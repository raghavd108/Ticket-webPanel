import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ChevronRight,
  ChevronDown,
  Layers,
  MessageSquare,
  Plus,
  Settings2,
  ShieldCheck,
  Tag,
  Users,
  X,
  Loader2,
  LockKeyhole,
  ArrowLeft,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import SendNotificationModal from "../components/SendNotificationModal";
import LeaveManagement from "../components/LeaveManagement";
import DesignationPicker from "../components/designationPicker";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3002"
).replace(/\/$/, "");

const ORGANISATION_TYPES = [
  "Hospital",
  "School",
  "Real Estate",
  "Inventory & Accounting",
  "Games",
];

type Permission = "canManageUsers" | "canPublishOffers" | "canNotifyEmployees";

type ModalType = "organisation" | "designation" | null;

interface ManagementItem {
  title: string;
  description: string;
  icon: React.ElementType;
  permission: Permission;
  path: string;
}

const managementItems: ManagementItem[] = [
  {
    title: "Send Notifications",
    description:
      "Send announcements and notifications to employees and clients.",
    icon: Bell,
    permission: "canNotifyEmployees",
    path: "/notifications",
  },
  {
    title: "Offers Management",
    description: "Create, publish and manage client offers.",
    icon: Tag,
    permission: "canPublishOffers",
    path: "/offers",
  },
  {
    title: "Client Feedback",
    description: "Review client ratings, feedback and suggestions.",
    icon: MessageSquare,
    permission: "canManageUsers",
    path: "/feedback",
  },
  {
    title: "Leave Management",
    description: "Manage employee leave requests and applications.",
    icon: BriefcaseBusiness,
    permission: "canManageUsers",
    path: "/leave",
  },

  {
    title: "Company Calendar",
    description: "Manage company holidays and working days.",
    icon: CalendarDays,
    permission: "canManageUsers",
    path: "/calendar",
  },
  {
    title: "Designations",
    description: "Manage employee designations and permissions.",
    icon: Users,
    permission: "canManageUsers",
    path: "/designations",
  },
  {
    title: "Organisation Categories",
    description: "Create and manage organisation types.",
    icon: Layers,
    permission: "canManageUsers",
    path: "/organisations",
  },
];

const ManagePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [currentUser, setCurrentUser] = useState<any>(user || null);
  const [loading, setLoading] = useState(true);

  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Notification modal
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Leave management view
  const [showLeaveManagement, setShowLeaveManagement] = useState(false);

  const [organisationName, setOrganisationName] = useState("");
  const [designationValue, setDesignationValue] = useState("");
  const [organisationType, setOrganisationType] = useState("");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const isSuperAdmin = currentUser?.isSuperAdmin === true;

  const permissions = currentUser?.permissions;

  const hasPermission = (permission: Permission) => {
    if (isSuperAdmin) return true;
    return permissions?.[permission] === true;
  };

  const canManageUsers = hasPermission("canManageUsers");
  const canPublishOffers = hasPermission("canPublishOffers");
  const canNotifyEmployees = hasPermission("canNotifyEmployees");

  const canManage =
    isSuperAdmin || canManageUsers || canPublishOffers || canNotifyEmployees;

  const visibleItems = useMemo(
    () => managementItems.filter((item) => hasPermission(item.permission)),
    [currentUser],
  );

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = sessionStorage.getItem("token");

      if (!token) {
        setCurrentUser(user || null);
        return;
      }

      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      const fetchedUser = response.data?.user || null;

      if (fetchedUser) {
        setCurrentUser(fetchedUser);
      }
    } catch (err: any) {
      console.error("MANAGE USER ERROR:", err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  const openOrganisationModal = () => {
    if (!canManageUsers) return;

    setError("");
    setActiveModal("organisation");
  };

  const closeModal = () => {
    if (creating) return;

    setActiveModal(null);
    setOrganisationName("");
    setOrganisationType("");
    setShowTypeDropdown(false);
    setError("");
    setDesignationValue("");
  };

  const createOrganisation = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = organisationName.trim();
    const cleanType = organisationType.trim();

    if (!cleanName || !cleanType) {
      setError("Please enter the organisation name and type.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const token = sessionStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }

      const userId = currentUser?._id || currentUser?.id;

      if (!userId) {
        throw new Error("Unable to identify the current user.");
      }

      await axios.post(
        `${API_URL}/api/org/add-org/${userId}`,
        {
          orgType: cleanType,
          name: cleanName,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        },
      );

      setActiveModal(null);
      setOrganisationName("");
      setOrganisationType("");
      setShowTypeDropdown(false);

      window.alert("Organisation created successfully.");
    } catch (err: any) {
      console.error("CREATE ORGANISATION ERROR:", err?.response?.data || err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to create organisation.",
      );
    } finally {
      setCreating(false);
    }
  };

  // Open the relevant management module.
  const handleManagementClick = (item: ManagementItem) => {
    if (item.title === "Send Notifications") {
      if (!canNotifyEmployees) return;

      setShowNotificationModal(true);
      return;
    }

    if (item.title === "Leave Management") {
      if (!canManageUsers) return;

      setShowLeaveManagement(true);

      return;
    }

    if (item.title === "Attendance History") {
      if (!canManageUsers) return;

      setShowLeaveManagement(false);
      return;
    }

    if (item.title === "Designations") {
      if (!canManageUsers) return;

      setDesignationValue("");
      setError("");
      setActiveModal("designation");
      return;
    }

    navigate(item.path);
  };

  if (loading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        style={{ background: theme.background, color: theme.primary }}
      >
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div
        className="flex min-h-[65vh] flex-col items-center justify-center px-6 text-center"
        style={{ background: theme.background, color: theme.text }}
      >
        <div
          className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: theme.primarySoft }}
        >
          <LockKeyhole className="h-8 w-8" style={{ color: theme.muted }} />
        </div>

        <h2 className="text-xl font-bold" style={{ color: theme.text }}>
          Management Access Restricted
        </h2>

        <p className="mt-2 max-w-sm text-sm" style={{ color: theme.muted }}>
          You don't have permission to access management features. Contact your
          administrator for assistance.
        </p>
      </div>
    );
  }

  // Render Leave Management inside the Manage page.
  if (showLeaveManagement) {
    return (
      <div
        className="min-h-full px-5 py-7 sm:px-8 lg:px-10"
        style={{
          background: theme.background,
          color: theme.text,
          ["--manage-bg" as any]: theme.background,
          ["--manage-surface" as any]: theme.white,
          ["--manage-input" as any]: theme.input,
          ["--manage-text" as any]: theme.text,
          ["--manage-muted" as any]: theme.muted,
          ["--manage-border" as any]: theme.border,
          ["--manage-divider" as any]: theme.divider,
          ["--manage-primary" as any]: theme.primary,
          ["--manage-primary-dark" as any]: theme.primaryDark,
          ["--manage-primary-soft" as any]: theme.primarySoft,
          ["--manage-danger" as any]: theme.danger,
          ["--manage-danger-soft" as any]: theme.dangerSoft,
        }}
      >
        <button
          type="button"
          onClick={() => setShowLeaveManagement(false)}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:bg-[#151922] dark:text-gray-200 dark:hover:bg-white/5"
        >
          <ArrowLeft size={17} />
          Back to Manage
        </button>

        <LeaveManagement />
      </div>
    );
  }

  return (
    <div
      className="min-h-full px-5 py-7 sm:px-8 lg:px-10"
      style={{
        background: theme.background,
        color: theme.text,
        ["--manage-bg" as any]: theme.background,
        ["--manage-surface" as any]: theme.white,
        ["--manage-input" as any]: theme.input,
        ["--manage-text" as any]: theme.text,
        ["--manage-muted" as any]: theme.muted,
        ["--manage-border" as any]: theme.border,
        ["--manage-divider" as any]: theme.divider,
        ["--manage-primary" as any]: theme.primary,
        ["--manage-primary-dark" as any]: theme.primaryDark,
        ["--manage-primary-soft" as any]: theme.primarySoft,
        ["--manage-danger" as any]: theme.danger,
        ["--manage-danger-soft" as any]: theme.dangerSoft,
      }}
    >
      {/* HEADER */}
      <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ">
            <Settings2 size={15} />
            Administration
          </div>

          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: theme.text }}
          >
            Manage
          </h1>

          <p className="mt-2 text-sm" style={{ color: theme.muted }}>
            Manage your organisation, employees and business operations.
          </p>
        </div>

        <div
          className="flex items-center gap-3 rounded-xl border px-4 py-3"
          style={{ borderColor: theme.border, background: theme.white }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl ">
            <ShieldCheck className="h-5 w-5 " />
          </div>

          <div>
            <p className="text-xs" style={{ color: theme.muted }}>
              Current access
            </p>

            <p className="text-sm font-semibold ">
              {isSuperAdmin
                ? "Super Administrator"
                : currentUser?.designation || currentUser?.role || "Management"}
            </p>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: theme.border, background: theme.white }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm ">Available features</p>
            <Settings2 size={19} className="" />
          </div>

          <p className="mt-3 text-3xl font-bold ">{visibleItems.length}</p>

          <p className="mt-1 text-xs ">Management modules</p>
        </div>

        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: theme.border, background: theme.white }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm ">User management</p>
            <Users size={19} className="" />
          </div>

          <p className="mt-3 text-lg font-bold ">
            {canManageUsers ? "Enabled" : "Restricted"}
          </p>

          <p className="mt-1 text-xs ">Organisation and designation access</p>
        </div>

        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: theme.border, background: theme.white }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm ">Communication</p>
            <Bell size={19} className="" />
          </div>

          <p className="mt-3 text-lg font-bold ">
            {canNotifyEmployees ? "Enabled" : "Restricted"}
          </p>

          <p className="mt-1 text-xs ">
            Employee and client notification access
          </p>
        </div>
      </div>

      {/* SECTION HEADER */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: theme.text }}>
            Management Modules
          </h2>

          <p className="mt-1 text-xs ">
            Select a module to manage its settings and operations.
          </p>
        </div>

        <span
          className="rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{ background: theme.primarySoft, color: theme.primaryDark }}
        >
          {visibleItems.length} modules
        </span>
      </div>

      {/* MANAGEMENT CARDS */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.title}
              type="button"
              onClick={() => handleManagementClick(item)}
              className="group flex min-h-[190px] flex-col rounded-2xl border p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              style={{
                borderColor: theme.border,
                background: theme.white,
                color: theme.text,
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}
            >
              <div className="flex w-full items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl ">
                  <Icon className="h-6 w-6" style={{ color: theme.primary }} />
                </div>

                <ChevronRight
                  className="h-5 w-5 transition-all group-hover:translate-x-1"
                  style={{ color: theme.muted }}
                />
              </div>

              <div className="mt-5">
                <h3
                  className="text-base font-bold"
                  style={{ color: theme.text }}
                >
                  {item.title}
                </h3>

                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: theme.muted }}
                >
                  {item.description}
                </p>
              </div>

              <div
                className="mt-auto pt-5 text-xs font-semibold"
                style={{ color: theme.primary }}
              >
                {item.title === "Send Notifications"
                  ? "Compose notification"
                  : "Open module"}
                <span className="ml-1">→</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ORGANISATION QUICK ACTION */}
      {canManageUsers && (
        <div
          className="mt-9 flex flex-col justify-between gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center"
          style={{
            borderColor: theme.border,
            background: theme.primarySoft,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: theme.white, color: theme.primary }}
            >
              <Building2 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="font-bold" style={{ color: theme.text }}>
                Add New Organisation
              </h3>

              <p className="mt-1 text-sm" style={{ color: theme.muted }}>
                Register a new client organisation in your system.
              </p>
            </div>
          </div>

          <button
            onClick={openOrganisationModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition"
            style={{ background: theme.primary }}
          >
            <Plus size={17} />
            Create Organisation
          </button>
        </div>
      )}

      {/* ORGANISATION MODAL */}
      {activeModal === "organisation" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="w-full max-w-md overflow-visible rounded-2xl border shadow-2xl"
            style={{ borderColor: theme.border, background: theme.white }}
          >
            <div
              className="flex items-center justify-between border-b px-6 py-5"
              style={{ borderColor: theme.divider }}
            >
              <div>
                <h2 className="text-lg font-bold" style={{ color: theme.text }}>
                  Add Organisation
                </h2>

                <p className="mt-1 text-xs" style={{ color: theme.muted }}>
                  Enter the organisation details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={creating}
                className="rounded-lg p-2 transition disabled:opacity-50"
                style={{ color: theme.muted }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createOrganisation} className="space-y-5 p-6">
              {/* ORGANISATION TYPE */}
              <div className="relative">
                <label
                  className="mb-2 block text-sm font-semibold"
                  style={{ color: theme.text }}
                >
                  Organisation Type
                </label>

                <button
                  type="button"
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  disabled={creating}
                  className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition"
                  style={{
                    borderColor: theme.border,
                    background: theme.input,
                    color: theme.text,
                  }}
                >
                  <span className={organisationType ? "" : ""}>
                    {organisationType || "Select organisation type"}
                  </span>

                  <ChevronDown size={17} className="" />
                </button>

                {showTypeDropdown && (
                  <div
                    className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border shadow-xl"
                    style={{
                      borderColor: theme.border,
                      background: theme.white,
                    }}
                  >
                    {ORGANISATION_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setOrganisationType(type);
                          setShowTypeDropdown(false);
                        }}
                        className="flex w-full items-center px-4 py-3 text-left text-sm transition"
                        style={{
                          background:
                            organisationType === type
                              ? theme.primarySoft
                              : "transparent",
                          color:
                            organisationType === type
                              ? theme.primaryDark
                              : theme.text,
                          fontWeight: organisationType === type ? 600 : 400,
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ORGANISATION NAME */}
              <div>
                <label
                  className="mb-2 block text-sm font-semibold"
                  style={{ color: theme.text }}
                >
                  Organisation Name
                </label>

                <input
                  value={organisationName}
                  onChange={(e) => setOrganisationName(e.target.value)}
                  placeholder="Enter organisation name"
                  disabled={creating}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition disabled:opacity-50"
                  style={{
                    borderColor: theme.border,
                    background: theme.input,
                    color: theme.text,
                  }}
                />
              </div>

              {error && (
                <p
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: theme.dangerSoft, color: theme.danger }}
                >
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={creating}
                  className="flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-50"
                  style={{
                    borderColor: theme.border,
                    color: theme.text,
                    background: theme.white,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: theme.primary }}
                >
                  {creating ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Create Organisation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DESIGNATION MODAL */}
      {activeModal === "designation" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border shadow-2xl"
            style={{
              borderColor: theme.border,
              background: theme.white,
              color: theme.text,
            }}
          >
            <div
              className="sticky top-0 z-10 flex items-center justify-between border-b px-6 py-5"
              style={{
                borderColor: theme.divider,
                background: theme.white,
              }}
            >
              <div>
                <h2 className="text-lg font-bold" style={{ color: theme.text }}>
                  Manage Designations
                </h2>
                <p className="mt-1 text-xs" style={{ color: theme.muted }}>
                  Create designations and configure their permissions.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 transition hover:opacity-70"
                style={{ color: theme.muted }}
                aria-label="Close designation modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <DesignationPicker
                value={designationValue}
                onChange={setDesignationValue}
                isSuperAdmin={isSuperAdmin}
                canManageUsers={canManageUsers}
                managementLevel={Number(currentUser?.managementLevel ?? 0)}
                allowCreate
              />
            </div>

            <div
              className="flex justify-end border-t px-6 py-4"
              style={{ borderColor: theme.divider }}
            >
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                style={{
                  background: theme.primarySoft,
                  color: theme.primaryDark,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND NOTIFICATION MODAL */}
      <SendNotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </div>
  );
};

export default ManagePage;
