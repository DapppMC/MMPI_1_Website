import time
import traceback
import subprocess
import os
import re
import cv2
import numpy as np
import ctypes
from ctypes import wintypes
# [PERBAIKAN AKURASI] Samakan sistem koordinat jendela & screenshot pada laptop dengan skala layar (DPI) > 100%
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass
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

def _siapkan_dosbox_conf():
    """[PERBAIKAN AKURASI] dosbox.conf memakai penanda {MMPI_DIR}; diganti otomatis dengan lokasi folder
    vDosMMPI/MMPI2007 di komputer ini, sehingga tidak perlu mengedit path per laptop."""
    folder = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(folder, DOSBOX_CONF), encoding="utf-8") as f:
        isi = f.read()
    isi = isi.replace("{MMPI_DIR}", os.path.join(folder, "vDosMMPI", "MMPI2007"))
    hasil = os.path.join(folder, "dosbox_runtime.conf")
    with open(hasil, "w", encoding="utf-8") as f:
        f.write(isi)
    return hasil

# --- PERSISTENT STATE ---
current_dos_proc = None

app = FastAPI()

# Helper to manage DOSBox focus
# [PERBAIKAN AKURASI] PENGAMAN FOKUS: Bot Logic hanya boleh mengetik kalau jendela yang aktif BENAR-BENAR DOSBox-X
# yang dijalankan server ini (dicari dari PID prosesnya, bukan dari judul jendela).
# Tanpa ini, ketikan bisa nyasar ke aplikasi lain (chat, email, dokumen) bila Windows menolak memindah fokus.
_user32 = ctypes.windll.user32
_kernel32 = ctypes.windll.kernel32

class _JendelaDos:
    def __init__(self, hwnd):
        self._hWnd = hwnd

def _hwnd_dosbox():
    if not current_dos_proc or current_dos_proc.poll() is not None:
        return None
    pid = current_dos_proc.pid
    ketemu = []
    @ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
    def _cb(h, l):
        if _user32.IsWindowVisible(h) and _user32.GetWindowTextLengthW(h) > 0:
            p = wintypes.DWORD()
            _user32.GetWindowThreadProcessId(h, ctypes.byref(p))
            if p.value == pid:
                ketemu.append(h)
        return True
    _user32.EnumWindows(_cb, 0)
    return ketemu[0] if ketemu else None

def _bawa_ke_depan(hwnd, pakai_alt=False):
    if _user32.IsIconic(hwnd):
        _user32.ShowWindow(hwnd, 9)  # SW_RESTORE
    fg = _user32.GetForegroundWindow()
    t_fg = _user32.GetWindowThreadProcessId(fg, None)
    t_ini = _kernel32.GetCurrentThreadId()
    _user32.AttachThreadInput(t_ini, t_fg, True)
    if pakai_alt:
        _user32.keybd_event(0x12, 0, 0, 0); _user32.keybd_event(0x12, 0, 2, 0)
    _user32.BringWindowToTop(hwnd)
    _user32.SetForegroundWindow(hwnd)
    _user32.AttachThreadInput(t_ini, t_fg, False)
    time.sleep(0.4)
    return _user32.GetForegroundWindow() == hwnd

def _wajib_fokus():
    hwnd = _hwnd_dosbox()
    if not hwnd:
        raise Exception("PENGAMAN: jendela DOSBox-X milik server tidak ditemukan; robot berhenti tanpa mengetik")
    if _user32.GetForegroundWindow() == hwnd:
        return hwnd
    for i in range(4):
        if _bawa_ke_depan(hwnd, pakai_alt=(i >= 2)):
            return hwnd
        time.sleep(0.5)
    raise Exception("PENGAMAN: DOSBox-X tidak bisa dibawa ke depan; robot berhenti tanpa mengetik")

def _cek_masih_fokus(hwnd):
    if _user32.GetForegroundWindow() != hwnd:
        raise Exception("PENGAMAN: fokus pindah dari DOSBox-X di tengah pengetikan; robot berhenti")

def _ketik(teks, interval=0.039):
    hwnd = _wajib_fokus()
    for i in range(0, len(teks), 25):
        _cek_masih_fokus(hwnd)
        pyautogui.typewrite(teks[i:i + 25], interval=interval)

def _tekan(tombol):
    hwnd = _wajib_fokus()
    for t in (tombol if isinstance(tombol, list) else [tombol]):
        _cek_masih_fokus(hwnd)
        pyautogui.press(t)

def ensure_dos_focus():
    try:
        return _JendelaDos(_wajib_fokus())
    except Exception as e:
        print(e)
        return None

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
    
    # Remove residue: morphological open (erode then dilate) kills small noise
    clean_kernel = np.ones((2,2), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, clean_kernel)
    
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
    
    # 2. Research Crop (Bottom row)
    research_start_row = int(h * 0.85)   # Bottom 15%
    research_start_col = int(w * 0.25)   # Skip "Skala penelitian" label
    research_area = img[research_start_row:, research_start_col:]
    
    cv2.imwrite("debug_02a_clinical_area.png", clinical_cropped)
    cv2.imwrite("debug_02b_research_area.png", research_area)
    
    # Process both areas with SPECIALIZED settings (Adaptive)
    
    # 1. Clinical: Needs high res (4x) and Linear smoothing for shape, 
    # but EROSION to keep '8' loops open (fix 8->6 merging)
    clinical_processed = preprocess_image(clinical_cropped, factor=4, interp=cv2.INTER_LINEAR, erode=True)
    
    # 2. Research: Factor 3x is usually best for these tiny rows.
    # Note: Smaller crops need cleaner processing. 
    research_processed = preprocess_image(research_area, factor=3, interp=cv2.INTER_LINEAR)
    # Thicken research font slightly to close gaps in '8'
    kernel = np.ones((2,2), np.uint8)
    research_processed = cv2.dilate(research_processed, kernel, iterations=1)
    
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
        ("scale",  0.07, 0.15),   # Scale identifier (L, F, K, 1-0)
        ("raw",    0.16, 0.30),   # Raw score
        ("kcorr",  0.28, 0.40),   # K-Correction addition
        ("total",  0.43, 0.58),   # Total Score (Raw + K)
        ("tscore", 0.63, 0.76),   # T-score
    ]
    
    column_texts = {}
    
    # Vertical cutoff: Stop at 82% height to skip the "Skala penelitian" footer
    h_cutoff = int(height * 0.82)
    
    for col_name, start_pct, end_pct in columns:
        x_start = int(width * start_pct)
        x_end = int(width * end_pct)
        
        # Extract column slice with height limit
        col_img = clinical_img[:h_cutoff, x_start:x_end]
        
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
    
    # DEBUG: Save raw OCR text to file for investigation
    with open("debug_ocr_columns.txt", "w") as f:
        for col_name, text in column_texts.items():
            f.write(f"=== {col_name} ===\n{text}\n\n")
    
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
    
    # FIX: Clamp T-scores to valid MMPI-2 range (max 120)
    # Tesseract sometimes hallucinates a leading digit (e.g. "396" instead of "96")
    # even when the image is clean. Strip leading digits until value <= 120.
    for i in range(len(tscore_vals)):
        val = int(tscore_vals[i])
        while val > 120 and len(str(val)) > 2:
            tscore_vals[i] = str(val)[1:]
            val = int(tscore_vals[i])
            print(f"  [CLAMP] T-score stripped to {tscore_vals[i]} (was > 120)")
    
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
            if scale in ['L', 'F', 'K'] or (scale.isdigit() and len(scale) == 1):
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
            'b': '8', 'B': '8', '&': '8', 'o': '0', 'O': '0', 
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
        clean_line = line.upper().replace("RMAS", "R MAS") # Hardware fix for label merge
        if "MAS" in clean_line and "ES" in clean_line:
            if i + 1 < len(lines):
                val_line = lines[i+1]
                # Improved tokenization: Handle cases where numbers merge (e.g. "9249" -> "92 49")
                raw_tokens = val_line.split()
                cleaned_vals = []
                for token in raw_tokens:
                    # Logic: If token is 4 digits, split it (it's likely two merged research scores)
                    digits_only = "".join(filter(str.isdigit, token))
                    if len(digits_only) == 4:
                        cleaned_vals.append(int(digits_only[:2]))
                        cleaned_vals.append(int(digits_only[2:]))
                    elif len(digits_only) == 3 and int(digits_only) > 150: # Likely merge like 924 -> 92 4
                         # Rare but possible
                         cleaned_vals.append(int(digits_only[:2]))
                         cleaned_vals.append(int(digits_only[2:]))
                    else:
                        val = clean_ocr_token(token)
                        if val is not None: cleaned_vals.append(val)
                
                for idx, scale_name in enumerate(research_order):
                    if idx < len(cleaned_vals):
                        data[scale_name] = cleaned_vals[idx]
            break
            
    return data

# --- PART 2: AUTOMATION BOT (Persistent Session) ---

@app.post("/start-dosbox")
def api_start_dosbox():
    """
    Launches DOSBox and navigates to the Gender selection screen.
    This replaces the 'cold start' in every request.
    """
    global current_dos_proc
    
    # 1. Kill any existing process
    if current_dos_proc and current_dos_proc.poll() is None:
        current_dos_proc.terminate()
        time.sleep(1)
        
    # 2. Start DOSBox
    current_dos_proc = subprocess.Popen([DOSBOX_EXE, "-nopromptfolder", "-defaultdir", os.path.dirname(os.path.abspath(__file__)),
                                         "-conf", _siapkan_dosbox_conf()])
    
    try:
        time.sleep(3) 
        dos_win = ensure_dos_focus()
        if not dos_win:
            raise Exception("DOSBox window not found after start")
            
        # ==========================================
        # STARTUP WORKFLOW (Modify here if needed)
        # ==========================================
        
        # 1. Wait for Serial Number Screen
        time.sleep(15) 
        
        # 2. Input Serial
        _ketik('MP-3980400', interval=0.001)
        time.sleep(0.5)
        _tekan('right')
        _tekan('enter')
        
        # 3. Delay for Main Menu
        time.sleep(7)
        
        # 4. Skip Intros
        _tekan('enter')
        time.sleep(0.5)
        _tekan(['enter', 'enter', 'enter', 'enter']) 
        
        return {"status": "success", "message": "DOSBox started and initialized to Gender screen"}

    except Exception as e:
        if current_dos_proc: current_dos_proc.terminate()
        raise HTTPException(status_code=500, detail=f"Startup Error: {str(e)}")

@app.post("/stop-dosbox")
def api_stop_dosbox():
    """Stops the persistent DOSBox process"""
    global current_dos_proc
    if current_dos_proc and current_dos_proc.poll() is None:
        current_dos_proc.terminate()
        current_dos_proc = None
        return {"status": "success", "message": "DOSBox stopped"}
    return {"status": "no_active_process", "message": "No DOSBox process was running"}


def run_dos_automation(gender, answers):
    """
    Runs the scoring logic using an ALREADY RUNNING DOSBox instance.
    """
    global current_dos_proc
    
    if not current_dos_proc or current_dos_proc.poll() is not None:
        raise Exception("DOSBox is not running. Call /start-dosbox first.")
    
    dos_win = ensure_dos_focus()
    if not dos_win:
        raise Exception("Could not focus DOSBox window")

    # ==========================================
    # SCORING WORKFLOW (Modify here if needed)
    # ==========================================
    
    # 1. Gender Input (L for Male / P for Female)
    gender_char = 'L' if gender == 'Male' else 'P'
    _tekan(gender_char)
    
    # 2. Skip to Questions
    _tekan(['enter', 'enter', 'enter', 'enter', 'enter']) 
    time.sleep(4) 
    
    # 3. Answer Input
    chars = ['+' if x else '-' for x in answers]
    input_string = "".join(chars)
    _ketik(input_string, interval=0.039) #originally 0.039
    time.sleep(0.3) 

    # [PERBAIKAN AKURASI] VERIFIKASI INPUT: baca 566 jawaban yang tampil di layar isian MMPI.EXE
    # dan cocokkan dengan jawaban yang seharusnya. Hasil dicek setelah alur selesai (lihat api_process_mmpi).
    global _verifikasi_input
    _verifikasi_input = None
    if _metode_baca() == "grid":
        try:
            import importlib, baca_layar
            importlib.reload(baca_layar)
            # Kursor MMPI.EXE berkedip di butir 1: tanda di sel itu kadang tak terlihat saat dipotret.
            # Potret ulang (maks. 4x) dan gabungkan sampai semua 566 tanda terbaca.
            terbaca = None
            for _ in range(4):
                capture_dos_result(dos_win, "temp_jawaban.png")
                s_baru = baca_layar.baca_jawaban(Image.open("debug_00_dos_720x400.png"), _urutan_grid())
                terbaca = s_baru if terbaca is None else "".join(g if g != "?" else x for g, x in zip(terbaca, s_baru))
                if "?" not in terbaca:
                    break
                time.sleep(0.35)
            beda = [i + 1 for i, (x, y) in enumerate(zip(terbaca, input_string)) if x != y]
            _verifikasi_input = {"cocok": not beda, "jumlah_beda": len(beda), "butir_beda": beda[:30]}
        except Exception as e:
            _verifikasi_input = {"cocok": False, "jumlah_beda": None, "galat": str(e)}
    
    # 4. Finish & Show Result
    _tekan('esc')
    time.sleep(_kalibrasi()[1])  # [PERBAIKAN AKURASI] beri waktu layar hasil tampil penuh (0.3 dtk terlalu cepat di laptop ini)
    
    # Capture results
    screenshot_filename = "temp_screen.png"
    capture_dos_result(dos_win, screenshot_filename)

    _tekan('esc') # Go out from scoring sheet 

    # Go back to Gender Field
    _tekan('enter')
    time.sleep(0.1)
    _tekan(['enter', 'enter', 'enter', 'enter'])

    return screenshot_filename

# [PERBAIKAN AKURASI] Pengambilan gambar layar hasil yang tidak bergantung ukuran jendela / skala layar.
# Isi jendela DOSBox-X (layar DOS 80x25, font 9x16 = 720x400) dinormalkan ke 720x400, lalu dipotong
# dengan bingkai yang setara potongan asli (left+12, top+160, width-35, height-185) pada laptop pembuat project.
# Bingkai bisa diubah tanpa restart lewat file kalibrasi_ocr.json: {"crop_720": [x0, y0, x1, y1], "tunggu_hasil_detik": 2.0}
RESULT_WAIT_S = 2.0
CROP_720 = (-8, 97, 763, 384)

def _kalibrasi():
    import json
    try:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "kalibrasi_ocr.json")) as f:
            k = json.load(f)
        return tuple(k.get("crop_720", CROP_720)), float(k.get("tunggu_hasil_detik", RESULT_WAIT_S))
    except Exception:
        return CROP_720, RESULT_WAIT_S

_verifikasi_input = None

def _urutan_grid():
    import json
    try:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "kalibrasi_ocr.json")) as f:
            return json.load(f).get("urutan_grid_jawaban", "kolom")
    except Exception:
        return "kolom"

def _metode_baca():
    """'grid' = pembaca grid-karakter baru (baca_layar.py); 'tesseract' = OCR asli buatan pengembang sebelumnya."""
    import json
    try:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "kalibrasi_ocr.json")) as f:
            return json.load(f).get("metode_baca", "grid")
    except Exception:
        return "grid"

def capture_dos_result(dos_win, path):
    hwnd = dos_win._hWnd
    rc = wintypes.RECT()
    ctypes.windll.user32.GetClientRect(hwnd, ctypes.byref(rc))
    pt = wintypes.POINT(0, 0)
    ctypes.windll.user32.ClientToScreen(hwnd, ctypes.byref(pt))
    w, h = rc.right - rc.left, rc.bottom - rc.top
    img = pyautogui.screenshot(region=(pt.x, pt.y, w, h))
    img.save("debug_00_client_raw.png")
    disp_h = int(round(w * 400 / 720))
    top = h - disp_h if h > disp_h + 4 else 0      # buang bilah menu bila ikut terpotret
    disp = img.crop((0, top, w, h)).resize((720, 400), Image.LANCZOS)
    disp.save("debug_00_dos_720x400.png")
    os.makedirs("arsip_layar", exist_ok=True)
    disp.save(os.path.join("arsip_layar", time.strftime("%Y%m%d_%H%M%S") + ".png"))
    (x0, y0, x1, y1), _ = _kalibrasi()
    canvas = Image.new("RGB", (x1 - x0, y1 - y0), (0, 0, 0))
    canvas.paste(disp.crop((max(0, x0), max(0, y0), min(720, x1), min(400, y1))), (max(0, -x0), max(0, -y0)))
    canvas.save(path)


# --- PART 3: API ENDPOINT ---
class MmpiInput(BaseModel):
    gender: Literal['Male', 'Female']
    answers: List[bool]

@app.post("/process-mmpi")
def api_process_mmpi(data: MmpiInput):
    print(f"Processing: {data.gender}, {len(data.answers)} items")
    
    screen_path = None
    try:
        # 1. Run Bot (Uses persistent session)
        screen_path = run_dos_automation(data.gender, data.answers)
        
        metode = _metode_baca()
        print(f"[PERBAIKAN AKURASI] metode baca layar: {metode}")
        if metode == "grid":
            # [PERBAIKAN AKURASI] Pembaca baru: baca angka per sel karakter DOS (80x25) dengan pola huruf DOS. Tanpa Tesseract.
            import importlib, baca_layar
            importlib.reload(baca_layar)
            pola = baca_layar.muat_pola(os.path.join(os.path.dirname(os.path.abspath(__file__)), "pola_angka_dos.npz"))
            hasil = baca_layar.baca_hasil(Image.open("debug_00_dos_720x400.png"), pola)
            scores = {k: ({"raw": v["raw"], "t": v["t"]} if isinstance(v, dict) else v)
                      for k, v in hasil.items() if k != "?"}
            print(f"[PERBAIKAN AKURASI] verifikasi input: {_verifikasi_input}")
            if not _verifikasi_input or not _verifikasi_input.get("cocok"):
                raise Exception(f"VERIFIKASI INPUT GAGAL: jawaban yang terlihat di MMPI.EXE tidak sama dengan jawaban peserta {_verifikasi_input}")
            return {"status": "success", "scores": scores, "metode": "grid",
                    "verifikasi_input": _verifikasi_input, "raw_text_debug": {"grid": hasil}}

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
        # [PERBAIKAN AKURASI] Jangan laporkan "sukses" kalau tidak ada satu pun angka terbaca
        if not any(k in scores for k in ("L", "F", "K")):
            raise Exception("OCR tidak menemukan skor di layar hasil (lihat debug_00_*.png)")
        
        return {
            "status": "success",
            "scores": scores,
            "metode": "tesseract",
            "raw_text_debug": {
                "clinical": clinical_text,
                "research": research_text,
                "combined": combined_text
            }
        }
        
    except Exception as e:
        print("\n=== PYTHON CRASH REPORT ===")
        traceback.print_exc() # <--- 2. ADD THIS TO PRINT THE EXACT ERROR LINE
        print("===========================\n")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        if screen_path and os.path.exists(screen_path):
            try: os.remove(screen_path)
            except: pass

# run "uvicorn server:app --reload" in cmd to start server