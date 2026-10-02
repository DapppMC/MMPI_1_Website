"""
buat_sql_soal.py - membuat file SQL untuk memasang 566 pernyataan MMPI asli ke tabel `soal`.

Teks soal MMPI berlisensi, jadi TIDAK disimpan di repositori ini.
Siapkan sendiri file teks berisi 566 baris (baris ke-N = butir nomor N), lalu:

    python scripts/buat_sql_soal.py path/ke/soal_asli.txt > 03_soal_asli.sql
    docker compose exec -T db psql -U myuser -d mmpi_db < 03_soal_asli.sql        (cmd / bash)

soal_id = nomor butir asli MMPI (1..566). Urutan JANGAN diubah: MMPI.EXE menilai berdasarkan nomor butir.
File 03_soal_asli.sql dan soal_asli.txt sudah masuk .gitignore.
"""
import sys

if len(sys.argv) != 2:
    sys.exit(__doc__)
items = [s.strip() for s in open(sys.argv[1], encoding="utf-8").read().splitlines() if s.strip()]
if len(items) != 566:
    sys.exit(f"Harus 566 baris, ditemukan {len(items)}")
rows = ",\n".join("({},'{}')".format(i, t.replace("'", "''")) for i, t in enumerate(items, 1))
print("BEGIN;\nDELETE FROM public.soal;\nINSERT INTO public.soal (soal_id, soal) VALUES\n" + rows + ";")
print("SELECT setval('public.soal_soal_id_seq', 566, true);\nCOMMIT;")
print("SELECT count(*) AS jumlah_soal FROM public.soal;")
