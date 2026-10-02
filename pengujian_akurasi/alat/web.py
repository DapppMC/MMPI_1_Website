"""
web.py - membantu sisi WEB pada uji akurasi (hanya library bawaan Python).

Jalankan dari folder pengujian_akurasi. Backend harus hidup di http://127.0.0.1:3000.

  python alat/web.py siapkan --kode-seri ABC [--tanggal 2026-10-02]
        Membuat 1 akun peserta per kasus (seperti tombol "Generate Akun"),
        lalu mengisi Data Diri (nama "UJI Kxx" + jenis kelamin) untuk kasus jalur "api".
        Kasus jalur "ui-acak" (K09) hanya dibuatkan akun; Data Diri & jawabannya diisi lewat layar.
        Hasil: hasil/peta_peserta.json  (Kxx -> ID peserta)

  python alat/web.py isi [--kasus K01,K02]
        Untuk kasus jalur "api": kirim 566 jawaban PERSIS seperti tombol "Selesai" di layar peserta
        (test-status/start -> jawaban-temp/bulk -> test-status/finish -> submit-test).

  python alat/web.py cek-jawaban
        Membaca jawaban yang TERSIMPAN di database web untuk tiap kasus lalu mencocokkan
        dengan kunci kasus (butir demi butir). Hasil: hasil/web/Kxx_cek_jawaban.json

  python alat/web.py antrekan [--kasus ...]
        CADANGAN saja kalau tombol "Nilai Tes" di dashboard Dokter gagal: memasukkan kasus ke antrean.

  python alat/web.py ambil-hasil
        Mengambil skor yang tersimpan di web (test_output.hasil_output_ms).
        Hasil: hasil/web/Kxx_hasil.json  (+ ringkasan di layar)
"""
import argparse
import datetime
import json
import os
import sys
import time
import urllib.request
import urllib.error

DASAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.environ.get("MMPI_API", "http://127.0.0.1:3000/api")
F_PETA = os.path.join(DASAR, "hasil", "peta_peserta.json")
D_WEB = os.path.join(DASAR, "hasil", "web")


def http(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"[GAGAL] {method} {path} -> HTTP {e.code}: {e.read().decode()[:300]}")
    except urllib.error.URLError as e:
        raise SystemExit(f"[GAGAL] Tidak bisa menghubungi {API}: {e}. Apakah docker compose sudah jalan?")


def kasus_semua():
    with open(os.path.join(DASAR, "kasus", "daftar_kasus.json"), encoding="utf-8") as f:
        ids = [k["id"] for k in json.load(f)]
    out = {}
    for k in ids:
        with open(os.path.join(DASAR, "kasus", f"{k}.json"), encoding="utf-8") as f:
            out[k] = json.load(f)
    return out


def pilih(semua, arg):
    if not arg:
        return list(semua)
    pilihan = [x.strip().upper() for x in arg.split(",") if x.strip()]
    for p in pilihan:
        if p not in semua:
            raise SystemExit(f"Kasus {p} tidak ada")
    return pilihan


def baca_peta():
    if not os.path.exists(F_PETA):
        raise SystemExit("hasil/peta_peserta.json belum ada. Jalankan dulu: python alat/web.py siapkan --kode-seri XXX")
    with open(F_PETA, encoding="utf-8") as f:
        return json.load(f)


def simpan(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def cmd_siapkan(a):
    semua = kasus_semua()
    target = pilih(semua, a.kasus)
    tanggal = a.tanggal or datetime.date.today().isoformat()
    peta = {}
    if os.path.exists(F_PETA):
        peta = baca_peta()
    baru = [k for k in target if k not in peta]
    if not baru:
        print("Semua kasus sudah punya akun (lihat hasil/peta_peserta.json).")
        return
    res = http("POST", "/peserta/generate", {"testDate": tanggal, "count": len(baru), "kodeSeri": a.kode_seri})
    akun = res.get("accounts", [])
    if len(akun) != len(baru):
        raise SystemExit(f"Jumlah akun tidak sesuai: {res}")
    for k, ak in zip(baru, akun):
        peta[k] = {"pasien_id": ak["pasienId"], "tanggal": tanggal, "jalur_web": semua[k]["jalur_web"]}
        if semua[k]["jalur_web"] == "api":
            http("POST", "/pasien", {
                "nomorId": ak["pasienId"], "nama": semua[k]["nama_peserta"], "nik": "0000000000000000",
                "jenisKelamin": semua[k]["gender"], "tanggalLahir": "2000-01-01",
                "alamat": "Data uji akurasi (bukan orang sungguhan)", "statusPerkawinan": "Belum Kawin",
                "pendidikan": "S1", "pekerjaan": "Mahasiswa", "sukuBangsa": "-", "agama": "-",
                "nomorHp": "080000000000", "tujuanPemeriksaan": "Uji akurasi sistem",
                "tanggalPemeriksaanDate": tanggal, "tanggalPemeriksaanTime": "08:00",
            })
        print(f"{k} -> {ak['pasienId']}  ({semua[k]['gender']}, jalur {semua[k]['jalur_web']})")
    simpan(F_PETA, peta)
    print(f"\nTersimpan di {F_PETA}")


def cmd_isi(a):
    semua = kasus_semua()
    peta = baca_peta()
    for k in pilih(semua, a.kasus):
        if semua[k]["jalur_web"] != "api":
            print(f"{k}: dilewati (jalur {semua[k]['jalur_web']} -> diisi lewat layar peserta)")
            continue
        pid = peta[k]["pasien_id"]
        jaw = [c == "T" for c in semua[k]["jawaban"]]
        http("POST", "/test-status/start", {"pasien_id": pid})
        time.sleep(1)
        http("POST", "/jawaban-temp/bulk", {"pasien_id": pid, "answers": jaw})
        st = http("POST", "/test-status/finish", {"pasien_id": pid}) or {}
        http("POST", "/submit-test", {"pasien_id": pid, "durasi": st.get("durasi_formatted", "-")})
        print(f"{k} ({pid}): 566 jawaban terkirim & dikumpulkan. Ya={sum(jaw)}")


def cmd_cek(a):
    semua = kasus_semua()
    peta = baca_peta()
    total_salah = 0
    for k in pilih(semua, a.kasus):
        if k not in peta:
            continue
        pid = peta[k]["pasien_id"]
        rows = http("GET", f"/jawaban-temp/{pid}") or []
        tersimpan = {int(r["soal_id"]): r["jawaban"].strip() for r in rows}
        kunci = semua[k]["jawaban"]
        salah = [{"no_butir": i, "kunci": kunci[i - 1], "tersimpan": tersimpan.get(i)}
                 for i in range(1, 567) if tersimpan.get(i) != kunci[i - 1]]
        total_salah += len(salah)
        simpan(os.path.join(D_WEB, f"{k}_cek_jawaban.json"), {
            "kasus": k, "pasien_id": pid, "jumlah_tersimpan": len(tersimpan),
            "jumlah_berbeda": len(salah), "berbeda": salah,
            "string_tersimpan": "".join(tersimpan.get(i, "?") for i in range(1, 567)),
        })
        print(f"{k} ({pid}): tersimpan {len(tersimpan)}/566, berbeda dari kunci: {len(salah)}"
              + (f"  contoh: {salah[:5]}" if salah else "  -> COCOK"))
    print("\nSEMUA COCOK" if total_salah == 0 else f"\nADA {total_salah} BUTIR BERBEDA")


def cmd_antrekan(a):
    semua = kasus_semua()
    peta = baca_peta()
    items = [{"pasien_id": peta[k]["pasien_id"], "gender": semua[k]["gender_api"]}
             for k in pilih(semua, a.kasus) if k in peta]
    print(http("POST", "/queue/add", {"items": items}))


def cmd_ambil(a):
    semua = kasus_semua()
    peta = baca_peta()
    target = [k for k in pilih(semua, a.kasus) if k in peta]
    rows = http("POST", "/peserta/report", {"ids": [peta[k]["pasien_id"] for k in target]}) or []
    by_id = {r["idPeserta"]: r for r in rows}
    belum = []
    for k in target:
        r = by_id.get(peta[k]["pasien_id"], {})
        h = r.get("hasil_output")
        if isinstance(h, str):
            try:
                h = json.loads(h)
            except ValueError:
                pass
        simpan(os.path.join(D_WEB, f"{k}_hasil.json"), {
            "kasus": k, "pasien_id": peta[k]["pasien_id"], "jenis_kelamin_web": r.get("jenisKelamin"),
            "durasi": r.get("durasiPengerjaan"), "diambil_pada": datetime.datetime.now().isoformat(timespec="seconds"),
            "skor": h,
        })
        if not h:
            belum.append(k)
            print(f"{k}: BELUM ADA SKOR")
        else:
            klin = " ".join(f"{s.split(' ')[0]}={v.get('raw')}/{v.get('t')}" for s, v in h.items() if isinstance(v, dict))
            print(f"{k}: {klin}")
    if belum:
        print(f"\nBelum dinilai: {', '.join(belum)}")


def main():
    p = argparse.ArgumentParser()
    sp = p.add_subparsers(dest="cmd", required=True)
    s = sp.add_parser("siapkan"); s.add_argument("--kode-seri", required=True); s.add_argument("--tanggal"); s.add_argument("--kasus")
    for nama in ("isi", "cek-jawaban", "antrekan", "ambil-hasil"):
        x = sp.add_parser(nama); x.add_argument("--kasus")
    a = p.parse_args()
    {"siapkan": cmd_siapkan, "isi": cmd_isi, "cek-jawaban": cmd_cek,
     "antrekan": cmd_antrekan, "ambil-hasil": cmd_ambil}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
