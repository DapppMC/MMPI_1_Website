// src/admin/ExportData.tsx
import React, { useState } from "react";
import arrowRightIcon from "../assets/icons/light_mode/keyboard_arrow_right.svg";
import { type ParticipantData } from "../data/participants";
import IconArrowNext from "../assets/icons/light_mode/arrow_next.svg";
import IconArrowPrev from "../assets/icons/light_mode/arrow_prev.svg";
import IconMoreHoriz from "../assets/icons/light_mode/more_horiz.svg";
import exportIcon from "../assets/icons/light_mode/export.svg";
import IconPrinter from "../assets/icons/light_mode/printer.svg"; // [NEW] Icon for printing

interface ExportDataProps {
  onPrintAll: (data: ParticipantData[]) => void; // [NEW] Prop to trigger PreviewCetak
}

const ExportData: React.FC<ExportDataProps> = ({ onPrintAll }) => {
  // State for Date Pickers
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  // State for Table Data
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // [NEW] Loading state for CSV generation

  // State for Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      setError("Mohon isi kedua tanggal terlebih dahulu.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("Tanggal akhir tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    setError("");
    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(1);

    try {
      const activeUserStr = localStorage.getItem("active_dokter");
      let kodeSeri = "";

      if (activeUserStr) {
        const activeUser = JSON.parse(activeUserStr);
        kodeSeri = activeUser.kodeSeri || activeUser.kode_seri || "";
      }

      const url = new URL("http://localhost:3000/api/peserta");
      if (kodeSeri) url.searchParams.append("kodeSeri", kodeSeri);
      url.searchParams.append("startDate", startDate);
      url.searchParams.append("endDate", endDate);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();
      setParticipants(data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Terjadi kesalahan saat mengambil data.");
    } finally {
      setIsSearching(false);
    }
  };

  // [UPDATED] Deep Fetch for Detailed CSV
  const handleExportCSV = async () => {
    if (participants.length === 0) return;
    setIsExporting(true);

    try {
      // 1. Grab all the IDs from the current search results
      const idsToFetch = participants.map((p) => p.idPeserta);

      // 2. Fetch the deep data using the report endpoint
      const response = await fetch("http://localhost:3000/api/peserta/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToFetch }),
      });

      if (!response.ok)
        throw new Error("Gagal memuat data lengkap dari server.");
      const fullData = await response.json();

      // 3. Define the CSV Headers
      const headers = [
        "Nomor ID",
        "NIK",
        "Nama Peserta",
        "Jenis Kelamin",
        "Tanggal Lahir",
        "Suku Bangsa",
        "Pendidikan",
        "Pekerjaan",
        "Status Perkawinan",
        "Nomor HP",
        "Alamat",
        "Tujuan Pemeriksaan",
        "Tanggal Pemeriksaan",
        "Waktu Pemeriksaan",
        "Durasi Pengerjaan",
        "Hasil Output",
      ].join(",");

      // 4. [UPDATED] Map the data to rows with JSON handling
      const safeString = (str: any) => {
        if (str === null || str === undefined) return '"-"';

        // If the data is a JSON object/array (like your test_output), stringify it!
        if (typeof str === "object") {
          str = JSON.stringify(str);
        }

        // Wrap in quotes and escape internal quotes for safe CSV formatting
        return `"${String(str).replace(/"/g, '""')}"`;
      };

      const rows = fullData
        .map((p: any) => {
          const dateLahir = p.tanggalLahir
            ? new Date(p.tanggalLahir).toLocaleDateString("id-ID")
            : "-";
          const datePemeriksaan = p.tanggalPemeriksaanDate
            ? new Date(p.tanggalPemeriksaanDate).toLocaleDateString("id-ID")
            : "-";

          return [
            safeString(p.idPeserta),
            safeString(p.nik),
            safeString(p.nama),
            safeString(p.jenisKelamin),
            safeString(dateLahir),
            safeString(p.sukuBangsa),
            safeString(p.pendidikan),
            safeString(p.pekerjaan),
            safeString(p.statusPerkawinan),
            safeString(p.nomorHp),
            safeString(p.alamat),
            safeString(p.tujuanPemeriksaan),
            safeString(datePemeriksaan),
            safeString(p.tanggalPemeriksaanTime),
            safeString(p.durasiPengerjaan),
            safeString(p.hasil_output), // The giant string from the bot!
          ].join(",");
        })
        .join("\n");

      // 5. Trigger download
      const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `MMPI_Export_${startDate}_to_${endDate}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("CSV Export Error:", err);
      alert("Terjadi kesalahan saat menyiapkan file CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = participants.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(participants.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="mb-8 shrink-0">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-black">
          <span>MMPI</span>
          <img src={arrowRightIcon} alt="arrow" className="w-5 h-5" />
          <span>Export Data</span>
        </h2>
      </div>

      <div className="flex-1 flex flex-col gap-8 overflow-y-auto custom-scrollbar pr-4 pb-8">
        {/* Date Filter Section */}
        <div className="bg-white p-6 rounded-xl border border-gray-300 shadow-sm">
          <h3 className="font-bold text-lg text-black mb-4">
            Pilih Rentang Waktu
          </h3>

          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setError("");
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-2 uppercase text-gray-700"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setError("");
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-2 uppercase text-gray-700"
                />
              </div>

              <div className="flex items-end self-end">
                <button
                  type="submit"
                  disabled={isSearching}
                  className={`bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-lg font-bold text-sm transition-colors shadow-md h-[50px] ${isSearching ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {isSearching ? "Mencari..." : "Cari Data"}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm font-medium">{error}</p>
            )}
          </form>
        </div>

        {/* Results Section */}
        {hasSearched && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
              <h3 className="font-bold text-lg text-black">
                Hasil Pencarian{" "}
                <span className="text-gray-500 font-normal text-sm ml-2">
                  ({participants.length} data ditemukan)
                </span>
              </h3>

              {participants.length > 0 && (
                <div className="flex gap-3">
                  {/* [NEW] Cetak Semua Button */}
                  <button
                    onClick={() => onPrintAll(participants)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2"
                  >
                    <img
                      src={IconPrinter}
                      alt="Print"
                      className="w-4 h-4 filter invert brightness-0"
                    />
                    Cetak Semua
                  </button>

                  {/* [UPDATED] Export CSV Button */}
                  <button
                    onClick={handleExportCSV}
                    disabled={isExporting}
                    className={`bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2 ${isExporting ? "opacity-70 cursor-wait" : ""}`}
                  >
                    <img
                      src={exportIcon}
                      alt="Export"
                      className="w-4 h-4 filter invert brightness-0"
                    />
                    {isExporting ? "Menyiapkan CSV..." : "Download CSV"}
                  </button>
                </div>
              )}
            </div>

            <div className="w-full overflow-visible border border-gray-6 rounded-lg bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-8 text-invert-gray-2 text-sm font-semibold h-12">
                    <th className="pl-6 pr-4 py-3 rounded-tl-lg">Nomor ID</th>
                    <th className="px-4 py-3">Nama Peserta</th>
                    <th className="px-4 py-3">Jenis Kelamin</th>
                    <th className="pl-4 pr-6 py-3 rounded-tr-lg text-right">
                      Tanggal Pemeriksaan
                    </th>
                  </tr>
                </thead>

                <tbody className="text-sm text-invert-gray-6">
                  {currentItems.length > 0 ? (
                    currentItems.map((item, index) => (
                      <tr
                        key={`${item.idPeserta}-${index}`}
                        className="even:bg-gray-5 odd:bg-white hover:bg-gray-2 transition-colors duration-150 h-12 border-b border-gray-1 last:border-0"
                      >
                        <td className="pl-6 pr-4 py-3 font-medium text-invert-gray-5">
                          {item.idPeserta}
                        </td>
                        <td className="px-4 py-3">{item.nama}</td>
                        <td className="px-4 py-3">{item.jenisKelamin}</td>
                        <td className="pl-4 pr-6 py-3 text-right">
                          {item.tanggalPemeriksaanDate
                            ? new Date(
                                item.tanggalPemeriksaanDate,
                              ).toLocaleDateString("id-ID")
                            : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-8 text-gray-500"
                      >
                        {isSearching
                          ? "Memuat..."
                          : "Tidak ada data peserta pada rentang waktu ini."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Container */}
            {totalPages > 0 && (
              <div className="flex items-center justify-center mt-4 gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                    currentPage === 1
                      ? "bg-gray-2 cursor-not-allowed"
                      : "bg-blue-2 hover:bg-blue-4"
                  }`}
                >
                  <img
                    src={IconArrowPrev}
                    alt="Previous"
                    className={`w-5 h-5 ${currentPage === 1 ? "brightness-0 opacity-40" : ""}`}
                  />
                </button>

                <button
                  onClick={() => handlePageChange(1)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                    currentPage === 1
                      ? "bg-blue-3 text-white border-blue-3"
                      : "bg-white text-gray-3 border-gray-6 hover:bg-gray-5"
                  }`}
                >
                  1
                </button>

                {currentPage > 3 && (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={IconMoreHoriz}
                      alt="..."
                      className="w-5 h-5 opacity-40 brightness-0"
                    />
                  </div>
                )}

                {totalPages > 1 && (
                  <>
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      if (pageNum === 1 || pageNum === totalPages) return null;

                      if (
                        pageNum >= currentPage - 1 &&
                        pageNum <= currentPage + 1
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? "bg-blue-3 text-white border-blue-3"
                                : "bg-white text-gray-3 border-gray-6 hover:bg-gray-5"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      return null;
                    })}
                  </>
                )}

                {currentPage < totalPages - 2 && (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={IconMoreHoriz}
                      alt="..."
                      className="w-5 h-5 opacity-40 brightness-0"
                    />
                  </div>
                )}

                {totalPages > 1 && (
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                      currentPage === totalPages
                        ? "bg-blue-3 text-white border-blue-3"
                        : "bg-white text-gray-3 border-gray-6 hover:bg-gray-5"
                    }`}
                  >
                    {totalPages}
                  </button>
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? "bg-gray-2 cursor-not-allowed"
                      : "bg-blue-2 hover:bg-blue-4"
                  }`}
                >
                  <img
                    src={IconArrowNext}
                    alt="Next"
                    className={`w-5 h-5 ${currentPage === totalPages ? "brightness-0 opacity-40" : ""}`}
                  />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportData;
