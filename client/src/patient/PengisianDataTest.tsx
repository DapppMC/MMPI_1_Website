// src/user/PengisianDataTest.tsx
import React, { useState, useEffect } from "react";
import { fetchMMPIQuestions } from "../constants/questions";
import chevronRightIcon from "../assets/icons/light_mode/keyboard_arrow_right.svg";
import errorIcon from "../assets/icons/error.svg";

interface Props {
  onFinish: () => void;
}

const TOTAL_QUESTIONS = 566;

const PengisianDataTest: React.FC<Props> = ({ onFinish }) => {
  const savedData = localStorage.getItem("mmpi_full_data");
  const parsedData = savedData ? JSON.parse(savedData) : {};
  const pasienId = parsedData.idPeserta || "xyz-123";

  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);

  const [answers, setAnswers] = useState<(boolean | null)[]>(
    Array(TOTAL_QUESTIONS).fill(null),
  );

  const [currentDisplayIdx, setCurrentDisplayIdx] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalAnswered = answers.filter((a) => a !== null).length;
  const isAllAnswered = totalAnswered === TOTAL_QUESTIONS;

  const handleForceExit = () => {
    localStorage.removeItem("mmpi_full_data");
    localStorage.removeItem("mmpi_phase1_data");
    localStorage.removeItem("mmpi_shuffle_map");
    localStorage.removeItem("mmpi_edit_mode");
    onFinish();
  };

  // --- INITIAL LOAD FROM DATABASE ---
  useEffect(() => {
    const initializeData = async () => {
      try {
        const qData = await fetchMMPIQuestions();
        setQuestions(qData);

        const progressRes = await fetch(
          `http://localhost:3000/api/jawaban-temp/${pasienId}`,
        );
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          const loadedAnswers = Array(TOTAL_QUESTIONS).fill(null);

          progressData.forEach((item: any) => {
            loadedAnswers[item.soal_id - 1] = item.jawaban === "T";
          });
          setAnswers(loadedAnswers);
        }
      } catch (error) {
        console.error("Gagal memuat data dari database:", error);
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    initializeData();
  }, [pasienId]);

  const realQuestionIdx = currentDisplayIdx;
  const questionText = isLoadingQuestions
    ? "Memuat pertanyaan dari database..."
    : questions[realQuestionIdx] ||
      `Pertanyaan tidak ditemukan untuk indeks ${realQuestionIdx}`;
  const currentAnswer = answers[realQuestionIdx];

  // --- MOUSE CLICK HANDLER (WITH AUTO-SAVE) ---
  const handleAnswer = (val: boolean) => {
    // 1. Update UI state instantly
    setAnswers((prev) => {
      const newArr = [...prev];
      newArr[realQuestionIdx] = val;
      return newArr;
    });

    // 2. Fire-and-forget save to database to prevent data loss
    fetch("http://localhost:3000/api/jawaban-temp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pasien_id: pasienId,
        soal_id: realQuestionIdx + 1,
        jawaban: val ? "T" : "F",
      }),
    }).catch((err) => console.error("Gagal menyimpan progress:", err));
  };

  const changeQuestion = (newDisplayIdx: number) => {
    setCurrentDisplayIdx(newDisplayIdx);
  };

  const handleSelesaiClick = () => {
    setIsModalOpen(true);
  };

  // --- FINAL SUBMIT ---
  const handleConfirmSubmit = async () => {
    try {
      // Replaced microservice trigger with a bulk database save
      await fetch("http://localhost:3000/api/jawaban-temp/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pasien_id: pasienId,
          answers: answers,
        }),
      });

      // 2. [NEW] Stop the timer and update status to 'Selesai'
      await fetch("http://localhost:3000/api/test-status/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pasien_id: pasienId }),
      });

      setIsModalOpen(false);
      onFinish();
    } catch (error) {
      console.error("Submission setup error:", error);
      alert("Terjadi kesalahan sistem saat menyimpan data.");
    }
  };

  const getGridItemClass = (displayIdx: number) => {
    const ans = answers[displayIdx];
    const isCurrent = displayIdx === currentDisplayIdx;
    const base =
      "w-10 h-10 flex items-center justify-center rounded-lg text-sm font-semibold border transition-all cursor-pointer select-none m-0.5";

    if (isCurrent)
      return `${base} bg-purple-2 border-purple-4 text-white ring-2 ring-purple-2 ring-offset-1`;
    if (ans !== null) return `${base} bg-blue-2 border-blue-3 text-white`;
    return `${base} bg-gray-7 border-gray-8 text-black hover:bg-gray-200`;
  };

  return (
    <div
      className="relative flex flex-col h-full w-full max-w-7xl mx-auto overflow-hidden outline-none"
      tabIndex={0}
    >
      {/* Header */}
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-black">
          <span>MMPI</span>
          <img src={chevronRightIcon} alt=">" className="w-5 h-5 opacity-50" />
          <span>Pengisian Data</span>
          <img src={chevronRightIcon} alt=">" className="w-5 h-5 opacity-50" />
          <span>Input Jawaban Tes</span>
        </h2>

        {/* Manual Exit Button */}
        <button
          onClick={() => {
            if (
              window.confirm(
                "Apakah anda yakin ingin membatalkan tes? Semua progress sesi ini akan hilang.",
              )
            ) {
              handleForceExit();
            }
          }}
          className="text-white font-medium text-sm flex items-center gap-1 transition-colors px-3 py-1 rounded-md bg-red-1 hover:bg-red-500"
        >
          <span>Batal / Keluar</span>
        </button>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden">
        {/* Left Column */}
        <div className="w-2/3 flex flex-col gap-6">
          <div className="bg-white rounded-xl p-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black pl-1">
                Pertanyaan {currentDisplayIdx + 1}
              </h3>
            </div>

            <div className="w-full p-6 bg-gray-50 border border-gray-200 rounded-lg mb-6">
              <p
                className={`text-lg font-medium ${isLoadingQuestions ? "text-gray-400 animate-pulse" : "text-gray-800"}`}
              >
                {questionText}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label
                className={`flex-1 flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${currentAnswer === true ? "border-blue-2 bg-blue-50 ring-1 ring-blue-2" : "border-gray-300 hover:bg-gray-50"} ${isLoadingQuestions ? "opacity-50 pointer-events-none" : ""}`}
              >
                <input
                  type="radio"
                  name={`q-${realQuestionIdx}`}
                  checked={currentAnswer === true}
                  onChange={() => handleAnswer(true)}
                  disabled={isLoadingQuestions}
                  className="w-5 h-5 accent-blue-600"
                />
                <span className="text-gray-800 font-medium">Setuju</span>
              </label>

              <label
                className={`flex-1 flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${currentAnswer === false ? "border-blue-2 bg-blue-50 ring-1 ring-blue-2" : "border-gray-300 hover:bg-gray-50"} ${isLoadingQuestions ? "opacity-50 pointer-events-none" : ""}`}
              >
                <input
                  type="radio"
                  name={`q-${realQuestionIdx}`}
                  checked={currentAnswer === false}
                  onChange={() => handleAnswer(false)}
                  disabled={isLoadingQuestions}
                  className="w-5 h-5 accent-blue-600"
                />
                <span className="text-gray-800 font-medium">Tidak Setuju</span>
              </label>
            </div>
          </div>

          <div className="mt-auto flex justify-between items-center w-full">
            <div className="flex gap-4">
              <button
                onClick={() =>
                  changeQuestion(Math.max(0, currentDisplayIdx - 1))
                }
                disabled={currentDisplayIdx === 0 || isLoadingQuestions}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Kembali
              </button>
              <button
                onClick={() =>
                  changeQuestion(
                    Math.min(TOTAL_QUESTIONS - 1, currentDisplayIdx + 1),
                  )
                }
                disabled={
                  currentDisplayIdx === TOTAL_QUESTIONS - 1 ||
                  isLoadingQuestions
                }
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Lanjut
              </button>
            </div>

            <button
              onClick={handleSelesaiClick}
              disabled={isLoadingQuestions}
              className={`px-8 py-2 rounded-lg font-bold text-white transition-all shadow-md ${isAllAnswered ? "bg-blue-600 hover:bg-blue-700 opacity-100" : "bg-blue-400 opacity-60 cursor-pointer"}`}
            >
              Selesai
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-1/3 flex flex-col bg-gray-50 border-l border-gray-200 pl-8">
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-1">Navigasi Soal</h3>
            <p className="text-xs text-gray-500">
              Klik nomor untuk melompat ke soal tersebut
            </p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pl-1 pt-1">
            <div className="grid grid-cols-5 gap-2 pb-4">
              {Array.from({ length: TOTAL_QUESTIONS }).map(
                (_, displayIndex) => (
                  <div
                    key={displayIndex}
                    onClick={() =>
                      !isLoadingQuestions && changeQuestion(displayIndex)
                    }
                    className={`${getGridItemClass(displayIndex)} ${isLoadingQuestions ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {displayIndex + 1}
                  </div>
                ),
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-bold mb-2">Ringkasan</h4>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Jumlah Soal</span>
                <span className="font-semibold">{TOTAL_QUESTIONS}</span>
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
                  {TOTAL_QUESTIONS - totalAnswered}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
          <div className="bg-white rounded-xl shadow-2xl p-8 w-[400px] flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 relative z-10">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <img src={errorIcon} alt="Alert" className="w-10 h-10" />
            </div>

            {!isAllAnswered ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Belum Selesai!
                </h3>
                <p className="text-gray-500 mb-8">
                  Masih ada {TOTAL_QUESTIONS - totalAnswered} soal yang belum
                  terisi.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors"
                >
                  Kembali
                </button>
              </>
            ) : (
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
                    className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
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
