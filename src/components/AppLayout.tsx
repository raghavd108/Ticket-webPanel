import React, { useState } from "react";

import Header from "./navbar";
import Sidebar from "./Sidebar";

import type { AuthUser } from "../types/auth";
import { useTheme } from "../context/ThemeContext";

interface AppLayoutProps {
  user: AuthUser;
  onLogout: () => void;
  notificationCount?: number;
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  user,
  onLogout,
  notificationCount = 0,
  children,
}) => {
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      style={{
        backgroundColor: theme.background,
        color: theme.text,
      }}
      className="min-h-screen transition-colors duration-200"
    >
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
      />

      {/* MAIN CONTENT */}
      <div className="min-h-screen md:pl-62.5">
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
          onLogout={onLogout}
          notificationCount={notificationCount}
        />

        <main
          style={{ backgroundColor: theme.background }}
          className="min-h-[calc(100vh-64px)] p-4 md:p-6 lg:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
