# Changelog

Semua perubahan di branch `Accuracy-Fix` dibandingkan repo asli
[IamJustANerd/MMPI_1_Website](https://github.com/IamJustANerd/MMPI_1_Website) (commit `9f7c657`).
Oleh Ahmad Dafa. Bukti pengujian: `pengujian_akurasi/`.

## Deploy (Docker)

- `docker-compose.yml`
  - Postgres 17 (sesuai versi dump), database otomatis diisi dari `mmpi_backup_docker.sql` + `init_acak_soal.sql`.
  - *Healthcheck* database; backend baru jalan setelah database siap (sebelumnya backend bisa gagal konek saat start).
  - Backend memanggil server Python lewat `PYTHON_API_URL=http://host.docker.internal:8000`. Sebelumnya `127.0.0.1:8000`,
    yang dari dalam container menunjuk ke container itu sendiri, sehingga tombol **Nilai Tes** tidak pernah sampai ke server Python.
- `mmpi_backup_docker.sql` (baru): salinan `mmpi_backup.sql` dengan `OWNER TO myuser` agar bisa dimuat oleh user database di Docker.
- `init_acak_soal.sql` (baru): menambah kolom `dokter.acak_soal` yang dipakai kode tetapi belum ada di dump.
- `client/Dockerfile`: Node 20 (Vite 7 butuh Node ≥ 20) dan fallback SPA di Nginx agar refresh halaman tidak 404.
- `client/package.json`: skrip `build` menjadi `vite build` (tanpa `tsc -b`) karena pemeriksaan tipe gagal di beberapa file.
  *Sementara* — sebaiknya error tipenya diperbaiki lalu `tsc -b` dikembalikan.
- `mmpi-backend/Dockerfile`: Node 20, `EXPOSE 3000` (sesuai port server).
- `mmpi-backend/workers/queueWorker.js`, `mmpi-backend/controllers/submissionController.js`: alamat server Python dari `PYTHON_API_URL`.

## Server Python — Bot Logic

- DOSBox-X dijalankan dengan `-nopromptfolder -defaultdir <folder server>`; sebelumnya dialog "Select folder" muncul saat
  pertama jalan dan Bot Logic mengetik nomor seri ke dialog itu.
- `dosbox.conf` memakai penanda `{MMPI_DIR}` yang diisi otomatis (`dosbox_runtime.conf`), tidak perlu mengedit path per laptop.
- **Pengaman fokus:** jendela DOSBox-X dicari dari PID prosesnya sendiri, dibawa ke depan (`AttachThreadInput`), dan jendela aktif
  diperiksa sebelum setiap tombol / setiap 25 karakter. Bila bukan DOSBox-X → berhenti tanpa mengetik.
  (Saat uji, versi lama sempat mengetik nomor seri dan jawaban ke aplikasi chat yang sedang aktif.)
- `import traceback` yang hilang ditambahkan.

## Server Python — Vision Engine / pembaca hasil

- Proses dibuat *DPI-aware*; yang dipotret hanya area klien jendela DOSBox-X, dinormalkan ke 720x400 (layar DOS 80x25),
  lalu dipotong dengan bingkai setara potongan asli. Jeda setelah Esc 2 detik (sebelumnya 0,3 detik).
- **Pembaca grid** (`server/baca_layar.py`, `server/pola_angka_dos.npz`): angka dibaca per sel karakter dengan mencocokkan pola huruf DOS,
  posisi tiap skala tetap (tidak bisa bergeser baris). Ragu → error. Menggantikan Tesseract sebagai default.
- **Verifikasi input:** sebelum Esc, 566 tanda `+`/`-` di layar isian MMPI.EXE dibaca (urutan per kolom, 38x15) dan dicocokkan dengan
  jawaban peserta; dipotret ulang sampai 4x karena kursor berkedip di butir 1.
- Bila tidak ada skor terbaca atau verifikasi gagal → HTTP 500 (sebelumnya skor kosong `{}` disimpan sebagai sukses).
- `server/kalibrasi_ocr.json`: `metode_baca` (`grid` | `tesseract`), `crop_720`, `tunggu_hasil_detik`, `urutan_grid_jawaban`.
  Jalur Tesseract lama tetap ada untuk perbandingan (termasuk aturan lama "T > 120 dipotong" yang terbukti keliru: 124 → 24).

## Pengujian

- `pengujian_akurasi/`: 10 kasus uji (kunci jawaban tanpa teks soal), alat bantu, hasil per fase, gambar layar DOS,
  dan laporan PDF. Hasil: 185/250 (Tesseract) → 250/250 (pembaca grid), 10/10 lolos verifikasi input,
  3 kasus pembanding MMPI.EXE tanpa website identik.
- `scripts/buat_sql_soal.py`: membuat SQL soal dari file teks lokal (teks soal berlisensi tidak disimpan di repo).

## Tidak diubah

Website (React), endpoint backend, skema database, alur antrean, dan MMPI.EXE.
