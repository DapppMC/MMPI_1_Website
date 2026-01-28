// src/admin/Dashboard.tsx
import React, { useState, useEffect, useRef } from "react";

// --- 1. Light Mode Icons Import ---
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

// --- 2. Blue Icons Import ---
import menuBlue from "../assets/icons/blue/menu.svg"; // Mapped to Menu Open (Hamburger)
import menuOpenBlue from "../assets/icons/blue/menu_open.svg"; // Mapped to Menu Close (Arrow)
import personBlue from "../assets/icons/blue/person.svg";
import arrowDownBlue from "../assets/icons/blue/keyboard_arrow_down.svg";
import keyboardBlue from "../assets/icons/blue/keyboard.svg";
import groupsBlue from "../assets/icons/blue/groups.svg";
import uploadBlue from "../assets/icons/blue/upload.svg"; // Mapped to Export
import downloadBlue from "../assets/icons/blue/download.svg"; // Mapped to Import
import darkModeBlue from "../assets/icons/blue/dark_mode.svg";

// --- Helper Component for Sidebar Items ---
interface SidebarItemProps {
  label: string;
  defaultIcon: string;
  blueIcon: string;
  isSidebarOpen: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  label,
  defaultIcon,
  blueIcon,
  isSidebarOpen,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-center gap-4 px-4 py-3 hover:bg-gray-2 rounded-lg cursor-pointer text-black transition-colors"
    >
      <img
        src={isHovered ? blueIcon : defaultIcon}
        alt={label}
        className="shrink-0 w-6 h-6" // Fixed size to prevent layout shifts
      />
      <span
        className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
      >
        {label}
      </span>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // State for Header Icons Hover
  const [hoverMenu, setHoverMenu] = useState(false);
  const [hoverPerson, setHoverPerson] = useState(false);
  const [hoverArrow, setHoverArrow] = useState(false);

  // Ref for the dropdown menu
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

  const handleProfileClick = () => {
    console.log("Navigate to Profile");
  };

  return (
    <div className="flex flex-col h-screen w-full font-sans overflow-hidden bg-white text-black">
      {/* --- 1. Top Navbar (10% Height) --- */}
      <header className="h-[10%] w-full bg-gray-5 border-b border-gray-6 flex items-center justify-between px-6 shrink-0 z-20 relative">
        {/* Left: Brand & Sidebar Toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            onMouseEnter={() => setHoverMenu(true)}
            onMouseLeave={() => setHoverMenu(false)}
            className="p-2 hover:bg-gray-2 rounded-lg transition-colors focus:outline-none"
          >
            <img
              // Logic: If sidebar is open (showing close icon), hover shows blue close icon (menuOpenBlue).
              // If sidebar is closed (showing open icon), hover shows blue open icon (menuBlue).
              src={
                isSidebarOpen
                  ? hoverMenu
                    ? menuOpenBlue
                    : menuCloseIcon
                  : hoverMenu
                    ? menuBlue
                    : menuOpenIcon
              }
              alt="Toggle Menu"
              className="w-6 h-6"
            />
          </button>
          <h1 className="text-2xl font-bold tracking-wide">MMPI</h1>
        </div>

        {/* Right: User Profile & Dropdown */}
        <div className="flex items-center">
          {/* 1. Profile Icon */}
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

          {/* 2. Dropdown Trigger */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onMouseEnter={() => setHoverArrow(true)}
              onMouseLeave={() => setHoverArrow(false)}
              className={`p-2 rounded-lg transition-colors focus:outline-none ${
                isDropdownOpen ? "bg-gray-2" : "hover:bg-gray-2"
              }`}
            >
              <img
                src={hoverArrow ? arrowDownBlue : arrowDownIcon}
                alt="Dropdown"
                className={`w-5 h-5 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-6 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {/* Option 1: Ganti Akun */}
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-6 cursor-pointer transition-colors text-lg font-medium text-black">
                  <img
                    src={swapIcon}
                    alt="Ganti Akun"
                    className="w-5 h-5 opacity-70"
                  />
                  <span>Ganti Akun</span>
                </div>

                {/* Option 2: Keluar */}
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

      {/* --- 2. Main Body (90% Height) --- */}
      <div className="flex h-[90%] w-full relative">
        {/* --- Sidebar (Collapsible) --- */}
        <aside
          className={`
            bg-gray-5 border-r border-gray-6 flex flex-col py-6 shrink-0 justify-between overflow-hidden transition-all duration-300 ease-in-out
            ${isSidebarOpen ? "w-[20%] opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-10 border-none"}
          `}
        >
          {/* Top Menu Group */}
          <div className="flex flex-col gap-1 px-4 min-w-50 font-medium text-xl">
            <SidebarItem
              label="Pengisian Data"
              defaultIcon={keyboardIcon}
              blueIcon={keyboardBlue}
              isSidebarOpen={isSidebarOpen}
            />

            <SidebarItem
              label="Daftar Peserta"
              defaultIcon={groupsIcon}
              blueIcon={groupsBlue}
              isSidebarOpen={isSidebarOpen}
            />

            {/* Divider */}
            <div className="h-px bg-gray-6 my-2 mx-2"></div>

            <SidebarItem
              label="Export Data"
              defaultIcon={exportIcon}
              blueIcon={uploadBlue} // Mapped to upload.svg
              isSidebarOpen={isSidebarOpen}
            />

            <SidebarItem
              label="Import Data"
              defaultIcon={importIcon}
              blueIcon={downloadBlue} // Mapped to download.svg
              isSidebarOpen={isSidebarOpen}
            />
          </div>

          {/* Bottom Menu Group (Mode Gelap) */}
          <div className="px-4 mb-2 min-w-50 font-medium text-xl">
            <SidebarItem
              label="Mode Gelap"
              defaultIcon={darkModeIcon}
              blueIcon={darkModeBlue}
              isSidebarOpen={isSidebarOpen}
            />
          </div>
        </aside>

        {/* --- Content Area --- */}
        <main className="flex-1 bg-white relative overflow-auto p-8 transition-all duration-300">
          {/* Content goes here */}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
