// src/admin/BuatAkunPasien.tsx
import React, { useState } from "react";
import arrowRightIcon from "../assets/icons/light_mode/keyboard_arrow_right.svg";

interface GeneratedAccount {
  pasienId: string;
  kodeKeluar: string;
  testDate: string;
}

const BuatAkunPasien: React.FC = () => {
  // Default to today's date
  const today = new Date();
  // Adjust for timezone offset to get correct YYYY-MM-DD local date
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  const defaultDate = today.toISOString().split("T")[0];

  const [testDate, setTestDate] = useState(defaultDate);
  const [accountCount, setAccountCount] = useState<number | "">(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedData, setGeneratedData] = useState<GeneratedAccount[]>([]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!testDate) {
      setError("Mohon pilih tanggal tes.");
      return;
    }
    if (!accountCount || accountCount < 1 || accountCount > 100) {
      setError("Jumlah akun harus antara 1 hingga 100.");
      return;
    }

    setIsLoading(true);

    try {
      // Grab doctor's kodeSeri from local storage
      const activeUserStr = localStorage.getItem("active_dokter");
      let kodeSeri = "DOC"; // Default fallback
      if (activeUserStr) {
        const activeUser = JSON.parse(activeUserStr);
        kodeSeri = activeUser.kodeSeri || activeUser.kode_seri || "DOC";
      }

      const response = await fetch(
        "http://localhost:3000/api/peserta/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testDate,
            count: Number(accountCount),
            kodeSeri,
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setGeneratedData(data.accounts);
      } else {
        setError(data.error || "Gagal membuat akun.");
      }
    } catch (err) {
      console.error("Generate error:", err);
      setError("Terjadi kesalahan koneksi ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto font-sans relative">
      {/* Header */}
      <div className="mb-8 shrink-0">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-black">
          <span>MMPI</span>
          <img src={arrowRightIcon} alt="arrow" className="w-5 h-5" />
          <span>Buat Akun Pasien</span>
        </h2>
      </div>

      <div className="flex-1 flex flex-col gap-8 overflow-y-auto custom-scrollbar pr-4 pb-24">
        {/* Input Form Card */}
        <div className="bg-white p-8 rounded-xl border border-gray-300 shadow-sm">
          <h3 className="font-bold text-xl text-black mb-6 border-b pb-4">
            Pengaturan Generate Akun
          </h3>

          <form onSubmit={handleGenerate} className="flex flex-col gap-6">
            <div className="flex gap-8">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Tanggal Tes (MM/DD/YYYY)
                </label>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase text-gray-700"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Digunakan sebagai bagian dari ID (DDMMYYYY).
                </p>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Jumlah Pasien
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={accountCount}
                  onChange={(e) =>
                    setAccountCount(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder="Misal: 5"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Maksimal 100 akun dalam satu kali generate.
                </p>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm font-semibold">{error}</p>
            )}

            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-lg font-bold transition-all shadow-md flex items-center gap-2 ${
                  isLoading
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:scale-[1.02]"
                }`}
              >
                {isLoading && (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                {isLoading ? "Membuat Akun..." : "Generate Akun"}
              </button>
            </div>
          </form>
        </div>

        {/* Results Card */}
        {generatedData.length > 0 && (
          <div className="bg-white p-8 rounded-xl border border-green-300 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-bold text-xl text-green-700 mb-2">
              Berhasil Dibuat!
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Berikut adalah ID yang telah berhasil didaftarkan
              ke database. Silakan berikan kredensial ini kepada peserta.
            </p>

            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-sm font-bold h-12">
                    <th className="pl-6 pr-4 py-3 border-b">No.</th>
                    <th className="px-4 py-3 border-b">ID Peserta</th>
                    {/* <th className="px-4 py-3 border-b">Kode Keluar</th> */}
                    <th className="px-4 py-3 border-b">Tanggal Tes</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-700">
                  {generatedData.map((acc, index) => (
                    <tr
                      key={acc.pasienId}
                      className="hover:bg-gray-50 transition-colors border-b last:border-0"
                    >
                      <td className="pl-6 pr-4 py-4 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 font-mono font-bold text-blue-700 text-base">
                        {acc.pasienId}
                      </td>
                      {/* <td className="px-4 py-4 font-mono font-bold tracking-widest text-red-600 text-base">
                        {acc.kodeKeluar}
                      </td> */}
                      <td className="px-4 py-4">
                        {new Date(acc.testDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuatAkunPasien;
