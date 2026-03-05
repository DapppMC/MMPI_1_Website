import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// --- Icons Import ---
import menuCloseIcon from "../assets/icons/light_mode/menu_close.svg";
import menuOpenIcon from "../assets/icons/light_mode/menu_open.svg";
import arrowDownIcon from "../assets/icons/light_mode/keyboard_arrow_down.svg";
import logoutIcon from "../assets/icons/light_mode/move_item.svg";
import addPatientIcon from "../assets/icons/light_mode/add_patient.svg";

import arrowDownBlue from "../assets/icons/blue/keyboard_arrow_down.svg";
import addPatientBlue from "../assets/icons/blue/add_patient.svg";

// --- Component Imports ---
import BuatAkunDokter from "./BuatAkunDokter";

// --- Helper Component (Exact match to Dashboard.tsx) ---
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

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Route Protection Logic
  useEffect(() => {
    const token = localStorage.getItem("super_admin_token");
    if (!token || token !== "super-admin-secure-token-123") {
      navigate("/super-admin/login", { replace: true });
    }
  }, [navigate]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string>("buat_dokter");

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

  const handleLogout = () => {
    localStorage.removeItem("super_admin_token");
    navigate("/super-admin/login", { replace: true });
  };

  const renderContent = () => {
    switch (selectedFeature) {
      case "buat_dokter":
        return <BuatAkunDokter />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full font-sans overflow-hidden bg-white text-black print:h-auto print:overflow-visible">
      {/* Header */}
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
          {/* Super Admin Badge */}
          <div className="hidden md:flex items-center bg-gray-2 px-3 py-1.5 rounded-md border border-gray-6">
            <span className="text-sm font-bold text-purple-4">SUPER ADMIN</span>
          </div>

          {/* The Dropdown Button */}
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
                {/* Keluar Button */}
                <div
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-6 cursor-pointer transition-colors text-lg font-medium text-black"
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

      <div className="flex h-[90%] w-full relative print:h-auto print:overflow-visible">
        {/* Sidebar */}
        <aside
          className={`bg-gray-5 border-r border-gray-6 flex flex-col py-6 shrink-0 justify-between overflow-hidden transition-all duration-300 ease-in-out print:hidden ${isSidebarOpen ? "w-[20%] opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-10 border-none"}`}
        >
          <div className="flex flex-col gap-1 px-4 min-w-50 font-medium text-xl">
            <SidebarItem
              label="Buat Akun Dokter"
              defaultIcon={addPatientIcon}
              blueIcon={addPatientBlue}
              isSidebarOpen={isSidebarOpen}
              isSelected={selectedFeature === "buat_dokter"}
              onClick={() => setSelectedFeature("buat_dokter")}
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-white relative overflow-auto p-8 transition-all duration-300 print:overflow-visible print:h-auto print:p-0 print:absolute print:top-0 print:left-0 print:w-full print:z-50">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
