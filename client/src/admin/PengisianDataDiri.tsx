// src/admin/PengisianDataDiri.tsx
import React, { useState, useEffect } from "react";
import arrowRightIcon from "../assets/icons/light_mode/keyboard_arrow_right.svg";

// Define the comprehensive data structure
export interface PengisianDataVariables {
  nomorId: string;
  tujuanPemeriksaan: string;
  durasiPengerjaan: string; // Keep as string
  tanggalPemeriksaanDate: string;
  tanggalPemeriksaanTime: string;
  nik: string;
  nama: string;
  tanggalLahir: string;
  jenisKelamin: "Pria" | "Wanita" | "";
  sukuBangsa: string;
  pendidikan: string;
  pekerjaan: string;
  statusPerkawinan: "Belum Menikah" | "Menikah" | "Sudah Berpisah" | "";
  nomorHp: string;
  alamat: string;
}

// Define Errors Type
type FormErrors = Partial<Record<keyof PengisianDataVariables, string>>;

interface Props {
  onNext: (data: PengisianDataVariables) => void;
}

const isEditMode = localStorage.getItem("mmpi_edit_mode") === "true";

const PengisianDataDiri: React.FC<Props> = ({ onNext }) => {
  // 1. Initialize State from LocalStorage if available
  const [formData, setFormData] = useState<PengisianDataVariables>(() => {
    const savedData = localStorage.getItem("mmpi_phase1_data");
    if (savedData) {
      const parsed = JSON.parse(savedData);

      console.log("Saved data: ");
      console.log(parsed);

      return {
        nomorId: parsed.nomorId || "",
        tujuanPemeriksaan: parsed.tujuanPemeriksaan || "",
        durasiPengerjaan: parsed.durasiPengerjaan || "",
        tanggalPemeriksaanDate: parsed.tanggalPemeriksaanDate || "",
        tanggalPemeriksaanTime: parsed.tanggalPemeriksaanTime || "",
        nik: parsed.nik || "",
        nama: parsed.nama || "",
        tanggalLahir: parsed.tanggalLahir || "",
        jenisKelamin: parsed.jenisKelamin || "",
        sukuBangsa: parsed.sukuBangsa || "",
        pendidikan: parsed.pendidikan || "",
        pekerjaan: parsed.pekerjaan || "",
        statusPerkawinan: parsed.statusPerkawinan || "",
        nomorHp: parsed.nomorHp || "",
        alamat: parsed.alamat || "",
      };
    }

    return {
      nomorId: "",
      tujuanPemeriksaan: "",
      durasiPengerjaan: "",
      tanggalPemeriksaanDate: "",
      tanggalPemeriksaanTime: "",
      nik: "",
      nama: "",
      tanggalLahir: "",
      jenisKelamin: "",
      sukuBangsa: "",
      pendidikan: "",
      pekerjaan: "",
      statusPerkawinan: "",
      nomorHp: "",
      alamat: "",
    };
  });

  const [isSaving, setIsSaving] = useState(false);

  // 2. Save to LocalStorage whenever formData changes
  useEffect(() => {
    localStorage.setItem("mmpi_phase1_data", JSON.stringify(formData));
  }, [formData]);

  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof PengisianDataVariables]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof PengisianDataVariables>).forEach(
      (key) => {
        if (!formData[key] || formData[key].trim() === "") {
          newErrors[key] = "Kolom ini wajib diisi";
          isValid = false;
        }
      },
    );

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      alert(
        "Mohon lengkapi semua kolom yang bergaris merah sebelum melanjutkan.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("http://localhost:3000/api/pasien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Gagal menyimpan data ke server");

      const finalJsonData = {
        ...formData,
        idPeserta: formData.nomorId,
        testAnswers: Array(566).fill(null),
      };

      localStorage.setItem("mmpi_full_data", JSON.stringify(finalJsonData));
      onNext(formData);
    } catch (error) {
      console.error("Submission Error:", error);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  const getInputClass = (fieldName: keyof PengisianDataVariables) => {
    const baseClass =
      "w-full p-3 border rounded-lg focus:outline-none transition-all";

    if (errors[fieldName]) {
      return `${baseClass} border-red-1 ring-1 ring-red-1 focus:ring-red-1`;
    }

    return `${baseClass} border-gray-400 focus:ring-2 focus:ring-purple-2`;
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto">
      <div className="mb-8 shrink-0">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-black">
          <span>MMPI</span>
          <img src={arrowRightIcon} alt="arrow" className="w-5 h-5" />
          <span>Pengisian Data</span>
          <img src={arrowRightIcon} alt="arrow" className="w-5 h-5" />
          <span>Data Diri</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-4">
          <div className="grid grid-cols-[250px_1fr] items-start gap-4 mt-2">
            <label className="font-bold text-sm text-black pt-3">
              Nomor ID
            </label>
            <div className="w-full">
              <input
                type="text"
                name="nomorId"
                value={formData.nomorId}
                onChange={handleChange}
                disabled={isEditMode}
                placeholder="Nomor ID peserta"
                className={`${getInputClass("nomorId")} ${isEditMode ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""}`}
              />
              {errors.nomorId && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.nomorId}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Tujuan Pemeriksaan
            </label>
            <div className="w-full">
              <input
                type="text"
                name="tujuanPemeriksaan"
                value={formData.tujuanPemeriksaan}
                onChange={handleChange}
                placeholder="Contoh: Seleksi Kerja, Konseling, dll"
                className={getInputClass("tujuanPemeriksaan")}
              />
              {errors.tujuanPemeriksaan && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.tujuanPemeriksaan}
                </p>
              )}
            </div>
          </div>

          {/* [UPDATED] Durasi Pengerjaan is now type="text" */}
          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Durasi Pengerjaan
            </label>
            <div className="w-full">
              <input
                type="text"
                name="durasiPengerjaan"
                value={formData.durasiPengerjaan}
                onChange={handleChange}
                placeholder="Contoh: 60 Menit atau 01:30"
                className={getInputClass("durasiPengerjaan")}
              />
              {errors.durasiPengerjaan && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.durasiPengerjaan}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Tanggal Pemeriksaan
            </label>
            <div className="flex gap-4 w-full">
              <div className="w-1/2">
                <input
                  type="date"
                  name="tanggalPemeriksaanDate"
                  value={formData.tanggalPemeriksaanDate}
                  onChange={handleChange}
                  className={`${getInputClass("tanggalPemeriksaanDate")} uppercase text-gray-600`}
                />
                {errors.tanggalPemeriksaanDate && (
                  <p className="text-red-1 text-xs mt-1 font-medium">
                    {errors.tanggalPemeriksaanDate}
                  </p>
                )}
              </div>
              <div className="w-1/2">
                <input
                  type="time"
                  name="tanggalPemeriksaanTime"
                  value={formData.tanggalPemeriksaanTime}
                  onChange={handleChange}
                  className={`${getInputClass("tanggalPemeriksaanTime")} uppercase text-gray-600`}
                />
                {errors.tanggalPemeriksaanTime && (
                  <p className="text-red-1 text-xs mt-1 font-medium">
                    {errors.tanggalPemeriksaanTime}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">NIK</label>
            <div className="w-full">
              <input
                type="text"
                name="nik"
                value={formData.nik}
                onChange={handleChange}
                placeholder="Nomor Induk Kependudukan"
                className={getInputClass("nik")}
              />
              {errors.nik && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.nik}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">Nama</label>
            <div className="w-full">
              <input
                type="text"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                placeholder="Nama peserta"
                className={getInputClass("nama")}
              />
              {errors.nama && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.nama}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Tanggal Lahir
            </label>
            <div className="w-full">
              <input
                type="date"
                name="tanggalLahir"
                value={formData.tanggalLahir}
                onChange={handleChange}
                className={`${getInputClass("tanggalLahir")} uppercase text-gray-600`}
              />
              {errors.tanggalLahir && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.tanggalLahir}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Jenis Kelamin
            </label>
            <div className="w-full">
              <div className="flex gap-4 w-full">
                <label
                  className={`flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${formData.jenisKelamin === "Pria" ? "border-purple-2 bg-blue-50 ring-1 ring-purple-2" : errors.jenisKelamin ? "border-red-1 ring-1 ring-red-1" : "border-gray-400"}`}
                >
                  <input
                    type="radio"
                    name="jenisKelamin"
                    value="Pria"
                    checked={formData.jenisKelamin === "Pria"}
                    onChange={handleChange}
                    className="accent-purple-2 w-5 h-5"
                  />
                  <span className="text-gray-700">Pria</span>
                </label>
                <label
                  className={`flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${formData.jenisKelamin === "Wanita" ? "border-purple-2 bg-blue-50 ring-1 ring-purple-2" : errors.jenisKelamin ? "border-red-1 ring-1 ring-red-1" : "border-gray-400"}`}
                >
                  <input
                    type="radio"
                    name="jenisKelamin"
                    value="Wanita"
                    checked={formData.jenisKelamin === "Wanita"}
                    onChange={handleChange}
                    className="accent-purple-2 w-5 h-5"
                  />
                  <span className="text-gray-700">Wanita</span>
                </label>
              </div>
              {errors.jenisKelamin && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.jenisKelamin}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Suku Bangsa
            </label>
            <div className="w-full">
              <input
                type="text"
                name="sukuBangsa"
                value={formData.sukuBangsa}
                onChange={handleChange}
                placeholder="Suku bangsa"
                className={getInputClass("sukuBangsa")}
              />
              {errors.sukuBangsa && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.sukuBangsa}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Pendidikan
            </label>
            <div className="w-full">
              <input
                type="text"
                name="pendidikan"
                value={formData.pendidikan}
                onChange={handleChange}
                placeholder="Pendidikan terakhir"
                className={getInputClass("pendidikan")}
              />
              {errors.pendidikan && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.pendidikan}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Pekerjaan
            </label>
            <div className="w-full">
              <input
                type="text"
                name="pekerjaan"
                value={formData.pekerjaan}
                onChange={handleChange}
                placeholder="Pekerjaan saat ini"
                className={getInputClass("pekerjaan")}
              />
              {errors.pekerjaan && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.pekerjaan}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Status Perkawinan
            </label>
            <div className="w-full">
              <div className="relative w-full">
                <select
                  name="statusPerkawinan"
                  value={formData.statusPerkawinan}
                  onChange={handleChange}
                  className={`${getInputClass("statusPerkawinan")} appearance-none bg-white text-gray-700`}
                >
                  <option value="" disabled>
                    Pilih Status
                  </option>
                  <option value="Belum Menikah">Belum Menikah</option>
                  <option value="Menikah">Menikah</option>
                  <option value="Sudah Berpisah">Sudah Berpisah</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>
              {errors.statusPerkawinan && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.statusPerkawinan}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Nomor HP
            </label>
            <div className="w-full">
              <input
                type="tel"
                name="nomorHp"
                value={formData.nomorHp}
                onChange={handleChange}
                placeholder="Contoh: 081234567890"
                className={getInputClass("nomorHp")}
              />
              {errors.nomorHp && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.nomorHp}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">Alamat</label>
            <div className="w-full">
              <input
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                placeholder="Alamat lengkap"
                className={getInputClass("alamat")}
              />
              {errors.alamat && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.alamat}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="mt-4 flex justify-end shrink-0 pt-4 border-t border-gray-200">
        <button
          onClick={handleSubmit}
          className="bg-blue-2 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-sm transition-colors shadow-lg"
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );
};

export default PengisianDataDiri;
