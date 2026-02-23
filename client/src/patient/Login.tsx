// src/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import loginBg from "../assets/login_bg.png"; // Adjusted path based on your snippet

const Login: React.FC = () => {
  const [pasienId, setPasienId] = useState("");
  const [error, setError] = useState(""); // Changed to string to hold API error messages
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pasienId.trim()) {
      setError("Nomor ID tidak boleh kosong!");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Connect to the backend endpoint
      const response = await fetch("http://localhost:3000/api/peserta/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pasien_id: pasienId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Save the authenticated patient data to localStorage
        localStorage.setItem("active_peserta", JSON.stringify(data.user));

        // Redirect to the patient dashboard
        navigate("/dashboard");
      } else {
        // Trigger error state with message from backend
        setError(data.message || "Nomor ID tidak valid!");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Terjadi kesalahan koneksi ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasienId(e.target.value);
    if (error) setError("");
  };

  return (
    <div className="relative w-full h-screen font-sans overflow-hidden select-none">
      {/* 1. Background Layer */}
      <div className="absolute inset-0 z-0">
        <img
          src={loginBg}
          alt="Medical Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[0px]" />
      </div>

      {/* 2. Login Panel */}
      <div className="absolute top-0 bottom-0 left-[60%] w-[30%] z-10 flex flex-col p-12 justify-between text-white">
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-blue-3 from-15% to-green-3 to-85% border-blue-3 border-2 opacity-95 shadow-2xl"></div>

        {/* Top: Title */}
        <div className="mt-[10%]">
          <h1 className="text-4xl font-bold leading-tight tracking-wide drop-shadow-md">
            Minnesota <br />
            Multiphasic <br />
            Personality <br />
            Inventory <br />
            <span className="font-normal">(MMPI)</span>
          </h1>
        </div>

        {/* Middle: Form */}
        <div className="flex flex-col gap-6 mt-[10%]">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="pasienId"
                className="text-md font-medium opacity-90 drop-shadow-sm"
              >
                Nomor ID Pasien
              </label>

              <input
                id="pasienId"
                type="text"
                value={pasienId}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Masukkan Nomor ID di sini"
                className={`w-full px-4 py-3 rounded-lg text-black placeholder-gray-400 bg-white focus:outline-none transition-all shadow-sm ${
                  error
                    ? "ring-2 ring-red-1 focus:ring-red-1"
                    : "focus:ring-2 focus:ring-purple-4"
                } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              />

              {/* Error Message */}
              {error && (
                <span className="text-red-1 font-medium text-md tracking-wide drop-shadow-sm">
                  {error}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full py-3 mt-4 rounded-lg bg-linear-to-r from-purple-4 to-purple-2 text-white font-bold tracking-wide shadow-lg transition-all transform overflow-hidden ${
                isLoading
                  ? "opacity-80 cursor-wait"
                  : "hover:shadow-xl active:scale-[0.98]"
              }`}
            >
              {!isLoading && (
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-15 transition-opacity duration-200" />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk"
                )}
              </span>
            </button>
          </form>
        </div>

        {/* Bottom: Footer Info */}
        <div className="text-2xl mt-[10%] font-light font-sans opacity-80 drop-shadow-sm">
          <p>Versi 3.0</p>
          <p>2026</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
