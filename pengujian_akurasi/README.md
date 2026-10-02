# Uji Akurasi: Website vs MMPI.EXE

Membuktikan apakah skor yang tersimpan di website sama dengan skor yang dihitung MMPI.EXE asli.
Laporan: [`Laporan_Uji_Akurasi_MMPI_Web_vs_DOS.pdf`](Laporan_Uji_Akurasi_MMPI_Web_vs_DOS.pdf).

## Isi

| Path | Isi |
|---|---|
| `kasus/` | 10 kasus uji (K01–K10): `Kxx.json` (kunci T/F, gender) dan `Kxx_dos.txt` (566 tanda +/-) |
| `alat/buat_kasus.py` | Membuat ulang kasus (deterministik). Log teks soal hanya dibuat bila `soal_asli.txt` lokal tersedia |
| `alat/web.py` | Membuat akun uji, mengirim jawaban seperti tombol "Selesai", mengecek jawaban tersimpan, mengambil skor |
| `alat/ketik_ke_dos.py` | Mengetik 566 jawaban ke jendela MMPI di DOSBox |
| `alat/jawab_k09.py` | Pembantu kasus soal teracak (butuh `soal_asli.txt` lokal) |
| `alat/dbf.py` | Membaca baris BARU di file .DBF MMPI.EXE (tidak membuka data lama) |
| `alat/bandingkan.py` | Menyusun tabel perbandingan |
| `hasil/web_sebelum/` | Skor tersimpan dengan pembaca Tesseract asli |
| `hasil/web_sesudah/`, `hasil/web_final/` | Skor tersimpan dengan pembaca grid (final = + verifikasi input) |
| `hasil/layar_dos_dari_gambar_sebelum.json` | Angka di layar hasil MMPI.EXE (diperiksa visual) |
| `hasil/dos_manual.json` | Pembanding MMPI.EXE tanpa website (K01, K04, K07) |
| `hasil/screenshot/` | Gambar layar hasil/isian MMPI.EXE tiap penilaian + lembar cek visual |
| `hasil/catatan_langkah.md` | Kronologi seluruh percobaan, termasuk yang gagal |

## Ringkasan hasil

| Fase | Skala benar (dari 250) |
|---|---|
| Kode asli di laptop lain | 0 (skor kosong tersimpan sebagai sukses) |
| Pembaca Tesseract asli, potret dibetulkan | 185 (74%) |
| Pembaca grid + verifikasi input + pengaman fokus | 250 (100%) |

Keterbatasan: diuji di satu laptop Windows; ketahanan skala layar lain disimulasikan dengan memperbesar gambar (1,25×–3×).
