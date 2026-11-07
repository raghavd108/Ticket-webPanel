import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Menu,
  Search,
  CalendarDays,
  Bell,
  ChevronDown,
  LogOut,
  UserRound,
  Settings,
  Ticket,
} from "lucide-react";

import type { AuthUser } from "../types/auth";
import { useTheme } from "../context/ThemeContext";

interface HeaderProps {
  user: AuthUser;
  onMenuClick: () => void;
  onLogout: () => void;
  notificationCount?: number;
}

const Header: React.FC<HeaderProps> = ({
  user,
  onMenuClick,
  onLogout,
  notificationCount = 0,
}) => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [profileOpen, setProfileOpen] = useState(false);

  const initials = user.userName?.trim().charAt(0).toUpperCase() || "U";

  const navigateTo = (path: string) => {
    navigate(path);
    setProfileOpen(false);
  };

  const actionButton =
    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors";

  return (
    <header
      style={{
        backgroundColor: theme.white,
        borderColor: theme.border,
      }}
      className="sticky top-0 z-40 h-16 shrink-0 border-b"
    >
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* LEFT SECTION */}
        <div className="flex min-w-0 items-center gap-3"></div>

        {/* RIGHT SECTION */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {user.permissions?.canViewAllTickets && (
            <button
              type="button"
              onClick={() => navigateTo("/search")}
              style={{ color: theme.muted }}
              className={`${actionButton} hover:bg-black/5`}
              title="Search tickets"
              aria-label="Search tickets"
            >
              <Search size={19} strokeWidth={1.8} />
            </button>
          )}

          <button
            type="button"
            onClick={() => navigateTo("/calendar")}
            style={{ color: theme.muted }}
            className={`${actionButton} hover:bg-black/5`}
            title="Company calendar"
            aria-label="Company calendar"
          >
            <CalendarDays size={19} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            onClick={() => navigateTo("/notifications")}
            style={{ color: theme.muted }}
            className={`${actionButton} hover:bg-black/5`}
            title="Notifications"
            aria-label={`Notifications, ${notificationCount} unread`}
          >
            <Bell size={19} strokeWidth={1.8} />

            {notificationCount > 0 && (
              <span
                style={{
                  backgroundColor: theme.danger,
                  borderColor: theme.white,
                }}
                className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 px-1 text-[9px] font-semibold text-white"
              >
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>

          <div
            style={{ backgroundColor: theme.border }}
            className="mx-2 hidden h-7 w-px sm:block"
          />

          {/* PROFILE */}
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-expanded={profileOpen}
              aria-label="Open profile menu"
              style={{ color: theme.ink }}
              className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-black/5"
            >
              <div
                style={{
                  backgroundColor: theme.primarySoft,
                  color: theme.primary,
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              >
                {initials}
              </div>

              <div className="hidden text-left md:block">
                <p className="max-w-32 truncate text-xs font-semibold">
                  {user.userName}
                </p>

                <p
                  style={{ color: theme.muted }}
                  className="max-w-32 truncate text-[10px]"
                >
                  {user.designation || user.role}
                </p>
              </div>

              <ChevronDown
                size={15}
                style={{ color: theme.muted }}
                className={`hidden transition-transform sm:block ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* DROPDOWN */}
            {profileOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close profile menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setProfileOpen(false)}
                />

                <div
                  style={{
                    backgroundColor: theme.white,
                    borderColor: theme.border,
                    boxShadow: "0 12px 35px rgba(0,0,0,0.12)",
                  }}
                  className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border"
                >
                  {/* USER DETAILS */}
                  <div
                    style={{ borderColor: theme.divider }}
                    className="border-b px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          backgroundColor: theme.primarySoft,
                          color: theme.primary,
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <p
                          style={{ color: theme.ink }}
                          className="truncate text-sm font-semibold"
                        >
                          {user.userName}
                        </p>

                        <p
                          style={{ color: theme.muted }}
                          className="truncate text-xs"
                        >
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <p
                      style={{
                        backgroundColor: theme.primarySoft,
                        color: theme.primary,
                      }}
                      className="mt-3 inline-flex rounded-md px-2 py-1 text-[10px] font-medium"
                    >
                      {user.designation || user.role}
                    </p>
                  </div>

                  {/* ACCOUNT ACTIONS */}
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => navigateTo("/profile")}
                      style={{ color: theme.text }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors hover:bg-black/5"
                    >
                      <UserRound size={17} style={{ color: theme.muted }} />
                      My Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo("/settings")}
                      style={{ color: theme.text }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors hover:bg-black/5"
                    >
                      <Settings size={17} style={{ color: theme.muted }} />
                      Settings
                    </button>
                  </div>

                  {/* LOGOUT */}
                  <div
                    style={{ borderColor: theme.divider }}
                    className="border-t p-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onLogout();
                      }}
                      style={{ color: theme.danger }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-red-50"
                    >
                      <LogOut size={17} />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
