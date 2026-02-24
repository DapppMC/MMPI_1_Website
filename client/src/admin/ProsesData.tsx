// src/admin/ProsesData.tsx
import React, { useState, useEffect } from "react";
import arrowRightIcon from "../assets/icons/light_mode/keyboard_arrow_right.svg";
import IconArrowNext from "../assets/icons/light_mode/arrow_next.svg";
import IconArrowPrev from "../assets/icons/light_mode/arrow_prev.svg";
import IconMoreHoriz from "../assets/icons/light_mode/more_horiz.svg";
import IconCheckbox from "../assets/icons/checkbox.svg";
import IconFilledCheckbox from "../assets/icons/filled_checkbox.svg";

interface ProsesParticipantData {
  idPeserta: string;
  nama: string;
  jenisKelamin: string;
  tanggalPemeriksaanDate: string;
  is_sent: boolean;
}

const ProsesData: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  const [participants, setParticipants] = useState<ProsesParticipantData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // [NEW] Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({
    current: 0,
    total: 0,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData("", "", false);
  }, []);

  const fetchData = async (start: string, end: string, autoSelect: boolean) => {
    setIsLoading(true);
    setError("");

    try {
      const activeUserStr = localStorage.getItem("active_dokter");
      let kodeSeri = "";

      if (activeUserStr) {
        const activeUser = JSON.parse(activeUserStr);
        kodeSeri = activeUser.kodeSeri || activeUser.kode_seri || "";
      }

      // [UPDATED] Pointing to the new specialized endpoint
      const url = new URL("http://localhost:3000/api/peserta-proses");
      if (kodeSeri) url.searchParams.append("kodeSeri", kodeSeri);
      if (start) url.searchParams.append("startDate", start);
      if (end) url.searchParams.append("endDate", end);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Network response was not ok");

      const data: ProsesParticipantData[] = await response.json();
      setParticipants(data);

      if (autoSelect) {
        const unassessedIds = data
          .filter((p) => !p.is_sent)
          .map((p) => p.idPeserta);
        setSelectedIds(unassessedIds);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Terjadi kesalahan saat mengambil data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      setError("Mohon isi kedua tanggal terlebih dahulu.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("Tanggal akhir tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    setCurrentPage(1);
    fetchData(startDate, endDate, true);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  // [UPDATED] Sequential processing logic
  const handleNilaiTesClick = async () => {
    if (selectedIds.length === 0) return;

    // Confirm before starting a potentially long process
    if (
      !window.confirm(
        `Mulai menilai ${selectedIds.length} data? Proses ini mungkin memakan waktu beberapa saat karena bot memproses satu per satu.`,
      )
    ) {
      return;
    }

    setIsProcessing(true);
    setProcessProgress({ current: 0, total: selectedIds.length });

    let successCount = 0;
    let failCount = 0;

    // Loop sequentially using a standard for-loop
    for (let i = 0; i < selectedIds.length; i++) {
      const currentId = selectedIds[i];

      // Find the participant's gender from our local state
      const participant = participants.find((p) => p.idPeserta === currentId);
      if (!participant) {
        failCount++;
        continue;
      }

      // Map 'Pria'/'Wanita' to 'Male'/'Female' for your Python script
      const mappedGender =
        participant.jenisKelamin === "Wanita" ? "Female" : "Male";

      try {
        // Adjust the URL if your route is named differently!
        const response = await fetch("http://localhost:3000/api/process-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pasien_id: currentId,
            gender: mappedGender,
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          console.error(
            `Gagal menilai ID ${currentId} - Server merespon dengan error`,
          );
          failCount++;
        }
      } catch (error) {
        console.error(`Gagal menilai ID ${currentId}:`, error);
        failCount++;
      }

      // Update progress after each iteration
      setProcessProgress({ current: i + 1, total: selectedIds.length });
    }

    // Finish up
    setIsProcessing(false);
    setProcessProgress({ current: 0, total: 0 });
    setSelectedIds([]); // Clear selection

    // Refresh the table to show updated "Sudah Dinilai" statuses
    fetchData(startDate, endDate, false);

    // Summary Alert
    alert(
      `Proses Penilaian Selesai!\nBerhasil: ${successCount}\nGagal: ${failCount}`,
    );
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = participants.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(participants.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto font-sans relative">
      <div className="mb-8 shrink-0">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-black">
          <span>MMPI</span>
          <img src={arrowRightIcon} alt="arrow" className="w-5 h-5" />
          <span>Proses Data Test</span>
        </h2>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-4 pb-24">
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
                  disabled={isLoading}
                  className={`bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-lg font-bold text-sm transition-colors shadow-md h-[50px] ${
                    isLoading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isLoading ? "Memuat..." : "Cari"}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm font-medium">{error}</p>
            )}
          </form>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <h3 className="font-bold text-lg text-black">
              Data Ujian Peserta
              <span className="text-gray-500 font-normal text-sm ml-2">
                ({participants.length} total)
              </span>
            </h3>
          </div>

          <div className="w-full overflow-visible border border-gray-6 rounded-lg bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-8 text-invert-gray-2 text-sm font-semibold h-12">
                  <th className="pl-6 pr-4 py-3 rounded-tl-lg">Nomor ID</th>
                  <th className="px-4 py-3">Nama Peserta</th>
                  <th className="px-4 py-3">Jenis Kelamin</th>
                  <th className="px-4 py-3">
                    Tanggal Pemeriksaan (DD/MM/YYYY)
                  </th>
                  <th className="px-4 py-3 text-center">Status Penilaian</th>
                  <th className="pl-4 pr-6 py-3 rounded-tr-lg text-right"></th>
                </tr>
              </thead>

              <tbody className="text-sm text-invert-gray-6">
                {isLoading && participants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-gray-500 font-medium"
                    >
                      Memuat data...
                    </td>
                  </tr>
                ) : currentItems.length > 0 ? (
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
                      <td className="px-4 py-3">
                        {/* [UPDATED] en-GB explicitly forces DD/MM/YYYY formatting */}
                        {item.tanggalPemeriksaanDate
                          ? new Date(
                              item.tanggalPemeriksaanDate,
                            ).toLocaleDateString("en-GB")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {item.is_sent ? (
                          <span className="text-green-600">Sudah Dinilai</span>
                        ) : (
                          <span className="text-red-600">Belum Dinilai</span>
                        )}
                      </td>
                      <td className="pl-4 pr-6 py-3 text-right">
                        <div className="flex items-center justify-end">
                          <img
                            src={
                              isSelected(item.idPeserta)
                                ? IconFilledCheckbox
                                : IconCheckbox
                            }
                            alt="Select"
                            onClick={() => toggleSelection(item.idPeserta)}
                            className={`w-6 h-6 min-w-6 cursor-pointer transition-all ${
                              isSelected(item.idPeserta)
                                ? "filter saturate-200 scale-110"
                                : "opacity-50 hover:opacity-100"
                            }`}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-gray-500 font-medium"
                    >
                      Tidak ada data peserta ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ... Pagination stays exactly the same ... */}
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
      </div>

      <div className="absolute bottom-6 right-6 z-10">
        <button
          onClick={handleNilaiTesClick}
          disabled={selectedIds.length === 0 || isProcessing}
          className={`px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl flex items-center gap-2 ${
            selectedIds.length === 0 || isProcessing
              ? "bg-gray-500 text-gray-200 opacity-50 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700 hover:scale-105"
          }`}
        >
          {isProcessing ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Memproses ({processProgress.current}/{processProgress.total})...
            </>
          ) : (
            `Nilai Tes (${selectedIds.length})`
          )}
        </button>
      </div>
    </div>
  );
};;;

export default ProsesData;
