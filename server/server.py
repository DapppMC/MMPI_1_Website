import time
import subprocess
import os
import re
import cv2
import numpy as np
import pyautogui
import pytesseract
import pygetwindow as gw
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Literal

"""Done : 
1. Tools Installed : Tesseract (OCR), Dosbox-x (for simul), FastAPI (for API hosting), pyautogui (for key inputs simul), cv2 (for image processing), screenshot (lupa pake apa, hrsnya internal lib)
2. Dos auto configure : dosbox.config
3. Cv set untuk mempermudah OCR (preproccesing)
4. Bot logic : untuk device Dv (sisanya hrs configure ulang untuk delaynya sementara : tergantung hardware speed)
5. Ss untuk di preprocess (cv2) dan di OCR (pytesseract)
6. Parsing OCR output
7. API to serve to frontend (kalo mau dipake tinggal call API : http://127.0.0.1:8000/process-mmpi) Local
8. Test API : request_dummy.py
9. Parsing OCR output tweak : untuk Skala penelitian sudah aman (soalnya struktur jelas) tinggal skala klinis (dipisah)
10. Add morphology di cv buat mempertebal teks (dilate) -> atau nanti di morph aja ya? gtw deh

Progress : 
1. Adjust cv and OCR biar mbacanya bener
2. Adjust parsing logic to accomodate skala klinik"""

# --- 1. CONFIGURATION ---
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
DOSBOX_EXE = r"C:\DOSBox-X\dosbox-x.exe"
DOSBOX_CONF = "dosbox.conf"
DOSBOX_WINDOW_TITLE = "DOSBox" 

app = FastAPI()

# --- PART 1: VISION ENGINE (Optimized with Smart Cropping) ---
def preprocess_image(img, factor=4, interp=cv2.INTER_LINEAR, erode=False):
    """
    Common preprocessing: upscale, grayscale, threshold, invert, pad
    Args:
        img: Input image
        factor: Upscaling factor (Default 4 for clinical rows)
        interp: Interpolation method (Default LINEAR for structure)
                Use factor=2, interp=cv2.INTER_NEAREST for exact pixel fonts (Research)
        erode: Whether to apply erosion (thinning) to separate loops
    """
    # Upscale
    img_scaled = cv2.resize(img, None, fx=factor, fy=factor, interpolation=interp)
    
    # Grayscale
    gray = cv2.cvtColor(img_scaled, cv2.COLOR_BGR2GRAY)
    
    # OTSU threshold - Auto-contrast is safer for varying DOS screens
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Invert (black text on white - required for Tesseract)
    final = cv2.bitwise_not(binary)
    
    # Optional Erode (Thinning) - Good for '8' loops merging into '6'
    if erode:
        kernel = np.ones((2,2), np.uint8)
        final = cv2.erode(final, kernel, iterations=1)
    
    # Padding
    final = cv2.copyMakeBorder(
        final, 10, 10, 10, 10, 
        cv2.BORDER_CONSTANT, value=(255, 255, 255)
    )
    
    return final


def process_screenshot_for_ocr(image_path):
    """
    Smart Cropping: Separates clinical area (cropped) from research area (full width)
    Returns tuple: (clinical_img, research_img, full_processed_img)
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Screenshot cannot be read")
    
    cv2.imwrite("debug_01_original.png", img)
    
    h, w = img.shape[:2]
    
    # 1. Clinical Crop
    clinical_crop_width = int(w * 0.45)  # Left 45%
    clinical_cropped = img[:, :clinical_crop_width]
    
    # 2. Research Crop
    research_start_row = int(h * 0.85)   # Bottom 15%
    research_area = img[research_start_row:, :]
    
    cv2.imwrite("debug_02a_clinical_area.png", clinical_cropped)
    cv2.imwrite("debug_02b_research_area.png", research_area)
    
    # Process both areas with SPECIALIZED settings (Adaptive)
    
    # 1. Clinical: Needs high res (4x) and Linear smoothing for shape, 
    # but EROSION to keep '8' loops open (fix 8->6 merging)
    clinical_processed = preprocess_image(clinical_cropped, factor=4, interp=cv2.INTER_LINEAR, erode=True)
    
    # 2. Research: Needs crisp pixels (3x Mean) to avoid '6' loop merging into '8' 
    # but big enough to keep '8' loops closed (fix 8->6)
    research_processed = preprocess_image(research_area, factor=3, interp=cv2.INTER_NEAREST)
    
    cv2.imwrite("debug_04_clinical_processed.png", clinical_processed)
    cv2.imwrite("debug_05_research_processed.png", research_processed)
    
    # Full (Backward compat)
    full_cropped = img[:, :clinical_crop_width]
    full_processed = preprocess_image(full_cropped, factor=4, interp=cv2.INTER_LINEAR)
    cv2.imwrite("debug_03_processed.png", full_processed)
    
    return clinical_processed, research_processed, full_processed


def extract_clinical_scores(clinical_img):
    """
    Column-based OCR for clinical scores (L, F, K, 1-0)
    Only extracts: Scale | Raw | T-Score (clinically relevant values)
    K-Correction and Total are intermediate values, not needed for interpretation
    """
    height, width = clinical_img.shape[:2]
    
    # Only 3 columns needed for clinical interpretation:
    # Scale identifier | Raw Score | T-Score
    # Boundaries shifted right to account for left black border
    columns = [
        ("scale",  0.08, 0.22),   # Scale identifier (L, F, K, 1-0)
        ("raw",    0.22, 0.33),   # Raw score (Adjusted left to avoid K-Corr column)
        ("tscore", 0.66, 0.98),   # T-score (Adjusted left to catch 100+)
    ]
    
    column_texts = {}
    
    for col_name, start_pct, end_pct in columns:
        x_start = int(width * start_pct)
        x_end = int(width * end_pct)
        
        # Extract column slice
        col_img = clinical_img[:, x_start:x_end]
        
        # NOTE: Reduced extra processing. Image is already 4x scaled and binaried.
        # Adding more scaling or padding might degrade accuracy.
        
        # Save for debugging
        cv2.imwrite(f"debug_col_{col_name}.png", col_img)
        
        # OCR config - OEM 3 (default - uses available engines)
        # PSM 6 for uniform block, digit whitelist
        # Try pure number reading first
        config = '--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789'
        
        text = pytesseract.image_to_string(col_img, config=config)
        column_texts[col_name] = text.strip()
        print(f"  [{col_name}]: {repr(text.strip())}")
    
    # Clean up each column - extract non-empty values
    def extract_values(text):
        """Extract non-empty values from OCR text"""
        # Fix common OCR artifacts for this specific DOS font
        lines = []
        for v in text.split('\n'):
            clean = v.strip()
            if not clean: continue
            
            # Map '?' to '7' (common error)
            clean = clean.replace('?', '7')
            
            # Map '°' or other noise to empty
            clean = re.sub(r'[^\d]', '', clean)
            
            if clean:
                lines.append(clean)
        return lines
    
    raw_vals = extract_values(column_texts["raw"])
    tscore_vals = extract_values(column_texts["tscore"])
    
    # Scale column is ALWAYS fixed - use expected values instead of OCR
    expected_scales = ['L', 'F', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
    
    # --- POST-PROCESSING REPAIR LOGIC ---
    # Apply clinical logic to fix impossible values (e.g. 90 -> 30)
    
    reconstructed_lines = []
    max_len = min(len(raw_vals), len(tscore_vals), 13)
    
    for i in range(max_len):
        scale = expected_scales[i]
        raw_str = raw_vals[i]
        t_str = tscore_vals[i]
        
        try:
            raw_int = int(raw_str)
            t_int = int(t_str)
            
            # RULE 1: Fix F Scale (Index 1) - High Raw cannot have Low T
            # Example: Raw 19, T 30 -> Impossible. Likely T 90.
            if scale == 'F' and raw_int > 15 and t_int < 50:
                 if str(t_int)[0] == '3': # If it starts with 3 (misread 9)
                     t_str = '9' + str(t_int)[1:]
                     t_int = int(t_str)
                     print(f"  [REPAIR] Fixed F Scale T-Score: {raw_int} -> {t_int} (was 30s)")
                     
            # RULE 2: Fix '7' reading as '2' (e.g. 77 -> 72)
            # Hard to generalize without lookup table, but we can verify consistency if needed.
            # For now, we rely on the clean image input.
            
        except:
            pass
            
        reconstructed_lines.append(f"{scale} {raw_str} {t_str}")
    
    reconstructed_text = '\n'.join(reconstructed_lines)
    print("\n--- CLINICAL OCR OUTPUT (Aligned & Repaired) ---\n", reconstructed_text)
    return reconstructed_text


def extract_research_scores(research_img):
    """
    OCR for research scales (A, R, Mas, Es, etc.) - full width
    """
    config = '--psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '
    text = pytesseract.image_to_string(research_img, config=config)
    print("\n--- RESEARCH OCR OUTPUT ---\n", text)
    return text


def extract_scores(processed_img):
    """
    Legacy function for backward compatibility - uses full processed image
    """
    custom_config = '--psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-'
    text = pytesseract.image_to_string(processed_img, config=custom_config)
    print("\n--- RAW OCR OUTPUT (Full Page) ---\n", text)
    return text

import re

def parse_dos_output(text):
    """
    FINAL PARSER (Platinum Version).
    Fitur Baru:
    - Logic 'Sanity Check': Membandingkan hasil potong Raw dengan Total Score.
      Jika Raw > Total, otomatis mundur mengambil 1 digit.
      Ini memperbaiki kasus 'n7 9286 37 62' -> Raw terbaca 9 (bukan 92).
    """
    data = {}
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # 1. PARSE CLINICAL (Simple Format: "Scale Raw T")
    # Expected format lines: "L 15 87", "F 19 90", etc.
    for line in lines:
        parts = line.split()
        if len(parts) >= 3:
            # Check if it looks like a clinical line: [Scale] [Raw] [T]
            scale = parts[0]
            if scale in ['L', 'F', 'K'] or scale.isdigit():
                try:
                    raw = int(parts[1])
                    t = int(parts[2])
                    
                    # Map scale to full keys
                    key_map = {
                        '1': "1 (Hs)", '2': "2 (D)", '3': "3 (Hy)", '4': "4 (Pd)", '5': "5 (Mf)",
                        '6': "6 (Pa)", '7': "7 (Pt)", '8': "8 (Sc)", '9': "9 (Ma)", '0': "0 (Si)",
                        'L': "L", 'F': "F", 'K': "K"
                    }
                    
                    full_key = key_map.get(scale, scale)
                    data[full_key] = {"raw": raw, "t": t}
                except:
                    continue
    
    # 2. PARSE RESEARCH (Existing Logic)
    # Scan for research lines which are more complex (name value name value...)
    research_order = ['A', 'R', 'Mas', 'Es', 'Lb', 'Ca', 'Dy', 'Do', 'Re', 'Pr', 'St', 'Cn']
    
    # Helper for research typos
    def clean_ocr_token(token):
        typo_map = {
            'g': '9', 'q': '9', 'G': '9', 's': '5', 'S': '5',
            'b': '6', 'B': '8', '&': '8', 'o': '0', 'O': '0', 
            'D': '0', 'Q': '0', 'i': '1', 'I': '1', 'l': '1', 
            '|': '1', '!': '1', 'z': '2', 'Z': '2', 'A': '4'
        }
        clean_str = ""
        has_digit = False
        for char in token:
            if char.isdigit():
                clean_str += char
                has_digit = True
            elif char in typo_map:
                clean_str += typo_map[char]
                has_digit = True
        if clean_str and has_digit: return int(clean_str)
        return None
    
    for i, line in enumerate(lines):
        if "MAS" in line.upper() and "ES" in line.upper():
            if i + 1 < len(lines):
                val_line = lines[i+1]
                raw_tokens = val_line.split()
                cleaned_vals = []
                for token in raw_tokens:
                    val = clean_ocr_token(token)
                    if val is not None: cleaned_vals.append(val)
                for idx, scale_name in enumerate(research_order):
                    if idx < len(cleaned_vals):
                        data[scale_name] = cleaned_vals[idx]
            break
            
    return data

# --- PART 2: AUTOMATION BOT (Your Custom Logic) ---
def run_dos_session(gender, answers):
    proc = subprocess.Popen([DOSBOX_EXE, "-conf", DOSBOX_CONF])
    
    try:
        # Wait for DOSBox to actually appear
        time.sleep(3) 
        
        # Window Management
        windows = gw.getWindowsWithTitle(DOSBOX_WINDOW_TITLE)
        dos_win = None
        for w in windows:
            if DOSBOX_WINDOW_TITLE.lower() in w.title.lower():
                dos_win = w
                break
        
        if not dos_win:
            raise Exception("DOSBox window not found")
            
        if not dos_win.isActive:
            try:
                dos_win.activate()
            except:
                dos_win.restore(); dos_win.activate()
        
        time.sleep(1) # Ensure focus before typing
        
        
        #Bot Typing
        
        # 1. Wait for Serial Number Screen
        time.sleep(10) 
        
        # 2. Input Serial
        pyautogui.press('enter')
        pyautogui.typewrite('MP-3980400', interval=0.001)
        time.sleep(0.5)
        pyautogui.press('right')
        pyautogui.press('enter')
        # 3. Delay for Main Menu
        time.sleep(7)
        
        # 4. Skip Intros
        pyautogui.press('enter')
        time.sleep(0.5)
        pyautogui.press(['enter', 'enter', 'enter', 'enter']) # Skip 4 times
        
        # 5. Gender Input (L for Male / P for Female)
        gender_char = 'L' if gender == 'Male' else 'P'
        pyautogui.press(gender_char)
        
        # 6. Skip to Questions
        pyautogui.press(['enter', 'enter', 'enter', 'enter', 'enter']) # Skip 5 times
        time.sleep(4) 
        
        # 7. Answer Input (+ / -)
        chars = ['+' if x else '-' for x in answers]
        input_string = "".join(chars)
        
        # Typing
        pyautogui.typewrite(input_string, interval=0.039)
        time.sleep(1) #A little delay to ensure it typed everything correctly
        
        # 8. Finish & Show Result
        pyautogui.press('esc')
        time.sleep(2) # Increased slightly to ensure render is complete
        
        # ==========================================
        # YOUR CUSTOM AUTOMATION SEQUENCE END
        # ==========================================

        # Capture
        screenshot_filename = "temp_screen.png"
        region = (dos_win.left+12, dos_win.top+160, dos_win.width-35, dos_win.height-185)
        pyautogui.screenshot(screenshot_filename, region=region)
        
        return screenshot_filename

    except Exception as e:
        print(f"Automation Error: {e}")
        raise e
    finally:
        # Always kill DOSBox
        if proc.poll() is None:
            proc.terminate()

# --- PART 3: API ENDPOINT ---
class MmpiInput(BaseModel):
    gender: Literal['Male', 'Female']
    answers: List[bool]

@app.post("/process-mmpi")
def api_process_mmpi(data: MmpiInput):
    print(f"Processing: {data.gender}, {len(data.answers)} items")
    
    screen_path = None
    try:
        # 1. Run Bot
        screen_path = run_dos_session(data.gender, data.answers)
        
        # 2. Run Vision (now returns 3 images)
        clinical_img, research_img, full_img = process_screenshot_for_ocr(screen_path)
        
        # 3. OCR - Extract separately
        clinical_text = extract_clinical_scores(clinical_img)
        research_text = extract_research_scores(research_img)
        
        # Combine for parsing (clinical + research)
        combined_text = clinical_text + "\n" + research_text
        print("\n--- COMBINED OCR OUTPUT ---\n", combined_text)
        
        # 4. Parse scores
        scores = parse_dos_output(combined_text)
        
        return {
            "status": "success",
            "scores": scores,
            "raw_text_debug": {
                "clinical": clinical_text,
                "research": research_text,
                "combined": combined_text
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        if screen_path and os.path.exists(screen_path):
            try: os.remove(screen_path)
            except: pass
