import React from "react";
import { useNavigate } from "react-router-dom";

const Finish: React.FC = () => {
  const navigate = useNavigate();

  const handleReturn = () => {
    // Redirect to the login page
    navigate("/", { replace: true });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-gray-50 text-center p-6 select-none font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
        {/* Success Checkmark Icon */}
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
          <svg
            className="w-12 h-12 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 tracking-wide">
          Selesai!
        </h1>

        <p className="text-gray-600 font-medium text-lg leading-relaxed">
          Pekerjaanmu telah disimpan! <br />
          Terima kasih telah mengerjakan tes ini.
        </p>

        <button
          onClick={handleReturn}
          className="mt-6 w-full py-3.5 rounded-lg bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md"
        >
          Kembali
        </button>
      </div>
    </div>
  );
};

export default Finish;
