"""[PERBAIKAN AKURASI] Pembaca layar hasil MMPI.EXE berbasis grid karakter DOS (80x25, sel 9x16) + pencocokan pola huruf.
Tidak memakai Tesseract. Deterministik."""
import numpy as np
from PIL import Image

KOLOM = {"raw": (6, 10), "kcorr": (11, 14), "total": (15, 20), "t": (22, 27)}   # [c0, c1] inklusif
BARIS_KLINIS = {"L": 6, "F": 7, "K": 8, "1 (Hs)": 10, "2 (D)": 11, "3 (Hy)": 12, "4 (Pd)": 13, "5 (Mf)": 14,
                "6 (Pa)": 15, "7 (Pt)": 16, "8 (Sc)": 17, "9 (Ma)": 18, "0 (Si)": 19}
BARIS_TANYA = 5
BARIS_RISET = 23
RISET = ["A", "R", "Mas", "Es", "Lb", "Ca", "Dy", "Do", "Re", "Pr", "St", "Cn"]

def ke_720(img):
    img = img.convert("RGB")
    if img.size != (720, 400):
        img = img.resize((720, 400), Image.LANCZOS)
    return np.asarray(img).astype(np.int16)

def sel_bit(a, r, c):
    cell = a[r*16:(r+1)*16, c*9:(c+1)*9]
    fg = np.maximum(cell[:, :, 0], cell[:, :, 1]) > 110     # teks hijau/putih/kuning; garis biru diabaikan
    return fg

def baca_sel(a, r, c, pola, maks_beda=18, selisih_min=3):
    b = sel_bit(a, r, c)
    if b.sum() < 4:
        return " ", 0
    jarak = sorted((int((b != t).sum()), ch) for ch, t in pola.items())
    (d, best), (d2, _) = jarak[0], jarak[1]
    # Gagal dengan jelas (bukan menebak) kalau bentuk huruf tidak cocok atau ragu-ragu
    if d > maks_beda or d2 - d < selisih_min:
        raise ValueError(f"karakter tak dikenal/ragu di baris {r} kolom {c} (beda {d}, pesaing {d2})")
    return best, d

def baca_rentang(a, r, c0, c1, pola):
    s = "".join(baca_sel(a, r, c, pola)[0] for c in range(c0, c1 + 1)).strip()
    if not s:
        return None
    if not s.isdigit():
        raise ValueError(f"teks bukan angka di baris {r} kolom {c0}-{c1}: {s!r}")
    return int(s)

def baca_hasil(img, pola):
    a = ke_720(img)
    out = {}
    for nama, r in BARIS_KLINIS.items():
        raw = baca_rentang(a, r, *KOLOM["raw"], pola)
        t = baca_rentang(a, r, *KOLOM["t"], pola)
        if raw is None or t is None:
            raise ValueError(f"skala {nama}: angka tidak lengkap (raw={raw}, t={t})")
        out[nama] = {"raw": raw, "t": t}
        k = baca_rentang(a, r, *KOLOM["kcorr"], pola); tot = baca_rentang(a, r, *KOLOM["total"], pola)
        if k is not None or tot is not None:
            out[nama]["koreksi_k"] = k; out[nama]["total"] = tot
    out["?"] = baca_rentang(a, BARIS_TANYA, *KOLOM["raw"], pola)
    # skala riset: token angka di baris 23, kolom 17..79
    teks = "".join(baca_sel(a, BARIS_RISET, c, pola)[0] for c in range(17, 79))
    nilai = [int(x) for x in teks.split()]
    if len(nilai) != 12:
        raise ValueError(f"skala riset terbaca {len(nilai)} angka, seharusnya 12: {teks!r}")
    out.update(dict(zip(RISET, nilai)))
    return out

def muat_pola(path):
    z = np.load(path)
    return {k[1:]: z[k] for k in z.files}

def latih_pola(img, kebenaran):
    """kebenaran: dict baris -> {kolom_awal: 'teks'}; ambil bitmap tiap digit."""
    a = ke_720(img); pola = {}
    for r, isian in kebenaran.items():
        for c0, teks in isian.items():
            for i, ch in enumerate(teks):
                b = sel_bit(a, r, c0 + i)
                if ch in pola and (pola[ch] != b).sum() > 2:
                    raise ValueError(f"pola {ch} tidak konsisten")
                pola.setdefault(ch, b)
    return pola


# ---------------------------------------------------------------------------
# [PERBAIKAN AKURASI] Verifikasi INPUT: membaca 566 jawaban yang tampil di layar isian MMPI.EXE
# (38 kolom x 15 baris sel, kolom karakter 3,5,...,77, baris karakter 6..20) sebelum Esc ditekan.
GRID_KOLOM = list(range(3, 78, 2))
GRID_BARIS = list(range(6, 21))

def _tanda_sel(a, r, c):
    cell = a[r*16:(r+1)*16, c*9:(c+1)*9].reshape(-1, 3)
    warna, jumlah = np.unique(cell, axis=0, return_counts=True)
    latar = warna[jumlah.argmax()]
    if latar.max() < 60:                      # sel hitam = belum ada butir / kosong
        return "?"
    beda = (np.abs(cell - latar).sum(axis=1) > 120).reshape(16, 9)
    if beda.sum() < 3:
        return "?"                            # sel berwarna tapi tanpa tanda = belum dijawab
    ys, xs = np.nonzero(beda)
    tinggi = ys.max() - ys.min() + 1
    return "+" if tinggi >= 4 else "-"

def baca_jawaban(img, urutan="kolom"):
    a = ke_720(img)
    sel = []
    if urutan == "kolom":
        for c in GRID_KOLOM:
            for r in GRID_BARIS:
                sel.append(_tanda_sel(a, r, c))
    else:
        for r in GRID_BARIS:
            for c in GRID_KOLOM:
                sel.append(_tanda_sel(a, r, c))
    return "".join(sel[:566])
