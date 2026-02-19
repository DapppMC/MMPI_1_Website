// src/admin/HapusData.tsx
import React, { useState, useEffect } from "react";
import { type ParticipantData } from "../data/participants";

// Icons
import IconCheckbox from "../assets/icons/checkbox.svg";
import IconFilledCheckbox from "../assets/icons/filled_checkbox.svg";
import IconArrowNext from "../assets/icons/light_mode/arrow_next.svg";
import IconArrowPrev from "../assets/icons/light_mode/arrow_prev.svg";
import IconMoreHoriz from "../assets/icons/light_mode/more_horiz.svg";
import IconDelete from "../assets/icons/light_mode/delete.svg";
import errorIcon from "../assets/icons/error.svg"; // [NEW] Used for the modal

interface HapusDataProps {
  onCancel: () => void;
  onDelete?: (selectedParticipants: ParticipantData[]) => void;
}

const HapusData: React.FC<HapusDataProps> = ({ onCancel, onDelete }) => {
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // --- NEW: Modal States ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/peserta");
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        setParticipants(data);
      } catch (error) {
        console.error("Failed to fetch participants:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParticipants();
  }, []);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = participants.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(participants.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const toggleSelection = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const isSelected = (index: number) => selectedIndices.includes(index);
  const hasSelection = selectedIndices.length > 0;

  // --- NEW: API Call to execute the deletion ---
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      // 1. Extract the actual patient IDs
      const idsToDelete = selectedIndices.map(
        (index) => participants[index].idPeserta,
      );

      // 2. Call the new backend endpoint
      const response = await fetch("http://localhost:3000/api/peserta/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      if (!response.ok) throw new Error("Gagal menghapus data dari database");

      // 3. Close modal and return to Dashboard list
      setIsModalOpen(false);

      // We use onCancel here because it triggers handleBackToList in Dashboard,
      // which safely remounts DaftarPeserta so it fetches the newly updated list!
      onCancel();
    } catch (error) {
      console.error("Delete Error:", error);
      alert("Terjadi kesalahan saat menghapus data.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center font-sans">
        Memuat data peserta...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col font-sans relative">
      {/* Warning Banner */}
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
        <img src={IconDelete} alt="Warning" className="w-5 h-5 opacity-70" />
        <p className="text-sm font-medium">
          Pilih data peserta yang ingin Anda hapus secara permanen dari sistem.
        </p>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-visible border border-gray-6 rounded-lg bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-8 text-invert-gray-2 text-sm font-semibold h-12">
              <th className="pl-6 pr-4 py-3 rounded-tl-lg">Nomor ID</th>
              <th className="px-4 py-3">Nama Peserta</th>
              <th className="px-4 py-3">Jenis Kelamin</th>
              <th className="px-4 py-3">Tanggal Pemeriksaan (DD/MM/YYYY)</th>
              <th className="pl-4 pr-6 py-3 rounded-tr-lg w-10 text-right">
                Hapus
              </th>
            </tr>
          </thead>

          <tbody className="text-sm text-invert-gray-6">
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => {
                const globalIndex = indexOfFirstItem + index;

                return (
                  <tr
                    key={`${item.idPeserta}-${globalIndex}`}
                    className={`transition-colors duration-150 h-12 border-b border-gray-1 last:border-0 cursor-pointer ${
                      isSelected(globalIndex)
                        ? "bg-red-50 hover:bg-red-100"
                        : "even:bg-gray-5 odd:bg-white hover:bg-gray-2"
                    }`}
                    onClick={() => toggleSelection(globalIndex)}
                  >
                    <td className="pl-6 pr-4 py-3 font-medium text-invert-gray-5">
                      {item.idPeserta}
                    </td>
                    <td className="px-4 py-3">{item.nama}</td>
                    <td className="px-4 py-3">{item.jenisKelamin}</td>
                    <td className="px-4 py-3">
                      {item.tanggalPemeriksaanDate
                        ? new Date(
                            item.tanggalPemeriksaanDate,
                          ).toLocaleDateString("id-ID")
                        : "-"}
                    </td>

                    {/* Checkbox Column */}
                    <td className="pl-4 pr-6 py-3 text-right">
                      <div className="flex items-center justify-end">
                        <img
                          src={
                            isSelected(globalIndex)
                              ? IconFilledCheckbox
                              : IconCheckbox
                          }
                          alt="Select"
                          className={`w-5 h-5 min-w-5 cursor-pointer ${isSelected(globalIndex) ? "filter hue-rotate-180 saturate-200" : ""}`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-500">
                  Tidak ada data peserta ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Actions & Pagination */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={onCancel}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition shadow-sm"
        >
          Batal
        </button>

        {/* Pagination Container */}
        {totalPages > 0 && (
          <div className="flex items-center gap-2">
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

        {/* Delete Button - Triggers Modal */}
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={!hasSelection}
          className={`font-medium py-2 px-6 rounded-lg transition shadow-sm text-white flex items-center gap-2 ${
            hasSelection
              ? "bg-red-600 hover:bg-red-700 opacity-100"
              : "bg-red-400 opacity-50 cursor-not-allowed"
          }`}
        >
          <img
            src={IconDelete}
            alt="Delete"
            className="w-4 h-4 filter invert brightness-0"
          />
          Hapus Terpilih
        </button>
      </div>

      {/* --- POP UP MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
          <div className="bg-white rounded-xl shadow-2xl p-8 w-[400px] flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 relative z-10">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <img src={errorIcon} alt="Alert" className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Apakah kamu yakin?
            </h3>
            <p className="text-gray-500 mb-8">
              Kamu akan menghapus <strong>{selectedIndices.length}</strong> data
              peserta. Tindakan ini tidak dapat dibatalkan, dan seluruh hasil
              tes terkait akan dihapus secara permanen.
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-lg bg-gray-500 text-white font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Yakin, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HapusData;
