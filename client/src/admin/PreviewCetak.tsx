// src/admin/PreviewCetak.tsx
import React, { useState, useEffect } from "react";
import { type ParticipantData } from "../data/participants";
import { PatientReport } from "./TampilkanData";

interface PreviewCetakProps {
  dataToPrint: ParticipantData[]; // The shallow data passed from the parent
  onBack: () => void;
}

const PreviewCetak: React.FC<PreviewCetakProps> = ({ dataToPrint, onBack }) => {
  // --- NEW: State to hold the fully populated database records ---
  const [fullPrintData, setFullPrintData] = useState<ParticipantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFullData = async () => {
      try {
        // 1. Extract just the IDs from the shallow data
        const idsToFetch = dataToPrint.map((p) => p.idPeserta);

        if (idsToFetch.length === 0) {
          setFullPrintData([]);
          setIsLoading(false);
          return;
        }

        // 2. Ask the Node server for the deep data
        const response = await fetch(
          "http://localhost:3000/api/peserta/report",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids: idsToFetch }),
          },
        );

        if (!response.ok) throw new Error("Failed to fetch full report data");

        const data = await response.json();
        setFullPrintData(data);
      } catch (error) {
        console.error("Error fetching print data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFullData();
  }, [dataToPrint]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full text-gray-500 font-sans">
        Mengambil data lengkap untuk dicetak...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full font-sans bg-gray-50 print:bg-white">
      {/* Top Action Bar - Hidden when printing */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 print:hidden mb-6 shadow-sm">
        <div className="text-sm text-gray-500">
          Previewing <strong>{fullPrintData.length}</strong> items to print.
        </div>
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Kembali
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium transition shadow-sm"
          >
            Cetak Sekarang
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex flex-col items-center gap-8 pb-10 print:pb-0 print:block print:w-full">
        {/* We map over fullPrintData now, instead of the shallow dataToPrint */}
        {fullPrintData.map((patient, index) => (
          <div
            key={patient.idPeserta || index}
            className="w-[210mm] min-h-[297mm] bg-white shadow-lg p-10 print:shadow-none print:w-full print:min-h-screen print:p-8 print:break-after-page print:mb-0 mb-8 last:mb-0"
          >
            {/* Header per page */}
            <div className="mb-6 border-b border-gray-200 pb-4 flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Hasil Tes MMPI
                </h1>
                <p className="text-sm text-gray-500">
                  Dicetak pada: {new Date().toLocaleDateString("id-ID")}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400">
                  ID: {patient.idPeserta}
                </span>
              </div>
            </div>

            <PatientReport data={patient} />
          </div>
        ))}
      </div>

      {/* Global Print Styles */}
      <style>{`
        @media print {
          @page { 
            margin: 0mm; 
            size: auto;
          }
          
          body { 
            margin: 0; 
            -webkit-print-color-adjust: exact; 
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:w-full { width: 100% !important; }
          
          .print\\:break-after-page { 
            break-after: page; 
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
};

export default PreviewCetak;
