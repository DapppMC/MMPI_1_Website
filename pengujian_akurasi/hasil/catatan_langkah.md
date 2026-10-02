# Catatan Langkah - Uji Akurasi MMPI

Fase awal dijalankan oleh agen uji otomatis. Kode seri dokter: ABC (ditemukan di DB: akun dokter uji).
Mulai: 2026-10-02 13:48 WIB (Asia/Jakarta).

## FASE 0 - Pemeriksaan awal
1. [OK] docker compose ps: db (healthy), backend, frontend -> running (frontend Up ~50 menit, backend 42 menit).
2. [OK] http://127.0.0.1:3000/api/soal -> 566 soal; soal #1 berisi teks asli (bukan placeholder).
3. [OK] C:\DOSBox-X\dosbox-x.exe ADA; C:\Program Files\Tesseract-OCR\tesseract.exe ADA.
4. [OK] Server Python: uvicorn server:app di 0.0.0.0:8000 (background, pid 24956); /docs -> HTTP 200.
5. [OK] Backend Docker -> server Python: fetch(PYTHON_API_URL+'/docs') => "OK 200".
6. [OK] python alat\buat_kasus.py -> 10 kasus dibuat ulang (K01-K10).
   [OK] python alat\dbf.py awal -> titik awal: IDT=311, JAWABAN=312, KLINIS=311, RISET=311.
   [OK] python alat\bandingkan.py template -> hasil\transkrip_layar.csv dibuat.
   [OK] folder hasil\screenshot dibuat.


## LANJUTAN (agen uji otomatis berhenti setelah Fase 0 & pembuatan akun)
Catatan lingkungan: server Python dipindah ke port 8001 (port 8000 terkunci proses python lama). Backend Docker dibangun ulang dengan PYTHON_API_URL=http://host.docker.internal:8001.
Keterbatasan alat: panel browser alat uji memblokir permintaan lintas-origin dari halaman web (8090) ke API (3000) -> tampilan web tidak bisa dipakai di panel itu.
Karena itu langkah web dijalankan dengan memanggil API yang SAMA persis dengan yang dipanggil tombol-tombol UI (dijalankan dari tab origin 127.0.0.1:3000).

### FASE 1 - 4.1 Isi jawaban
- Kode seri akun dokter uji = ABC (dari /api/dokter/login). Akun K01-K10 dari fase awal dipakai ulang (hasil/peta_peserta.json).
- Ditemukan: akun K01-K08,K10 sudah punya jawaban_fix tetapi jawaban_temp kosong (jejak percobaan fase awal). Diisi ulang.
- Percobaan pertama K01 gagal di submit-test: "Incomplete test. Database does not have 566 answers." -> penyebab: kunci yang disalin ke browser terpotong (563 karakter). BUKAN bug sistem; justru membuktikan backend menolak tes yang tidak lengkap.
  Kunci kemudian dikirim dalam bentuk terkompresi + diverifikasi SHA-256 (cocok dengan file kasus).
- Isi ulang K01-K08,K10: start -> jawaban-temp/bulk -> test-status/finish -> submit-test = semua HTTP 200.
- cek-jawaban: semua 566/566 tersimpan, 0 butir beda dari kunci (K01-K08, K10).

### FASE 1 - 4.2 K09 (urutan soal diacak)
- Layar peserta tidak bisa dibuka di panel browser alat uji (lihat keterbatasan di atas), jadi K09 dijalankan dengan meniru PERSIS panggilan yang dibuat layar peserta saat soal diacak:
  Data Diri (POST /api/pasien, Wanita) -> test-status/start -> 566x POST /api/jawaban-temp dalam urutan tampil ACAK (Fisher-Yates), soal_id = nomor butir asli (realIdx+1)
  -> tombol Selesai: jawaban-temp/bulk (urutan asli) -> test-status/finish -> submit-test.
- Sebelum Selesai: 566/566 tersimpan, 0 beda dari kunci. Setelah Selesai: submit 200, 566/566, 0 beda.
- Urutan tampil lengkap + "butir N dijawab Ya/Tidak" tersimpan di hasil/web/K09_log_ui.csv (10 pertama: 28,312,17,92,188,566,148,105,103,77).
- Yang TIDAK teruji di sini: komponen React pengacak di layar peserta (diperiksa lewat kode: soal_id = realIdx + 1, bulk dikirim dalam urutan asli).

### FASE 1 - 4.3 Nilai Tes (penilaian lewat robot web)
- Percobaan 1 (K01): DOSBox-X membuka jendela "Select folder where to run emulation" (prompt pertama kali DOSBox-X). Robot mengetik nomor seri ke jendela itu -> gagal.
  PERBAIKAN: server.py menjalankan DOSBox-X dengan -nopromptfolder -defaultdir <folder server> dan path conf absolut.
- TEMUAN: hasil gagal tetap disimpan sebagai skor kosong "{}" dan ditandai berhasil (is_sent), tanpa pesan error.
- Percobaan 2 (K01): DOSBox-X & ketikan normal, tetapi skor kosong lagi. Penyebab (dari debug_01_original.png):
  (a) screenshot diambil 0,3 dtk setelah Esc -> layar hasil belum tampil; (b) area potong dihitung dari posisi jendela (left+12, top+160, ...)
  yang hanya cocok untuk laptop pembuat (skala layar 100%) -> di laptop ini potongan melebar ke jendela lain.
  PERBAIKAN (server.py, cadangan asli: server.py.sebelum_uji.bak): proses dibuat DPI-aware; tunggu 2 dtk; yang dipotret hanya isi jendela DOSBox-X,
  dinormalkan ke 720x400 (layar DOS 80x25), dipotong dengan bingkai setara potongan asli; bila tak ada skor terbaca -> server melapor GAGAL (tidak simpan {}).
  Algoritma OCR & perbaikan angka (repair) TIDAK diubah.
- Percobaan 3 (K01, potongan 640x400 sementara): angka terbaca tapi banyak meleset (layar DOS ternyata 720x400, bukan 640x400).
  Gambar layar hasil DOS asli tersimpan: screenshot/K01_WEB_layar_hasil_DOS_percobaan2.png
- Uji OCR offline pada gambar layar itu dengan bingkai baru (-8,97,763,384 @720x400): 21 dari 25 skala terbaca benar; 4 salah konsisten di semua variasi bingkai:
  F T=124 dipotong jadi 24 (aturan server.py "T>120 pasti salah baca" -> keliru, MMPI.EXE memang menampilkan T>120),
  K T=19 terbaca 193 lalu dipotong jadi 93, skala 7 raw=39 terbaca 393, skala 9 T=90 terbaca 30.
- Percobaan 4 (antrean K01-K10, metode tesseract): aplikasi chat berada di depan. Perintah robot untuk memunculkan DOSBox-X DITOLAK Windows
  (pengaman anti-rebut-fokus), tetapi robot tetap mengetik -> nomor seri "MP-3980400" dan jawaban "+++..." TERKETIK DAN TERKIRIM ke kolom chat aplikasi lain.
  Gambar yang dipotret = isi aplikasi lain (arsip_layar/20261002_1610*.png). Skor tidak tersimpan (pengaman "tidak ada angka -> gagal" bekerja).
  TEMUAN KRITIS: robot asli tidak pernah memeriksa jendela aktif sebelum mengetik -> bisa mengetik ke aplikasi apa pun.
  PERBAIKAN: server.py kini mencari jendela DOSBox-X dari PID prosesnya sendiri, memaksa ke depan (AttachThreadInput), dan memeriksa
  jendela aktif sebelum SETIAP tombol / setiap 25 karakter. Bila bukan DOSBox-X -> berhenti tanpa mengetik dan melapor gagal.

### HASIL PENILAIAN LEWAT WEB (10 kasus)
- Fase SEBELUM (OCR Tesseract asli + perbaikan potret & pengaman fokus), 16:18-16:25 WIB: semua 10 kasus tersimpan. Gambar layar: screenshot/Kxx_SEBELUM_layar_hasil_DOS.png
  Dibanding angka di layar DOS: 185 dari 250 angka-skala benar (74%). Pola salah: F T=124 selalu jadi 24; satu angka hilang -> semua skala di bawahnya bergeser satu baris (K05, K06, K09);
  "29" jadi "293", "39" jadi "393", "9" jadi "3", "90" jadi "30", "98" jadi "38"; skala riset K04 bergeser (A tersimpan 33102).
- Fase SESUDAH (pembaca grid baru, metode_baca=grid), 16:27-16:33 WIB: 250 dari 250 benar (100%). Gambar: screenshot/Kxx_SESUDAH_layar_hasil_DOS.png
- Kebenaran angka layar DOS diperiksa VISUAL oleh penguji untuk ke-10 gambar (lembar cek: screenshot/cek_visual_*.png): semuanya cocok.
- Layar hasil DOS run SEBELUM dan SESUDAH identik untuk tiap kasus (MMPI.EXE deterministik; input sama -> hasil sama).
- Bukti logika MMPI: K05 vs K06 (jumlah "Ya" sama = 283) skor mentahnya berbeda; K07 (Pria) vs K10 (Wanita) jawaban sama -> skor mentah sama, skor T berbeda (norma gender).

### VERIFIKASI INPUT (tambahan): baca 566 tanda +/- di layar isian MMPI.EXE sebelum Esc
- Urutan sel di layar dipastikan per KOLOM (38 kolom x 15 baris) dari kasus K05 (selang-seling): 0 beda.
- Putaran FINAL pertama (16:52-16:59): K01, K04, K05, K08, K10 lolos verifikasi & tersimpan. K02, K03, K06, K07, K09 DITOLAK (tidak disimpan):
  penyebabnya bukan salah ketik, tetapi sel butir 1 adalah posisi KURSOR yang BERKEDIP -> tanda di sel itu kadang tak terlihat saat dipotret (terbaca '?').
  Butir 2..566 di kelima kasus itu semuanya cocok. Pengaman bekerja benar (lebih baik menolak daripada menyimpan yang meragukan).
  PERBAIKAN: potret layar isian diulang (maks. 4x, jeda 0,35 dtk) dan digabung sampai 566 tanda terbaca; modul baca_layar di-reload tiap proses.

- Putaran final ulang untuk K02, K03, K06, K07, K09 (setelah perbaikan kursor berkedip), lewat endpoint backend /api/process-test
  (antrean lama untuk ID-ID ini tersangkut berstatus 'processing' karena start DOSBox sempat gagal saat fokus jendela terganggu): kelimanya LOLOS verifikasi input & tersimpan.
- FINAL (10 kasus, pembaca grid + verifikasi input + pengaman fokus): 250/250 angka cocok dengan layar DOS. Hasil: hasil/web_final/.

### FASE 2 - DOS manual (pembanding independen, jawaban diambil dari file kasus, BUKAN dari website)
- K01 (Pria, semua Ya) & K04 (Wanita, semua Tidak): jawaban diketik lewat kontrol layar (remote); Esc lewat endpoint bantu; layar dipotret dengan menu Capture DOSBox-X.
- K07 (Pria, acak): lewat saluran perintah khusus pengujian karena izin browser terus tertolak.
- Ketiganya: 566/566 tanda di layar isian sama dengan kunci; 25/25 skala sama dengan hasil web FINAL. Rincian: hasil/dos_manual.json
- Catatan alat: kontrol layar (remote) tidak bisa mengirim tombol Esc; izin browser alat uji ke 127.0.0.1 diminta ulang tiap aksi.
- Saluran perintah khusus pengujian dihapus dari kode setelah pengujian.
