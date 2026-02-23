// src/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [patientData, setPatientData] = useState<any>(null);

  // Route Guard: Kick out if not logged in
  useEffect(() => {
    const activePesertaStr = localStorage.getItem("active_peserta");
    if (!activePesertaStr) {
      navigate("/", { replace: true });
    } else {
      setPatientData(JSON.parse(activePesertaStr));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("active_peserta");
    navigate("/", { replace: true });
  };

  if (!patientData) return null; // Prevent flicker before redirect

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-blue-600 tracking-wide">
          MMPI Portal Tes
        </h1>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">
              {patientData.nama}
            </p>
            <p className="text-xs text-gray-500">ID: {patientData.idPeserta}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="bg-white p-12 rounded-2xl shadow-lg border border-gray-100 max-w-2xl w-full text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-10 h-10"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12"
              />
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Selamat Datang, {patientData.nama}!
          </h2>
          <p className="text-gray-500 text-lg mb-10 leading-relaxed">
            Data Anda telah berhasil diverifikasi oleh sistem. Klik tombol di
            bawah ini saat Anda sudah siap untuk memulai pengerjaan tes MMPI.
          </p>

          <button className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] text-lg">
            Mulai Tes Sekarang
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
