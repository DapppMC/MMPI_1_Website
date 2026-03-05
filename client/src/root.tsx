// src/root.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./patient/Login";
import PatientDashboard from "./patient/Dashboard"; // Import Patient Dashboard
import Finish from "./patient/Finish";
import AdminLogin from "./admin/Login"; // Import Admin Login
import AdminDashboard from "./admin/Dashboard";
import SuperAdminLogin from "./superAdmin/SuperAdminLogin"; // REPLACE component path placeholder
import SuperAdminDashboard from "./superAdmin/SuperAdminDashboard"; // REPLACE component path placeholder

// Placeholders (Create actual files for these later if they don't exist)
const NotFound = () => <h2>404 - Page Not Found</h2>;

// Protected Route helper for Super Admin
const SuperAdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Check for the hardcoded token
    const token = localStorage.getItem("super_admin_token");
    if (token === "super-admin-secure-token-123") {
        return <>{children}</>; // Authenticated, show content
    } else {
        console.warn("Unauthorized Super Admin access detected, redirecting to login.");
        return <Navigate to="/super-admin/login" replace />; // Not authenticated
    }
};

function App() {
  return (
    <Router>
      <Routes>
        {/* --- User Routes --- */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PatientDashboard />} />
        <Route path="/finish" element={<Finish />} />

        {/* --- Admin Routes --- */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* --- [NEW] SUPER ADMIN ROUTES --- */}
        {/* Login Path */}
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />

        {/* Dashboard Path - Protected by authentication logic */}
        <Route
          path="/super-admin/dashboard/*" // Use /* for nested routes
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminDashboard />
            </SuperAdminProtectedRoute>
          }
        />

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
