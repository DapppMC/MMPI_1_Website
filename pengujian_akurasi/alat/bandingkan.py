"""
bandingkan.py - menyusun perbandingan akhir WEB vs DOS dari semua hasil yang terkumpul.

  python alat/bandingkan.py template   -> membuat hasil/transkrip_layar.csv (kosong) untuk diisi
                                          angka yang TERLIHAT di layar DOS & di layar web
  python alat/bandingkan.py            -> membuat:
        hasil/perbandingan_detail.csv  (1 baris = 1 kasus x 1 skala)
        hasil/ringkasan.json           (angka ringkasan untuk laporan PDF)
        hasil/RINGKASAN.md             (ringkasan yang bisa dibaca manusia)

Sumber yang dipakai (yang tidak ada dilewati):
  hasil/web/Kxx_hasil.json        skor yang disimpan web (hasil OCR server)          -> "web"
  hasil/web/Kxx_cek_jawaban.json  jawaban yang tersimpan di database web
  hasil/dbf/Kxx_WEB.json          skor yang DIHITUNG DOS saat dijalankan oleh web     -> "dos_saat_web"
  hasil/dbf/Kxx_DOS.json          skor DOS saat dijalankan MANUAL (pembanding utama)  -> "dos"
  hasil/transkrip_layar.csv       angka yang dibaca agen dari layar (DOS_LAYAR / WEB_LAYAR)
"""
import csv
import json
import os
import sys

DASAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = os.path.join(DASAR, "hasil")
KLINIS = ["L", "F", "K", "1 (Hs)", "2 (D)", "3 (Hy)", "4 (Pd)", "5 (Mf)", "6 (Pa)", "7 (Pt)",
          "8 (Sc)", "9 (Ma)", "0 (Si)"]
RISET = ["A", "R", "Mas", "Es", "Lb", "Ca", "Dy", "Do", "Re", "Pr", "St", "Cn"]


def muat(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def kasus_semua():
    daftar = muat(os.path.join(DASAR, "kasus", "daftar_kasus.json"))
    return {k["id"]: muat(os.path.join(DASAR, "kasus", f"{k['id']}.json")) for k in daftar}


def int_or_none(x):
    try:
        return int(str(x).strip())
    except (TypeError, ValueError):
        return None


def template():
    path = os.path.join(H, "transkrip_layar.csv")
    if os.path.exists(path):
        sys.exit(f"{path} sudah ada, tidak ditimpa.")
    os.makedirs(H, exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["kasus", "sumber", "skala", "raw", "t", "catatan"])
        for k in kasus_semua():
            for sumber in ("DOS_LAYAR", "WEB_LAYAR"):
                for s in KLINIS + RISET:
                    w.writerow([k, sumber, s, "", "", ""])
    print("Template dibuat:", path)


def baca_transkrip():
    path = os.path.join(H, "transkrip_layar.csv")
    out = {}
    if not os.path.exists(path):
        return out
    with open(path, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            out[(r["kasus"], r["sumber"], r["skala"])] = (int_or_none(r["raw"]), int_or_none(r["t"]))
    return out


def ambil_web(web, s):
    if not web or not web.get("skor"):
        return None, None
    v = web["skor"].get(s)
    if isinstance(v, dict):
        return int_or_none(v.get("raw")), int_or_none(v.get("t"))
    return int_or_none(v), None          # skala riset di web hanya 1 angka (raw)


def ambil_dbf(d, s):
    if not d:
        return None, None
    v = (d.get("klinis") or {}).get(s) or (d.get("riset") or {}).get(s)
    return (v or {}).get("raw"), (v or {}).get("t")


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "template":
        return template()
    semua = kasus_semua()
    tr = baca_transkrip()
    baris, per_kasus = [], {}
    for k, kas in semua.items():
        web = muat(os.path.join(H, "web", f"{k}_hasil.json"))
        cek = muat(os.path.join(H, "web", f"{k}_cek_jawaban.json"))
        dw = muat(os.path.join(H, "dbf", f"{k}_WEB.json"))
        dd = muat(os.path.join(H, "dbf", f"{k}_DOS.json"))
        n_banding = n_cocok = 0
        beda_list = []
        for s in KLINIS + RISET:
            kel = "validitas" if s in ("L", "F", "K") else ("klinis" if s in KLINIS else "riset")
            w_raw, w_t = ambil_web(web, s)
            dw_raw, dw_t = ambil_dbf(dw, s)
            d_raw, d_t = ambil_dbf(dd, s)
            ld_raw, ld_t = tr.get((k, "DOS_LAYAR", s), (None, None))
            lw_raw, lw_t = tr.get((k, "WEB_LAYAR", s), (None, None))
            # pembanding DOS: DBF manual -> kalau tidak ada, angka layar DOS
            ref_raw = d_raw if d_raw is not None else ld_raw
            ref_t = d_t if d_t is not None else ld_t
            status, sebab = "BELUM LENGKAP", ""
            if w_raw is not None and ref_raw is not None:
                ok_raw = w_raw == ref_raw
                ok_t = True if kel == "riset" else (w_t == ref_t)
                n_banding += 1
                if ok_raw and ok_t:
                    status = "COCOK"
                    n_cocok += 1
                else:
                    status = "BEDA"
                    if dw_raw is not None and dw_raw == ref_raw and (kel == "riset" or dw_t == ref_t):
                        sebab = "DOS menghitung benar, web salah MEMBACA layar (OCR)"
                    elif dw_raw is not None:
                        sebab = "Input yang diterima DOS saat dijalankan web berbeda (jawaban/gender/ketikan)"
                    else:
                        sebab = "Belum diketahui (data DBF fase WEB tidak ada)"
                    beda_list.append(s)
            baris.append({
                "kasus": k, "gender": kas["gender"], "skala": s, "kelompok": kel,
                "web_raw": w_raw, "web_t": w_t,
                "dos_saat_web_raw": dw_raw, "dos_saat_web_t": dw_t,
                "dos_manual_raw": d_raw, "dos_manual_t": d_t,
                "layar_dos_raw": ld_raw, "layar_dos_t": ld_t,
                "layar_web_raw": lw_raw, "layar_web_t": lw_t,
                "status": status, "kemungkinan_sebab": sebab,
            })
        per_kasus[k] = {
            "gender": kas["gender"], "deskripsi": kas["deskripsi"], "jumlah_ya": kas["jumlah_ya"],
            "jalur_web": kas["jalur_web"],
            "jawaban_web_beda_dari_kunci": cek["jumlah_berbeda"] if cek else None,
            "jawaban_dos_saat_web_beda_dari_kunci": dw["beda_dengan_kunci"] if dw else None,
            "jawaban_dos_manual_beda_dari_kunci": dd["beda_dengan_kunci"] if dd else None,
            "skala_dibandingkan": n_banding, "skala_cocok": n_cocok, "skala_beda": beda_list,
        }
    os.makedirs(H, exist_ok=True)
    with open(os.path.join(H, "perbandingan_detail.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(baris[0].keys()))
        w.writeheader()
        w.writerows(baris)
    tot_b = sum(v["skala_dibandingkan"] for v in per_kasus.values())
    tot_c = sum(v["skala_cocok"] for v in per_kasus.values())

    # pembuktian: jumlah "Ya" sama tetapi skor berbeda (K05 vs K06), dan efek gender (K07 vs K10)
    def skor_ref(k):
        d = muat(os.path.join(H, "dbf", f"{k}_DOS.json")) or muat(os.path.join(H, "dbf", f"{k}_WEB.json"))
        return d
    bukti = {}
    a, b = skor_ref("K05"), skor_ref("K06")
    if a and b:
        bukti["K05_vs_K06_jumlah_ya_sama_skor_beda"] = {
            s: [a["klinis"][s]["raw"], b["klinis"][s]["raw"]] for s in KLINIS}
    a, b = skor_ref("K07"), skor_ref("K10")
    if a and b:
        bukti["K07_pria_vs_K10_wanita_jawaban_sama"] = {
            s: {"raw": [a["klinis"][s]["raw"], b["klinis"][s]["raw"]], "t": [a["klinis"][s]["t"], b["klinis"][s]["t"]]}
            for s in KLINIS}
    ringkas = {"total_skala_dibandingkan": tot_b, "total_cocok": tot_c,
               "persen_cocok": round(100 * tot_c / tot_b, 2) if tot_b else None,
               "per_kasus": per_kasus, "bukti": bukti}
    with open(os.path.join(H, "ringkasan.json"), "w", encoding="utf-8") as f:
        json.dump(ringkas, f, ensure_ascii=False, indent=1)

    L = ["# Ringkasan Uji Akurasi Web vs DOS", "",
         f"Skala dibandingkan: **{tot_b}**, cocok: **{tot_c}**"
         + (f" (**{ringkas['persen_cocok']}%**)" if tot_b else ""), "",
         "| Kasus | Gender | Ya | Jawaban web vs kunci | Jawaban DOS (run web) vs kunci | Skala cocok | Skala beda |",
         "|---|---|---|---|---|---|---|"]
    for k, v in per_kasus.items():
        def b(x):
            return "-" if x is None else ("cocok" if x == 0 else f"{x} beda")
        L.append(f"| {k} | {v['gender']} | {v['jumlah_ya']} | {b(v['jawaban_web_beda_dari_kunci'])} | "
                 f"{b(v['jawaban_dos_saat_web_beda_dari_kunci'])} | {v['skala_cocok']}/{v['skala_dibandingkan']} | "
                 f"{', '.join(v['skala_beda']) or '-'} |")
    with open(os.path.join(H, "RINGKASAN.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    print("\n".join(L))


if __name__ == "__main__":
    main()
