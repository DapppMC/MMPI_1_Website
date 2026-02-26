// src/user/Dashboard.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// --- Icons Import ---
import menuCloseIcon from "../assets/icons/light_mode/menu_close.svg";
import menuOpenIcon from "../assets/icons/light_mode/menu_open.svg";
import arrowDownIcon from "../assets/icons/light_mode/keyboard_arrow_down.svg";
import keyboardIcon from "../assets/icons/light_mode/keyboard.svg";
import logoutIcon from "../assets/icons/light_mode/move_item.svg";
import errorIcon from "../assets/icons/error.svg";

import arrowDownBlue from "../assets/icons/blue/keyboard_arrow_down.svg";
import keyboardBlue from "../assets/icons/blue/keyboard.svg";

// --- Component Imports ---
import PengisianDataDiri, {
  type PengisianDataVariables,
} from "./PengisianDataDiri";
import PengisianDataTest from "./PengisianDataTest";

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

const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const activePeserta = localStorage.getItem("active_peserta");
    if (!activePeserta) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string>("pengisian");

  const [pengisianPhase, setPengisianPhase] = useState<1 | 2>(() => {
    const savedData = localStorage.getItem("mmpi_full_data");
    return savedData ? 2 : 1;
  });

  const [pengisianData, setPengisianData] =
    useState<PengisianDataVariables | null>(null);

  // --- [NEW] Exit Modal States ---
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitCode, setExitCode] = useState("");
  const [exitError, setExitError] = useState("");
  const [isVerifyingExit, setIsVerifyingExit] = useState(false);

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

  const handlePengisianNext = (data: PengisianDataVariables) => {
    setPengisianData(data);
    setPengisianPhase(2);
  };

  const handleTestFinished = () => {
    localStorage.removeItem("mmpi_full_data");
    localStorage.removeItem("mmpi_phase1_data");
    localStorage.removeItem("mmpi_shuffle_map");
    localStorage.removeItem("mmpi_edit_mode");
    localStorage.removeItem("active_peserta");
    navigate("/finish", { replace: true });
  };

  // --- [UPDATED] Authorized Logout Logic ---
  const handleVerifyExit = async () => {
    if (!exitCode || exitCode.length < 6) {
      setExitError("Kode keluar harus terdiri dari 6 digit.");
      return;
    }

    setIsVerifyingExit(true);
    setExitError("");

    try {
      const activePesertaStr = localStorage.getItem("active_peserta");
      if (!activePesertaStr) return; // Failsafe

      const activePeserta = JSON.parse(activePesertaStr);
      const pasienId = activePeserta.idPeserta || activePeserta.pasien_id;

      const response = await fetch(
        "http://localhost:3000/api/peserta/verify-exit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pasien_id: pasienId, kode_keluar: exitCode }),
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Verification passed! Wipe session and kick to login.
        setIsExitModalOpen(false);
        localStorage.removeItem("active_peserta");
        localStorage.removeItem("mmpi_full_data");
        localStorage.removeItem("mmpi_phase1_data");
        localStorage.removeItem("mmpi_shuffle_map");
        localStorage.removeItem("mmpi_edit_mode");
        navigate("/", { replace: true });
      } else {
        setExitError(data.error || "Kode keluar tidak valid.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setExitError("Gagal memverifikasi kode. Periksa koneksi.");
    } finally {
      setIsVerifyingExit(false);
    }
  };

  const handleConfirmExit = () => {
    setIsExitModalOpen(false);
    localStorage.removeItem("active_peserta");
    localStorage.removeItem("mmpi_full_data");
    localStorage.removeItem("mmpi_phase1_data");
    localStorage.removeItem("mmpi_shuffle_map");
    localStorage.removeItem("mmpi_edit_mode");
    navigate("/", { replace: true });
  };

  const renderContent = () => {
    if (selectedFeature === "pengisian") {
      if (pengisianPhase === 1) {
        return <PengisianDataDiri onNext={handlePengisianNext} />;
      } else {
        return <PengisianDataTest onFinish={handleTestFinished} />;
      }
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen w-full font-sans overflow-hidden bg-white text-black">
      <header className="h-[10%] w-full bg-gray-5 border-b border-gray-6 flex items-center justify-between px-6 shrink-0 z-20 relative">
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
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onMouseEnter={() => setHoverArrow(true)}
              onMouseLeave={() => setHoverArrow(false)}
              className={`p-2 rounded-lg transition-colors focus:outline-none flex items-center gap-2 ${isDropdownOpen ? "bg-gray-2" : "hover:bg-gray-2"}`}
            >
              <img
                src={hoverArrow ? arrowDownBlue : arrowDownIcon}
                alt="Dropdown"
                className={`w-5 h-5 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-6 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div
                  // [UPDATED] Trigger the modal instead of immediate logout
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsExitModalOpen(true);
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors text-md font-medium text-gray-800"
                >
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

      <div className="flex h-[90%] w-full relative">
        <aside
          className={`bg-gray-5 border-r border-gray-6 flex flex-col py-6 shrink-0 justify-between overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-[20%] opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-10 border-none"}`}
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
          </div>
        </aside>

        <main className="flex-1 bg-white relative overflow-auto p-8 transition-all duration-300">
          {renderContent()}
        </main>
      </div>

      {/* --- [UPDATED] SIMPLE EXIT CONFIRMATION MODAL --- */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
          <div className="bg-white rounded-xl shadow-2xl p-8 w-[400px] flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 relative z-10">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <img src={errorIcon} alt="Alert" className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Apakah anda yakin?
            </h3>
            <p className="text-gray-500 mb-8">
              Apakah anda yakin ingin meninggalkan tes? Semua progres pada sesi
              ini akan hilang.
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setIsExitModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg bg-gray-500 text-white font-semibold hover:bg-gray-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
