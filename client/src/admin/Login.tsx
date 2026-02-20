// src/admin/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// Adjusted path to reach assets from the admin folder
import loginBg from "../assets/login_bg.png";

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // [NEW] Loading state
  const navigate = useNavigate();

  // [UPDATED] Async login handler connected to database
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(false);

    try {
      const response = await fetch("http://localhost:3000/api/dokter/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Optional: Save doctor info to use in the Dashboard profile section!
        localStorage.setItem("active_dokter", JSON.stringify(data.user));

        navigate("/admin/dashboard");
      } else {
        setError(true);
        setPassword(""); // Clear password on failure for security/UX
      }
    } catch (err) {
      console.error("Failed to connect to server:", err);
      setError(true);
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error when user types in EITHER field
  const handleInputChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string,
  ) => {
    setter(value);
    if (error) setError(false);
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
        {/* Panel Background Gradient */}
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-blue-3 from-15% to-green-3 to-85% border-blue-3 border-2 opacity-95 shadow-2xl"></div>

        {/* Content Section */}

        {/* Top: Title */}
        <div className="mt-[10%]">
          <h1 className="text-4xl font-bold leading-tight tracking-wide drop-shadow-md">
            Admin Portal<br />
            <span className="font-normal text-3xl block mt-2">
              (MMPI System)
            </span>
          </h1>
        </div>

        {/* Middle: Form */}
        <div className="flex flex-col gap-6 mt-[5%]">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* Field 1: Username */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="username"
                className="text-md font-medium opacity-90 drop-shadow-sm"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => handleInputChange(setUsername, e.target.value)}
                disabled={isLoading}
                placeholder="Masukkan username"
                className={`w-full px-4 py-3 rounded-lg text-black placeholder-gray-400 bg-white focus:outline-none transition-all shadow-sm ${
                  error
                    ? "ring-2 ring-red-1"
                    : "focus:ring-2 focus:ring-purple-4"
                } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              />
            </div>

            {/* Field 2: Password */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-md font-medium opacity-90 drop-shadow-sm"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => handleInputChange(setPassword, e.target.value)}
                disabled={isLoading}
                placeholder="Masukkan password"
                className={`w-full px-4 py-3 rounded-lg text-black placeholder-gray-400 bg-white focus:outline-none transition-all shadow-sm ${
                  error
                    ? "ring-2 ring-red-1"
                    : "focus:ring-2 focus:ring-purple-4"
                } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              />

              {/* Error Message: Only appears below password */}
              {error && (
                <span className="text-red-1 font-medium text-md mt-1 tracking-wide drop-shadow-sm">
                  Username atau password salah!
                </span>
              )}
            </div>

            {/* [UPDATED] Submit Button with Loading State */}
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
                    Memproses...
                  </>
                ) : (
                  "Masuk sebagai Dokter"
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

export default AdminLogin;
