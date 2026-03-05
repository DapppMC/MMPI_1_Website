import React, { useState } from "react";
import arrowRightIcon from "../assets/icons/light_mode/keyboard_arrow_right.svg";

// Define field errors type to match the styling logic
type FormErrors = {
  nama?: string;
  kodeSeri?: string;
  username?: string;
  password?: string;
};

const BuatAkunDokter: React.FC = () => {
  const [nama, setNama] = useState("");
  const [kodeSeri, setKodeSeri] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
    fieldName: keyof FormErrors,
  ) => {
    let val = e.target.value;

    if (fieldName === "kodeSeri") val = val.toUpperCase();
    if (fieldName === "username") val = val.toLowerCase().replace(/\s/g, "");

    setter(val);

    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    }
    setGeneralError("");
    setSuccessMessage("");
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!nama.trim()) {
      newErrors.nama = "Kolom ini wajib diisi";
      isValid = false;
    }
    if (!username.trim()) {
      newErrors.username = "Kolom ini wajib diisi";
      isValid = false;
    }
    if (!password.trim() || password.length < 6) {
      newErrors.password = "Password minimal 6 karakter";
      isValid = false;
    }
    if (!kodeSeri.trim() || kodeSeri.length !== 3) {
      newErrors.kodeSeri = "Kode Seri harus tepat 3 karakter";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setGeneralError(
        "Mohon lengkapi semua kolom yang bergaris merah dengan benar.",
      );
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("super_admin_token");

      const response = await fetch(
        "http://localhost:3000/api/super-admin/create-dokter",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token || "",
          },
          body: JSON.stringify({
            nama,
            username,
            password,
            kode_seri: kodeSeri,
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage(
          `Berhasil membuat Akun Dokter: ${nama} (${username}).`,
        );
        setNama("");
        setKodeSeri("");
        setUsername("");
        setPassword("");
      } else {
        // [UPDATED] Check if the backend specifically targeted an input field (like kodeSeri)
        if (data.field) {
          setErrors((prev) => ({ ...prev, [data.field]: data.error }));
          setGeneralError("Terdapat kesalahan pada isian form.");
        } else {
          setGeneralError(data.error || "Gagal membuat akun dokter.");
        }
      }
    } catch (err) {
      console.error("Submission Error:", err);
      setGeneralError("Terjadi kesalahan koneksi ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  const getInputClass = (fieldName: keyof FormErrors) => {
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
          <span>Super Admin</span>
          <img src={arrowRightIcon} alt="arrow" className="w-5 h-5" />
          <span>Buat Akun Dokter</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        {generalError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 text-sm p-4 rounded-lg font-medium">
            {generalError}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-lg font-medium">
            {successMessage}
          </div>
        )}

        <form
          id="dokterForm"
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 pb-4"
        >
          {/* NAMA DOKTER */}
          <div className="grid grid-cols-[250px_1fr] items-start gap-4 mt-2">
            <label className="font-bold text-sm text-black pt-3">
              Nama Dokter
            </label>
            <div className="w-full">
              <input
                type="text"
                value={nama}
                onChange={(e) => handleChange(e, setNama, "nama")}
                placeholder="Nama lengkap dokter"
                className={getInputClass("nama")}
              />
              {errors.nama && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.nama}
                </p>
              )}
            </div>
          </div>

          {/* KODE SERI */}
          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Kode Seri
            </label>
            <div className="w-full">
              <input
                type="text"
                maxLength={3}
                value={kodeSeri}
                onChange={(e) => handleChange(e, setKodeSeri, "kodeSeri")}
                placeholder="Tiga huruf unik, misal: XYZ"
                className={`${getInputClass("kodeSeri")} uppercase`}
              />
              <p className="text-xs text-gray-500 mt-1.5 ml-1">
                Akan digunakan sebagai awalan ID Pasien (contoh:
                XYZ-24022026001)
              </p>
              {errors.kodeSeri && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.kodeSeri}
                </p>
              )}
            </div>
          </div>

          {/* USERNAME */}
          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Username Login
            </label>
            <div className="w-full">
              <input
                type="text"
                value={username}
                onChange={(e) => handleChange(e, setUsername, "username")}
                placeholder="Gunakan huruf kecil tanpa spasi"
                className={getInputClass("username")}
              />
              {errors.username && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.username}
                </p>
              )}
            </div>
          </div>

          {/* PASSWORD */}
          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Password Login
            </label>
            <div className="w-full">
              <input
                type="password"
                value={password}
                onChange={(e) => handleChange(e, setPassword, "password")}
                placeholder="Minimal 6 karakter"
                className={getInputClass("password")}
              />
              {errors.password && (
                <p className="text-red-1 text-xs mt-1 font-medium">
                  {errors.password}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="mt-4 flex justify-end shrink-0 pt-4 border-t border-gray-200">
        <button
          type="submit"
          form="dokterForm"
          disabled={isLoading}
          className={`px-8 py-3 rounded-lg font-bold text-sm transition-colors shadow-lg flex items-center gap-2 ${
            isLoading
              ? "bg-gray-400 text-gray-100 cursor-not-allowed"
              : "bg-blue-2 hover:bg-blue-600 text-white"
          }`}
        >
          {isLoading && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          )}
          {isLoading ? "Menyimpan..." : "Simpan Data"}
        </button>
      </div>
    </div>
  );
};

export default BuatAkunDokter;
