import { useCallback, useEffect, useState } from "react";
import { api } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  CalendarDays,
  Clock3,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Coffee,
  CalendarCheck,
} from "lucide-react";

type AttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "leave"
  | "holiday"
  | "not-joined"
  | "pending";

interface DailyAttendance {
  date: string;
  day: string;
  status: AttendanceStatus;
  isHoliday: boolean;
  inTime: string | null;
  outTime: string | null;
  location: string | null;
}

interface AttendanceSummary {
  totalCalendarDays: number;
  workingDays: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  holidays: number;
  pending: number;
  completedWorkingDays: number;
  attendancePercentage: number;
}

interface HistoryResponse {
  employeeId: string;
  period: {
    year: number;
    month: number | null;
    startDate: string;
    endDate: string;
  };
  summary: AttendanceSummary;
  attendance: DailyAttendance[];
}

interface AttendanceHistoryProps {
  employeeId?: string;
  employeeName?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const EMPTY_SUMMARY: AttendanceSummary = {
  totalCalendarDays: 0,
  workingDays: 0,
  present: 0,
  late: 0,
  absent: 0,
  leave: 0,
  holidays: 0,
  pending: 0,
  completedWorkingDays: 0,
  attendancePercentage: 0,
};

const AttendanceHistory = ({
  employeeId: selectedEmployeeId,
  employeeName,
}: AttendanceHistoryProps) => {
  useTheme();
  const currentDate = new Date();

  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const [history, setHistory] = useState<DailyAttendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showDailyAttendance, setShowDailyAttendance] = useState(false);

  const fetchHistory = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);

      setError("");

      try {
        let id = selectedEmployeeId || employeeId;

        // If no employee was selected, get the currently logged-in user
        // through the shared API client. Authentication is cookie-based.
        if (!id) {
          const userResponse = await api.get("/auth/me");

          const body = userResponse.data;
          const user = body?.user ?? body?.data?.user ?? body?.data ?? body;

          id = user?._id || user?.id || "";

          if (!id || user?.role?.toLowerCase() !== "employee") {
            throw new Error(
              "Unable to identify the logged-in employee. An employee ID is required.",
            );
          }

          setEmployeeId(id);
        }

        const response = await api.get<HistoryResponse>("/attendance/history", {
          params: { employeeId: id, month, year },
        });

        setHistory(response.data?.attendance || []);
        setSummary(response.data?.summary || EMPTY_SUMMARY);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load attendance history.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [employeeId, selectedEmployeeId, month, year],
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const changeMonth = (nextMonth: number) => {
    if (nextMonth < 1) {
      if (year > 2000) {
        setYear((previous) => previous - 1);
        setMonth(12);
      }
      return;
    }

    if (nextMonth > 12) {
      if (year < 2100) {
        setYear((previous) => previous + 1);
        setMonth(1);
      }
      return;
    }

    setMonth(nextMonth);
  };

  const formatTime = (value: string | null) => {
    if (!value) return "--:--";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "--:--";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  const formatDate = (value: string) => {
    const date = new Date(`${value}T12:00:00`);

    return {
      dayNumber: date.getDate().toString().padStart(2, "0"),
      monthName: date.toLocaleDateString("en-IN", { month: "short" }),
      weekday: date.toLocaleDateString("en-IN", { weekday: "short" }),
    };
  };

  const statusConfig = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return {
          label: "Present",
          className:
            "bg-[var(--theme-success-soft)] text-[var(--theme-success)]",
          symbol: "✓",
        };
      case "late":
        return {
          label: "Late",
          className:
            "bg-[var(--theme-warning-soft)] text-[var(--theme-warning)]",
          symbol: "!",
        };
      case "absent":
        return {
          label: "Absent",
          className: "bg-(--theme-danger-soft) text-(--theme-danger)",
          symbol: "×",
        };
      case "leave":
        return {
          label: "On Leave",
          className:
            "bg-[var(--theme-primary-soft)] text-[var(--theme-primary-dark)]",
          symbol: "↗",
        };
      case "holiday":
        return {
          label: "Holiday",
          className: "bg-[var(--theme-divider)] text-(--theme-muted)",
          symbol: "—",
        };
      case "not-joined":
        return {
          label: "Not joined",
          className: "bg-[var(--theme-divider)] text-(--theme-muted)",
          symbol: "·",
        };
      default:
        return {
          label: "Pending",
          className:
            "bg-[var(--theme-primary-soft)] text-[var(--theme-primary-dark)]",
          symbol: "○",
        };
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(false);
  };

  const summaryCards = [
    {
      label: "Present",
      value: summary.present,
      description: "On-time arrivals",
      icon: CheckCircle2,
      color: "text-[var(--theme-success)]",
      background: "bg-[var(--theme-success-soft)]",
    },
    {
      label: "Late",
      value: summary.late,
      description: "Late arrivals",
      icon: Clock3,
      color: "text-[var(--theme-warning)]",
      background: "bg-[var(--theme-warning-soft)]",
    },
    {
      label: "Absent",
      value: summary.absent,
      description: "Missed working days",
      icon: XCircle,
      color: "text-(--theme-danger)",
      background: "bg-(--theme-danger-soft)",
    },
    {
      label: "Leave",
      value: summary.leave,
      description: "Recorded leave days",
      icon: Coffee,
      color: "text-(--theme-primary)",
      background: "bg-[var(--theme-primary-soft)]",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-(--theme-primary-soft)">
            <CalendarCheck className="h-6 w-6 text-(--theme-primary)" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-(--theme-ink)">
              Attendance History
            </h1>
            <p className="mt-1 text-sm text-(--theme-muted)">
              {employeeName
                ? `${employeeName}'s attendance overview and history`
                : "Your attendance overview and history"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-(--theme-border) bg-(--theme-white) px-4 py-2.5 text-sm font-semibold text-(--theme-text) hover:bg-(--theme-background) disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Month and year filters */}
      <section className="rounded-2xl border border-(--theme-border) bg-(--theme-white) p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-(--theme-ink)">Select period</h2>
            <p className="mt-1 text-xs text-(--theme-muted)">
              Choose a month and year to view attendance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setMonth(currentDate.getMonth() + 1);
              setYear(currentDate.getFullYear());
            }}
            className="rounded-lg bg-(--theme-primary-soft) px-3 py-2 text-xs font-bold text-(--theme-primary-dark) hover:opacity-90"
          >
            Current month
          </button>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => changeMonth(month - 1)}
            className="rounded-lg border border-(--theme-border) p-2 text-(--theme-muted) hover:bg-(--theme-background)"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="min-w-32 text-center">
            <p className="text-lg font-bold text-(--theme-ink)">{year}</p>
            <p className="text-xs text-(--theme-muted)">{MONTHS[month - 1]}</p>
          </div>

          <button
            type="button"
            onClick={() => changeMonth(month + 1)}
            className="rounded-lg border border-(--theme-border) p-2 text-(--theme-muted) hover:bg-(--theme-background)"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {MONTHS.map((name, index) => {
            const selected = month === index + 1;

            return (
              <button
                key={name}
                type="button"
                onClick={() => setMonth(index + 1)}
                className={`shrink-0 rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                  selected
                    ? "border-(--theme-primary) bg-(--theme-primary) text-white"
                    : "border-(--theme-border) bg-(--theme-white) text-(--theme-muted) hover:opacity-90"
                }`}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-(--theme-divider) pt-3">
          <span className="text-xs font-medium text-(--theme-muted)">
            Showing {MONTHS[month - 1]} {year}
          </span>
          <CalendarDays size={16} className="text-(--theme-primary)" />
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-(--theme-border) bg-(--theme-white)">
          <RefreshCw className="h-7 w-7 animate-spin text-(--theme-primary)" />
          <p className="mt-3 text-sm text-(--theme-muted)">
            Loading attendance...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-(--theme-danger) bg-(--theme-danger-soft) p-6 text-center">
          <p className="font-semibold text-(--theme-danger)">
            Couldn't load attendance
          </p>
          <p className="mt-2 text-sm text-(--theme-danger)">{error}</p>
          <button
            type="button"
            onClick={() => fetchHistory()}
            className="mt-4 rounded-lg bg-(--theme-danger) px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Analytics */}
          <section className="rounded-2xl border border-(--theme-border) bg-(--theme-white) p-5">
            <div className="mb-5">
              <h2 className="font-bold text-(--theme-ink)">
                Attendance analytics
              </h2>
              <p className="mt-1 text-xs text-(--theme-muted)">
                Monthly attendance performance
              </p>
            </div>

            <div className="rounded-xl bg-(--theme-background) p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[7px] border-(--theme-primary)">
                  <span className="text-2xl font-black text-(--theme-ink)">
                    {summary.attendancePercentage}%
                  </span>
                </div>

                <div>
                  <p className="font-bold text-(--theme-ink)">
                    Attendance rate
                  </p>
                  <p className="mt-1 text-sm text-(--theme-muted)">
                    {summary.present + summary.late} days attended
                  </p>
                  <p className="mt-1 text-xs text-(--theme-light)">
                    Out of {summary.completedWorkingDays} completed working days
                  </p>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-(--theme-border)">
                <div
                  className="h-full rounded-full bg-(--theme-primary) transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, summary.attendancePercentage),
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {summaryCards.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-(--theme-divider) p-4"
                  >
                    <div
                      className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${item.background}`}
                    >
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <p className="text-2xl font-black text-(--theme-ink)">
                      {item.value}
                    </p>
                    <p className="mt-1 text-sm font-bold text-(--theme-text)">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-(--theme-light)">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x divide-(--theme-border) border-t border-(--theme-divider) pt-4">
              <div className="text-center">
                <p className="text-lg font-bold text-(--theme-ink)">
                  {summary.workingDays}
                </p>
                <p className="text-xs text-(--theme-muted)">Working days</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-(--theme-ink)">
                  {summary.holidays}
                </p>
                <p className="text-xs text-(--theme-muted)">Holidays</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-(--theme-ink)">
                  {summary.pending}
                </p>
                <p className="text-xs text-(--theme-muted)">Pending</p>
              </div>
            </div>
          </section>

          {/* Daily records */}
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-(--theme-ink)">
                  Daily attendance
                </h2>
                <p className="mt-1 text-xs text-(--theme-muted)">
                  Day-by-day attendance records
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDailyAttendance((previous) => !previous)}
                className="inline-flex items-center gap-2 rounded-lg border border-(--theme-border) bg-(--theme-white) px-3 py-2 text-xs font-bold text-(--theme-text) hover:bg-(--theme-background)"
              >
                {showDailyAttendance ? "Hide days" : "Show days"}
                {showDailyAttendance ? (
                  <ChevronUp size={15} />
                ) : (
                  <ChevronDown size={15} />
                )}
              </button>
            </div>

            {showDailyAttendance &&
              (history.length === 0 ? (
                <div className="rounded-2xl border border-(--theme-border) bg-(--theme-white) p-10 text-center">
                  <CalendarDays className="mx-auto h-9 w-9 text-(--theme-light)" />
                  <p className="mt-3 font-semibold text-(--theme-ink)">
                    No attendance records
                  </p>
                  <p className="mt-1 text-sm text-(--theme-muted)">
                    There are no daily records for this period.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => {
                    const badge = statusConfig(item.status);
                    const date = formatDate(item.date);

                    return (
                      <div
                        key={item.date}
                        className="rounded-2xl border border-(--theme-border) bg-(--theme-white) p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-(--theme-primary-soft) text-(--theme-primary)">
                              <CalendarDays size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-(--theme-ink)">
                                {date.dayNumber} {date.monthName}
                              </p>
                              <p className="text-xs text-(--theme-muted)">
                                {date.weekday}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${badge.className}`}
                          >
                            {badge.symbol} {badge.label}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-(--theme-divider) pt-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-(--theme-light)">
                              Check-in
                            </p>
                            <p className="mt-1 text-sm font-bold text-(--theme-ink)">
                              {formatTime(item.inTime)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-(--theme-light)">
                              Check-out
                            </p>
                            <p className="mt-1 text-sm font-bold text-(--theme-ink)">
                              {formatTime(item.outTime)}
                            </p>
                          </div>
                        </div>

                        {item.location && (
                          <p className="mt-3 border-t border-(--theme-divider) pt-3 text-xs text-(--theme-muted)">
                            Location: {item.location}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
          </section>

          <p className="text-center text-xs text-(--theme-light)">
            All attendance times are displayed in IST.
          </p>
        </>
      )}
    </div>
  );
};

export default AttendanceHistory;
