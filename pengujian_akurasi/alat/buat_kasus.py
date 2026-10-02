"""
buat_kasus.py - membuat kasus uji (set jawaban) untuk uji akurasi Web vs DOS.

Jalankan dari folder pengujian_akurasi:
    python alat/buat_kasus.py

Hasil (folder kasus/):
    K01.json ...           -> data kasus (jawaban T/F, gender, jalur)
    K01_log_jawaban.csv    -> "soal nomor N dijawab Ya/Tidak" lengkap 566 baris
                              (hanya bila soal_asli.txt tersedia; teks soal MMPI berlisensi, TIDAK disertakan di repo)
    K01_dos.txt            -> 566 karakter + / - (urutan butir asli) untuk diketik ke DOS
Deterministik: dijalankan berkali-kali hasilnya selalu sama.
Hanya pakai library bawaan Python.
"""
import csv
import json
import os
import random

DASAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE_SOAL = os.path.join(os.path.dirname(DASAR), "soal_asli.txt")
FOLDER_KASUS = os.path.join(DASAR, "kasus")
N = 566


def baca_soal():
    if not os.path.exists(FILE_SOAL):
        return None
    with open(FILE_SOAL, encoding="utf-8") as f:
        soal = [s.strip() for s in f.read().splitlines() if s.strip()]
    assert len(soal) == N, f"soal_asli.txt harus 566 baris, ditemukan {len(soal)}"
    return soal


# Butir ulangan MMPI (teksnya identik), sebagai nomor butir (indeks 1). Dipakai bila soal_asli.txt tidak ada.
KEMBAR_TETAP = [[13, 290], [16, 315], [21, 308], [22, 326], [23, 288], [24, 333], [33, 323], [35, 331],
                [37, 302], [38, 311], [317, 362]]


def kembar(soal):
    """Kelompok butir yang teksnya persis sama (MMPI memang punya butir ulangan)."""
    if soal is None:
        return [[n - 1 for n in g] for g in KEMBAR_TETAP]
    peta = {}
    for i, s in enumerate(soal):
        peta.setdefault(s, []).append(i)
    return [g for g in peta.values() if len(g) > 1]


def acak(seed):
    r = random.Random(seed)
    return [r.random() < 0.5 for _ in range(N)]


def buat_semua(soal):
    k07 = acak(7)
    k09 = acak(9)
    # K09 dikerjakan lewat UI dengan soal teracak: agen mencocokkan butir dari TEKS-nya,
    # jadi butir kembar dibuat berjawaban sama supaya tidak ambigu.
    for g in kembar(soal):
        for i in g[1:]:
            k09[i] = k09[g[0]]
    ganjil_ya = [(i + 1) % 2 == 1 for i in range(N)]
    return [
        ("K01", "Pria", [True] * N, "api", "Semua dijawab Ya"),
        ("K02", "Pria", [False] * N, "api", "Semua dijawab Tidak"),
        ("K03", "Wanita", [True] * N, "api", "Semua dijawab Ya"),
        ("K04", "Wanita", [False] * N, "api", "Semua dijawab Tidak"),
        ("K05", "Pria", ganjil_ya, "api", "Selang-seling: nomor ganjil Ya, genap Tidak"),
        ("K06", "Pria", [not x for x in ganjil_ya], "api",
         "Kebalikan K05: nomor ganjil Tidak, genap Ya (jumlah Ya sama dengan K05)"),
        ("K07", "Pria", k07, "api", "Acak (seed 7)"),
        ("K08", "Wanita", acak(8), "api", "Acak (seed 8)"),
        ("K09", "Wanita", k09, "ui-acak",
         "Acak (seed 9), butir kembar dibuat sama; DIKERJAKAN LEWAT LAYAR PESERTA dengan acak soal AKTIF"),
        ("K10", "Wanita", list(k07), "api", "Jawaban PERSIS sama dengan K07 tetapi Wanita (uji pengaruh norma gender)"),
    ]


def main():
    soal = baca_soal()
    os.makedirs(FOLDER_KASUS, exist_ok=True)
    daftar = []
    for kid, gender, jaw, jalur, desk in buat_semua(soal):
        data = {
            "id": kid,
            "nama_peserta": f"UJI {kid}",
            "gender": gender,                       # nilai di web (Data Diri)
            "gender_api": "Female" if gender == "Wanita" else "Male",
            "tombol_gender_dos": "P" if gender == "Wanita" else "L",
            "jalur_web": jalur,                     # api = diisi skrip; ui-acak = diisi lewat layar peserta
            "deskripsi": desk,
            "jumlah_ya": sum(jaw),
            "jumlah_tidak": N - sum(jaw),
            "jawaban": "".join("T" if x else "F" for x in jaw),   # T = Ya, F = Tidak; indeks 0 = butir 1
        }
        with open(os.path.join(FOLDER_KASUS, f"{kid}.json"), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        with open(os.path.join(FOLDER_KASUS, f"{kid}_dos.txt"), "w", encoding="ascii") as f:
            f.write("".join("+" if x else "-" for x in jaw))
        if soal is None:
            daftar.append({k: data[k] for k in ("id", "gender", "jalur_web", "jumlah_ya", "deskripsi")})
            print(f"{kid}  {gender:6}  Ya={data['jumlah_ya']:3}  jalur={jalur:8}  {desk}  (tanpa log teks soal)")
            continue
        with open(os.path.join(FOLDER_KASUS, f"{kid}_log_jawaban.csv"), "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(["no_butir", "pernyataan", "jawaban", "kode_web", "tombol_dos"])
            for i, (s, x) in enumerate(zip(soal, jaw), 1):
                w.writerow([i, s, "Ya" if x else "Tidak", "T" if x else "F", "+" if x else "-"])
        daftar.append({k: data[k] for k in ("id", "gender", "jalur_web", "jumlah_ya", "deskripsi")})
        print(f"{kid}  {gender:6}  Ya={data['jumlah_ya']:3}  jalur={jalur:8}  {desk}")
    with open(os.path.join(FOLDER_KASUS, "daftar_kasus.json"), "w", encoding="utf-8") as f:
        json.dump(daftar, f, ensure_ascii=False, indent=1)
    print(f"\n{len(daftar)} kasus dibuat di {FOLDER_KASUS}")


if __name__ == "__main__":
    main()
