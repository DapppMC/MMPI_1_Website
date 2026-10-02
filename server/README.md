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
- **OCR Accuracy Issues**: With the grid reader (default, see below) the capture is normalised to the 80x25 DOS text grid, so window size and Windows display scaling no longer matter. The legacy Tesseract path is still calibrated for one specific screen geometry.

---

## Important Notes

1.  **Editing Answers (`request_dummy.py`)**:
    - **Logic Toggle**: Change `answer_logic = False` (or True) to set the baseline for all 566 answers.
    - **Specific Overrides**: Edit the `jawaban_edit` list (e.g., `[1, 5, 10]`) to flip the logic for specific question numbers (if baseline is False, these become True).

2.  **Changing Gender**:
    - Update the `gender` field in the `payload` dictionary within `request_dummy.py` (e.g., `"Male"` or `"Female"`).

3.  **DOSBox Configuration**:
    - The `MOUNT` path in `dosbox.conf` now uses the placeholder `{MMPI_DIR}`, which `server.py` fills in automatically with `server/vDosMMPI/MMPI2007` on the current PC (written to `dosbox_runtime.conf`). No manual path editing is needed anymore.


---

## Perbaikan Akurasi & Keandalan (Oktober 2026)

Ditambahkan oleh Ahmad Dafa di atas karya tim pengembang sebelumnya. Rincian lengkap: `../CHANGELOG.md`
dan laporan `../pengujian_akurasi/Laporan_Uji_Akurasi_MMPI_Web_vs_DOS.pdf`.

| Bagian | Perubahan |
|---|---|
| Bot Logic | DOSBox-X dijalankan dengan `-nopromptfolder` + folder kerja pasti; **pengaman fokus**: jendela DOSBox-X dicari dari PID prosesnya dan diperiksa sebelum setiap tombol, kalau bukan DOSBox-X maka berhenti tanpa mengetik |
| Vision Engine | proses DPI-aware; hanya isi jendela DOSBox-X yang dipotret lalu dinormalkan ke 720x400; jeda 2 dtk setelah Esc |
| Pembaca grid (`baca_layar.py`) | membaca angka per sel karakter DOS (80x25) dengan pola huruf DOS (`pola_angka_dos.npz`), tanpa Tesseract; berhenti bila ragu |
| Verifikasi input | sebelum Esc, 566 tanda `+`/`-` di layar isian MMPI.EXE dibaca dan dicocokkan dengan jawaban peserta; beda satu saja = ditolak |
| Gagal = gagal | bila tidak ada skor terbaca atau verifikasi gagal, server mengembalikan error (sebelumnya `{}` tersimpan sebagai sukses) |

Pengaturan di `kalibrasi_ocr.json` (dibaca tanpa restart):

```json
{"metode_baca": "grid", "crop_720": [-8, 97, 763, 384], "tunggu_hasil_detik": 2.0, "urutan_grid_jawaban": "kolom"}
```

`"metode_baca": "tesseract"` mengembalikan pembaca OCR lama (untuk perbandingan).

Jalankan server agar bisa dipanggil dari Docker:

```bash
uvicorn server:app --host 0.0.0.0 --port 8000
```

Selama penilaian, DOSBox-X harus bisa tampil di depan; jangan memakai keyboard/mouse.
