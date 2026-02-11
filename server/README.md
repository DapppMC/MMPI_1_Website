# MMPI OCR Server - Installation & Usage Guide

This server automates the legacy MMPI DOS application, captures the results, and uses computer vision (OCR) to return structured JSON scores.

## 1. System Requirements & External Tools

Before running the Python server, you must install the following external tools. **The server expects these tools to be in specific paths.**

### A. Tesseract OCR

The optical character recognition engine.

1.  **Download**: [Tesseract-OCR for Windows](https://github.com/UB-Mannheim/tesseract/wiki) (Download the 64-bit installer).
2.  **Install**: Run the installer.
3.  **Path Configuration**:
    - Install specifically to: `C:\Program Files\Tesseract-OCR`
    - The server looks for: `C:\Program Files\Tesseract-OCR\tesseract.exe`
    - _If you install elsewhere, you must update line 32 in `server.py`._

### B. DOSBox-X

The emulator used to run the legacy MMPI program.

1.  **Download**: [DOSBox-X Releases](https://github.com/joncampbell123/dosbox-x/releases).
2.  **Install**: Extract or install to the C: drive.
3.  **Path Configuration**:
    - The server looks for: `C:\DOSBox-X\dosbox-x.exe`
    - _If you install elsewhere, you must update line 33 in `server.py`._

---

## 2. Python Dependencies

Open your terminal (PowerShell or CMD) in this folder and install the required libraries:

```bash
pip install fastapi uvicorn opencv-python pytesseract pyautogui pygetwindow pillow pydantic numpy requests
```

_Note: `requests` is needed for the `request_dummy.py` test script._

---

## 3. How to Use

### Step 1: Start the Server

Run the following command in the `MMPIServer` folder to start the API:

```bash
uvicorn server:app --reload
```

You should see output indicating the server is running at `http://127.0.0.1:8000`.

### Step 2: Run a Test Request

You can use the provided dummy script to send answers to the server and see the automated process in action.

1.  Open a new terminal window.
2.  Run the test script:
    ```bash
    python request_dummy.py
    ```

### Step 3: What Happens Next?

1.  The server receives the request.
2.  It launches **DOSBox-X** automatically.
3.  It types the serial number, gender, and answers.
4.  It captures a screenshot of the result screen.
5.  It processes the image (Cropping -> Scaling -> Erosion -> OCR).
6.  It returns the final scores as a JSON response to your script.

---

## Troubleshooting

- **DOSBox window not found**: Make sure DOSBox-X launches correctly and the window title is exactly "DOSBox" or contains it.
- **Tesseract Not Found**: Check if `tesseract.exe` is actually at `C:\Program Files\Tesseract-OCR\tesseract.exe`.
- **OCR Accuracy Issues**: The server is calibrated for specific screen geometry. If you change DOSBox resolution or window size, OCR might fail. Keep the default `dosbox.conf` settings.

---

## Important Notes

1.  **Editing Answers (`request_dummy.py`)**:
    - **Logic Toggle**: Change `answer_logic = False` (or True) to set the baseline for all 566 answers.
    - **Specific Overrides**: Edit the `jawaban_edit` list (e.g., `[1, 5, 10]`) to flip the logic for specific question numbers (if baseline is False, these become True).

2.  **Changing Gender**:
    - Update the `gender` field in the `payload` dictionary within `request_dummy.py` (e.g., `"Male"` or `"Female"`).

3.  **DOSBox Configuration**:
    - **Crucial**: Open `dosbox.conf` and ensure the `mount` paths match the actual folder addresses on your specific PC. The automation relies on these paths being correct.
