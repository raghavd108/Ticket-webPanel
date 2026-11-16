import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import { useTheme } from "../context/ThemeContext";
import { useAuth, api } from "../context/AuthContext";

type AttendanceRecord = {
  status?: string;
  inTime?: string | null;
  outTime?: string | null;
};

type AttendanceResponse = {
  attendance?: AttendanceRecord | null;
  isHoliday?: boolean;
  message?: string;
};

const AttendanceToggle: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();

  const mountedRef = useRef(false);

  const [checkedIn, setCheckedIn] = useState(false);
  const [holiday, setHoliday] = useState(false);

  const [inTime, setInTime] = useState("");
  const [outTime, setOutTime] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const employeeId = user?.id;

  const colors = {
    card: theme.white,
    surface: theme.background,
    text: theme.ink,
    muted: theme.muted,
    primary: theme.primary,
    primarySoft: theme.primarySoft,
    green: theme.green,
    greenSoft: theme.greenSoft,
    border: theme.border,
    danger: theme.danger,
  };

  // ==========================================
  // LOAD TODAY'S ATTENDANCE
  // Uses the existing authenticated API instance
  // ==========================================

  const loadAttendance = useCallback(async () => {
    if (!employeeId || user?.role?.toLowerCase() !== "employee") {
      throw new Error("Unable to identify the logged-in employee.");
    }

    const response = await api.get<AttendanceResponse>("/attendance/today", {
      params: {
        employeeId,
      },
    });

    const record = response.data?.attendance || {};

    if (!mountedRef.current) return;

    setHoliday(Boolean(response.data?.isHoliday));

    setInTime(record.inTime || "");
    setOutTime(record.outTime || "");
    setAttendanceStatus(record.status || "");

    setCheckedIn(
      Boolean(
        record.inTime &&
        !record.outTime &&
        ["present", "late"].includes(record.status || ""),
      ),
    );

    setLastUpdated(
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }),
    );

    setLoadError("");
  }, [employeeId, user?.role]);

  // ==========================================
  // INITIALIZE
  // ==========================================

  useEffect(() => {
    mountedRef.current = true;

    const initialise = async () => {
      if (!employeeId || user?.role?.toLowerCase() !== "employee") {
        setLoadError("Unable to identify the logged-in employee.");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        await loadAttendance();
      } catch (error: any) {
        if (mountedRef.current) {
          setLoadError(
            error?.response?.data?.message ||
              error?.message ||
              "Unable to load attendance.",
          );
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initialise();

    return () => {
      mountedRef.current = false;
    };
  }, [loadAttendance, employeeId, user?.role]);

  // ==========================================
  // REFRESH ATTENDANCE
  // ==========================================

  const refreshAttendance = async () => {
    if (loading || processing) return;

    setLoading(true);

    try {
      await loadAttendance();
    } catch (error: any) {
      if (mountedRef.current) {
        setLoadError(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to refresh attendance.",
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // ==========================================
  // GET CURRENT LOCATION
  // ==========================================

  const getLocation = async (): Promise<string> => {
    if (!window.isSecureContext) {
      throw new Error("Location access requires HTTPS or localhost.");
    }

    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported by your browser.");
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          resolve(`${latitude},${longitude}`);
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(
                new Error(
                  "Location permission denied. Please allow location access in your browser settings.",
                ),
              );
              break;

            case error.POSITION_UNAVAILABLE:
              reject(
                new Error(
                  "Your current location is unavailable. Please enable GPS.",
                ),
              );
              break;

            case error.TIMEOUT:
              reject(
                new Error("Location request timed out. Please try again."),
              );
              break;

            default:
              reject(new Error("Unable to get your current location."));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        },
      );
    });
  };

  // ==========================================
  // CHECK IN / CHECK OUT
  // ==========================================

  const handleToggle = async () => {
    if (!employeeId || processing || loading || holiday || loadError) {
      return;
    }

    const nextCheckedIn = !checkedIn;

    setProcessing(true);

    try {
      if (nextCheckedIn) {
        // CHECK IN WITH LOCATION

        const location = await getLocation();

        await api.post("/attendance/check-in", {
          employeeId,
          location,
        });
      } else {
        // CHECK OUT

        await api.patch("/attendance/check-out", {
          employeeId,
        });
      }

      // GET UPDATED SERVER STATE

      await loadAttendance();

      if (mountedRef.current) {
        window.alert(
          nextCheckedIn
            ? "You have checked in successfully."
            : "You have checked out successfully.",
        );
      }
    } catch (error: any) {
      if (mountedRef.current) {
        window.alert(
          error?.response?.data?.message ||
            error?.message ||
            "Attendance update failed. Please try again.",
        );

        // RESTORE ACTUAL SERVER STATE

        try {
          await loadAttendance();
        } catch (refreshError: any) {
          setLoadError(
            refreshError?.response?.data?.message ||
              refreshError?.message ||
              "Unable to refresh attendance.",
          );
        }
      }
    } finally {
      if (mountedRef.current) {
        setProcessing(false);
      }
    }
  };

  // ==========================================
  // FORMAT TIME IN IST
  // ==========================================

  const formatTime = (value: string) => {
    if (!value) return "--:--";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "--:--";
    }

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  // ==========================================
  // ATTENDANCE STATUS
  // ==========================================

  const statusLabel = loading
    ? "Loading..."
    : loadError
      ? "Unavailable"
      : holiday
        ? "Scheduled holiday"
        : checkedIn
          ? attendanceStatus === "late"
            ? "Checked in · Late"
            : "Checked in"
          : outTime
            ? "Shift completed"
            : "Not checked in";

  const statusColor = loadError
    ? colors.danger
    : holiday
      ? colors.muted
      : checkedIn
        ? colors.green
        : outTime
          ? colors.primary
          : colors.muted;

  // ==========================================
  // LOADING
  // ==========================================

  if (loading && !inTime && !outTime && !loadError) {
    return (
      <div
        className="flex h-11 w-full items-center gap-2 rounded-xl border px-3"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
        }}
      >
        <Activity
          size={16}
          className="animate-spin"
          style={{ color: colors.primary }}
        />

        <span className="text-xs font-medium" style={{ color: colors.muted }}>
          Loading attendance...
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full min-w-0">
      {/* =====================================
          NAVBAR ATTENDANCE WIDGET
      ===================================== */}

      <div
        className="flex h-11 w-full items-center gap-2 rounded-xl border px-2.5 transition-colors"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
        }}
      >
        {/* ICON */}

        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: checkedIn ? colors.greenSoft : colors.primarySoft,
          }}
        >
          {loading || processing ? (
            <Activity
              size={16}
              className="animate-spin"
              style={{ color: colors.primary }}
            />
          ) : loadError ? (
            <AlertCircle size={17} style={{ color: colors.danger }} />
          ) : (
            <Check
              size={17}
              strokeWidth={2.5}
              style={{
                color: checkedIn ? colors.green : colors.primary,
              }}
            />
          )}
        </div>

        {/* STATUS */}

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-bold leading-4"
            style={{ color: colors.text }}
          >
            Attendance
          </p>

          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: statusColor }}
            />

            <span
              className="truncate text-[10px] font-medium leading-3"
              style={{ color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {/* DETAILS BUTTON */}

        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          aria-label="Attendance details"
          aria-expanded={showDetails}
          className="flex h-8 w-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
          style={{ color: colors.muted }}
        >
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${
              showDetails ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* CHECK IN / CHECK OUT */}

        <button
          type="button"
          onClick={handleToggle}
          disabled={
            loading ||
            processing ||
            holiday ||
            !employeeId ||
            Boolean(loadError)
          }
          aria-label={checkedIn ? "Check out" : "Check in"}
          aria-pressed={checkedIn}
          title={
            holiday ? "Scheduled holiday" : checkedIn ? "Check out" : "Check in"
          }
          className={`relative flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
            checkedIn ? "justify-end" : "justify-start"
          }`}
          style={{
            backgroundColor: checkedIn ? colors.green : colors.border,
          }}
        >
          {processing ? (
            <Activity
              size={13}
              className="absolute inset-0 m-auto animate-spin"
              style={{ color: colors.text }}
            />
          ) : (
            <span className="mx-0.5 h-5 w-5 rounded-full bg-white shadow-sm" />
          )}
        </button>
      </div>

      {/* =====================================
          ATTENDANCE DETAILS DROPDOWN
      ===================================== */}

      {showDetails && (
        <>
          <button
            type="button"
            aria-label="Close attendance details"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setShowDetails(false)}
          />

          <div
            className="absolute left-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border shadow-xl"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
            }}
          >
            {/* HEADER */}

            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: colors.border }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: colors.text }}>
                  Today's attendance
                </p>

                <p
                  className="mt-0.5 text-[11px]"
                  style={{ color: colors.muted }}
                >
                  Your daily attendance summary
                </p>
              </div>

              <button
                type="button"
                onClick={refreshAttendance}
                disabled={loading || processing}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-black/5 disabled:opacity-50"
                style={{ color: colors.muted }}
                title="Refresh attendance"
                aria-label="Refresh attendance"
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {/* ERROR */}

            {loadError && (
              <div
                className="mx-3 mt-3 flex items-start gap-2 rounded-lg p-3"
                style={{
                  backgroundColor: colors.surface,
                  color: colors.danger,
                }}
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" />

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold">
                    Unable to load attendance
                  </p>

                  <p className="mt-1 wrap-break-word text-[10px]">
                    {loadError}
                  </p>

                  <button
                    type="button"
                    onClick={refreshAttendance}
                    disabled={loading}
                    className="mt-2 text-[11px] font-bold underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* CURRENT STATUS */}

            <div
              className="mx-3 mt-3 flex items-center justify-between rounded-lg p-3"
              style={{ backgroundColor: colors.surface }}
            >
              <div>
                <p
                  className="text-[10px] font-semibold"
                  style={{ color: colors.muted }}
                >
                  CURRENT STATUS
                </p>

                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: statusColor }}
                  />

                  <p
                    className="text-xs font-bold"
                    style={{ color: statusColor }}
                  >
                    {statusLabel}
                  </p>
                </div>
              </div>

              <span
                className="rounded-md px-2 py-1 text-[10px] font-semibold"
                style={{
                  backgroundColor: checkedIn
                    ? colors.greenSoft
                    : colors.primarySoft,
                  color: checkedIn ? colors.green : colors.primary,
                }}
              >
                {holiday
                  ? "Holiday"
                  : checkedIn
                    ? "Active"
                    : outTime
                      ? "Done"
                      : "Pending"}
              </span>
            </div>

            {/* CHECK IN / CHECK OUT TIME */}

            <div className="grid grid-cols-2 gap-2 p-3">
              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: colors.surface }}
              >
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight size={14} style={{ color: colors.green }} />

                  <span
                    className="text-[10px] font-bold"
                    style={{ color: colors.muted }}
                  >
                    CHECK IN
                  </span>
                </div>

                <p
                  className="mt-2 text-sm font-bold"
                  style={{ color: colors.text }}
                >
                  {formatTime(inTime)}
                </p>
              </div>

              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: colors.surface }}
              >
                <div className="flex items-center gap-1.5">
                  <ArrowDownLeft size={14} style={{ color: colors.primary }} />

                  <span
                    className="text-[10px] font-bold"
                    style={{ color: colors.muted }}
                  >
                    CHECK OUT
                  </span>
                </div>

                <p
                  className="mt-2 text-sm font-bold"
                  style={{ color: colors.text }}
                >
                  {formatTime(outTime)}
                </p>
              </div>
            </div>

            {/* HELPER INFORMATION */}

            <div
              className="flex items-start gap-2 border-t px-4 py-3"
              style={{ borderColor: colors.border }}
            >
              {holiday ? (
                <Check size={15} style={{ color: colors.muted }} />
              ) : checkedIn ? (
                <Clock3 size={15} style={{ color: colors.green }} />
              ) : (
                <MapPin size={15} style={{ color: colors.muted }} />
              )}

              <p
                className="text-[11px] leading-4"
                style={{ color: colors.muted }}
              >
                {holiday
                  ? "Today is a scheduled holiday. Attendance marking is disabled."
                  : checkedIn
                    ? "You are currently on shift. Remember to check out when your shift ends."
                    : outTime
                      ? "Your attendance for today is complete."
                      : "Turn on the attendance switch to check in using your current location."}
              </p>
            </div>

            {/* LAST UPDATED */}

            {lastUpdated && (
              <div
                className="border-t px-4 py-2"
                style={{ borderColor: colors.border }}
              >
                <p className="text-[10px]" style={{ color: colors.muted }}>
                  Last updated at {lastUpdated} IST
                </p>
              </div>
            )}

            {/* PROCESSING */}

            {processing && (
              <div
                className="flex items-center gap-2 border-t px-4 py-2.5 text-[11px]"
                style={{
                  borderColor: colors.border,
                  color: colors.muted,
                }}
              >
                <Activity size={13} className="animate-spin" />
                Updating attendance...
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceToggle;
