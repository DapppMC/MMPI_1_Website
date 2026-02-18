// src/admin/Dashboard.tsx
import React, { useState, useEffect, useRef } from "react";

// --- Icons Import ---
import menuCloseIcon from "../assets/icons/light_mode/menu_close.svg";
import menuOpenIcon from "../assets/icons/light_mode/menu_open.svg";
import personIcon from "../assets/icons/light_mode/person.svg";
import arrowDownIcon from "../assets/icons/light_mode/keyboard_arrow_down.svg";
import keyboardIcon from "../assets/icons/light_mode/keyboard.svg";
import groupsIcon from "../assets/icons/light_mode/groups.svg";
import exportIcon from "../assets/icons/light_mode/export.svg";
import importIcon from "../assets/icons/light_mode/import.svg";
import darkModeIcon from "../assets/icons/light_mode/dark_mode.svg";
import swapIcon from "../assets/icons/light_mode/swap_horiz.svg";
import logoutIcon from "../assets/icons/light_mode/move_item.svg";

import menuBlue from "../assets/icons/blue/menu.svg";
import menuOpenBlue from "../assets/icons/blue/menu_open.svg";
import personBlue from "../assets/icons/blue/person.svg";
import arrowDownBlue from "../assets/icons/blue/keyboard_arrow_down.svg";
import keyboardBlue from "../assets/icons/blue/keyboard.svg";
import groupsBlue from "../assets/icons/blue/groups.svg";
import uploadBlue from "../assets/icons/blue/upload.svg";
import downloadBlue from "../assets/icons/blue/download.svg";
import darkModeBlue from "../assets/icons/blue/dark_mode.svg";

// --- Component Imports ---
import PengisianDataDiri, {
  type PengisianDataVariables,
} from "./PengisianDataDiri";
import PengisianDataTest from "./PengisianDataTest";
import DaftarPeserta from "./DaftarPeserta";
import TampilkanData from "./TampilkanData";
import CetakData from "./CetakData";
import PreviewCetak from "./PreviewCetak";
import { type ParticipantData } from "../data/participants";

// --- Helper Component ---
interface SidebarItemProps {
  label: string;
  defaultIcon: string;
  blueIcon: string;
  isSidebarOpen: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  label,
  defaultIcon,
  blueIcon,
  isSidebarOpen,
  isSelected = false,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = isSelected || isHovered;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
        isActive ? "bg-gray-2 text-black" : "text-black hover:bg-gray-2"
      }`}
    >
      <img
        src={isActive ? blueIcon : defaultIcon}
        alt={label}
        className="shrink-0 w-6 h-6"
      />
      <span
        className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
      >
        {label}
      </span>
    </div>
  );
};

const ExportDataContent = () => (
  <h2 className="text-2xl font-bold">Konten Export Data</h2>
);
const ImportDataContent = () => (
  <h2 className="text-2xl font-bold">Konten Import Data</h2>
);

const AdminDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string>("pengisian");
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [pengisianPhase, setPengisianPhase] = useState<1 | 2>(() => {
    const savedData = localStorage.getItem("mmpi_full_data");
    return savedData ? 2 : 1;
  });

  const [pengisianData, setPengisianData] =
    useState<PengisianDataVariables | null>(null);

  const [pesertaViewMode, setPesertaViewMode] = useState<
    "list" | "detail" | "print" | "preview"
  >("list");
  const [dataToPrint, setDataToPrint] = useState<ParticipantData[]>([]);
  const [selectedParticipant, setSelectedParticipant] =
    useState<ParticipantData | null>(null);

  const [hoverMenu, setHoverMenu] = useState(false);
  const [hoverPerson, setHoverPerson] = useState(false);
  const [hoverArrow, setHoverArrow] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleProfileClick = () => console.log("Navigate to Profile");

  const handlePengisianNext = (data: PengisianDataVariables) => {
    setPengisianData(data);
    setPengisianPhase(2);
  };

  const handleTestFinished = () => {
    // [UPDATED] Clear out the edit flag as well when a test finishes!
    localStorage.removeItem("mmpi_full_data");
    localStorage.removeItem("mmpi_phase1_data");
    localStorage.removeItem("mmpi_shuffle_map");
    localStorage.removeItem("mmpi_edit_mode");

    setPengisianPhase(1);
    setPengisianData(null);
    setSelectedFeature("peserta");
    setPesertaViewMode("list");
  };

  const handleViewDetail = (participant: ParticipantData) => {
    setSelectedParticipant(participant);
    setPesertaViewMode("detail");
  };

  const handleBackToList = () => {
    setPesertaViewMode("list");
    setSelectedParticipant(null);
  };

  const handlePrintMode = () => setPesertaViewMode("print");

  const handleExecutePrint = (selectedData: ParticipantData[]) => {
    setDataToPrint(selectedData);
    setPesertaViewMode("preview");
  };

  // --- NEW: HANDLE EDIT PARTICIPANT ---
  const handleEditParticipant = async (participant: ParticipantData) => {
    try {
      // 1. Fetch the deep data for this patient
      const response = await fetch("http://localhost:3000/api/peserta/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [participant.idPeserta] }),
      });

      if (!response.ok) throw new Error("Gagal mengambil data lengkap peserta");
      const data = await response.json();

      if (data && data.length > 0) {
        const fullData = data[0];

        // Helper to format ISO dates into standard YYYY-MM-DD for HTML inputs
        const formatDate = (dateStr: string) => {
          if (!dateStr) return "";
          const d = new Date(dateStr);
          // Prevent timezone shift from pushing date back 1 day
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          return d.toISOString().split("T")[0];
        };

        // Format time to HH:mm (PostgreSQL returns HH:mm:ss)
        const formatTime = (timeStr: string) => {
          if (!timeStr) return "";
          return timeStr.substring(0, 5);
        };

        // 2. Map database fields to the form variables
        const mappedData: PengisianDataVariables = {
          nomorId: fullData.idPeserta || "",
          tujuanPemeriksaan: fullData.tujuanPemeriksaan || "",

          // [FIX] Double-check both naming conventions from the DB
          durasiPengerjaan:
            fullData.durasiPengerjaan || fullData.durasi_pengerjaan || "",

          tanggalPemeriksaanDate: formatDate(fullData.tanggalPemeriksaanDate),
          tanggalPemeriksaanTime: formatTime(fullData.tanggalPemeriksaanTime),
          nik: fullData.nik || "",
          nama: fullData.nama || "",
          tanggalLahir: formatDate(fullData.tanggalLahir),
          jenisKelamin: fullData.jenisKelamin || "",
          sukuBangsa: fullData.sukuBangsa || "",
          pendidikan: fullData.pendidikan || "",
          pekerjaan: fullData.pekerjaan || "",
          statusPerkawinan: fullData.statusPerkawinan || "",
          nomorHp: fullData.nomorHp || "",
          alamat: fullData.alamat || "",
        };

        // 3. Save to localStorage so Phase 1 populates automatically
        localStorage.setItem("mmpi_phase1_data", JSON.stringify(mappedData));

        // Also setup mmpi_full_data so Phase 2 has the ID ready
        const finalJsonData = { ...mappedData, idPeserta: mappedData.nomorId };
        localStorage.setItem("mmpi_full_data", JSON.stringify(finalJsonData));

        // 4. Set the Edit Flag and clear the old shuffle map!
        localStorage.setItem("mmpi_edit_mode", "true");
        localStorage.removeItem("mmpi_shuffle_map");

        // 5. Redirect the view
        setSelectedFeature("pengisian");
        setPengisianPhase(1);
      }
    } catch (error) {
      console.error("Error editing participant:", error);
      alert("Gagal memuat data untuk diperbaiki.");
    }
  };

  const renderContent = () => {
    switch (selectedFeature) {
      case "pengisian":
        if (pengisianPhase === 1) {
          return <PengisianDataDiri onNext={handlePengisianNext} />;
        } else {
          return <PengisianDataTest onFinish={handleTestFinished} />;
        }
      case "peserta":
        if (pesertaViewMode === "detail" && selectedParticipant) {
          return (
            <div className="flex flex-col gap-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-black">MMPI</span>
                <span className="text-gray-3 font-normal">&rsaquo;</span>
                <button
                  onClick={handleBackToList}
                  className="text-black hover:text-blue-3 transition"
                >
                  Daftar Peserta
                </button>
                <span className="text-gray-3 font-normal">&rsaquo;</span>
                <span className="text-black">Detail</span>
              </h2>
              <TampilkanData
                data={selectedParticipant}
                onBack={handleBackToList}
              />
            </div>
          );
        }

        if (pesertaViewMode === "print") {
          return (
            <div className="flex flex-col gap-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-black">MMPI</span>
                <span className="text-gray-3 font-normal">&rsaquo;</span>
                <button
                  onClick={handleBackToList}
                  className="text-black hover:text-blue-600 transition"
                >
                  Daftar Peserta
                </button>
                <span className="text-gray-3 font-normal">&rsaquo;</span>
                <span className="text-black">Cetak Data</span>
              </h2>
              <CetakData
                onCancel={handleBackToList}
                onPrint={handleExecutePrint}
              />
            </div>
          );
        }

        if (pesertaViewMode === "preview") {
          return (
            <PreviewCetak
              dataToPrint={dataToPrint}
              onBack={() => setPesertaViewMode("print")}
            />
          );
        }

        return (
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-black">MMPI</span>
              <span className="text-gray-3 font-normal">&rsaquo;</span>
              <span className="text-black">Daftar Peserta</span>
            </h2>
            {/* [UPDATED] Pass the new onEdit function to DaftarPeserta */}
            <DaftarPeserta
              onViewDetail={handleViewDetail}
              onPrintMode={handlePrintMode}
              onEdit={handleEditParticipant}
            />
          </div>
        );
      case "export":
        return <ExportDataContent />;
      case "import":
        return <ImportDataContent />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full font-sans overflow-hidden bg-white text-black print:h-auto print:overflow-visible">
      {/* ... Header stays exactly the same ... */}
      <header className="h-[10%] w-full bg-gray-5 border-b border-gray-6 flex items-center justify-between px-6 shrink-0 z-20 relative print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-2 rounded-lg transition-colors focus:outline-none"
          >
            <img
              src={isSidebarOpen ? menuCloseIcon : menuOpenIcon}
              alt="Toggle Menu"
              className="w-6 h-6"
            />
          </button>
          <h1 className="text-2xl font-bold tracking-wide">MMPI</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleProfileClick}
            onMouseEnter={() => setHoverPerson(true)}
            onMouseLeave={() => setHoverPerson(false)}
            className="p-2 hover:bg-gray-2 rounded-lg transition-colors focus:outline-none"
            title="Profile"
          >
            <img
              src={hoverPerson ? personBlue : personIcon}
              alt="User"
              className="w-6 h-6"
            />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onMouseEnter={() => setHoverArrow(true)}
              onMouseLeave={() => setHoverArrow(false)}
              className={`p-2 rounded-lg transition-colors focus:outline-none ${isDropdownOpen ? "bg-gray-2" : "hover:bg-gray-2"}`}
            >
              <img
                src={hoverArrow ? arrowDownBlue : arrowDownIcon}
                alt="Dropdown"
                className={`w-5 h-5 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-6 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-6 cursor-pointer transition-colors text-lg font-medium text-black">
                  <img
                    src={swapIcon}
                    alt="Ganti Akun"
                    className="w-5 h-5 opacity-70"
                  />
                  <span>Ganti Akun</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-6 cursor-pointer transition-colors text-lg font-medium text-black">
                  <img
                    src={logoutIcon}
                    alt="Keluar"
                    className="w-5 h-5 opacity-70"
                  />
                  <span>Keluar</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-[90%] w-full relative print:h-auto print:overflow-visible">
        <aside
          className={`bg-gray-5 border-r border-gray-6 flex flex-col py-6 shrink-0 justify-between overflow-hidden transition-all duration-300 ease-in-out print:hidden ${isSidebarOpen ? "w-[20%] opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-10 border-none"}`}
        >
          <div className="flex flex-col gap-1 px-4 min-w-50 font-medium text-xl">
            <SidebarItem
              label="Pengisian Data"
              defaultIcon={keyboardIcon}
              blueIcon={keyboardBlue}
              isSidebarOpen={isSidebarOpen}
              isSelected={selectedFeature === "pengisian"}
              onClick={() => setSelectedFeature("pengisian")}
            />
            <SidebarItem
              label="Daftar Peserta"
              defaultIcon={groupsIcon}
              blueIcon={groupsBlue}
              isSidebarOpen={isSidebarOpen}
              isSelected={selectedFeature === "peserta"}
              onClick={() => {
                setSelectedFeature("peserta");
                setPesertaViewMode("list");
              }}
            />
            <div className="h-px bg-gray-6 my-2 mx-2"></div>
            <SidebarItem
              label="Export Data"
              defaultIcon={exportIcon}
              blueIcon={uploadBlue}
              isSidebarOpen={isSidebarOpen}
              isSelected={selectedFeature === "export"}
              onClick={() => setSelectedFeature("export")}
            />
            <SidebarItem
              label="Import Data"
              defaultIcon={importIcon}
              blueIcon={downloadBlue}
              isSidebarOpen={isSidebarOpen}
              isSelected={selectedFeature === "import"}
              onClick={() => setSelectedFeature("import")}
            />
          </div>
          <div className="px-4 mb-2 min-w-50 font-medium text-xl">
            <SidebarItem
              label="Mode Gelap"
              defaultIcon={darkModeIcon}
              blueIcon={darkModeBlue}
              isSidebarOpen={isSidebarOpen}
              isSelected={isDarkMode}
              onClick={() => setIsDarkMode(!isDarkMode)}
            />
          </div>
        </aside>

        <main className="flex-1 bg-white relative overflow-auto p-8 transition-all duration-300 print:overflow-visible print:h-auto print:p-0 print:absolute print:top-0 print:left-0 print:w-full print:z-50">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
