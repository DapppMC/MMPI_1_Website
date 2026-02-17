// src/admin/TampilkanData.tsx
import React, { useState, useEffect } from "react";
import { type ParticipantData, type MmpiScore } from "../data/participants";
import IconArrowPrev from "../assets/icons/light_mode/arrow_prev.svg";

// --- Helper Functions ---
const getKCorrection = (kRaw: number, scale: string): number => {
  switch (scale) {
    case "1 (Hs)":
      return Math.round(0.5 * kRaw);
    case "4 (Pd)":
      return Math.round(0.4 * kRaw);
    case "7 (Pt)":
      return Math.round(1.0 * kRaw);
    case "8 (Sc)":
      return Math.round(1.0 * kRaw);
    case "9 (Ma)":
      return Math.round(0.2 * kRaw);
    default:
      return 0;
  }
};

// --- Reusable Report Component ---
export const PatientReport: React.FC<{ data: ParticipantData }> = ({
  data,
}) => {
  // Gracefully handle undefined output just in case
  const output = data.hasil_output || {};

  console.log("Data Pasien: ");
  console.log(data);

  const getScore = (key: keyof typeof output): MmpiScore => {
    return (output[key] as MmpiScore) || { raw: 0, t: 0 };
  };

  const kScore = getScore("K");
  const kRaw = kScore.raw;

  console.log("kScore: ");
  console.log(kScore);

  const validityScales = ["L", "F", "K"];
  const clinicalScales = [
    "1 (Hs)",
    "2 (D)",
    "3 (Hy)",
    "4 (Pd)",
    "5 (Mf)",
    "6 (Pa)",
    "7 (Pt)",
    "8 (Sc)",
    "9 (Ma)",
    "0 (Si)",
  ];
  const correctedScales = ["1 (Hs)", "4 (Pd)", "7 (Pt)", "8 (Sc)", "9 (Ma)"];
  const researchScales = [
    "A",
    "R",
    "Mas",
    "Es",
    "Lb",
    "Ca",
    "Dy",
    "Do",
    "Re",
    "Pr",
    "St",
    "Cn",
  ];

  const renderRow = (label: string, key: string, isClinical: boolean) => {
    const scoreData = getScore(key as any);
    const correction = correctedScales.includes(key)
      ? getKCorrection(kRaw, key)
      : 0;
    const raw = scoreData.raw;
    const newRaw = raw + correction;
    const tScore = scoreData.t;
    const maxT = 110;
    const barWidth = Math.min((tScore / maxT) * 100, 100);

    return (
      <div
        key={key}
        className="flex items-center text-sm border-b border-gray-200 h-10 print:h-8"
      >
        <div className="w-12 text-center font-medium shrink-0">{label}</div>
        <div className="w-16 text-center text-gray-700 shrink-0">{raw}</div>
        <div className="w-16 text-center text-gray-500 shrink-0">
          {correction > 0 ? correction : ""}
        </div>
        <div className="w-16 text-center font-medium text-gray-900 shrink-0">
          {isClinical && correction > 0 ? newRaw : ""}
        </div>
        <div className="w-16 text-center font-bold text-black shrink-0 border-r border-gray-200">
          {tScore}
        </div>
        <div className="flex-1 relative h-full flex items-center px-2">
          <div className="absolute top-0 bottom-0 left-0 w-full flex">
            <div
              className="h-full border-r border-gray-200 border-dashed"
              style={{ width: `${(30 / maxT) * 100}%` }}
            ></div>
            <div
              className="h-full border-r border-gray-300 border-solid"
              style={{ width: `${(20 / maxT) * 100}%` }}
            ></div>
            <div
              className="h-full border-r border-gray-200 border-dashed"
              style={{ width: `${(20 / maxT) * 100}%` }}
            ></div>
          </div>
          <div
            className="h-4 bg-[#B774F2] rounded-r-sm relative z-10 print:bg-purple-400 print:print-color-adjust-exact"
            style={{ width: `${barWidth}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 pb-10 print:pb-0">
      {/* Patient Data Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 print:border print:bg-gray-50 print:p-4">
        <h3 className="text-lg font-bold mb-4 text-gray-800 border-b border-gray-200 pb-2">
          Informasi Peserta
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 text-sm print:grid-cols-3 print:gap-y-2">
          <div className="space-y-3 print:space-y-1">
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                ID Peserta
              </span>
              <span className="font-semibold">{data.idPeserta || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                Nama Lengkap
              </span>
              <span className="font-semibold">{data.nama || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase">NIK</span>
              <span className="font-semibold">{data.nik || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                Jenis Kelamin
              </span>
              <span className="font-semibold">{data.jenisKelamin || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                Tanggal Lahir
              </span>
              <span className="font-semibold">
                {data.tanggalLahir
                  ? new Date(data.tanggalLahir).toLocaleDateString("id-ID")
                  : "-"}
              </span>
            </div>
          </div>
          <div className="space-y-3 print:space-y-1">
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                Tujuan Pemeriksaan
              </span>
              <span className="font-semibold">
                {data.tujuanPemeriksaan || "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                Tanggal Pemeriksaan
              </span>
              <span className="font-semibold">
                {data.tanggalPemeriksaanDate
                  ? new Date(data.tanggalPemeriksaanDate).toLocaleDateString(
                      "id-ID",
                    )
                  : "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                Durasi
              </span>
              <span className="font-semibold">
                {data.durasiPengerjaan || "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                Pendidikan
              </span>
              <span className="font-semibold">{data.pendidikan || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                Pekerjaan
              </span>
              <span className="font-semibold">{data.pekerjaan || "-"}</span>
            </div>
          </div>
          <div className="space-y-3 print:space-y-1">
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                Suku Bangsa
              </span>
              <span className="font-semibold">{data.sukuBangsa || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                Status Perkawinan
              </span>
              <span className="font-semibold">
                {data.statusPerkawinan || "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                Nomor HP
              </span>
              <span className="font-semibold">{data.nomorHp || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase">
                Alamat
              </span>
              <span className="font-semibold">{data.alamat || "-"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden print:border print:shadow-none">
        <div className="flex items-center bg-gray-50 border-b border-gray-200 text-sm font-bold text-gray-700 h-12 print:bg-gray-100 print:print-color-adjust-exact">
          <div className="w-12 text-center">Skala</div>
          <div className="w-16 text-center leading-tight">
            Skor
            <br />
            Awal
          </div>
          <div className="w-16 text-center leading-tight">Koreksi</div>
          <div className="w-16 text-center leading-tight">
            Skor
            <br />
            Baru
          </div>
          <div className="w-16 text-center leading-tight border-r border-gray-200">
            Skor-T
          </div>
          <div className="flex-1 relative h-full">
            <div className="absolute bottom-1 w-full flex text-xs text-gray-500 font-normal">
              <span
                className="absolute transform -translate-x-1/2"
                style={{ left: `${(30 / 110) * 100}%` }}
              >
                30
              </span>
              <span
                className="absolute transform -translate-x-1/2"
                style={{ left: `${(50 / 110) * 100}%` }}
              >
                50
              </span>
              <span
                className="absolute transform -translate-x-1/2"
                style={{ left: `${(70 / 110) * 100}%` }}
              >
                70
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          {validityScales.map((key) => renderRow(key, key, false))}
          <div className="h-4 bg-white"></div>
          {clinicalScales.map((key, index) =>
            renderRow(
              index + 1 === 10 ? "0" : (index + 1).toString(),
              key,
              true,
            ),
          )}
        </div>

        <div className="bg-white border-t border-gray-200 p-6 print:p-4">
          <div className="flex items-center gap-4 mb-2">
            <span className="font-bold text-sm text-gray-900">
              Skala Penelitian
            </span>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {researchScales.map((key) => {
              const val = (data.hasil_output as any)?.[key] ?? "-";
              return (
                <div key={key} className="flex flex-col items-center">
                  <span className="text-xs font-bold text-gray-500 mb-1">
                    {key}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main TampilkanData Component ---
const TampilkanData: React.FC<{
  data: ParticipantData; // This is the shallow data passed from Dashboard
  onBack: () => void;
}> = ({ data, onBack }) => {
  // --- NEW: State for the Full Database Profile ---
  const [fullProfile, setFullProfile] = useState<ParticipantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW: Fetch Deep Data on Mount ---
  useEffect(() => {
    const fetchDeepData = async () => {
      if (!data?.idPeserta) return;

      try {
        const response = await fetch(
          "http://localhost:3000/api/peserta/report",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            // Send an array with just the single ID
            body: JSON.stringify({ ids: [data.idPeserta] }),
          },
        );

        if (!response.ok)
          throw new Error("Failed to fetch full patient profile");

        const resultData = await response.json();

        // The API returns an array, so we grab the first (and only) result
        if (resultData && resultData.length > 0) {
          setFullProfile(resultData[0]);
        }
      } catch (error) {
        console.error("Error fetching deep profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeepData();
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex w-full h-full items-center justify-center font-sans text-gray-500 mt-10">
        Memuat detail lengkap peserta...
      </div>
    );
  }

  // If the fetch fails or the patient doesn't exist, fallback to the shallow data so the screen doesn't completely break
  const displayData = fullProfile || data;

  return (
    <div className="flex flex-col w-full h-full font-sans bg-white">
      <PatientReport data={displayData} />

      <div className="flex justify-end mt-4">
        <button
          onClick={onBack}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition shadow-sm"
        >
          Kembali
        </button>
      </div>
    </div>
  );
};

export default TampilkanData;
