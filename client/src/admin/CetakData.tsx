// src/admin/CetakData.tsx
import React, { useState } from "react";
import { PARTICIPANTS } from "../data/participants"; // Adjust path if needed

// Icons
import IconCheckbox from "../assets/icons/checkbox.svg";
import IconFilledCheckbox from "../assets/icons/filled_checkbox.svg";
import IconArrowNext from "../assets/icons/light_mode/arrow_next.svg";
import IconArrowPrev from "../assets/icons/light_mode/arrow_prev.svg";
import IconMoreHoriz from "../assets/icons/light_mode/more_horiz.svg";

interface CetakDataProps {
  onCancel: () => void;
  // Updated: Returns the indices of the rows to avoid duplicate ID issues
  onPrint: (selectedIndices: number[]) => void;
}

const CetakData: React.FC<CetakDataProps> = ({ onCancel, onPrint }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // [FIX] State now tracks unique row indices (numbers), not IDs (strings)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = PARTICIPANTS.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(PARTICIPANTS.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // [FIX] Toggle logic using Index
  const toggleSelection = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const isSelected = (index: number) => selectedIndices.includes(index);
  const hasSelection = selectedIndices.length > 0;

  return (
    <div className="w-full h-full flex flex-col font-sans">
      {/* Table Container */}
      <div className="w-full overflow-visible border border-gray-6 rounded-lg bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-8 text-invert-gray-2 text-sm font-semibold h-12">
              <th className="pl-6 pr-4 py-3 rounded-tl-lg">Nomor ID</th>
              <th className="px-4 py-3">Nama Peserta</th>
              <th className="px-4 py-3">Jenis Kelamin</th>
              <th className="px-4 py-3">Tanggal Pemeriksaan</th>
              <th className="pl-4 pr-6 py-3 rounded-tr-lg w-10"></th>
            </tr>
          </thead>

          <tbody className="text-sm text-invert-gray-6">
            {currentItems.map((item, index) => {
              // [FIX] Calculate Global Index to ensure uniqueness across pages
              // Page 1: 0-9, Page 2: 10-19, etc.
              const globalIndex = indexOfFirstItem + index;

              return (
                <tr
                  key={`${item.nomorId}-${globalIndex}`} // Ensure key is unique using index
                  className="even:bg-gray-5 odd:bg-white hover:bg-gray-2 transition-colors duration-150 h-12 border-b border-gray-1 last:border-0 cursor-pointer"
                  onClick={() => toggleSelection(globalIndex)}
                >
                  <td className="pl-6 pr-4 py-3 font-medium text-invert-gray-5">
                    {item.nomorId}
                  </td>
                  <td className="px-4 py-3">{item.nama}</td>
                  <td className="px-4 py-3">{item.jenisKelamin}</td>
                  <td className="px-4 py-3">{item.tanggalPemeriksaanDate}</td>

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
                        className="w-5 h-5 min-w-5 cursor-pointer"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Actions & Pagination */}
      <div className="flex items-center justify-between mt-8">
        {/* Cancel Button (Left) */}
        <button
          onClick={onCancel}
          className="bg-red-1 hover:bg-red-600 text-white font-medium py-2 px-6 rounded-lg transition shadow-sm"
        >
          Batal
        </button>

        {/* Pagination (Center) */}
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

        {/* Print Button (Right) */}
        <button
          onClick={() => hasSelection && onPrint(selectedIndices)}
          disabled={!hasSelection}
          className={`font-medium py-2 px-6 rounded-lg transition shadow-sm text-white ${
            hasSelection
              ? "bg-green-2 hover:bg-green-3 opacity-100"
              : "bg-green-2 opacity-50 cursor-not-allowed"
          }`}
        >
          Cetak
        </button>
      </div>
    </div>
  );
};

export default CetakData;
