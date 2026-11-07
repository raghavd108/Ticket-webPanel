import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

type TicketStatus = {
  id: number;
  code: string;
  name: string;
  sortOrder?: number;
  isFinal?: boolean;
};

type Employee = {
  id: string;
  userName: string;
  email?: string;
  designation?: string | null;
};

type Ticket = {
  id?: string;
  _id: string;
  module: string;
  problem: string;
  status: string;
  statusName?: string;
  statusId?: number;
  createdAt: string;
  image?: { url: string }[];
  organisation?: {
    name: string;
    orgType: string;
  };
  user?: {
    userName: string;
    email?: string;
  };
  assignedEmployeeId?: string | null;
  assignedEmployee?: Employee | null;
};

const PAGE_SIZE = 10;

const normalizeTicket = (ticket: any): Ticket => ({
  ...ticket,
  _id: String(ticket?._id ?? ticket?.id ?? ""),
  status: String(ticket?.status ?? "pending").toLowerCase(),
  image: Array.isArray(ticket?.image)
    ? ticket.image
    : Array.isArray(ticket?.images)
      ? ticket.images.map((item: any) => ({
          ...item,
          url: item.url ?? "",
        }))
      : [],
});

const normalizeStatus = (status: string) =>
  status?.toLowerCase().replaceAll("_", "-") || "pending";

const OPEN_STATUSES = ["pending", "assigned"];
const COMPLETED_STATUSES = ["work-completed", "release-updated"];

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const statusColor = (status: string) => {
  const value = normalizeStatus(status);

  if (OPEN_STATUSES.includes(value))
    return "bg-amber-50 text-amber-700 ring-amber-200";

  if (value === "in-progress")
    return "bg-violet-50 text-violet-700 ring-violet-200";

  if (COMPLETED_STATUSES.includes(value))
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";

  if (value === "cancelled") return "bg-red-50 text-red-700 ring-red-200";

  return "bg-gray-100 text-gray-700 ring-gray-200";
};

export default function Tickets() {
  const { user } = useAuth();
  const { theme } = useTheme();

  // Theme tokens are applied to the existing layout so the ticket workflow
  // remains unchanged while the page follows the app-wide light/dark theme.
  const pageTheme = {
    "--ticket-bg": theme.background,
    "--ticket-surface": theme.white,
    "--ticket-input": theme.input,
    "--ticket-text": theme.text,
    "--ticket-muted": theme.muted,
    "--ticket-light": theme.light,
    "--ticket-primary": theme.primary,
    "--ticket-primary-soft": theme.primarySoft,
    "--ticket-border": theme.border,
    "--ticket-divider": theme.divider,
    "--ticket-success": theme.success,
    "--ticket-success-soft": theme.successSoft,
    "--ticket-warning": theme.warning,
    "--ticket-warning-soft": theme.warningSoft,
    "--ticket-danger": theme.danger,
    "--ticket-danger-soft": theme.dangerSoft,
    "--ticket-blue": theme.blue,
    "--ticket-blue-soft": theme.blueSoft,
  } as CSSProperties;

  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";
  const isClient = user?.role === "client";

  const canManageStatus = isAdmin || isEmployee;
  const canAssign = isAdmin || Boolean(user?.permissions?.canAssignTickets);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [organisationFilter, setOrganisationFilter] = useState("all");
  const [orgTypeFilter, setOrgTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "7d" | "30d" | "month" | "custom"
  >("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sortFilter, setSortFilter] = useState("newest");

  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [attachmentPreview, setAttachmentPreview] = useState("");

  // --------------------------------------------------
  // FETCH TICKETS
  // --------------------------------------------------

  const fetchTickets = async (pageNumber = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      setError("");

      const response = await api.get("/complain/getcomplain", {
        params: {
          page: pageNumber,
          limit: PAGE_SIZE,
        },
      });

      const rawTickets =
        response.data?.complains ?? response.data?.complaint ?? [];

      const formatted = Array.isArray(rawTickets)
        ? rawTickets.map(normalizeTicket)
        : [];

      setTickets((previous) => {
        if (!append) return formatted;

        const existing = new Set(previous.map((item) => item._id));

        return [
          ...previous,
          ...formatted.filter((item) => !existing.has(item._id)),
        ];
      });

      const pagination = response.data?.pagination;

      setHasMore(
        typeof pagination?.hasNextPage === "boolean"
          ? pagination.hasNextPage
          : formatted.length === PAGE_SIZE,
      );

      setPage(pageNumber);
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to load tickets.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // --------------------------------------------------
  // FETCH STATUSES
  // --------------------------------------------------

  const fetchStatuses = async () => {
    try {
      const response = await api.get("/complain/statuses");

      setStatuses(
        Array.isArray(response.data?.statuses) ? response.data.statuses : [],
      );
    } catch (err) {
      console.error("STATUS FETCH ERROR:", err);
    }
  };

  useEffect(() => {
    fetchTickets(1);
    fetchStatuses();
  }, []);

  // --------------------------------------------------
  // FILTER OPTIONS
  // --------------------------------------------------

  const modules = useMemo(
    () =>
      [
        ...new Set(tickets.map((ticket) => ticket.module).filter(Boolean)),
      ].sort(),
    [tickets],
  );

  const organisations = useMemo(
    () =>
      [
        ...new Set(
          tickets.map((ticket) => ticket.organisation?.name).filter(Boolean),
        ),
      ] as string[],
    [tickets],
  );

  const organisationTypes = useMemo(
    () =>
      [
        ...new Set(
          tickets
            .map((ticket) => ticket.organisation?.orgType)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [tickets],
  );

  // --------------------------------------------------
  // FILTER TICKETS
  // --------------------------------------------------

  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    // Keep client tickets scoped to their own organisation.
    if (isClient) {
      result = result.filter(
        (ticket) => ticket.organisation?.name === user?.organisation,
      );
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();

      result = result.filter((ticket) =>
        [
          ticket._id,
          ticket.module,
          ticket.problem,
          ticket.organisation?.name,
          ticket.organisation?.orgType,
          ticket.user?.userName,
          ticket.user?.email,
          ticket.assignedEmployee?.userName,
          ticket.assignedEmployee?.email,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      );
    }

    if (moduleFilter !== "all") {
      result = result.filter((ticket) => ticket.module === moduleFilter);
    }

    if (organisationFilter !== "all") {
      result = result.filter(
        (ticket) => ticket.organisation?.name === organisationFilter,
      );
    }

    if (orgTypeFilter !== "all") {
      result = result.filter(
        (ticket) => ticket.organisation?.orgType === orgTypeFilter,
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(
        (ticket) => normalizeStatus(ticket.status) === statusFilter,
      );
    }

    // Inclusive local-calendar date range, matching the useFilter hook.
    if (dateFilter !== "all") {
      const now = new Date();
      const startOfDay = (value: Date) => {
        const date = new Date(value);
        date.setHours(0, 0, 0, 0);
        return date;
      };
      const endOfDay = (value: Date) => {
        const date = new Date(value);
        date.setHours(23, 59, 59, 999);
        return date;
      };

      let from: Date | null = null;
      let to: Date | null = null;

      if (dateFilter === "today") {
        from = startOfDay(now);
        to = endOfDay(now);
      } else if (dateFilter === "7d") {
        from = startOfDay(now);
        from.setDate(from.getDate() - 6);
        to = endOfDay(now);
      } else if (dateFilter === "30d") {
        from = startOfDay(now);
        from.setDate(from.getDate() - 29);
        to = endOfDay(now);
      } else if (dateFilter === "month") {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = endOfDay(now);
      } else if (dateFilter === "custom") {
        if (customFrom) {
          const parsedFrom = new Date(`${customFrom}T00:00:00`);
          if (!Number.isNaN(parsedFrom.getTime())) from = parsedFrom;
        }
        if (customTo) {
          const parsedTo = new Date(`${customTo}T23:59:59.999`);
          if (!Number.isNaN(parsedTo.getTime())) to = parsedTo;
        }
      }

      result = result.filter((ticket) => {
        const createdAt = new Date(ticket.createdAt);
        if (Number.isNaN(createdAt.getTime())) return false;
        if (from && createdAt < from) return false;
        if (to && createdAt > to) return false;
        return true;
      });
    }

    result.sort((a, b) => {
      const first = new Date(a.createdAt).getTime();
      const second = new Date(b.createdAt).getTime();
      return sortFilter === "oldest" ? first - second : second - first;
    });

    return result;
  }, [
    tickets,
    search,
    moduleFilter,
    organisationFilter,
    orgTypeFilter,
    statusFilter,
    dateFilter,
    customFrom,
    customTo,
    sortFilter,
    isClient,
    user?.organisation,
  ]);

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const pendingCount = tickets.filter((ticket) =>
    OPEN_STATUSES.includes(normalizeStatus(ticket.status)),
  ).length;

  const progressCount = tickets.filter(
    (ticket) => normalizeStatus(ticket.status) === "in-progress",
  ).length;

  const completedCount = tickets.filter((ticket) =>
    COMPLETED_STATUSES.includes(normalizeStatus(ticket.status)),
  ).length;

  const stats = [
    {
      label: "Total tickets",
      value: tickets.length,
      color: "bg-gray-900",
      icon: "▤",
    },
    {
      label: "Pending",
      value: pendingCount,
      color: "bg-amber-500",
      icon: "◷",
    },
    {
      label: "In progress",
      value: progressCount,
      color: "bg-violet-600",
      icon: "↻",
    },
    {
      label: "Completed",
      value: completedCount,
      color: "bg-emerald-600",
      icon: "✓",
    },
  ];

  // --------------------------------------------------
  // OPEN TICKET DETAILS
  // --------------------------------------------------

  const openDetails = async (ticket: Ticket) => {
    setSelectedTicket(ticket);

    setSelectedEmployeeId(
      ticket.assignedEmployeeId ?? ticket.assignedEmployee?.id ?? "",
    );

    if (canAssign) {
      await fetchEmployees(ticket._id);
    }
  };

  // --------------------------------------------------
  // FETCH ASSIGNABLE EMPLOYEES
  // --------------------------------------------------

  const fetchEmployees = async (ticketId: string) => {
    try {
      setLoadingEmployees(true);
      setEmployees([]);

      const response = await api.get(
        `/complain/${ticketId}/assignable-employees`,
      );

      const data = Array.isArray(response.data?.employees)
        ? response.data.employees
        : [];

      setEmployees(
        data
          .map((item: any) => ({
            id: String(item.id ?? item._id ?? ""),
            userName: item.userName ?? "Unknown user",
            email: item.email,
            designation: item.designation,
          }))
          .filter((item: Employee) => item.id),
      );
    } catch (err) {
      console.error("EMPLOYEE FETCH ERROR:", err);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // --------------------------------------------------
  // UPDATE STATUS
  // --------------------------------------------------

  const updateStatus = async (statusCode: string) => {
    if (!selectedTicket) return;

    try {
      setUpdatingStatus(true);

      const response = await api.patch(
        `/complain/update-status/${selectedTicket._id}`,
        { status: statusCode },
      );

      const updated = response.data?.complaint
        ? normalizeTicket(response.data.complaint)
        : {
            ...selectedTicket,
            status: statusCode,
          };

      setTickets((previous) =>
        previous.map((ticket) =>
          ticket._id === updated._id ? { ...ticket, ...updated } : ticket,
        ),
      );

      setSelectedTicket(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || "Unable to update ticket status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // --------------------------------------------------
  // ASSIGN / UNASSIGN TICKET
  // --------------------------------------------------

  const assignTicket = async () => {
    if (!selectedTicket) return;

    try {
      setAssigning(true);

      const response = await api.patch(
        `/complain/${selectedTicket._id}/assign`,
        {
          employeeId: selectedEmployeeId || null,
        },
      );

      const updated = response.data?.complaint
        ? normalizeTicket(response.data.complaint)
        : null;

      if (updated) {
        setTickets((previous) =>
          previous.map((ticket) =>
            ticket._id === updated._id ? { ...ticket, ...updated } : ticket,
          ),
        );

        setSelectedTicket(updated);
      } else {
        await fetchTickets(1);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Unable to assign ticket.");
    } finally {
      setAssigning(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setModuleFilter("all");
    setOrganisationFilter("all");
    setOrgTypeFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
    setCustomFrom("");
    setCustomTo("");
    setSortFilter("newest");
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
          <p className="mt-4 text-sm text-gray-500">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-theme-page space-y-7 pb-10" style={pageTheme}>
      <style>{`
        .ticket-theme-page {
          color: var(--ticket-text);
          color-scheme: light dark;
        }
        .ticket-theme-page .bg-white { background-color: var(--ticket-surface) !important; }
        .ticket-theme-page .bg-gray-50 { background-color: var(--ticket-bg) !important; }
        .ticket-theme-page .bg-gray-100 { background-color: var(--ticket-primary-soft) !important; }
        .ticket-theme-page .bg-gray-900 { background-color: var(--ticket-primary) !important; }
        .ticket-theme-page .text-gray-900,
        .ticket-theme-page .text-gray-800,
        .ticket-theme-page .text-gray-700 { color: var(--ticket-text) !important; }
        .ticket-theme-page .text-gray-600,
        .ticket-theme-page .text-gray-500,
        .ticket-theme-page .text-gray-400 { color: var(--ticket-muted) !important; }
        .ticket-theme-page .border-gray-100,
        .ticket-theme-page .border-gray-200 { border-color: var(--ticket-border) !important; }
        .ticket-theme-page .divide-gray-100 > :not([hidden]) ~ :not([hidden]) { border-color: var(--ticket-divider) !important; }
        .ticket-theme-page .hover\\:bg-gray-50:hover { background-color: var(--ticket-primary-soft) !important; }
        .ticket-theme-page .hover\\:bg-gray-700:hover { background-color: var(--ticket-primary) !important; filter: brightness(.92); }
        .ticket-theme-page input,
        .ticket-theme-page select,
        .ticket-theme-page textarea {
          color: var(--ticket-text);
          background-color: var(--ticket-input);
          border-color: var(--ticket-border);
        }
        .ticket-theme-page input::placeholder { color: var(--ticket-muted); }
        .ticket-theme-page .bg-amber-50 { background-color: var(--ticket-warning-soft) !important; }
        .ticket-theme-page .text-amber-700,
        .ticket-theme-page .text-amber-600 { color: var(--ticket-warning) !important; }
        .ticket-theme-page .ring-amber-200 { --tw-ring-color: var(--ticket-warning) !important; }
        .ticket-theme-page .bg-amber-500 { background-color: var(--ticket-warning) !important; }
        .ticket-theme-page .bg-violet-50 { background-color: var(--ticket-blue-soft) !important; }
        .ticket-theme-page .text-violet-700 { color: var(--ticket-blue) !important; }
        .ticket-theme-page .ring-violet-200 { --tw-ring-color: var(--ticket-blue) !important; }
        .ticket-theme-page .bg-violet-600 { background-color: var(--ticket-blue) !important; }
        .ticket-theme-page .bg-emerald-50 { background-color: var(--ticket-success-soft) !important; }
        .ticket-theme-page .text-emerald-700 { color: var(--ticket-success) !important; }
        .ticket-theme-page .ring-emerald-200 { --tw-ring-color: var(--ticket-success) !important; }
        .ticket-theme-page .bg-emerald-600 { background-color: var(--ticket-success) !important; }
        .ticket-theme-page .bg-red-50 { background-color: var(--ticket-danger-soft) !important; }
        .ticket-theme-page .text-red-700 { color: var(--ticket-danger) !important; }
        .ticket-theme-page .border-red-200 { border-color: var(--ticket-danger) !important; }
        .ticket-theme-page .text-white { color: #fff !important; }
        .ticket-theme-page button:disabled { cursor: not-allowed; }
        .ticket-theme-page button:focus-visible,
        .ticket-theme-page input:focus-visible,
        .ticket-theme-page select:focus-visible {
          outline: 2px solid var(--ticket-primary);
          outline-offset: 2px;
        }
      `}</style>
      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Support desk
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            {isClient ? "My Tickets" : "Tickets"}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {isClient
              ? "Track your support requests and their progress."
              : "Manage and monitor support requests across organisations."}
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchTickets(1);
          }}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <span className={refreshing ? "animate-spin" : ""}>↻</span>
          Refresh
        </button>
      </div>

      {/* STATISTICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                {stat.label}
              </span>

              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg text-white ${stat.color}`}
              >
                {stat.icon}
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold text-gray-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* STATUS BREAKDOWN */}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Resolution progress</h2>
            <p className="mt-1 text-xs text-gray-500">
              Overview of your loaded tickets by current status
            </p>
          </div>

          <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
            {tickets.length} tickets
          </span>
        </div>

        <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-gray-100">
          {tickets.length > 0 && (
            <>
              <div
                className="bg-amber-500"
                style={{
                  width: `${(pendingCount / tickets.length) * 100}%`,
                }}
              />
              <div
                className="bg-violet-600"
                style={{
                  width: `${(progressCount / tickets.length) * 100}%`,
                }}
              />
              <div
                className="bg-emerald-600"
                style={{
                  width: `${(completedCount / tickets.length) * 100}%`,
                }}
              />
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-6">
          {[
            ["Pending", pendingCount, "bg-amber-500"],
            ["In progress", progressCount, "bg-violet-600"],
            ["Completed", completedCount, "bg-emerald-600"],
          ].map(([label, count, color]) => (
            <div key={String(label)} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-xs font-bold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TICKET LIST */}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Recent tickets
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Select a ticket to view its details.
              </p>
            </div>

            <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
              {filteredTickets.length} matching loaded tickets
            </span>
          </div>

          {/* SEARCH */}

          <div className="mt-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets, modules, clients..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
            />
          </div>

          {/* FILTERS */}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            >
              <option value="all">All modules</option>
              {modules.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            {!isClient && (
              <select
                value={organisationFilter}
                onChange={(e) => setOrganisationFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
              >
                <option value="all">All organisations</option>
                {organisations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            )}

            {!isClient && (
              <select
                value={orgTypeFilter}
                onChange={(e) => setOrgTypeFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
              >
                <option value="all">All organisation types</option>
                {organisationTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status.code} value={normalizeStatus(status.code)}>
                  {status.name}
                </option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) =>
                setDateFilter(
                  e.target.value as
                    | "all"
                    | "today"
                    | "7d"
                    | "30d"
                    | "month"
                    | "custom",
                )
              }
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="month">This month</option>
              <option value="custom">Custom range</option>
            </select>

            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {dateFilter === "custom" && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">
                  From date
                </span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">
                  To date
                </span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                />
              </label>
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900"
            >
              Clear filters
            </button>
          </div>
        </div>

        {error && (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* TABLE */}

        {filteredTickets.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-500">
              ✓
            </div>

            <h3 className="mt-4 font-semibold text-gray-900">
              No tickets found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {tickets.length
                ? "Try changing your filters."
                : "There are no tickets available yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5 text-left">
              <thead className="bg-gray-50">
                <tr className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4">Ticket</th>
                  <th className="px-5 py-4">Organisation</th>
                  <th className="px-5 py-4">Raised by</th>
                  <th className="px-5 py-4">Assigned to</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket._id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 font-semibold text-gray-700">
                          {ticket.module?.slice(0, 1).toUpperCase() || "T"}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">
                            {ticket.module}
                          </p>
                          <p className="mt-1 max-w-57.5 truncate text-xs text-gray-500">
                            {ticket.problem}
                          </p>
                          {ticket.image?.length ? (
                            <p className="mt-1 text-xs text-gray-400">
                              {ticket.image.length} attachment(s)
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-800">
                        {ticket.organisation?.name || "—"}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {ticket.organisation?.orgType || ""}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {ticket.user?.userName || "—"}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {ticket.assignedEmployee?.userName || "Unassigned"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">
                        {formatDate(ticket.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatTime(ticket.createdAt)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusColor(ticket.status)}`}
                      >
                        {ticket.statusName ||
                          statuses.find(
                            (item) =>
                              normalizeStatus(item.code) ===
                              normalizeStatus(ticket.status),
                          )?.name ||
                          ticket.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => openDetails(ticket)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-white"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-500">
            Showing {tickets.length} loaded tickets
          </p>

          {hasMore && (
            <button
              disabled={loadingMore}
              onClick={() => fetchTickets(page + 1, true)}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more tickets"}
            </button>
          )}
        </div>
      </section>

      {/* ------------------------------------------------
          TICKET DETAILS MODAL
      ------------------------------------------------ */}

      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedTicket(null);
            }
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Support desk
                </p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  Ticket details
                </h2>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-600 hover:bg-gray-200"
              >
                ×
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="space-y-6 overflow-y-auto p-6">
              {/* IDENTITY */}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedTicket.module}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Reported on {formatDate(selectedTicket.createdAt)} at{" "}
                    {formatTime(selectedTicket.createdAt)}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ring-inset ${statusColor(selectedTicket.status)}`}
                >
                  {selectedTicket.statusName ||
                    statuses.find(
                      (item) =>
                        normalizeStatus(item.code) ===
                        normalizeStatus(selectedTicket.status),
                    )?.name ||
                    selectedTicket.status}
                </span>
              </div>

              {/* PROBLEM */}

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Reported issue
                </p>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                  {selectedTicket.problem || "No description provided."}
                </p>
              </div>

              {/* TICKET INFORMATION */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-400">Organisation</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {selectedTicket.organisation?.name || "—"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedTicket.organisation?.orgType || ""}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-400">Raised by</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {selectedTicket.user?.userName || "—"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedTicket.user?.email || ""}
                  </p>
                </div>
              </div>

              {/* ATTACHMENTS */}

              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Attachments</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Images submitted with this ticket.
                    </p>
                  </div>

                  <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
                    {selectedTicket.image?.length || 0} images
                  </span>
                </div>

                {selectedTicket.image?.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedTicket.image.map((item, index) => (
                      <button
                        key={`${item.url}-${index}`}
                        onClick={() => setAttachmentPreview(item.url)}
                        className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                      >
                        <img
                          src={item.url}
                          alt={`Ticket attachment ${index + 1}`}
                          className="h-36 w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                          View
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                    No attachments available.
                  </div>
                )}
              </div>

              {/* PROGRESS */}

              <div>
                <h3 className="font-semibold text-gray-900">
                  Resolution progress
                </h3>

                <div className="mt-4 space-y-4">
                  {[
                    {
                      title: "Submitted",
                      description: "Ticket received successfully",
                      done: true,
                    },
                    {
                      title: "In progress",
                      description: "Our team is working on your issue",
                      done: ["in-progress", ...COMPLETED_STATUSES].includes(
                        normalizeStatus(selectedTicket.status),
                      ),
                    },
                    {
                      title: "Completed",
                      description: "Ticket resolution completed",
                      done: COMPLETED_STATUSES.includes(
                        normalizeStatus(selectedTicket.status),
                      ),
                    },
                  ].map((step, index) => (
                    <div key={step.title} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                            step.done
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {step.done ? "✓" : index + 1}
                        </div>

                        {index !== 2 && (
                          <div className="my-1 h-6 w-px bg-gray-200" />
                        )}
                      </div>

                      <div className="pt-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {step.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STAFF STATUS MANAGEMENT */}

              {canManageStatus && (
                <div className="rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900">Manage ticket</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Update the ticket workflow status.
                  </p>

                  <label className="mt-4 block text-xs font-semibold text-gray-600">
                    Ticket status
                  </label>

                  <select
                    value={normalizeStatus(selectedTicket.status)}
                    disabled={updatingStatus}
                    onChange={(e) => updateStatus(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400 disabled:opacity-50"
                  >
                    {statuses.map((status) => (
                      <option
                        key={status.code}
                        value={normalizeStatus(status.code)}
                      >
                        {status.name}
                      </option>
                    ))}
                  </select>

                  {updatingStatus && (
                    <p className="mt-2 text-xs text-gray-400">
                      Updating status...
                    </p>
                  )}
                </div>
              )}

              {/* ASSIGNMENT */}

              {canAssign && (
                <div className="rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900">
                    Ticket ownership
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Assign this ticket to an eligible employee.
                  </p>

                  {loadingEmployees ? (
                    <p className="mt-4 text-sm text-gray-500">
                      Loading assignable employees...
                    </p>
                  ) : (
                    <>
                      <label className="mt-4 block text-xs font-semibold text-gray-600">
                        Select employee
                      </label>

                      <select
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                      >
                        <option value="">Unassigned</option>

                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.userName}
                            {employee.designation
                              ? ` — ${employee.designation}`
                              : ""}
                          </option>
                        ))}
                      </select>

                      {employees.length === 0 && (
                        <p className="mt-2 text-xs text-amber-600">
                          No assignable employees found.
                        </p>
                      )}

                      <button
                        onClick={assignTicket}
                        disabled={assigning}
                        className="mt-4 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50"
                      >
                        {assigning
                          ? "Saving..."
                          : selectedEmployeeId
                            ? "Save assignment"
                            : "Remove assignment"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* CURRENT OWNER */}

              {(isAdmin || isEmployee) && (
                <div className="rounded-xl border border-gray-200 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Currently assigned to
                  </p>

                  <p className="mt-2 font-semibold text-gray-900">
                    {selectedTicket.assignedEmployee?.userName ||
                      "Not assigned"}
                  </p>

                  {selectedTicket.assignedEmployee?.designation && (
                    <p className="mt-1 text-xs text-gray-500">
                      {selectedTicket.assignedEmployee.designation}
                    </p>
                  )}

                  {selectedTicket.assignedEmployee?.email && (
                    <p className="mt-1 text-xs text-gray-500">
                      {selectedTicket.assignedEmployee.email}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}

            <div className="flex justify-end border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL IMAGE PREVIEW */}

      {attachmentPreview && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-5"
          onClick={() => setAttachmentPreview("")}
        >
          <button
            onClick={() => setAttachmentPreview("")}
            className="absolute right-6 top-5 text-3xl text-white"
          >
            ×
          </button>

          <img
            src={attachmentPreview}
            alt="Full ticket attachment"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
