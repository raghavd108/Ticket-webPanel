import React from "react";
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Check,
  Palette,
  Monitor,
} from "lucide-react";

import { useTheme } from "../context/ThemeContext";

const Settings: React.FC = () => {
  const { theme, isDarkMode, setDarkMode } = useTheme();

  const options = [
    {
      label: "Light Mode",
      description: "Use a bright and clean appearance.",
      value: false,
      icon: Sun,
    },
    {
      label: "Dark Mode",
      description: "Use a darker appearance for comfortable viewing.",
      value: true,
      icon: Moon,
    },
  ];

  return (
    <div
      className="min-h-screen p-5 md:p-8"
      style={{ backgroundColor: theme.background }}
    >
      <div className="mx-auto max-w-4xl">
        {/* HEADER */}
        <div className="mb-8 flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{
              backgroundColor: theme.primarySoft,
              color: theme.primary,
            }}
          >
            <SettingsIcon size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.ink }}>
              Settings
            </h1>

            <p className="mt-1 text-sm" style={{ color: theme.muted }}>
              Manage your application preferences.
            </p>
          </div>
        </div>

        {/* APPEARANCE */}
        <section
          className="overflow-hidden rounded-xl border"
          style={{
            backgroundColor: theme.white,
            borderColor: theme.border,
          }}
        >
          <div
            className="flex items-center gap-3 border-b p-5"
            style={{ borderColor: theme.border }}
          >
            <Palette size={20} style={{ color: theme.primary }} />

            <div>
              <h2
                className="text-base font-semibold"
                style={{ color: theme.ink }}
              >
                Appearance
              </h2>

              <p className="mt-1 text-xs" style={{ color: theme.muted }}>
                Customize the look and feel of SP Support.
              </p>
            </div>
          </div>

          <div className="p-5">
            <h3
              className="mb-1 text-sm font-semibold"
              style={{ color: theme.ink }}
            >
              Choose your theme
            </h3>

            <p className="mb-5 text-xs" style={{ color: theme.muted }}>
              Your preference will be saved automatically.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {options.map((option) => {
                const Icon = option.icon;
                const selected = isDarkMode === option.value;

                return (
                  <button
                    key={option.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDarkMode(option.value)}
                    className="rounded-xl border p-5 text-left transition-all duration-200 hover:shadow-sm"
                    style={{
                      backgroundColor: selected
                        ? theme.primarySoft
                        : theme.background,
                      borderColor: selected ? theme.primary : theme.border,
                    }}
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: theme.white,
                          color: theme.primary,
                        }}
                      >
                        <Icon size={21} />
                      </div>

                      {selected && (
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: theme.primary,
                            color: theme.everWhite,
                          }}
                        >
                          <Check size={14} />
                        </div>
                      )}
                    </div>

                    <h4
                      className="text-sm font-semibold"
                      style={{ color: theme.ink }}
                    >
                      {option.label}
                    </h4>

                    <p
                      className="mt-1 text-xs leading-5"
                      style={{ color: theme.muted }}
                    >
                      {option.description}
                    </p>

                    {selected && (
                      <p
                        className="mt-4 text-xs font-semibold"
                        style={{ color: theme.primary }}
                      >
                        Currently selected
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* CURRENT THEME */}
        <div
          className="mt-5 flex items-center gap-3 rounded-xl border p-4"
          style={{
            backgroundColor: theme.white,
            borderColor: theme.border,
          }}
        >
          <Monitor size={20} style={{ color: theme.primary }} />

          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: theme.ink }}>
              Current appearance
            </p>

            <p className="mt-1 text-xs" style={{ color: theme.muted }}>
              {isDarkMode ? "Dark Mode is enabled." : "Light Mode is enabled."}
            </p>
          </div>

          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: theme.primarySoft,
              color: theme.primary,
            }}
          >
            {isDarkMode ? "Dark" : "Light"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Settings;
