// src/admin/PengisianDataTest.tsx
import React, { useState, useEffect } from "react";
import { MMPI_QUESTIONS } from "../constants/questions";

// Icons
import chevronRightIcon from "../assets/icons/light_mode/keyboard_arrow_right.svg";
import errorIcon from "../assets/icons/error.svg";

interface Props {
  // Optional props
}

const PengisianDataTest: React.FC<Props> = () => {
  // --- State Initialization ---

  // 1. Load Answers
  const [answers, setAnswers] = useState<(boolean | null)[]>(() => {
    const savedData = localStorage.getItem("mmpi_full_data");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      return parsed.testAnswers || Array(566).fill(null);
    }
    return Array(566).fill(null);
  });

  // 2. Load Shuffle Map (Ensures order persists across reloads/navigation)
  const [shuffledIndices, setShuffledIndices] = useState<number[]>(() => {
    const savedShuffle = localStorage.getItem("mmpi_shuffle_map");
    if (savedShuffle) {
      return JSON.parse(savedShuffle);
    }
    const indices = Array.from({ length: 566 }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    localStorage.setItem("mmpi_shuffle_map", JSON.stringify(indices));
    return indices;
  });

  // 3. UI State
  const [currentDisplayIdx, setCurrentDisplayIdx] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Derived State ---
  const totalAnswered = answers.filter((a) => a !== null).length;
  const isAllAnswered = totalAnswered === 566;

  // --- Effects ---
  useEffect(() => {
    const savedData = localStorage.getItem("mmpi_full_data");
    let fullData = savedData ? JSON.parse(savedData) : {};
    fullData.testAnswers = answers;
    localStorage.setItem("mmpi_full_data", JSON.stringify(fullData));
  }, [answers]);

  // --- Handlers ---
  const realQuestionIdx = shuffledIndices[currentDisplayIdx];
  const questionText = MMPI_QUESTIONS[realQuestionIdx];
  const currentAnswer = answers[realQuestionIdx];

  const handleAnswer = (val: boolean) => {
    setAnswers((prev) => {
      const newArr = [...prev];
      newArr[realQuestionIdx] = val;
      return newArr;
    });
  };

  const handleSelesaiClick = () => {
    setIsModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    alert("Data Berhasil Dikumpulkan!"); // Replace with real submit logic
    setIsModalOpen(false);
  };

  // Grid Item Class Logic
  const getGridItemClass = (displayIdx: number) => {
    const realIdx = shuffledIndices[displayIdx];
    const ans = answers[realIdx];
    const isCurrent = displayIdx === currentDisplayIdx;

    // Added 'm-0.5' (margin) to ensure borders don't clip at edges
    const base =
      "w-10 h-10 flex items-center justify-center rounded-lg text-sm font-semibold border transition-all cursor-pointer select-none m-0.5";

    if (isCurrent) {
      return `${base} bg-purple-2 border-purple-4 text-white ring-2 ring-purple-2 ring-offset-1`;
    }
    if (ans !== null) {
      return `${base} bg-blue-2 border-blue-3 text-white`;
    }
    return `${base} bg-gray-7 border-gray-8 text-black hover:bg-gray-200`;
  };

  return (
    <div className="relative flex flex-col h-full w-full max-w-7xl mx-auto overflow-hidden">
      {/* --- Breadcrumb --- */}
      <div className="mb-6 shrink-0">
        <h2 className="text-xl font-bold flex items-center gap-2 text-black">
          <span>MMPI</span>
          <img src={chevronRightIcon} alt=">" className="w-5 h-5 opacity-50" />
          <span>Pengisian Data</span>
          <img src={chevronRightIcon} alt=">" className="w-5 h-5 opacity-50" />
          <span>Input Jawaban Tes</span>
        </h2>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 flex gap-8 overflow-hidden">
        {/* LEFT COLUMN: Question & Controls */}
        <div className="w-2/3 flex flex-col gap-6">
          <div className="bg-white rounded-xl p-1">
            <h3 className="text-xl font-bold mb-4 text-black pl-1">
              Pertanyaan {currentDisplayIdx + 1}
            </h3>

            {/* Question Box */}
            <div className="w-full p-6 bg-gray-50 border border-gray-200 rounded-lg mb-6">
              <p className="text-lg text-gray-800 font-medium">
                {questionText}
              </p>
            </div>

            {/* Answer Options */}
            <div className="flex items-center gap-4">
              <label
                className={`flex-1 flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  currentAnswer === true
                    ? "border-blue-2 bg-blue-50 ring-1 ring-blue-2"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${realQuestionIdx}`}
                  checked={currentAnswer === true}
                  onChange={() => handleAnswer(true)}
                  className="w-5 h-5 accent-blue-600"
                />
                <span className="text-gray-800 font-medium">Ya</span>
              </label>

              <label
                className={`flex-1 flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  currentAnswer === false
                    ? "border-blue-2 bg-blue-50 ring-1 ring-blue-2"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${realQuestionIdx}`}
                  checked={currentAnswer === false}
                  onChange={() => handleAnswer(false)}
                  className="w-5 h-5 accent-blue-600"
                />
                <span className="text-gray-800 font-medium">Tidak</span>
              </label>
            </div>
          </div>

          {/* Navigation Buttons Row */}
          <div className="mt-auto flex justify-between items-center w-full">
            {/* Left Side: Kembali & Lanjut */}
            <div className="flex gap-4">
              <button
                onClick={() =>
                  setCurrentDisplayIdx(Math.max(0, currentDisplayIdx - 1))
                }
                disabled={currentDisplayIdx === 0}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Kembali
              </button>
              <button
                onClick={() =>
                  setCurrentDisplayIdx(Math.min(565, currentDisplayIdx + 1))
                }
                disabled={currentDisplayIdx === 565}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Lanjut
              </button>
            </div>

            {/* Right Side: Selesai */}
            <button
              onClick={handleSelesaiClick}
              className={`px-8 py-2 rounded-lg font-bold text-white transition-all shadow-md ${
                isAllAnswered
                  ? "bg-blue-600 hover:bg-blue-700 opacity-100"
                  : "bg-blue-400 opacity-60 cursor-pointer"
              }`}
            >
              Selesai
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Navigation Grid */}
        <div className="w-1/3 flex flex-col bg-gray-50 border-l border-gray-200 pl-8">
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-1">Navigasi Soal</h3>
            <p className="text-xs text-gray-500">
              Klik nomor untuk melompat ke soal tersebut
            </p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pl-1 pt-1">
            <div className="grid grid-cols-5 gap-2 pb-4">
              {shuffledIndices.map((_, displayIndex) => (
                <div
                  key={displayIndex}
                  onClick={() => setCurrentDisplayIdx(displayIndex)}
                  className={getGridItemClass(displayIndex)}
                >
                  {displayIndex + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-bold mb-2">Ringkasan</h4>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Jumlah Soal</span>
                <span className="font-semibold">566</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Dijawab</span>
                <span className="font-semibold text-blue-600">
                  {totalAnswered}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Belum Dijawab</span>
                <span className="font-semibold text-gray-500">
                  {566 - totalAnswered}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- POP UP MODAL (Fixed Position) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />

          {/* Modal Content */}
          <div className="bg-white rounded-xl shadow-2xl p-8 w-[400px] flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 relative z-10">
            {/* Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <img src={errorIcon} alt="Alert" className="w-10 h-10" />
            </div>

            {!isAllAnswered ? (
              // CASE 1: Incomplete
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Belum Selesai!
                </h3>
                <p className="text-gray-500 mb-8">
                  Masih ada {566 - totalAnswered} soal yang belum terisi.
                  Silakan lengkapi semua jawaban terlebih dahulu.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors"
                >
                  Kembali
                </button>
              </>
            ) : (
              // CASE 2: Complete
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Apakah kamu yakin?
                </h3>
                <p className="text-gray-500 mb-8">
                  Apakah kamu yakin ingin mengumpulkan jawabanmu? Jawaban tidak
                  dapat diubah setelah dikumpulkan.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-lg bg-gray-500 text-white font-semibold hover:bg-gray-600 transition-colors"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                  >
                    Kumpulkan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PengisianDataTest;
