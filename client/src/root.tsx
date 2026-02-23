// src/root.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./patient/Login";
import AdminLogin from "./admin/Login"; // Import Admin Login
import AdminDashboard from "./admin/Dashboard";

// Placeholders (Create actual files for these later if they don't exist)
const Dashboard = () => <h2>User Dashboard</h2>;
const NotFound = () => <h2>404 - Page Not Found</h2>;

function App() {
  return (
    <Router>
      <Routes>
        {/* --- User Routes --- */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* --- Admin Routes --- */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
