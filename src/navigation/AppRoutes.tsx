import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import Tickets from "../pages/ticket";
import UserManagement from "../pages/userManagement";
import ManagePage from "../pages/ManagePage";
import ProfilePage from "../pages/ProfilePage";
import SearchPage from "../pages/SearchPage";
import LoginPage from "../pages/LoginPage";
import OfferPage from "../pages/OfferPage";
import CompanyCalendar from "../pages/CompanyCalendar";
import AppLayout from "../components/AppLayout";
import LeaveRequest from "../pages/LeaveRequest";
import NotificationPage from "../pages/NotificationPage";
import SettingsPage from "../pages/Settings";

// Protected Route
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F6]">
        <div className="h-9 w-9 rounded-full border-[3px] border-[#B99B70] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role === "client") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Main Layout
const ProtectedLayout = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <AppLayout user={user} onLogout={() => void logout()}>
      <Outlet />
    </AppLayout>
  );
};

// Placeholder Page
const Page = ({ title }: { title: string }) => (
  <div>
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
      {title}
    </h1>
    <p className="mt-2 text-sm text-gray-500">
      {title} page is ready for integration.
    </p>
  </div>
);

// Routes
const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedLayout />}>
            <Route path="/tickets" element={<Tickets />} />

            <Route path="/search" element={<SearchPage />} />

            {/* User Management */}
            <Route path="/users" element={<UserManagement />} />

            <Route path="/manage" element={<ManagePage />} />

            <Route path="/offers" element={<OfferPage />} />

            <Route
              path="/feedback"
              element={<Page title="Client Feedback" />}
            />

            <Route path="/calendar" element={<CompanyCalendar />} />

            <Route path="/notifications" element={<NotificationPage />} />

            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/leave" element={<LeaveRequest />} />

            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Default */}
        <Route path="/" element={<Navigate to="/tickets" replace />} />
        <Route path="*" element={<Navigate to="/tickets" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
