// src/user/Dashboard.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// --- Icons Import ---
import menuCloseIcon from "../assets/icons/light_mode/menu_close.svg";
import menuOpenIcon from "../assets/icons/light_mode/menu_open.svg";
import arrowDownIcon from "../assets/icons/light_mode/keyboard_arrow_down.svg";
import keyboardIcon from "../assets/icons/light_mode/keyboard.svg";
import logoutIcon from "../assets/icons/light_mode/move_item.svg";

import arrowDownBlue from "../assets/icons/blue/keyboard_arrow_down.svg";
import keyboardBlue from "../assets/icons/blue/keyboard.svg";

// --- Component Imports ---
import PengisianDataDiri, {
  type PengisianDataVariables,
} from "./PengisianDataDiri"; // Adjust path to point to your existing component!
import PengisianDataTest from "./PengisianDataTest"; // Adjust path!

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

  // Route Protection Logic
  useEffect(() => {
    // Check if the patient's info is in localStorage
    const activePeserta = localStorage.getItem("active_peserta");

    // If no patient is logged in, redirect them to the login page immediately
    if (!activePeserta) {
      navigate("/", { replace: true }); // Adjust route to your patient login
    }
  }, [navigate]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // The only feature available is 'pengisian'
  const [selectedFeature, setSelectedFeature] = useState<string>("pengisian");

  const [pengisianPhase, setPengisianPhase] = useState<1 | 2>(() => {
    const savedData = localStorage.getItem("mmpi_full_data");
    return savedData ? 2 : 1;
  });

  const [pengisianData, setPengisianData] =
    useState<PengisianDataVariables | null>(null);

  const [hoverArrow, setHoverArrow] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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
    // Clear out the temporary test progression data
    localStorage.removeItem("mmpi_full_data");
    localStorage.removeItem("mmpi_phase1_data");
    localStorage.removeItem("mmpi_shuffle_map");
    localStorage.removeItem("mmpi_edit_mode");

    // Once finished, log the patient out automatically for security
    handleLogout();
  };

  const handleLogout = () => {
    // Clear the active patient session
    localStorage.removeItem("active_peserta");

    // Clear any pending test data just to be safe
    localStorage.removeItem("mmpi_full_data");
    localStorage.removeItem("mmpi_phase1_data");
    localStorage.removeItem("mmpi_shuffle_map");
    localStorage.removeItem("mmpi_edit_mode");

    // Send them back to the login screen
    navigate("/finish", { replace: true });
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
      {/* Header */}
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
          {/* Patient Header Dropdown */}
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
                {/* Simplified Logout Button */}
                <div
                  onClick={handleLogout}
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

      {/* Main Layout */}
      <div className="flex h-[90%] w-full relative">
        {/* Simplified Sidebar */}
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

        {/* Content Area */}
        <main className="flex-1 bg-white relative overflow-auto p-8 transition-all duration-300">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default PatientDashboard;
