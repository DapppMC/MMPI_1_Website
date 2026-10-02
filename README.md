# MMPI_1_Website

Sistem tes kepribadian **MMPI** berbasis web: peserta mengerjakan 566 pernyataan di browser, dokter/psikolog mengelola peserta dan hasil,
dan skor dihitung oleh program **MMPI.EXE asli (DOS, versi 2.03)** yang dijalankan otomatis lewat DOSBox-X.

> **Kredit.** Sistem ini dikembangkan oleh tim pengembang sebelumnya. Repositori asli:
> [IamJustANerd/MMPI_1_Website](https://github.com/IamJustANerd/MMPI_1_Website) (kontributor: Mikel, IamJustANerd).
> Seluruh website (React), backend (Node/Express + PostgreSQL), alur antrean penilaian, dan otomasi DOSBox adalah karya mereka.
> Repositori ini adalah *fork* untuk melanjutkan proyek tersebut.

## Kontribusi di fork ini (branch `Accuracy-Fix`)

Oleh **Ahmad Dafa**. Fokus: menguji apakah skor di website sama dengan MMPI.EXE,
lalu memperbaiki bagian yang membuatnya tidak sama.

| | Hasil |
|---|---|
| Kode asli dijalankan di laptop lain (skala layar ≠ 100%) | 0 skor terbaca, skor kosong tersimpan sebagai "berhasil" |
| Pembaca angka asli (Tesseract), setelah potret dibetulkan | 185 / 250 skala benar (74%) |
| **Sesudah perbaikan** (pembaca grid + verifikasi input + pengaman fokus) | **250 / 250 (100%)** pada 10 kasus uji |

Laporan lengkap: [`pengujian_akurasi/Laporan_Uji_Akurasi_MMPI_Web_vs_DOS.pdf`](pengujian_akurasi/Laporan_Uji_Akurasi_MMPI_Web_vs_DOS.pdf) ·
daftar perubahan: [`CHANGELOG.md`](CHANGELOG.md).

## Komponen

| Folder | Isi |
|---|---|
| `client/` | Website React + Vite + TypeScript (Super Admin, Dokter, Peserta) |
| `mmpi-backend/` | API Node/Express + PostgreSQL, termasuk *queue worker* penilaian |
| `server/` | Server Python (FastAPI): Bot Logic (DOSBox-X + pyautogui) dan pembaca hasil — lihat `server/README.md` |
| `pengujian_akurasi/` | Alat, kasus, hasil, dan laporan uji akurasi website vs MMPI.EXE |
| `scripts/` | Pembuat SQL untuk memasang teks soal MMPI dari file lokal |

## Menjalankan (Windows + Docker Desktop)

1. `docker compose up -d --build` → website di `http://localhost`, API di `http://localhost:3000`.
   Database otomatis diisi dari `mmpi_backup_docker.sql` saat pertama dibuat.
2. Server Python (butuh DOSBox-X di `C:\DOSBox-X`, Tesseract di `C:\Program Files\Tesseract-OCR`):
   ```bash
   cd server
   pip install fastapi uvicorn opencv-python pytesseract pyautogui pygetwindow pillow numpy requests
   uvicorn server:app --host 0.0.0.0 --port 8000
   ```
   Backend di Docker memanggilnya lewat `PYTHON_API_URL=http://host.docker.internal:8000` (ubah di `docker-compose.yml` bila port lain).
3. **Teks soal MMPI berlisensi dan tidak disertakan.** Tabel `soal` berisi placeholder. Untuk memakai soal asli, siapkan
   `soal_asli.txt` (566 baris, baris ke-N = butir N) secara lokal, lalu:
   ```bash
   python scripts/buat_sql_soal.py soal_asli.txt > 03_soal_asli.sql
   docker compose exec -T db psql -U myuser -d mmpi_db < 03_soal_asli.sql
   ```
4. Kalau `localhost` di browser bermasalah (mis. VPN bawaan browser), coba `http://127.0.0.1`.

## Catatan data & lisensi

- `MMPI.EXE` dan teks soal MMPI adalah materi berlisensi.
- Folder `server/vDosMMPI/MMPI2007` (berasal dari repo asli) berisi file database program lama. Sebelum repositori dipakai lebih luas,
  periksa apakah ada data peserta sungguhan di dalamnya.
