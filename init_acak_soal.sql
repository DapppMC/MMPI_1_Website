-- Kolom ini dipakai kode backend tapi tidak ada di backup asli.
-- Ditambahkan otomatis saat database pertama kali dibuat.
ALTER TABLE public.dokter
  ADD COLUMN IF NOT EXISTS acak_soal boolean DEFAULT false;
