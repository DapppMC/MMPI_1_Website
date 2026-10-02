"""
ketik_ke_dos.py - mengetik 566 jawaban sebuah kasus ke jendela MMPI DOS yang sedang aktif.

Butuh pyautogui (sudah terpasang kalau server.py bisa jalan; kalau belum: pip install pyautogui).

Cara pakai (dari folder pengujian_akurasi):
  1. Di jendela DOSBox, bawa MMPI sampai kursor berada di BUTIR NOMOR 1 (layar isian jawaban).
  2. Jalankan:  python alat/ketik_ke_dos.py K01
  3. Dalam 5 detik, KLIK jendela DOSBox supaya aktif, lalu JANGAN sentuh keyboard/mouse
     sampai tulisan "SELESAI" muncul (sekitar 30-40 detik).
Opsi: --jeda 8 (hitung mundur lebih lama), --interval 0.06 (ketik lebih pelan kalau ada yang terlewat)
"""
import argparse
import os
import sys
import time

DASAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("kasus")
    p.add_argument("--jeda", type=float, default=5)
    p.add_argument("--interval", type=float, default=0.05)
    a = p.parse_args()
    try:
        import pyautogui
    except ImportError:
        sys.exit("pyautogui belum terpasang: pip install pyautogui")
    path = os.path.join(DASAR, "kasus", f"{a.kasus.upper()}_dos.txt")
    s = open(path, encoding="ascii").read().strip()
    assert len(s) == 566 and set(s) <= {"+", "-"}, "file jawaban rusak"
    print(f"Kasus {a.kasus.upper()}: {s.count('+')} Ya (+), {s.count('-')} Tidak (-)")
    print(f"Klik jendela DOSBox sekarang. Mulai mengetik dalam {a.jeda:.0f} detik...")
    for i in range(int(a.jeda), 0, -1):
        print(f"  {i}...", flush=True)
        time.sleep(1)
    pyautogui.FAILSAFE = True   # gerakkan mouse ke pojok kiri-atas layar untuk membatalkan darurat
    t0 = time.time()
    pyautogui.typewrite(s, interval=a.interval)
    print(f"SELESAI mengetik 566 jawaban dalam {time.time() - t0:.0f} detik. Sekarang tekan Esc untuk melihat hasil.")


if __name__ == "__main__":
    main()
