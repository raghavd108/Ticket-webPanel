import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Mail,
  RefreshCw,
  UserRound,
  XCircle,
  CloudOff,
} from "lucide-react";

import { api } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
type LeaveFilter = "all" | LeaveStatus;

interface Employee {
  _id: string;
  userName?: string;
  email?: string;
  designation?: string;
}

interface LeaveItem {
  _id: string;
  employeeId: string | Employee;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  Reason?: string;
  status: LeaveStatus | string;
  createdAt?: string;
  reviewComment?: string;
}

const getEmployee = (leave: LeaveItem): Employee | null =>
  typeof leave.employeeId === "object" && leave.employeeId
    ? leave.employeeId
    : null;

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

const LeaveManagement = () => {
  const { theme } = useTheme();

  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [filter, setFilter] = useState<LeaveFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");

  const fetchLeaves = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      setLoadError("");

      const response = await api.get("/leave/admin/all");
      const data = response.data?.leaves;

      setLeaves(Array.isArray(data) ? data : []);
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to load leave requests.";

      setLoadError(message);
      console.error("FETCH ADMIN LEAVES ERROR:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeaves();
  }, [fetchLeaves]);

  const counts = useMemo(
    () => ({
      all: leaves.length,
      pending: leaves.filter((item) => item.status?.toLowerCase() === "pending")
        .length,
      approved: leaves.filter(
        (item) => item.status?.toLowerCase() === "approved",
      ).length,
      rejected: leaves.filter(
        (item) => item.status?.toLowerCase() === "rejected",
      ).length,
    }),
    [leaves],
  );

  const filteredLeaves = useMemo(() => {
    if (filter === "all") return leaves;
    return leaves.filter((item) => item.status?.toLowerCase() === filter);
  }, [leaves, filter]);

  const updateLeaveStatus = async (
    leave: LeaveItem,
    status: "approved" | "rejected",
  ) => {
    const employee = getEmployee(leave);
    const employeeName = employee?.userName || "this employee";
    const action = status === "approved" ? "Approve" : "Reject";

    if (
      !window.confirm(
        `Are you sure you want to ${action.toLowerCase()} ${employeeName}'s ${leave.leaveType} request?`,
      )
    ) {
      return;
    }

    try {
      setProcessingId(leave._id);

      await api.patch(`/leave/admin/${leave._id}/status`, { status });

      setLeaves((current) =>
        current.map((item) =>
          item._id === leave._id ? { ...item, status } : item,
        ),
      );
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to update this leave request.";

      window.alert(message);
      console.error("UPDATE LEAVE STATUS ERROR:", error);

      await fetchLeaves(true);
    } finally {
      setProcessingId(null);
    }
  };

  const filters: LeaveFilter[] = [
    "all",
    "pending",
    "approved",
    "rejected",
    "cancelled",
  ];

  const getStatusColors = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return { color: theme.success, background: theme.successSoft };
      case "rejected":
        return { color: theme.danger, background: theme.dangerSoft };
      case "cancelled":
        return { color: theme.muted, background: theme.background };
      default:
        return { color: theme.warning, background: theme.warningSoft };
    }
  };

  const statCards = [
    {
      label: "All requests",
      value: counts.all,
      icon: FileText,
      color: theme.primary,
      background: theme.primarySoft,
    },
    {
      label: "Pending",
      value: counts.pending,
      icon: Clock3,
      color: theme.warning,
      background: theme.warningSoft,
    },
    {
      label: "Approved",
      value: counts.approved,
      icon: CheckCircle2,
      color: theme.success,
      background: theme.successSoft,
    },
    {
      label: "Rejected",
      value: counts.rejected,
      icon: XCircle,
      color: theme.danger,
      background: theme.dangerSoft,
    },
  ];

  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8"
      style={{ backgroundColor: theme.background, color: theme.ink }}
    >
      <div className="mx-auto max-w-7xl">
        {/* PAGE HEADER */}
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: theme.primarySoft,
                color: theme.primary,
              }}
            >
              <CalendarDays size={24} />
            </div>

            <div>
              <h1
                className="text-xl font-bold sm:text-2xl"
                style={{ color: theme.ink }}
              >
                Leave Management
              </h1>
              <p className="mt-1 text-sm" style={{ color: theme.muted }}>
                Review employee leave requests and manage approvals.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchLeaves(true)}
            disabled={refreshing}
            title="Refresh leave requests"
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
            style={{
              backgroundColor: theme.white,
              borderColor: theme.border,
              color: theme.ink,
            }}
          >
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-xl border p-5"
                style={{
                  backgroundColor: theme.white,
                  borderColor: theme.border,
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: stat.background,
                      color: stat.color,
                    }}
                  >
                    <Icon size={19} />
                  </div>
                  <strong
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: theme.ink }}
                  >
                    {stat.value}
                  </strong>
                </div>
                <p className="mt-4 text-sm" style={{ color: theme.muted }}>
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* REQUESTS HEADER */}
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: theme.ink }}
            >
              Employee requests
            </h2>
            <p className="mt-1 text-xs" style={{ color: theme.muted }}>
              {filteredLeaves.length}{" "}
              {filteredLeaves.length === 1 ? "request" : "requests"} displayed
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="mb-5 flex flex-wrap gap-2">
          {filters.map((value) => {
            const count =
              value === "all"
                ? counts.all
                : value === "pending"
                  ? counts.pending
                  : value === "approved"
                    ? counts.approved
                    : value === "rejected"
                      ? counts.rejected
                      : null;

            const active = filter === value;

            return (
              <button
                type="button"
                key={value}
                onClick={() => setFilter(value)}
                aria-pressed={active}
                className="rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: active ? theme.primarySoft : theme.white,
                  borderColor: active ? theme.primary : theme.border,
                  color: active ? theme.primary : theme.muted,
                }}
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
                {count !== null && ` (${count})`}
              </button>
            );
          })}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div
            className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border"
            style={{
              backgroundColor: theme.white,
              borderColor: theme.border,
              color: theme.muted,
            }}
          >
            <Activity
              size={30}
              className="animate-spin"
              style={{ color: theme.primary }}
            />
            <p className="text-sm">Loading leave requests...</p>
          </div>
        ) : loadError ? (
          <div
            className="flex min-h-64 flex-col items-center justify-center rounded-xl border p-6 text-center"
            style={{
              backgroundColor: theme.white,
              borderColor: theme.border,
            }}
          >
            <CloudOff size={32} style={{ color: theme.danger }} />
            <h3
              className="mt-3 text-base font-semibold"
              style={{ color: theme.ink }}
            >
              Unable to load requests
            </h3>
            <p className="mt-2 max-w-md text-sm" style={{ color: theme.muted }}>
              {loadError}
            </p>
            <button
              type="button"
              className="mt-5 rounded-lg px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: theme.primary, color: theme.everWhite }}
              onClick={() => void fetchLeaves()}
            >
              Try again
            </button>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div
            className="flex min-h-64 flex-col items-center justify-center rounded-xl border p-6 text-center"
            style={{
              backgroundColor: theme.white,
              borderColor: theme.border,
            }}
          >
            <CalendarDays size={34} style={{ color: theme.muted }} />
            <h3
              className="mt-3 text-base font-semibold"
              style={{ color: theme.ink }}
            >
              No leave requests found
            </h3>
            <p className="mt-2 max-w-md text-sm" style={{ color: theme.muted }}>
              {filter === "pending"
                ? "There are no pending requests requiring your review."
                : "Leave requests matching this filter will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredLeaves.map((leave) => {
              const employee = getEmployee(leave);
              const status = (leave.status || "pending").toLowerCase();
              const isPending = status === "pending";
              const isProcessing = processingId === leave._id;
              const statusColors = getStatusColors(status);

              return (
                <article
                  className="overflow-hidden rounded-xl border"
                  key={leave._id}
                  style={{
                    backgroundColor: theme.white,
                    borderColor: theme.border,
                  }}
                >
                  <div className="p-5">
                    {/* EMPLOYEE */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: theme.primarySoft,
                            color: theme.primary,
                          }}
                        >
                          <UserRound size={21} />
                        </div>

                        <div className="min-w-0">
                          <h3
                            className="truncate text-sm font-semibold"
                            style={{ color: theme.ink }}
                          >
                            {employee?.userName || "Employee"}
                          </h3>
                          <p
                            className="mt-0.5 truncate text-xs"
                            style={{ color: theme.muted }}
                          >
                            {employee?.designation || "Team member"}
                          </p>
                        </div>
                      </div>

                      <span
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize"
                        style={{
                          color: statusColors.color,
                          backgroundColor: statusColors.background,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: statusColors.color }}
                        />
                        {status}
                      </span>
                    </div>

                    {employee?.email && (
                      <div
                        className="mt-3 flex items-center gap-2 text-xs"
                        style={{ color: theme.muted }}
                      >
                        <Mail size={14} />
                        <span className="break-all">{employee.email}</span>
                      </div>
                    )}

                    {/* LEAVE TYPE */}
                    <div
                      className="mt-5 flex items-center gap-3 rounded-lg p-3"
                      style={{ backgroundColor: theme.background }}
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: theme.primarySoft,
                          color: theme.primary,
                        }}
                      >
                        <CalendarDays size={19} />
                      </div>
                      <div>
                        <span
                          className="block text-[10px] font-semibold tracking-wider"
                          style={{ color: theme.muted }}
                        >
                          LEAVE TYPE
                        </span>
                        <strong
                          className="mt-0.5 block text-sm"
                          style={{ color: theme.ink }}
                        >
                          {leave.leaveType || "Leave"}
                        </strong>
                      </div>
                    </div>

                    {/* DATES */}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <span
                          className="block text-[10px] font-semibold tracking-wider"
                          style={{ color: theme.muted }}
                        >
                          START DATE
                        </span>
                        <strong
                          className="mt-1 block text-sm"
                          style={{ color: theme.ink }}
                        >
                          {formatDate(leave.startDate)}
                        </strong>
                      </div>

                      <ChevronRight
                        size={18}
                        className="shrink-0"
                        style={{ color: theme.light }}
                      />

                      <div className="min-w-0 flex-1">
                        <span
                          className="block text-[10px] font-semibold tracking-wider"
                          style={{ color: theme.muted }}
                        >
                          END DATE
                        </span>
                        <strong
                          className="mt-1 block text-sm"
                          style={{ color: theme.ink }}
                        >
                          {formatDate(leave.endDate)}
                        </strong>
                      </div>
                    </div>

                    {/* REASON */}
                    <div className="mt-4">
                      <span
                        className="block text-[10px] font-semibold tracking-wider"
                        style={{ color: theme.muted }}
                      >
                        REASON FOR LEAVE
                      </span>
                      <p
                        className="mt-1 whitespace-pre-wrap text-sm leading-6"
                        style={{ color: theme.text }}
                      >
                        {leave.reason || leave.Reason || "No reason provided"}
                      </p>
                    </div>

                    <div
                      className="mt-4 flex items-center gap-2 border-t pt-3 text-xs"
                      style={{ borderColor: theme.divider, color: theme.muted }}
                    >
                      <Clock3 size={14} />
                      Applied on {formatDate(leave.createdAt)}
                    </div>

                    {/* ACTIONS */}
                    {isPending ? (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={processingId !== null}
                          onClick={() =>
                            void updateLeaveStatus(leave, "rejected")
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                          style={{
                            backgroundColor: theme.dangerSoft,
                            borderColor: theme.danger,
                            color: theme.danger,
                          }}
                        >
                          {isProcessing ? (
                            <Activity size={16} className="animate-spin" />
                          ) : (
                            <XCircle size={17} />
                          )}
                          Reject
                        </button>

                        <button
                          type="button"
                          disabled={processingId !== null}
                          onClick={() =>
                            void updateLeaveStatus(leave, "approved")
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                          style={{
                            backgroundColor: theme.success,
                            color: theme.everWhite,
                          }}
                        >
                          {isProcessing ? (
                            <Activity size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={17} />
                          )}
                          Approve
                        </button>
                      </div>
                    ) : (
                      <div
                        className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium capitalize"
                        style={{
                          backgroundColor: statusColors.background,
                          color: statusColors.color,
                        }}
                      >
                        {status === "approved" ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        This request has been {status}.
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagement;
