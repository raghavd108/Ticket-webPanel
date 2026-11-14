import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  Layers,
  MessageSquare,
  Settings2,
  ShieldCheck,
  Tag,
  Users,
  X,
  Loader2,
  LockKeyhole,
  ArrowLeft,
  Plus,
  Check,
} from "lucide-react";
import axios from "axios";
import { useAuth, api } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import SendNotificationModal from "../components/SendNotificationModal";
import LeaveManagement from "../components/LeaveManagement";
import DesignationPicker from "../components/designationPicker";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3002"
).replace(/\/$/, "");

type Permission = "canManageUsers" | "canPublishOffers" | "canNotifyEmployees";

type ModalType = "designation" | null;

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
    title: "Organisation Management",
    description: "Create organisations and manage organisation categories.",
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

  const [designationValue, setDesignationValue] = useState("");

  // Organisation management
  const [showOrganisationModal, setShowOrganisationModal] = useState(false);
  const [organisationName, setOrganisationName] = useState("");
  const [organisationType, setOrganisationType] = useState("");
  const [organisationTypes, setOrganisationTypes] = useState<
    { _id: string; name: string }[]
  >([]);
  const [loadingOrganisationTypes, setLoadingOrganisationTypes] =
    useState(false);
  const [newOrganisationType, setNewOrganisationType] = useState("");
  const [addingOrganisationType, setAddingOrganisationType] = useState(false);
  const [creatingOrganisation, setCreatingOrganisation] = useState(false);
  const [showOrganisationTypeList, setShowOrganisationTypeList] =
    useState(false);

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

  const closeModal = () => {
    setActiveModal(null);
    setDesignationValue("");
  };

  const canAddOrganisationType =
    currentUser?.role === "admin" ||
    isSuperAdmin ||
    currentUser?.permissions?.canManageUsers === true;

  const getOrganisationTypes = async () => {
    try {
      setLoadingOrganisationTypes(true);
      const response = await api.get("/org/types");
      const list = Array.isArray(response.data?.types)
        ? response.data.types
        : [];
      setOrganisationTypes(
        list
          .map((item: any) => ({
            _id: String(item._id || item.id || ""),
            name: String(item.name || ""),
          }))
          .filter(
            (item: { _id: string; name: string }) => item._id && item.name,
          ),
      );
    } catch (error: any) {
      window.alert(
        error?.response?.data?.message || "Unable to load organisation types.",
      );
    } finally {
      setLoadingOrganisationTypes(false);
    }
  };

  useEffect(() => {
    if (showOrganisationModal) {
      setOrganisationName("");
      setOrganisationType("");
      setNewOrganisationType("");
      setShowOrganisationTypeList(false);
      void getOrganisationTypes();
    }
  }, [showOrganisationModal]);

  const addOrganisationType = async () => {
    const name = newOrganisationType.trim().replace(/\s+/g, " ");
    if (!canAddOrganisationType) {
      window.alert("You do not have permission to add organisation types.");
      return;
    }
    if (!name) {
      window.alert("Enter an organisation type.");
      return;
    }
    try {
      setAddingOrganisationType(true);
      const response = await api.post("/org/add-type", { name });
      const createdName = String(response.data?.type?.name || name);
      await getOrganisationTypes();
      setOrganisationType(createdName);
      setNewOrganisationType("");
      setShowOrganisationTypeList(false);
      window.alert(`${createdName} has been added successfully.`);
    } catch (error: any) {
      window.alert(
        error?.response?.data?.message || "Unable to add organisation type.",
      );
    } finally {
      setAddingOrganisationType(false);
    }
  };

  const createOrganisation = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = organisationName.trim();
    const orgType = organisationType.trim();
    if (!orgType) return window.alert("Please select an organisation type.");
    if (!name) return window.alert("Please enter organisation name.");

    try {
      setCreatingOrganisation(true);
      const response = await api.get("/auth/me");
      const userId =
        response.data?.user?._id ||
        response.data?.user?.id ||
        response.data?._id ||
        response.data?.id ||
        currentUser?._id ||
        currentUser?.id;
      if (!userId) throw new Error("Could not identify the signed-in user.");

      await api.post(`/org/add-org/${userId}`, { name, orgType });
      setOrganisationName("");
      setOrganisationType("");
      setNewOrganisationType("");
      setShowOrganisationTypeList(false);
      setShowOrganisationModal(false);
      window.alert("Organisation created successfully.");
    } catch (error: any) {
      window.alert(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to create organisation.",
      );
    } finally {
      setCreatingOrganisation(false);
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

    if (item.title === "Organisation Management") {
      if (!canManageUsers) return;
      setShowOrganisationModal(true);
      return;
    }

    if (item.title === "Designations") {
      if (!canManageUsers) return;

      setDesignationValue("");
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
              className="group flex min-h-47.5 flex-col rounded-2xl border p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
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

      {/* ORGANISATION MANAGEMENT MODAL */}
      {showOrganisationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !creatingOrganisation &&
              !addingOrganisationType
            ) {
              setShowOrganisationModal(false);
            }
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[22px] border p-5 shadow-2xl sm:p-6"
            style={{
              borderColor: theme.border,
              background: theme.background,
              color: theme.text,
            }}
          >
            {/* Modal heading */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div
                  className="mb-3 inline-flex items-center rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[1px]"
                  style={{
                    background: theme.primarySoft,
                    color: theme.primary,
                  }}
                >
                  New Organisation
                </div>
                <h2
                  className="text-[23px] font-extrabold leading-tight"
                  style={{ color: theme.ink || theme.text }}
                >
                  Add Organisation
                </h2>
                <p
                  className="mt-1.5 text-[13px] leading-5"
                  style={{ color: theme.muted }}
                >
                  Create a new organisation and assign it to a category.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!creatingOrganisation && !addingOrganisationType) {
                    setShowOrganisationModal(false);
                  }
                }}
                disabled={creatingOrganisation || addingOrganisationType}
                className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl border transition hover:opacity-75 disabled:opacity-50"
                style={{
                  background: theme.primarySoft,
                  borderColor: theme.border,
                  color: theme.ink || theme.text,
                }}
                aria-label="Close organisation management"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={createOrganisation} className="space-y-5">
              {/* Organisation category */}
              <div>
                <label
                  className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.5px]"
                  style={{ color: theme.text }}
                >
                  Organisation Type
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const next = !showOrganisationTypeList;
                    setShowOrganisationTypeList(next);
                    if (next) void getOrganisationTypes();
                  }}
                  disabled={creatingOrganisation}
                  className="flex min-h-13 w-full items-center justify-between rounded-xl border px-4 text-left text-sm transition disabled:opacity-60"
                  style={{
                    borderColor: showOrganisationTypeList
                      ? theme.primary
                      : theme.border,
                    background: theme.background,
                    color: organisationType
                      ? theme.ink || theme.text
                      : theme.muted,
                  }}
                >
                  <span
                    className={
                      organisationType ? "font-semibold" : "font-normal"
                    }
                  >
                    {organisationType || "Select organisation type"}
                  </span>
                  <ChevronRight
                    size={19}
                    className={
                      showOrganisationTypeList
                        ? "rotate-90 transition-transform"
                        : "transition-transform"
                    }
                    style={{ color: theme.muted }}
                  />
                </button>

                {showOrganisationTypeList && (
                  <div
                    className="mt-2 max-h-65 overflow-y-auto overflow-hidden rounded-xl border"
                    style={{
                      borderColor: theme.border,
                      background: theme.background,
                    }}
                  >
                    {loadingOrganisationTypes ? (
                      <div
                        className="flex items-center justify-center gap-2 p-4 text-sm"
                        style={{ color: theme.muted }}
                      >
                        <Loader2 size={17} className="animate-spin" />
                        Loading organisation types...
                      </div>
                    ) : organisationTypes.length === 0 ? (
                      <p
                        className="p-4 text-center text-sm"
                        style={{ color: theme.muted }}
                      >
                        No organisation types available.
                      </p>
                    ) : (
                      organisationTypes.map((type) => {
                        const selected = organisationType === type.name;
                        return (
                          <button
                            type="button"
                            key={type._id}
                            onClick={() => {
                              setOrganisationType(type.name);
                              setShowOrganisationTypeList(false);
                            }}
                            className="flex w-full items-center justify-between border-b px-4 py-3.5 text-left text-sm transition last:border-b-0 hover:opacity-80"
                            style={{
                              borderColor: theme.divider,
                              background: selected
                                ? theme.primarySoft
                                : theme.background,
                              color: selected
                                ? theme.primary
                                : theme.ink || theme.text,
                              fontWeight: selected ? 700 : 500,
                            }}
                          >
                            {type.name}
                            {selected && (
                              <Check
                                size={18}
                                style={{ color: theme.primary }}
                              />
                            )}
                          </button>
                        );
                      })
                    )}

                    {canAddOrganisationType && (
                      <div
                        className="border-t p-3"
                        style={{
                          borderColor: theme.divider,
                          background: theme.background,
                        }}
                      >
                        <p
                          className="mb-2 text-xs font-bold"
                          style={{ color: theme.ink || theme.text }}
                        >
                          Add a new organisation type
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={newOrganisationType}
                            onChange={(event) =>
                              setNewOrganisationType(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void addOrganisationType();
                              }
                            }}
                            placeholder="Enter new type"
                            autoCapitalize="words"
                            disabled={
                              addingOrganisationType || creatingOrganisation
                            }
                            className="h-11.5 min-w-0 flex-1 rounded-[10px] border px-3 text-[13px] outline-none transition focus:ring-2"
                            style={{
                              borderColor: theme.border,
                              background: theme.background,
                              color: theme.ink || theme.text,
                              ["--tw-ring-color" as any]: theme.primarySoft,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => void addOrganisationType()}
                            disabled={
                              addingOrganisationType ||
                              creatingOrganisation ||
                              !newOrganisationType.trim()
                            }
                            className="inline-flex h-11.5 min-w-19 items-center justify-center gap-2 rounded-[10px] px-4 text-[13px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ background: theme.primary, color: "#fff" }}
                          >
                            {addingOrganisationType ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Plus size={16} />
                            )}
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Organisation name */}
              <div>
                <label
                  className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.5px]"
                  style={{ color: theme.text }}
                >
                  Organisation Name
                </label>
                <input
                  value={organisationName}
                  onChange={(event) => setOrganisationName(event.target.value)}
                  placeholder="Enter organisation name"
                  autoCapitalize="words"
                  disabled={creatingOrganisation}
                  className="h-13 w-full rounded-xl border px-4 text-sm outline-none transition focus:ring-2 disabled:opacity-60"
                  style={{
                    borderColor: theme.border,
                    background: theme.background,
                    color: theme.ink || theme.text,
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={
                  creatingOrganisation ||
                  !organisationName.trim() ||
                  !organisationType
                }
                className="flex h-13 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-extrabold transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: theme.primary, color: "#fff" }}
              >
                {creatingOrganisation && (
                  <Loader2 size={17} className="animate-spin" />
                )}
                {creatingOrganisation ? "Creating..." : "Create Organisation"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!creatingOrganisation && !addingOrganisationType) {
                    setShowOrganisationModal(false);
                    setShowOrganisationTypeList(false);
                  }
                }}
                disabled={creatingOrganisation || addingOrganisationType}
                className="flex h-11.5 w-full items-center justify-center text-[13px] font-bold transition hover:opacity-70 disabled:opacity-50"
                style={{ color: theme.muted }}
              >
                Cancel
              </button>
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
