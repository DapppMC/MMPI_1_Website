import React from "react";
import { type ParticipantData, type MmpiScore } from "../data/participants";
import IconArrowPrev from "../assets/icons/light_mode/arrow_prev.svg";

interface TampilkanDataProps {
  data: ParticipantData;
  onBack: () => void;
}

// Helper to determine K correction value
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

const TampilkanData: React.FC<TampilkanDataProps> = ({ data, onBack }) => {
  const output = data.hasil_output || {};

  // Safe access to raw scores defaulting to 0
  const getScore = (key: keyof typeof output): MmpiScore => {
    return (output[key] as MmpiScore) || { raw: 0, t: 0 };
  };

  const kScore = getScore("K");
  const kRaw = kScore.raw;

  // Define the rows for the chart
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

  // Scales that use K-correction
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

  // Render a single row of the chart
  const renderRow = (label: string, key: string, isClinical: boolean) => {
    const scoreData = getScore(key as any);
    const correction = correctedScales.includes(key)
      ? getKCorrection(kRaw, key)
      : 0;
    const raw = scoreData.raw;
    const newRaw = raw + correction; // Skor Baru
    const tScore = scoreData.t;

    // Calculate bar width (Assuming Max T-Score of 110 for display scaling)
    const maxT = 110;
    const barWidth = Math.min((tScore / maxT) * 100, 100);

    return (
      <div
        key={key}
        className="flex items-center text-sm border-b border-gray-200 hover:bg-gray-50 h-10"
      >
        {/* Columns */}
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

        {/* Graph Area */}
        <div className="flex-1 relative h-full flex items-center px-2">
          {/* Background Grid Lines (30, 50, 70) */}
          {/* Mapping 0 to 110 scale to percentage */}
          <div className="absolute top-0 bottom-0 left-0 w-full flex">
            <div
              className="h-full border-r border-gray-200 border-dashed"
              style={{ width: `${(30 / maxT) * 100}%` }}
            ></div>
            <div
              className="h-full border-r border-gray-300 border-solid"
              style={{ width: `${(20 / maxT) * 100}%` }}
            ></div>{" "}
            {/* +20 to reach 50 */}
            <div
              className="h-full border-r border-gray-200 border-dashed"
              style={{ width: `${(20 / maxT) * 100}%` }}
            ></div>{" "}
            {/* +20 to reach 70 */}
          </div>

          {/* The Bar */}
          <div
            className="h-4 bg-[#B774F2] rounded-r-sm relative z-10 transition-all duration-500 ease-out"
            style={{ width: `${barWidth}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full font-sans bg-white">
      <div className="flex flex-col gap-8 pb-10">
        {/* 2. Patient Data Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-800 border-b border-gray-200 pb-2">
            Informasi Peserta
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 text-sm">
            {/* Column 1 */}
            <div className="space-y-3">
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Nomor ID
                </span>
                <span className="font-semibold text-gray-900">
                  {data.nomorId}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Nama Lengkap
                </span>
                <span className="font-semibold text-gray-900">{data.nama}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  NIK
                </span>
                <span className="font-semibold text-gray-900">{data.nik}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Jenis Kelamin
                </span>
                <span className="font-semibold text-gray-900">
                  {data.jenisKelamin}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Tanggal Lahir
                </span>
                <span className="font-semibold text-gray-900">
                  {data.tanggalLahir}
                </span>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-3">
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Tujuan Pemeriksaan
                </span>
                <span className="font-semibold text-gray-900">
                  {data.tujuanPemeriksaan}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Tanggal Pemeriksaan
                </span>
                <span className="font-semibold text-gray-900">
                  {data.tanggalPemeriksaanDate} - {data.tanggalPemeriksaanTime}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Durasi Pengerjaan
                </span>
                <span className="font-semibold text-gray-900">
                  {data.durasiPengerjaan}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Pendidikan
                </span>
                <span className="font-semibold text-gray-900">
                  {data.pendidikan}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Pekerjaan
                </span>
                <span className="font-semibold text-gray-900">
                  {data.pekerjaan}
                </span>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-3">
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Suku Bangsa
                </span>
                <span className="font-semibold text-gray-900">
                  {data.sukuBangsa}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Status Perkawinan
                </span>
                <span className="font-semibold text-gray-900">
                  {data.statusPerkawinan}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Nomor HP
                </span>
                <span className="font-semibold text-gray-900">
                  {data.nomorHp}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">
                  Alamat
                </span>
                <span className="font-semibold text-gray-900">
                  {data.alamat}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Graph Section */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* Table/Graph Header */}
          <div className="flex items-center bg-gray-50 border-b border-gray-200 text-sm font-bold text-gray-700 h-12">
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

            {/* Axis Labels for Graph */}
            <div className="flex-1 relative h-full">
              <div className="absolute bottom-1 w-full flex text-xs text-gray-500 font-normal">
                {/* Manually positioned based on 110 max scale */}
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

          {/* Validity Scales */}
          <div className="flex flex-col">
            {/* Note: '?' scale is not in JSON, skipping as per instructions */}
            {validityScales.map((key) => renderRow(key, key, false))}

            {/* Divider */}
            <div className="h-4 bg-white"></div>

            {/* Clinical Scales */}
            {clinicalScales.map((key, index) => {
              const label = (index + 1).toString(); // Display just "1", "2" etc or "1 (Hs)" depending on pref. Image shows "1".
              // However, mapping key "1 (Hs)" to label "1"
              const shortLabel =
                index + 1 === 10 ? "0" : (index + 1).toString();
              return renderRow(shortLabel, key, true);
            })}
          </div>

          {/* Research Scales Footer */}
          <div className="bg-white border-t border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-2">
              <span className="font-bold text-sm text-gray-900">
                Skala Penelitian
              </span>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              {researchScales.map((key) => {
                // Handle the single number lookup
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

        {/* Bottom Action */}
        <div className="flex justify-end">
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition shadow-sm"
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
};

export default TampilkanData;
