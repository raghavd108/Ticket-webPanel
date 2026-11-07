import React from "react";
import { NavLink } from "react-router-dom";

import {
  Ticket,
  Search,
  Users,
  Grid2X2,
  Gift,
  MessageSquare,
  CalendarDays,
  Bell,
  UserRound,
  Settings,
  LogOut,
  X,
  PlusCircle,
} from "lucide-react";

import type { AuthUser } from "../types/auth";
import { useTheme } from "../context/ThemeContext";

interface SidebarProps {
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

interface MenuItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  isOpen,
  onClose,
  onLogout,
}) => {
  const { theme } = useTheme();

  const isClient = user.role?.toLowerCase() === "client";
  const permissions = user.permissions;

  const initials = user.userName?.trim().charAt(0).toUpperCase() || "U";

  const mainMenu: MenuItem[] = [
    { label: "Tickets", path: "/tickets", icon: Ticket },
  ];

  const clientMenu: MenuItem[] = [
    { label: "New Ticket", path: "/new-ticket", icon: PlusCircle },
    { label: "Offers", path: "/offers", icon: Gift },
    { label: "Client Feedback", path: "/feedback", icon: MessageSquare },
  ];

  const staffMenu: MenuItem[] = [
    ...(permissions.canViewAllTickets
      ? [{ label: "Search Tickets", path: "/search", icon: Search }]
      : []),

    ...(permissions.canManageUsers
      ? [{ label: "User Management", path: "/users", icon: Users }]
      : []),

    ...(permissions.canManageUsers ||
    permissions.canPublishOffers ||
    permissions.canNotifyEmployees
      ? [{ label: "Manage", path: "/manage", icon: Grid2X2 }]
      : []),
  ];

  const quickMenu: MenuItem[] = [
    { label: "Company Calendar", path: "/calendar", icon: CalendarDays },
    { label: "Notifications", path: "/notifications", icon: Bell },
  ];

  const accountMenu: MenuItem[] = [
    { label: "Profile", path: "/profile", icon: UserRound },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  const renderMenu = (title: string, items: MenuItem[]) => {
    if (!items.length) return null;

    return (
      <section className="mb-7">
        <p
          className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[1.3px]"
          style={{ color: theme.light }}
        >
          {title}
        </p>

        <div className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? theme.primarySoft : "transparent",
                  color: isActive ? theme.primary : theme.muted,
                })}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors duration-150"
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.1 : 1.8}
                      style={{
                        color: isActive ? theme.primary : theme.muted,
                      }}
                      className="shrink-0"
                    />

                    <span className="flex-1">{item.label}</span>

                    {isActive && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: theme.primary }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside
        style={{
          backgroundColor: theme.white,
          borderColor: theme.border,
        }}
        className={`fixed inset-y-0 left-0 z-50 flex w-62.5 flex-col border-r transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* BRAND */}
        <div
          style={{ borderColor: theme.border }}
          className="flex h-16 shrink-0 items-center justify-between border-b px-5"
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                color: "#FFFFFF",
              }}
              className="h-9 w-9 flex items-center justify-center rounded-lg overflow-hidden"
            >
              <img
                src="/icon.png"
                alt="SP Infocom"
                className="h-full w-full object-contain p-1"
              />
            </div>

            <div>
              <h2
                style={{ color: theme.ink }}
                className="text-[15px] font-bold tracking-tight"
              >
                SP Support
              </h2>

              <p style={{ color: theme.muted }} className="text-[10px]">
                Management Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            style={{ color: theme.muted }}
            className="rounded-lg p-1.5 md:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* USER INFORMATION */}
        <div
          style={{
            backgroundColor: theme.background,
            borderColor: theme.border,
          }}
          className="mx-4 mt-5 flex items-center gap-3 rounded-lg border p-3"
        >
          <div
            style={{
              backgroundColor: theme.primarySoft,
              color: theme.primary,
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p
              style={{ color: theme.ink }}
              className="truncate text-xs font-semibold"
            >
              {user.userName}
            </p>

            <p
              style={{ color: theme.muted }}
              className="mt-0.5 truncate text-[11px]"
            >
              {user.designation || user.role}
            </p>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-4 pb-4 pt-7">
          {renderMenu("Main Menu", mainMenu)}

          {isClient
            ? renderMenu("Client Services", clientMenu)
            : renderMenu("Management", staffMenu)}

          {renderMenu("Quick Access", quickMenu)}

          {renderMenu("Account", accountMenu)}
        </nav>

        {/* FOOTER */}
        <div
          style={{ borderColor: theme.border }}
          className="shrink-0 border-t p-4"
        >
          <button
            type="button"
            onClick={onLogout}
            style={{ color: theme.danger }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-red-50"
          >
            <LogOut size={18} strokeWidth={1.8} />
            Logout
          </button>

          <p
            style={{ color: theme.light }}
            className="mt-3 text-center text-[10px]"
          >
            SP Support Management System
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
