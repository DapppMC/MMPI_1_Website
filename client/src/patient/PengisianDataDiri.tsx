// src/user/PengisianDataDiri.tsx
import React, { useState, useEffect } from "react";
import arrowRightIcon from "../assets/icons/light_mode/keyboard_arrow_right.svg";

// Define the comprehensive data structure
export interface PengisianDataVariables {
  nomorId: string;
  tujuanPemeriksaan: string;
  durasiPengerjaan: string;
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

const PengisianDataDiri: React.FC<Props> = ({ onNext }) => {
  // 1. Initialize State
  const [formData, setFormData] = useState<PengisianDataVariables>(() => {
    // [NEW] Pull active user FIRST to guarantee the ID belongs to the current session
    const activePesertaStr = localStorage.getItem("active_peserta");
    let initialId = "";
    let initialNama = "";
    let initialGender = "";

    if (activePesertaStr) {
      const activePeserta = JSON.parse(activePesertaStr); // Fallback checks depending on how your Node.js backend sends the user object
      initialId =
        activePeserta.idPeserta ||
        activePeserta.pasien_id ||
        activePeserta.id ||
        "";
      initialNama = activePeserta.nama || "";
      if (
        activePeserta.jenisKelamin === "Pria" ||
        activePeserta.jenisKelamin === "Wanita"
      ) {
        initialGender = activePeserta.jenisKelamin;
      }
    } // Check if they already started filling this out and refreshed the page

    const savedData = localStorage.getItem("mmpi_phase1_data");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      return {
        ...parsed, // Override the saved ID with the active session ID to prevent cross-contamination
        nomorId: initialId || parsed.nomorId || "",
      };
    }

    return {
      nomorId: initialId, // Auto-filled from login
      nama: initialNama, // Auto-filled from login
      jenisKelamin: initialGender as any, // Auto-filled from login
      tujuanPemeriksaan: "",
      durasiPengerjaan: "",
      tanggalPemeriksaanDate: "",
      tanggalPemeriksaanTime: "",
      nik: "",
      tanggalLahir: "",
      sukuBangsa: "",
      pendidikan: "",
      pekerjaan: "",
      statusPerkawinan: "",
      nomorHp: "",
      alamat: "",
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({}); // [NEW] Loading state for fetching DB data

  const [isFetching, setIsFetching] = useState(true); // [NEW] Fetch existing data from DB on component mount

  useEffect(() => {
    const fetchExistingData = async () => {
      const activePesertaStr = localStorage.getItem("active_peserta");
      if (!activePesertaStr) {
        setIsFetching(false);
        return;
      }

      const activePeserta = JSON.parse(activePesertaStr);
      const rawUserId =
        activePeserta.idPeserta || activePeserta.pasien_id || activePeserta.id;

      if (!rawUserId) {
        setIsFetching(false);
        return;
      }

      // [NEW] Remove accidental spaces and encode special characters for the URL
      const cleanUserId = String(rawUserId).trim();

      try {
        const response = await fetch(
          `http://localhost:3000/api/peserta/${encodeURIComponent(cleanUserId)}`,
        );

        if (response.ok) {
          const dbData = await response.json();

          const formatDate = (dateString: string) => {
            if (!dateString) return "";
            return dateString.split("T")[0];
          };

          setFormData((prev) => ({
            ...prev,
            nik: dbData.nik || prev.nik,
            tanggalLahir: formatDate(dbData.tanggalLahir) || prev.tanggalLahir,
            sukuBangsa: dbData.sukuBangsa || prev.sukuBangsa,
            pendidikan: dbData.pendidikan || prev.pendidikan,
            pekerjaan: dbData.pekerjaan || prev.pekerjaan,
            statusPerkawinan: dbData.statusPerkawinan || prev.statusPerkawinan,
            nomorHp: dbData.nomorHp || prev.nomorHp,
            alamat: dbData.alamat || prev.alamat,
            tujuanPemeriksaan:
              dbData.tujuanPemeriksaan || prev.tujuanPemeriksaan,
            durasiPengerjaan: dbData.durasiPengerjaan || prev.durasiPengerjaan,
            tanggalPemeriksaanDate:
              formatDate(dbData.tanggalPemeriksaanDate) ||
              prev.tanggalPemeriksaanDate,
            tanggalPemeriksaanTime:
              dbData.tanggalPemeriksaanTime || prev.tanggalPemeriksaanTime,
          }));
        } else {
          console.warn(
            `Database returned ${response.status}: Make sure ID '${cleanUserId}' exactly matches the database case (e.g., uppercase vs lowercase).`,
          );
        }
      } catch (error) {
        console.error("Error fetching existing data:", error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchExistingData();
  }, []);

  // 2. Save to LocalStorage whenever formData changes
  useEffect(() => {
    localStorage.setItem("mmpi_phase1_data", JSON.stringify(formData));
  }, [formData]);

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

    const validateForm = (): boolean => {
      const newErrors: FormErrors = {};
      let isValid = true;

      // Fields that are allowed to be empty before the test begins
      const optionalFields = ["durasiPengerjaan"];

      (Object.keys(formData) as Array<keyof PengisianDataVariables>).forEach(
        (key) => {
          // Skip validation for optional fields
          if (optionalFields.includes(key)) return;

          const value = formData[key];

          // Safely check if value is null, undefined, or an empty string
          if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
          ) {
            newErrors[key] = "Kolom ini wajib diisi";
            isValid = false;
          }
        },
      );

      setErrors(newErrors);

      // DEBUGGING: This will print exactly which fields are failing to your browser console
      if (!isValid) {
        console.warn(
          "Validasi Gagal! Kolom yang masih kosong:",
          Object.keys(newErrors),
        );
      }

      return isValid;
    };

    setIsSaving(true);
    try {
      // Upsert the patient biodata to the database
      const response = await fetch("http://localhost:3000/api/pasien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Gagal menyimpan data ke server");

      // 2. [NEW] Start the database timer and update status
      await fetch("http://localhost:3000/api/test-status/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pasien_id: formData.nomorId }),
      });

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
      {/* Header matching Admin layout */}
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
        {isFetching ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 font-medium animate-pulse">Memuat data peserta...</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-4">
          {/* Row: Nomor ID (LOCKED FOR PATIENTS) */}
          <div className="grid grid-cols-[250px_1fr] items-start gap-4 mt-2">
            <label className="font-bold text-sm text-black pt-3">
              Nomor ID
            </label>
            <div className="w-full">
              <input
                type="text"
                name="nomorId"
                value={formData.nomorId}
                disabled // ALWAYS LOCKED
                className={`${getInputClass("nomorId")} bg-gray-100 cursor-not-allowed text-gray-500`}
              />
              <p className="text-xs text-gray-400 mt-2 font-medium">
                ID ini telah ditetapkan oleh sistem dan tidak dapat diubah.
              </p>
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

          {/* <div className="grid grid-cols-[250px_1fr] items-start gap-4">
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
          </div> */}

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
        )}
      </div>

      <div className="mt-4 flex justify-end shrink-0 pt-4 border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className={`bg-blue-2 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-sm transition-colors shadow-lg ${isSaving ? "opacity-70 cursor-wait" : ""}`}
        >
          {isSaving ? "Menyimpan..." : "Selanjutnya"}
        </button>
      </div>
    </div>
  );
};;;

export default PengisianDataDiri;
