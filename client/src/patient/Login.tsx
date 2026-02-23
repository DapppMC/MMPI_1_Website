// src/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import loginBg from "../assets/login_bg.png";

const Login: React.FC = () => {
  const [serialNumber, setSerialNumber] = useState("");
  const [error, setError] = useState(false); // New state for error handling
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Check strict equality
    if (serialNumber === "mmpi") {
      navigate("/dashboard");
    } else {
      // Trigger error state if code is wrong
      setError(true);
      setSerialNumber(""); // Optional: clear input on fail
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSerialNumber(e.target.value);
    // Remove error state as soon as user types again
    if (error) setError(false);
  };

  return (
    <div className="relative w-full h-screen font-sans overflow-hidden select-none">
      {/* 1. Background Layer (Full Screen, Z-Index 0) */}
      <div className="absolute inset-0 z-0">
        <img
          src={loginBg}
          alt="Medical Background"
          className="w-full h-full object-cover"
        />
        {/* 2. Black Overlay (20% Opacity) */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[0px]" />
      </div>

      {/* 3. Login Panel (Z-Index 10) */}
      <div className="absolute top-0 bottom-0 left-[60%] w-[30%] z-10 flex flex-col p-12 justify-between text-white">
        {/* Panel Background Gradient */}
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-blue-3 from-15% to-green-3 to-85% border-blue-3 border-2 opacity-95 shadow-2xl"></div>

        {/* Content Section */}

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
                htmlFor="serial"
                className="text-md font-medium opacity-90 drop-shadow-sm"
              >
                Nomor Seri
              </label>

              {/* Input Field with Conditional Styling */}
              <input
                id="serial"
                type="password" // Changed to password for masking (*******) as per your image
                value={serialNumber}
                onChange={handleInputChange}
                placeholder="Masukkan nomor seri di sini"
                className={`w-full px-4 py-3 rounded-lg text-black placeholder-gray-400 bg-white focus:outline-none transition-all shadow-sm ${
                  error
                    ? "ring-2 ring-red-1 focus:ring-red-1" // Error State: Red Ring
                    : "focus:ring-2 focus:ring-purple-4" // Normal State: Purple Ring
                }`}
              />

              {/* Error Message */}
              {error && (
                <span className="text-red-1 font-medium text-md tracking-wide drop-shadow-sm">
                  Masukkan kode seri yang valid!
                </span>
              )}
            </div>

            <button
              type="submit"
              className="group relative w-full py-3 mt-4 rounded-lg bg-linear-to-r from-purple-4 to-purple-2 text-white font-bold tracking-wide shadow-lg hover:shadow-xl transition-all transform active:scale-[0.98] overflow-hidden"
            >
              {/* Overlay Layer: Visible only on hover */}
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-15 transition-opacity duration-200" />

              {/* Text Layer */}
              <span className="relative z-10">Masuk</span>
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
