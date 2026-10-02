"""
dbf.py - membaca hasil yang DISIMPAN SENDIRI oleh MMPI.EXE (file .DBF), tanpa OCR.

Setiap kali MMPI.EXE selesai menilai satu tes (baik dijalankan oleh server web maupun manual),
program DOS itu menambah 1 baris di IDT.DBF, JAWABAN.DBF, KLINIS.DBF, dan RISET.DBF.
Baris-baris itulah "jawaban resmi" DOS: jawaban yang benar-benar diterima DOS + skor yang dihitungnya.

PRIVASI: file DBF berisi data orang sungguhan dari pemakaian lama. Skrip ini HANYA membaca
baris BARU (setelah titik awal) dan dari IDT hanya kolom ID & SEX. Jangan menyalin file DBF ke mana pun.

Pemakaian (dari folder pengujian_akurasi):
  python alat/dbf.py awal              -> catat jumlah baris sekarang sebagai titik awal (WAJIB sebelum uji)
  python alat/dbf.py status            -> lihat jumlah baris & berapa baris baru sejak titik awal
  python alat/dbf.py catat --fase WEB  -> ambil semua baris baru, cocokkan otomatis ke kasus (dari jawaban+gender),
                                          simpan ke hasil/dbf/Kxx_WEB.json, lalu majukan titik awal
  python alat/dbf.py catat --fase DOS  -> sama, untuk fase DOS manual (hasil/dbf/Kxx_DOS.json)
Opsi: --folder "C:\\...\\MMPI2007" kalau lokasi folder DOS berbeda.
"""
import argparse
import hashlib
import json
import os
import struct

DASAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOLDER_DEFAULT = os.path.join(os.path.dirname(DASAR), "server", "vDosMMPI", "MMPI2007")
F_STATE = os.path.join(DASAR, "hasil", "dbf", "titik_awal.json")
FILES = ["IDT", "JAWABAN", "KLINIS", "RISET"]
KLINIS = [("L", "L"), ("F", "F"), ("K", "K"), ("1 (Hs)", "1"), ("2 (D)", "2"), ("3 (Hy)", "3"),
          ("4 (Pd)", "4"), ("5 (Mf)", "5"), ("6 (Pa)", "6"), ("7 (Pt)", "7"), ("8 (Sc)", "8"),
          ("9 (Ma)", "9"), ("0 (Si)", "0")]
KOREKSI_K = {"1": "1", "4": "4", "7": "7", "8": "8", "9": "9"}
RISET = [("A", "A"), ("R", "R"), ("Mas", "M"), ("Es", "S"), ("Lb", "B"), ("Ca", "C"),
         ("Dy", "Y"), ("Do", "D"), ("Re", "E"), ("Pr", "P"), ("St", "T"), ("Cn", "N")]


def baca_dbf(path, kolom=None):
    """Membaca SEMUA rekaman fisik di file (termasuk yang tertulis tetapi belum tercatat di header,
    misalnya karena DOSBox dimatikan paksa)."""
    with open(path, "rb") as f:
        b = f.read()
    n_header, hl, rl = struct.unpack("<IHH", b[4:12])
    n = max(n_header, (len(b) - hl) // rl)
    fields, i = [], 32
    while b[i] != 0x0D:
        fields.append((b[i:i + 11].split(b"\0")[0].decode(), b[i + 16]))
        i += 32
    rows = []
    for r in range(n):
        raw = b[hl + r * rl: hl + (r + 1) * rl]
        if len(raw) < rl or raw[:1] == b"\x1a":
            break
        d, pos = {"_hapus": raw[:1] == b"*", "_baris": r, "_sidik": hashlib.md5(raw).hexdigest()[:12]}, 1
        for nm, ln in fields:
            if kolom is None or nm in kolom:
                d[nm] = raw[pos:pos + ln].decode("latin1").strip()
            pos += ln
        rows.append(d)
    return n_header, rows


def sidik(folder):
    """Sidik jari (hash) tiap rekaman, untuk mendeteksi rekaman baru ATAU rekaman yang ditimpa."""
    return {f: [r["_sidik"] for r in baca_dbf(os.path.join(folder, f + ".DBF"), kolom=set())[1]] for f in FILES}


def angka(s):
    try:
        return int(s)
    except (TypeError, ValueError):
        return None


def kasus_semua():
    with open(os.path.join(DASAR, "kasus", "daftar_kasus.json"), encoding="utf-8") as f:
        ids = [k["id"] for k in json.load(f)]
    out = {}
    for k in ids:
        with open(os.path.join(DASAR, "kasus", f"{k}.json"), encoding="utf-8") as f:
            out[k] = json.load(f)
    return out


def cmd_awal(a):
    os.makedirs(os.path.dirname(F_STATE), exist_ok=True)
    c = sidik(a.folder)
    with open(F_STATE, "w") as f:
        json.dump(c, f)
    print("Titik awal dicatat. Jumlah rekaman:", {k: len(v) for k, v in c.items()})


def berubah(lama, baru):
    return [i for i, h in enumerate(baru) if i >= len(lama) or lama[i] != h]


def cmd_status(a):
    c = sidik(a.folder)
    print("Jumlah rekaman sekarang:", {k: len(v) for k, v in c.items()})
    if os.path.exists(F_STATE):
        awal = json.load(open(F_STATE))
        print("Rekaman baru/berubah sejak titik awal:", {k: len(berubah(awal[k], c[k])) for k in c})
    else:
        print("Titik awal belum dicatat. Jalankan: python alat/dbf.py awal")


def cmd_catat(a):
    if not os.path.exists(F_STATE):
        raise SystemExit("Titik awal belum dicatat. Jalankan dulu: python alat/dbf.py awal")
    awal = json.load(open(F_STATE))
    data = {}
    for f in FILES:
        kol = {"ID", "SEX"} if f == "IDT" else None
        semua_baris = baca_dbf(os.path.join(a.folder, f + ".DBF"), kolom=kol)[1]
        idx = berubah(awal[f], [r["_sidik"] for r in semua_baris])
        data[f] = [semua_baris[i] for i in idx]
    jml = {f: len(v) for f, v in data.items()}
    print("Baris baru:", jml)
    if len(set(jml.values())) != 1:
        print("PERINGATAN: jumlah baris baru tidak sama di semua file. Dipasangkan menurut urutan dari belakang.")
    n = min(jml.values())
    if n == 0:
        print("Tidak ada baris baru. Apakah MMPI.EXE sudah menyimpan hasilnya (sudah keluar dari layar hasil)?")
        return
    for f in FILES:
        data[f] = data[f][-n:]
    semua = kasus_semua()
    out_dir = os.path.dirname(F_STATE)
    for i in range(n):
        idt, jw, kl, rs = data["IDT"][i], data["JAWABAN"][i], data["KLINIS"][i], data["RISET"][i]
        ans = "".join({"+": "T", "-": "F"}.get(jw.get(f"P{j}", ""), "?") for j in range(1, 567))
        sex = idt.get("SEX", "")
        # cocokkan ke kasus: jarak Hamming terkecil, gender harus sama
        kandidat = []
        for k, kas in semua.items():
            beda = sum(1 for x, y in zip(ans, kas["jawaban"]) if x != y)
            gender_ok = (sex.upper() == kas["tombol_gender_dos"]) if sex else True
            kandidat.append((not gender_ok, beda, k))
        kandidat.sort()
        _, beda, k = kandidat[0]
        klinis = {}
        for nama, s in KLINIS:
            klinis[nama] = {"raw": angka(kl.get("S" + s)), "t": angka(kl.get("T" + s)),
                            "raw_plus_k": angka(kl.get("B" + s)) if s in KOREKSI_K else None,
                            "tambahan_k": angka(kl.get("K" + s)) if s in KOREKSI_K else None}
        riset = {nama: {"raw": angka(rs.get("S" + s)), "t": angka(rs.get("T" + s))} for nama, s in RISET}
        hasil = {
            "kasus": k, "fase": a.fase, "baris_dbf": jw["_baris"], "id_di_dos": jw.get("ID", ""),
            "sex_di_dos": sex, "jawaban_diterima_dos": ans,
            "beda_dengan_kunci": beda,
            "butir_beda": [j + 1 for j, (x, y) in enumerate(zip(ans, semua[k]["jawaban"])) if x != y][:50],
            "tidak_dijawab_tanda_tanya": angka(kl.get("SO")),
            "klinis": klinis, "riset": riset,
        }
        path = os.path.join(out_dir, f"{k}_{a.fase}.json")
        if os.path.exists(path):
            print(f"  (menimpa {os.path.basename(path)} - kasus {k} fase {a.fase} dijalankan ulang)")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(hasil, f, ensure_ascii=False, indent=1)
        ringkas = " ".join(f"{n.split(' ')[0]}={v['raw']}/{v['t']}" for n, v in klinis.items())
        status = "COCOK" if beda == 0 else f"BEDA {beda} butir"
        print(f"  baris {jw['_baris']}: -> {k} (sex {sex or '?'}) jawaban vs kunci: {status} | {ringkas}")
    with open(F_STATE, "w") as f:
        json.dump(sidik(a.folder), f)
    print("Titik awal dimajukan.")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--folder", default=FOLDER_DEFAULT)
    sp = p.add_subparsers(dest="cmd", required=True)
    sp.add_parser("awal"); sp.add_parser("status")
    c = sp.add_parser("catat"); c.add_argument("--fase", required=True, choices=["WEB", "DOS"])
    a = p.parse_args()
    {"awal": cmd_awal, "status": cmd_status, "catat": cmd_catat}[a.cmd](a)


if __name__ == "__main__":
    main()
