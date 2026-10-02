"""
jawab_k09.py - pembantu untuk kasus K09 (diisi lewat LAYAR PESERTA dengan soal TERACAK).

Karena urutan soal di layar diacak, nomor di layar BUKAN nomor butir asli.
Salin teks pernyataan yang tampil di layar, lalu tanyakan ke skrip ini jawabannya:

  python alat/jawab_k09.py 1 "<teks pernyataan di layar>"
        -> 1 = nomor urut di layar (1..566), lalu teks persis seperti di layar
  Output: "Layar #1 = butir asli 1 -> klik YA"
  Setiap pemanggilan otomatis dicatat ke hasil/web/K09_log_ui.csv
  (urutan_layar, no_butir_asli, pernyataan, jawaban) = bukti "soal A dijawab B".

  python alat/jawab_k09.py --cek     -> memeriksa log: ada berapa butir, ada yang dobel/terlewat?
"""
import csv
import difflib
import json
import os
import sys

DASAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOAL = [s.strip() for s in open(os.path.join(os.path.dirname(DASAR), "soal_asli.txt"), encoding="utf-8").read().splitlines() if s.strip()]
KUNCI = json.load(open(os.path.join(DASAR, "kasus", "K09.json"), encoding="utf-8"))["jawaban"]
LOG = os.path.join(DASAR, "hasil", "web", "K09_log_ui.csv")


def norm(s):
    return " ".join(s.lower().replace("’", "'").replace("“", '"').replace("”", '"').split())


NORM = [norm(s) for s in SOAL]


def cari(teks):
    t = norm(teks)
    idx = [i for i, s in enumerate(NORM) if s == t]
    if idx:
        return idx, "persis"
    best = difflib.get_close_matches(t, NORM, n=1, cutoff=0.85)
    if best:
        return [i for i, s in enumerate(NORM) if s == best[0]], "mirip"
    return [], "tidak ditemukan"


def cek():
    if not os.path.exists(LOG):
        sys.exit("Belum ada log.")
    rows = list(csv.DictReader(open(LOG, encoding="utf-8-sig")))
    layar = [int(r["urutan_layar"]) for r in rows]
    asli = [int(x) for r in rows if r["no_butir_asli"] for x in r["no_butir_asli"].split("/")]
    print(f"Baris log: {len(rows)} | urutan layar unik: {len(set(layar))} | butir asli unik: {len(set(asli))}")
    kurang = sorted(set(range(1, 567)) - set(layar))
    print("Urutan layar yang belum tercatat:", kurang[:40], "..." if len(kurang) > 40 else "")


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "--cek":
        return cek()
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    urut, teks = int(sys.argv[1]), " ".join(sys.argv[2:])
    idx, cara = cari(teks)
    if not idx:
        print(f"TIDAK DITEMUKAN: '{teks}'. Periksa ketikan, atau catat manual & laporkan.")
        no, jaw = "", ""
    else:
        jaw_set = {KUNCI[i] for i in idx}
        assert len(jaw_set) == 1, "butir kembar berjawaban beda (tidak seharusnya terjadi)"
        jaw = "Ya" if jaw_set.pop() == "T" else "Tidak"
        no = "/".join(str(i + 1) for i in idx)
        catatan = f" (teks kembar: butir {no})" if len(idx) > 1 else ""
        print(f"Layar #{urut} = butir asli {no} -> klik {jaw.upper()}  [{cara}]{catatan}")
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    baru = not os.path.exists(LOG)
    with open(LOG, "a", encoding="utf-8-sig" if baru else "utf-8", newline="") as f:
        w = csv.writer(f)
        if baru:
            w.writerow(["urutan_layar", "no_butir_asli", "pernyataan", "jawaban"])
        w.writerow([urut, no, teks, jaw])


if __name__ == "__main__":
    main()
