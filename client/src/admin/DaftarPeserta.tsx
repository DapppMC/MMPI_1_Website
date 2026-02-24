// src/pages/DaftarPeserta.tsx
import React, { useState, useEffect } from "react";
import { type ParticipantData } from "../data/participants";

// --- Icons Import ---
import IconMoreVert from "../assets/icons/light_mode/more_vert.svg";
import IconMoreHoriz from "../assets/icons/light_mode/more_horiz.svg";
import IconArrowNext from "../assets/icons/light_mode/arrow_next.svg";
import IconArrowPrev from "../assets/icons/light_mode/arrow_prev.svg";

// New Dropdown Icons
import IconList from "../assets/icons/light_mode/list.svg";
import IconPrinter from "../assets/icons/light_mode/printer.svg";
import IconEdit from "../assets/icons/light_mode/edit.svg";
import IconDelete from "../assets/icons/light_mode/delete.svg";

// Define Props
interface DaftarPesertaProps {
  onViewDetail: (participant: ParticipantData) => void;
  onPrintMode: () => void;
  onEdit: (participant: ParticipantData) => void; // [NEW] Trigger edit mode
  onDeleteMode: () => void; // [NEW PROP] Trigger delete mode
}

const DaftarPeserta: React.FC<DaftarPesertaProps> = ({
  onViewDetail,
  onPrintMode,
  onEdit, // [NEW]
  onDeleteMode, // [NEW]
}) => {
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        // 1. Get the active doctor's kodeSeri from local storage
        const activeUserStr = localStorage.getItem("active_dokter");
        let kodeSeri = "";

        if (activeUserStr) {
          const activeUser = JSON.parse(activeUserStr);
          // Check both camelCase and snake_case just to be safe
          kodeSeri = activeUser.kodeSeri || activeUser.kode_seri || "";
        }

        // 2. Append it to the API URL as a query parameter
        const url = kodeSeri
          ? `http://localhost:3000/api/peserta?kodeSeri=${kodeSeri}`
          : "http://localhost:3000/api/peserta";

        const response = await fetch(url);
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
      setOpenDropdownIndex(null);
    }
  };

  const toggleDropdown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownIndex(openDropdownIndex === index ? null : index);
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownIndex(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center font-sans text-gray-500">
        Memuat data peserta...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col font-sans">
      {/* Table Container */}
      <div className="w-full overflow-visible border border-gray-6 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-8 text-invert-gray-2 text-sm font-semibold h-12">
              <th className="pl-6 pr-4 py-3 rounded-tl-lg">Nomor ID</th>
              <th className="px-4 py-3">Nama Peserta</th>
              <th className="px-4 py-3">Jenis Kelamin</th>
              <th className="px-4 py-3">Tanggal Pemeriksaan (DD/MM/YYYY)</th>
              <th className="pl-4 pr-6 py-3 rounded-tr-lg w-10"></th>
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
                  <td className="px-4 py-3">
                    {item.tanggalPemeriksaanDate
                      ? new Date(
                          item.tanggalPemeriksaanDate,
                        ).toLocaleDateString("id-ID", {
                          timeZone: "Asia/Jakarta",
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                      : "-"}
                  </td>

                  {/* Actions Column */}
                  <td className="pl-4 pr-6 py-3 text-right">
                    <div className="relative inline-block text-left">
                      <button
                        onClick={(e) => toggleDropdown(index, e)}
                        className={`w-8 h-8 rounded-full transition flex items-center justify-center ${
                          openDropdownIndex === index
                            ? "bg-gray-3"
                            : "hover:bg-gray-3"
                        }`}
                      >
                        <img
                          src={IconMoreVert}
                          alt="Actions"
                          className="w-5 h-5 min-w-5 shrink-0 brightness-0 opacity-60"
                        />
                      </button>

                      {/* FLYING DROPDOWN MENU */}
                      {openDropdownIndex === index && (
                        <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-white border border-gray-6 rounded-lg shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                          <div
                            onClick={() => onViewDetail(item)}
                            className="px-4 py-3 hover:bg-gray-2 cursor-pointer flex items-center gap-3 transition-colors border-t border-gray-1/50"
                          >
                            <img
                              src={IconList}
                              alt="Show"
                              className="w-4 h-4 opacity-70"
                            />
                            <span className="text-invert-gray-2 font-medium">
                              Tampilkan Data
                            </span>
                          </div>

                          <div
                            onClick={onPrintMode}
                            className="px-4 py-3 hover:bg-gray-2 cursor-pointer flex items-center gap-3 transition-colors"
                          >
                            <img
                              src={IconPrinter}
                              alt="Print"
                              className="w-4 h-4 opacity-70"
                            />
                            <span className="text-invert-gray-2 font-medium">
                              Cetak Data
                            </span>
                          </div>

                          {/* [UPDATED] Trigger Edit Mode */}
                          <div
                            onClick={() => onEdit(item)}
                            className="px-4 py-3 hover:bg-gray-2 cursor-pointer flex items-center gap-3 transition-colors"
                          >
                            <img
                              src={IconEdit}
                              alt="Edit"
                              className="w-4 h-4 opacity-70"
                            />
                            <span className="text-invert-gray-2 font-medium">
                              Perbaikan Data
                            </span>
                          </div>

                          <div
                            onClick={onDeleteMode} // [NEW] Attach the click handler here
                            className="px-4 py-3 hover:bg-gray-2 cursor-pointer flex items-center gap-3 transition-colors text-red-1 border-b border-gray-1/50"
                          >
                            <img
                              src={IconDelete}
                              alt="Delete"
                              className="w-4 h-4 opacity-70"
                            />
                            <span className="font-medium">Hapus Data</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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

      {/* Pagination Container */}
      {totalPages > 0 && (
        <div className="flex items-center justify-center mt-8 gap-2">
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

                if (pageNum >= currentPage - 1 && pageNum <= currentPage + 1) {
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
  );
};

export default DaftarPeserta;
