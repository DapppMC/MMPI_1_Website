// src/admin/Profile.tsx
import React, { useState, useEffect } from "react";
import arrowRightIcon from "../assets/icons/light_mode/keyboard_arrow_right.svg";

const Profile: React.FC = () => {
  const [formData, setFormData] = useState({
    nama: "",
    username: "",
    password: "",
    kode_seri: "",
    acak_soal: false, // [NEW] Added acak_soal state
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Security States
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const [statusMessage, setStatusMessage] = useState({
    text: "",
    isError: false,
  });

  // Load the active doctor's data from localStorage on mount (NO PASSWORD)
  useEffect(() => {
    const activeUserStr = localStorage.getItem("active_dokter");
    if (activeUserStr) {
      const activeUser = JSON.parse(activeUserStr);
      setFormData({
        nama: activeUser.nama || "",
        username: activeUser.username || "",
        password: "", // Leave blank for security until unlocked
        kode_seri: activeUser.kodeSeri || "",
        acak_soal: activeUser.acakSoal || false, // [NEW] Load acakSoal from active user
      });
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // [NEW] Toggle Handler for Acak Soal
  const handleToggleAcakSoal = () => {
    if (!isUnlocked) return; // Prevent changing if locked
    setFormData((prev) => ({
      ...prev,
      acak_soal: !prev.acak_soal,
    }));
  };

  const handleVerifyPassword = async () => {
    const activeUserStr = localStorage.getItem("active_dokter");
    if (!activeUserStr) return;

    const activeUser = JSON.parse(activeUserStr);
    setIsVerifying(true);
    setAuthError("");

    try {
      const response = await fetch("http://localhost:3000/api/dokter/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: activeUser.username,
          password: authPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsUnlocked(true);
        setIsAuthModalOpen(false);
        setFormData((prev) => ({ ...prev, password: authPassword }));
        setAuthPassword("");
        setStatusMessage({ text: "", isError: false });
      } else {
        setAuthError("Password salah. Silakan coba lagi.");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setAuthError("Gagal menghubungi server.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ text: "", isError: false });

    const activeUserStr = localStorage.getItem("active_dokter");
    if (!activeUserStr) {
      setIsSaving(false);
      return;
    }
    const activeUser = JSON.parse(activeUserStr);

    try {
      const response = await fetch("http://localhost:3000/api/dokter/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dokterId: activeUser.dokterId,
          nama: formData.nama,
          username: formData.username,
          password: formData.password,
          acak_soal: formData.acak_soal, // [NEW] Send acak_soal to the backend
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("active_dokter", JSON.stringify(data.user));

        setStatusMessage({
          text: "Profil berhasil diperbarui!",
          isError: false,
        });

        setIsUnlocked(false);
        setFormData((prev) => ({ ...prev, password: "" }));
      } else {
        setStatusMessage({
          text: data.message || "Gagal memperbarui profil.",
          isError: true,
        });
      }
    } catch (error) {
      console.error("Update error:", error);
      setStatusMessage({
        text: "Terjadi kesalahan koneksi atau server.",
        isError: true,
      });
    } finally {
      setIsSaving(false);

      setTimeout(() => {
        setStatusMessage({ text: "", isError: false });
      }, 4000);
    }
  };

  const inputBaseClass =
    "w-full p-3 border rounded-lg focus:outline-none transition-all ";
  const getInputClass = () => {
    return !isUnlocked
      ? inputBaseClass +
          "bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed"
      : inputBaseClass +
          "border-gray-400 focus:ring-2 focus:ring-purple-2 bg-white text-black";
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto relative">
      {/* --- Header / Breadcrumb --- */}
      <div className="mb-8 shrink-0">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-black">
          <span>MMPI</span>
          <img src={arrowRightIcon} alt="arrow" className="w-5 h-5" />
          <span>Profil</span>
          <img src={arrowRightIcon} alt="arrow" className="w-5 h-5" />
          <span>Detail Akun</span>
        </h2>
      </div>

      {/* --- Scrollable Form Container --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-4">
          {/* Row: Acak Soal Toggle [NEW] */}
          <div className="grid grid-cols-[250px_1fr] items-start gap-4 mt-2">
            <label className="font-bold text-sm text-black pt-2">
              Sistem Ujian
            </label>
            <div className="w-full flex flex-col gap-2">
              <div
                onClick={handleToggleAcakSoal}
                className={`inline-flex items-center gap-3 select-none w-fit ${
                  !isUnlocked
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer"
                }`}
              >
                {/* The visual switch */}
                <div
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 ease-in-out ${
                    formData.acak_soal ? "bg-purple-3" : "bg-gray-400"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ease-in-out ${
                      formData.acak_soal ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </div>
                {/* Label text */}
                <span className="font-medium text-gray-800">
                  {formData.acak_soal
                    ? "Acak Soal Ujian"
                    : "Soal Berurutan (Default)"}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Jika diaktifkan, urutan soal tes MMPI untuk pasien Anda akan
                diacak.
              </p>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-200 my-2" />

          {/* Row: Nama */}
          <div className="grid grid-cols-[250px_1fr] items-start gap-4 mt-2">
            <label className="font-bold text-sm text-black pt-3">
              Nama Lengkap
            </label>
            <div className="w-full">
              <input
                type="text"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                disabled={!isUnlocked}
                placeholder="Nama Dokter"
                className={getInputClass()}
              />
            </div>
          </div>

          {/* Row: Username */}
          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Username
            </label>
            <div className="w-full">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={!isUnlocked}
                placeholder="Username untuk login"
                className={getInputClass()}
              />
            </div>
          </div>

          {/* Row: Password with Eye Toggle */}
          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Password
            </label>
            <div className="w-full relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={!isUnlocked ? "••••••••" : formData.password}
                onChange={handleChange}
                disabled={!isUnlocked}
                placeholder="Password"
                className={`${getInputClass()} pr-12`}
              />
              <button
                type="button"
                onClick={() => isUnlocked && setShowPassword(!showPassword)}
                disabled={!isUnlocked}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 focus:outline-none transition-colors ${!isUnlocked ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-gray-700"}`}
                title={showPassword ? "Sembunyikan Password" : "Lihat Password"}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Row: Kode Seri (Not Modifiable) */}
          <div className="grid grid-cols-[250px_1fr] items-start gap-4">
            <label className="font-bold text-sm text-black pt-3">
              Kode Seri (Read-Only)
            </label>
            <div className="w-full">
              <input
                type="text"
                name="kode_seri"
                value={formData.kode_seri}
                disabled
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-2 font-medium">
                Kode seri ditetapkan oleh sistem dan tidak dapat diubah.
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* --- Footer / Dynamic Button / Status Message --- */}
      <div className="mt-4 flex items-center justify-between shrink-0 pt-4 border-t border-gray-200 min-h-[64px]">
        {/* Left Side: Status Message */}
        <div className="flex-1">
          {statusMessage.text && (
            <span
              className={`font-semibold text-sm animate-in fade-in duration-300 ${statusMessage.isError ? "text-red-500" : "text-green-600"}`}
            >
              {statusMessage.text}
            </span>
          )}
        </div>

        {/* Right Side: Buttons */}
        <div className="flex gap-4 justify-end">
          {!isUnlocked ? (
            <button
              type="button"
              onClick={() => {
                setIsAuthModalOpen(true);
                setAuthError("");
                setStatusMessage({ text: "", isError: false });
              }}
              className="bg-blue-2 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-sm transition-colors shadow-lg flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              Ubah Data
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsUnlocked(false);
                  setShowPassword(false);
                  setStatusMessage({ text: "", isError: false });
                  const activeUserStr = localStorage.getItem("active_dokter");
                  if (activeUserStr) {
                    const activeUser = JSON.parse(activeUserStr);
                    // Ensure acakSoal is reset too
                    setFormData({
                      ...formData,
                      ...activeUser,
                      acak_soal: activeUser.acakSoal || false,
                      password: "",
                    });
                  }
                }}
                className="px-6 py-3 rounded-lg font-bold text-sm text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className={`bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold text-sm transition-colors shadow-lg flex items-center gap-2 ${isSaving ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* --- SECURITY POP-UP MODAL --- */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
          <div className="bg-white rounded-xl shadow-2xl p-8 w-[400px] flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 relative z-10">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 ring-4 ring-blue-50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Verifikasi Keamanan
            </h3>
            <p className="text-gray-500 mb-6 text-sm">
              Masukkan password Anda saat ini untuk membuka akses edit profil.
            </p>

            <div className="w-full mb-8 relative">
              <input
                type={showPassword ? "text" : "password"}
                value={authPassword}
                onChange={(e) => {
                  setAuthPassword(e.target.value);
                  setAuthError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerifyPassword();
                }}
                autoFocus
                disabled={isVerifying}
                placeholder="Masukkan password..."
                className={`w-full p-3 pr-10 border rounded-lg focus:outline-none transition-colors ${authError ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-gray-300 focus:ring-2 focus:ring-blue-200"}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                )}
              </button>

              {authError && (
                <p className="text-red-500 text-xs font-medium text-left mt-2 pl-1 absolute">
                  {authError}
                </p>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setIsAuthModalOpen(false)}
                disabled={isVerifying}
                className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleVerifyPassword}
                disabled={isVerifying}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex justify-center items-center"
              >
                {isVerifying ? "Mengecek..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
