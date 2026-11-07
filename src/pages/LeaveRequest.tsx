import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const LEAVE_TYPES = [
  "Casual Leave",
  "Sick Leave",
  "Earned Leave",
  "Annual Leave",
  "Emergency Leave",
  "Unpaid Leave",
] as const;

type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

interface LeaveRequestItem {
  _id?: string;
  id?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus | string;
  createdAt?: string;
  reviewComment?: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const todayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (value?: string) => {
  if (!value) return "—";

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDays = (start: string, end: string) => {
  if (!start || !end) return 0;
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const startDate = Date.UTC(sy, sm - 1, sd);
  const endDate = Date.UTC(ey, em - 1, ed);
  return Math.floor((endDate - startDate) / 86400000) + 1;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || apiError.message || fallback;
};

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  cancelled: "bg-stone-100 text-stone-600 ring-stone-200",
};

export default function LeaveRequest() {
  const { theme, isDarkMode } = useTheme();

  const themeStyles = `
    .leave-request-page {
      background: ${theme.background} !important;
      color: ${theme.text} !important;
      color-scheme: ${isDarkMode ? "dark" : "light"};
    }
    .leave-request-page [class*="bg-white"],
    .leave-request-page [class*="bg-[#fdfdfb]"],
    .leave-request-page [class*="bg-[#fcfbf8]"],
    .leave-request-page [class*="bg-[#faf9f6]"] {
      background-color: ${theme.white} !important;
    }
    .leave-request-page [class*="border-[#e8e5dc]"],
    .leave-request-page [class*="border-[#e4e1d8]"],
    .leave-request-page [class*="border-[#ece9e1]"],
    .leave-request-page [class*="border-[#dedbd2]"],
    .leave-request-page [class*="border-[#eeeae1]"] {
      border-color: ${theme.border} !important;
    }
    .leave-request-page [class*="text-[#262820]"],
    .leave-request-page [class*="text-[#55564e]"] {
      color: ${theme.text} !important;
    }
    .leave-request-page [class*="text-[#858579]"],
    .leave-request-page [class*="text-[#929187]"],
    .leave-request-page [class*="text-[#99998f]"],
    .leave-request-page [class*="text-[#77796f]"] {
      color: ${theme.muted} !important;
    }
    .leave-request-page input,
    .leave-request-page select,
    .leave-request-page textarea {
      background-color: ${theme.input} !important;
      color: ${theme.text} !important;
      border-color: ${theme.border} !important;
    }
    .leave-request-page input::placeholder,
    .leave-request-page textarea::placeholder {
      color: ${theme.muted} !important;
    }
    .leave-request-page [class*="bg-[#f7f6f2]"],
    .leave-request-page [class*="bg-[#faf9f6]"],
    .leave-request-page [class*="bg-[#fcfbf8]"],
    .leave-request-page [class*="bg-[#fdfdfb]"] {
      background-color: ${theme.background} !important;
    }
    .leave-request-page [class*="bg-[#f7f3ec]"],
    .leave-request-page [class*="bg-[#f4f1eb]"],
    .leave-request-page [class*="bg-[#f3ede4]"],
    .leave-request-page [class*="bg-[#f0e9df]"] {
      background-color: ${theme.primarySoft} !important;
    }
    .leave-request-page [class*="text-[#a47745]"],
    .leave-request-page [class*="text-[#8d673d]"],
    .leave-request-page [class*="text-[#9a754b]"] {
      color: ${theme.primary} !important;
    }
    .leave-request-page [class*="bg-[#a47745]"] {
      background-color: ${theme.primary} !important;
    }
    .leave-request-page [class*="hover\\:bg-[#91683d]"]:hover {
      background-color: ${theme.primaryDark} !important;
    }
    .leave-request-page [class*="border-rose-200"],
    .leave-request-page [class*="bg-rose-50"] {
      border-color: ${theme.danger} !important;
      background-color: ${theme.dangerSoft} !important;
    }
    .leave-request-page [class*="text-rose-700"] {
      color: ${theme.danger} !important;
    }
    .leave-request-page [class*="border-emerald-200"],
    .leave-request-page [class*="bg-emerald-50"] {
      border-color: ${theme.success} !important;
      background-color: ${theme.successSoft} !important;
    }
    .leave-request-page [class*="text-emerald-700"] {
      color: ${theme.success} !important;
    }
    .leave-request-page [class*="bg-amber-50"] {
      background-color: ${theme.warningSoft} !important;
    }
    .leave-request-page [class*="text-amber-700"] {
      color: ${theme.warning} !important;
    }
    .leave-request-page [class*="ring-amber-200"],
    .leave-request-page [class*="ring-emerald-200"],
    .leave-request-page [class*="ring-rose-200"],
    .leave-request-page [class*="ring-stone-200"] {
      --tw-ring-color: ${theme.border} !important;
    }
    .leave-request-page button:focus-visible,
    .leave-request-page input:focus-visible,
    .leave-request-page select:focus-visible,
    .leave-request-page textarea:focus-visible {
      outline: 2px solid ${theme.primary};
      outline-offset: 2px;
    }
  `;

  const [leaveType, setLeaveType] =
    useState<(typeof LEAVE_TYPES)[number]>("Casual Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const requestedDays = useMemo(
    () => getDays(startDate, endDate),
    [startDate, endDate],
  );

  const fetchLeaves = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/leave/my-leaves");
      setLeaves(
        Array.isArray(response.data?.leaves) ? response.data.leaves : [],
      );
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load your leave applications."));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeaves();
  }, [fetchLeaves]);

  const resetForm = () => {
    setLeaveType("Casual Leave");
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    setError("");

    if (!startDate || !endDate || !reason.trim()) {
      setError("Please complete all fields before submitting.");
      return;
    }
    if (startDate < todayKey()) {
      setError("Leave cannot start before today.");
      return;
    }
    if (endDate < startDate) {
      setError("The end date cannot be earlier than the start date.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Please provide a reason with at least 5 characters.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/leave/apply", {
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
      });
      setNotice(
        response.data?.message ||
          "Your leave request has been submitted successfully.",
      );
      resetForm();
      await fetchLeaves();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to submit your leave request."));
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = leaves.filter(
    (leave) => leave.status?.toLowerCase() === "pending",
  ).length;
  const approvedCount = leaves.filter(
    (leave) => leave.status?.toLowerCase() === "approved",
  ).length;

  return (
    <div className="leave-request-page min-h-full bg-[#f7f6f2] px-4 py-6 text-[#262820] sm:px-6 lg:px-8">
      <style>{themeStyles}</style>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#9a754b]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a47745]" />
              Employee self service
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Leave requests
            </h1>
            <p className="mt-1 text-sm text-[#77796f]">
              Apply for time off and keep track of your applications.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchLeaves()}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[#e4e1d8] bg-white px-4 py-2.5 text-sm font-semibold text-[#625b4f] shadow-sm transition hover:bg-[#faf9f6] sm:self-auto"
          >
            <span aria-hidden="true">↻</span>
            Refresh history
          </button>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e8e5dc] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-[#858579]">
              Total applications
            </p>
            <p className="mt-2 text-2xl font-bold">{leaves.length}</p>
          </div>
          <div className="rounded-2xl border border-[#f0e4c9] bg-[#fffaf0] p-4 shadow-sm">
            <p className="text-xs font-medium text-[#92713d]">Pending review</p>
            <p className="mt-2 text-2xl font-bold text-[#8a641f]">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-2xl border border-[#dcebe0] bg-[#f4faf5] p-4 shadow-sm">
            <p className="text-xs font-medium text-[#568064]">Approved</p>
            <p className="mt-2 text-2xl font-bold text-[#287448]">
              {approvedCount}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-2xl border border-[#e8e5dc] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold">New application</h2>
              <p className="mt-1 text-sm text-[#858579]">
                Enter the dates and details for your leave.
              </p>
            </div>

            <form onSubmit={submitRequest} className="space-y-4">
              <div>
                <label
                  htmlFor="leaveType"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  Leave type
                </label>
                <select
                  id="leaveType"
                  value={leaveType}
                  onChange={(event) =>
                    setLeaveType(
                      event.target.value as (typeof LEAVE_TYPES)[number],
                    )
                  }
                  className="w-full rounded-xl border border-[#e4e1d8] bg-[#fdfdfb] px-3.5 py-3 text-sm outline-none transition focus:border-[#a47745] focus:ring-2 focus:ring-[#a47745]/15"
                >
                  {LEAVE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startDate"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Start date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    min={todayKey()}
                    value={startDate}
                    onChange={(event) => {
                      const value = event.target.value;
                      setStartDate(value);
                      if (endDate && value && endDate < value) setEndDate("");
                    }}
                    required
                    className="w-full rounded-xl border border-[#e4e1d8] bg-[#fdfdfb] px-3 py-3 text-sm outline-none focus:border-[#a47745] focus:ring-2 focus:ring-[#a47745]/15"
                  />
                </div>
                <div>
                  <label
                    htmlFor="endDate"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    End date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    min={startDate || todayKey()}
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                    className="w-full rounded-xl border border-[#e4e1d8] bg-[#fdfdfb] px-3 py-3 text-sm outline-none focus:border-[#a47745] focus:ring-2 focus:ring-[#a47745]/15"
                  />
                </div>
              </div>

              {startDate && endDate && endDate >= startDate && (
                <div className="flex items-center justify-between rounded-xl bg-[#f7f3ec] px-3.5 py-3 text-sm">
                  <span className="text-[#766b5c]">Requested duration</span>
                  <span className="font-bold text-[#8d673d]">
                    {requestedDays} {requestedDays === 1 ? "day" : "days"}
                  </span>
                </div>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="reason" className="text-sm font-semibold">
                    Reason for leave
                  </label>
                  <span className="text-xs text-[#99998f]">
                    {reason.length}/500
                  </span>
                </div>
                <textarea
                  id="reason"
                  rows={5}
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain why you need leave..."
                  required
                  className="w-full resize-y rounded-xl border border-[#e4e1d8] bg-[#fdfdfb] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#aaa99f] focus:border-[#a47745] focus:ring-2 focus:ring-[#a47745]/15"
                />
                <p className="mt-1.5 text-xs text-[#99998f]">
                  Please provide at least 5 characters.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
                >
                  {error}
                </div>
              )}
              {notice && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700"
                >
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a47745] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#91683d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">➤</span>
                    Submit application
                  </>
                )}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[#e8e5dc] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">My applications</h2>
                <p className="mt-1 text-sm text-[#858579]">
                  Your leave request history and review status.
                </p>
              </div>
              <span className="rounded-full bg-[#f4f1eb] px-3 py-1 text-xs font-semibold text-[#85745d]">
                {leaves.length} total
              </span>
            </div>

            {fetching ? (
              <div className="flex items-center justify-center gap-3 py-16 text-sm text-[#858579]">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d9d1c4] border-t-[#a47745]" />
                Loading applications...
              </div>
            ) : error && leaves.length === 0 ? (
              <div className="rounded-xl border border-[#eeeae1] bg-[#faf9f6] px-4 py-10 text-center">
                <p className="text-sm font-semibold">
                  Couldn't load applications
                </p>
                <p className="mt-1 text-sm text-[#858579]">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchLeaves()}
                  className="mt-4 rounded-lg bg-[#f0e9df] px-4 py-2 text-sm font-semibold text-[#8d673d]"
                >
                  Try again
                </button>
              </div>
            ) : leaves.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#dedbd2] bg-[#fcfbf8] px-4 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3ede4] text-xl text-[#a47745]">
                  ▦
                </div>
                <p className="mt-3 text-sm font-bold">No applications yet</p>
                <p className="mt-1 text-sm text-[#858579]">
                  Your submitted leave requests will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaves.map((leave, index) => {
                  const status = (leave.status || "pending").toLowerCase();
                  const key =
                    leave._id || leave.id || `${leave.startDate}-${index}`;
                  return (
                    <article
                      key={key}
                      className="rounded-xl border border-[#ece9e1] p-4 transition hover:border-[#d8c9b4]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold">
                            {leave.leaveType || "Leave"}
                          </h3>
                          <p className="mt-1 text-xs text-[#929187]">
                            Applied {formatDate(leave.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${
                            statusStyles[status] || statusStyles.pending
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-[#faf9f6] p-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#99998f]">
                            From
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {formatDate(leave.startDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#99998f]">
                            To
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {formatDate(leave.endDate)}
                          </p>
                        </div>
                      </div>

                      {leave.reason && (
                        <div className="mt-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#99998f]">
                            Reason
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#55564e]">
                            {leave.reason}
                          </p>
                        </div>
                      )}

                      {leave.reviewComment && (
                        <div className="mt-3 rounded-lg border border-[#eee6d9] bg-[#faf7f1] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#98764d]">
                            Admin response
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[#625b4f]">
                            {leave.reviewComment}
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
