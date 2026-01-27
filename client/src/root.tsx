// src/root.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Placeholder components - replace these with your actual page imports later
const Login = () => <h2>Login Page</h2>;
const Dashboard = () => <h2>MMPI Dashboard</h2>;
const MMPITest = () => <h2>MMPI Assessment</h2>;
const NotFound = () => <h2>404 - Page Not Found</h2>;

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected/App Routes */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Specific Route for the MMPI Assessment */}
        <Route path="/test" element={<MMPITest />} />

        {/* Redirect root "/" to dashboard or login */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Catch-all for undefined routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
