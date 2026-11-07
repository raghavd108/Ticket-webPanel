import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, api } from "../context/AuthContext";
import AttendanceHistory from "../components/AttendanceHistory";
import DesignationPicker from "../components/designationPicker";
import { useTheme } from "../context/ThemeContext";

type Role = "client" | "employee";

interface Organisation {
  _id: string;
  name: string;
  orgType?: string;
}

interface Employee {
  _id: string;
  userName: string;
  email: string;
  mobileNumber?: string;
  designation?: string;
  organisation?: Organisation | string;
}

interface User {
  id: string;
  _id: string;
  userName: string;
  email: string;
  mobileNumber?: string;
  role: string;
  designation?: string;
  organisation?: Organisation;
  assignedEmployee?: Employee[];
  isRevoked?: boolean;
  revokedAt?: string | null;
  revokedReason?: string | null;
}

const PAGE_SIZE = 10;
const DEFAULT_ORGANISATION = "SP Infocom";

const ORGANISATION_TYPES = [
  "Hospital",
  "School",
  "Real Estate",
  "Inventory & Accounting",
  "Games",
];

const initialForm = {
  userName: "",
  email: "",
  mobileNumber: "",
  password: "",
  designation: "",
  organisation: "",
  assignedEmployee: [] as string[],
};

const getId = (user: User) => String(user._id || user.id);

const getError = (error: any) =>
  error?.response?.data?.message || error?.message || "Something went wrong.";

const Modal = ({
  title,
  children,
  onClose,
  width = "max-w-xl",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}) => (
  <div
    className="um-modal-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div
      className={`um-modal-panel my-auto flex max-h-[90vh] w-full ${width} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="um-modal-header flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
        <h2 className="min-w-0 text-lg font-bold text-gray-900">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="ml-4 shrink-0 rounded-lg px-3 py-1.5 text-xl text-gray-400 hover:bg-gray-100 hover:text-gray-800"
        >
          ×
        </button>
      </div>
      <div className="um-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
        {children}
      </div>
    </div>
  </div>
);

export default function UserManagement() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { theme } = useTheme();

  const isSuperAdmin = currentUser?.isSuperAdmin === true;
  const canManageUsers =
    isSuperAdmin || currentUser?.permissions?.canManageUsers === true;

  // DATA
  const [users, setUsers] = useState<User[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // LOADING
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingAccess, setChangingAccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  // PAGINATION
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);

  // SEARCH AND FILTERS
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "client" | "employee" | "revoked"
  >("all");

  // MODALS
  const [showUserModal, setShowUserModal] = useState(false);
  const [showOrganisationModal, setShowOrganisationModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAttendanceHistory, setShowAttendanceHistory] = useState(false);

  // SELECTED USER
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // CREATE USER
  const [createRole, setCreateRole] = useState<Role>("client");
  const [form, setForm] = useState(initialForm);

  // CREATE ORGANISATION
  const [organisationName, setOrganisationName] = useState("");
  const [organisationType, setOrganisationType] = useState("");

  // EDIT USER
  const [editForm, setEditForm] = useState({
    userName: "",
    email: "",
    mobileNumber: "",
    designation: "",
    password: "",
    assignedEmployee: [] as string[],
  });

  // DOCUMENT UPLOAD
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);

  const notify = (message: string) => window.alert(message);

  // =====================================================
  // FETCH USERS
  // =====================================================

  const getUsers = useCallback(async (nextPage = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get("/auth/getUser", {
        params: {
          page: nextPage,
          limit: PAGE_SIZE,
        },
      });

      const list = Array.isArray(response.data?.users)
        ? response.data.users
        : [];

      const normalized: User[] = list.map((item: any) => ({
        ...item,
        id: String(item.id || item._id || ""),
        _id: String(item._id || item.id || ""),
        mobileNumber:
          item.mobileNumber ?? item.phoneNumber ?? item.mobile ?? "",
        isRevoked: Boolean(item.isRevoked),
        organisation:
          typeof item.organisation === "object" && item.organisation
            ? item.organisation
            : undefined,
        assignedEmployee: (Array.isArray(item.assignedEmployee)
          ? item.assignedEmployee
          : Array.isArray(item.assignedEmployees)
            ? item.assignedEmployees
            : []
        ).map((entry: any) => entry?.employee || entry),
      }));

      setUsers((previous) =>
        append ? [...previous, ...normalized] : normalized,
      );

      const pagination = response.data?.pagination;

      setHasMore(pagination?.hasNextPage ?? normalized.length === PAGE_SIZE);

      setTotalUsers(Number(pagination?.totalRecords ?? normalized.length));

      setPage(nextPage);
    } catch (error) {
      console.error("GET USERS ERROR:", error);
      notify(getError(error));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // =====================================================
  // FETCH ORGANISATIONS
  // =====================================================

  const getOrganisations = useCallback(async () => {
    try {
      const response = await api.get("/org/get-org");
      setOrganisations(response.data?.org || []);
    } catch (error) {
      console.error("GET ORGANISATIONS ERROR:", error);
    }
  }, []);

  // =====================================================
  // FETCH EMPLOYEES
  // =====================================================

  const getEmployees = useCallback(async () => {
    try {
      const response = await api.get("/auth/employees");
      setEmployees(response.data?.employees || []);
    } catch (error) {
      console.error("GET EMPLOYEES ERROR:", error);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && canManageUsers) {
      void Promise.all([getUsers(), getOrganisations(), getEmployees()]);
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, canManageUsers, getUsers, getOrganisations, getEmployees]);

  // =====================================================
  // ORGANISATION HELPERS
  // =====================================================

  const spinfocomOrganisation = organisations.find(
    (item) =>
      item.name?.trim().toLowerCase() === DEFAULT_ORGANISATION.toLowerCase(),
  );

  const spinfocomEmployees = employees.filter((employee) => {
    const orgId =
      typeof employee.organisation === "object"
        ? employee.organisation?._id
        : employee.organisation;

    return String(orgId || "") === String(spinfocomOrganisation?._id || "");
  });

  // =====================================================
  // CREATE USER
  // =====================================================

  const openCreateUser = (role: Role) => {
    setCreateRole(role);
    setForm({
      ...initialForm,
      organisation: role === "employee" ? spinfocomOrganisation?._id || "" : "",
    });
    setShowUserModal(true);
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();

    const userName = form.userName.trim().toLowerCase();
    const email = form.email.trim().toLowerCase();
    const mobileNumber = form.mobileNumber.trim();
    const designation = form.designation.trim();

    if (!userName || !email || !form.password) {
      return notify("Please fill in all required fields.");
    }

    if (createRole === "client" && !form.organisation) {
      return notify("Please select an organisation.");
    }

    if (createRole === "employee") {
      if (!spinfocomOrganisation?._id) {
        return notify("SP Infocom organisation was not found.");
      }

      if (!/^\d{10}$/.test(mobileNumber)) {
        return notify("Enter a valid 10-digit mobile number.");
      }

      if (!designation) {
        return notify("Please enter employee designation.");
      }
    }

    const payload: Record<string, any> = {
      organisation:
        createRole === "employee"
          ? spinfocomOrganisation?._id
          : form.organisation,
      userName,
      email,
      password: form.password,
      role: createRole,
    };

    if (createRole === "employee") {
      payload.designation = designation;
      payload.mobileNumber = mobileNumber;
    }

    if (createRole === "client") {
      payload.assignedEmployee = form.assignedEmployee;
    }

    try {
      setSaving(true);

      await api.post("/auth/register", payload);

      notify("User account created successfully.");

      setForm({
        ...initialForm,
        organisation:
          createRole === "employee" ? spinfocomOrganisation?._id || "" : "",
      });
      setShowUserModal(false);

      await Promise.all([getUsers(), getEmployees()]);
    } catch (error) {
      notify(getError(error));
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // CREATE ORGANISATION
  // =====================================================

  const createOrganisation = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!organisationName.trim() || !organisationType) {
      return notify("Please enter organisation name and type.");
    }

    try {
      setSaving(true);

      const me = await api.get("/auth/me");
      const userId =
        me.data?.user?._id || me.data?.user?.id || me.data?._id || me.data?.id;

      if (!userId) {
        throw new Error("Could not identify the signed-in user.");
      }

      const response = await api.post(`/org/add-org/${userId}`, {
        name: organisationName.trim(),
        orgType: organisationType,
      });

      const created = response.data?.org || response.data?.organisation;

      await getOrganisations();

      if (created?._id) {
        setForm((previous) => ({
          ...previous,
          organisation: created._id,
        }));
      }

      setOrganisationName("");
      setOrganisationType("");
      setShowOrganisationModal(false);

      notify("Organisation created successfully.");
    } catch (error) {
      notify(getError(error));
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // USER DETAILS
  // =====================================================

  const openDetails = (item: User) => {
    setSelectedUser(item);
    setShowDetails(true);
  };

  // =====================================================
  // EDIT USER
  // =====================================================

  const openEdit = () => {
    if (!selectedUser) return;

    setEditForm({
      userName: selectedUser.userName || "",
      email: selectedUser.email || "",
      mobileNumber: selectedUser.mobileNumber || "",
      designation: selectedUser.designation || "",
      password: "",
      assignedEmployee: (selectedUser.assignedEmployee || []).map((item) =>
        String(item._id),
      ),
    });

    setShowEditModal(true);
  };

  const updateUser = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedUser) return;

    const userId = getId(selectedUser);
    const isEmployee = selectedUser.role === "employee";
    const isClient = selectedUser.role === "client";

    const userName = editForm.userName.trim();
    const email = editForm.email.trim().toLowerCase();
    const mobileNumber = editForm.mobileNumber.trim();
    const designation = editForm.designation.trim();

    if (!userName || !email) {
      return notify("Username and email are required.");
    }

    if (mobileNumber && !/^\d{10}$/.test(mobileNumber)) {
      return notify("Enter a valid 10-digit mobile number.");
    }

    if (isEmployee && (!mobileNumber || !designation)) {
      return notify("Employee mobile number and designation are required.");
    }

    if (editForm.password && editForm.password.trim().length < 8) {
      return notify("Password must contain at least 8 characters.");
    }

    const payload: Record<string, any> = {
      userName,
      email,
      mobileNumber: mobileNumber || null,
    };

    if (editForm.password) {
      payload.password = editForm.password;
    }

    if (isEmployee) {
      payload.designation = designation;
    }

    if (isClient) {
      payload.assignedEmployee = editForm.assignedEmployee;
    }

    try {
      setSaving(true);

      const response = await api.patch(`/auth/update-user/${userId}`, payload);

      const updated = response.data?.user || response.data?.updatedUser || {};

      const nextUser = {
        ...selectedUser,
        ...updated,
        userName: updated.userName ?? userName,
        email: updated.email ?? email,
        mobileNumber: updated.mobileNumber ?? mobileNumber,
        designation: updated.designation ?? designation,
        assignedEmployee:
          updated.assignedEmployee ??
          (isClient
            ? employees.filter((item) =>
                editForm.assignedEmployee.includes(item._id),
              )
            : selectedUser.assignedEmployee),
      };

      setSelectedUser(nextUser);

      setUsers((previous) =>
        previous.map((item) => (getId(item) === userId ? nextUser : item)),
      );

      setShowEditModal(false);
      notify("User details updated successfully.");

      await Promise.all([getUsers(), getEmployees()]);
    } catch (error) {
      notify(getError(error));
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // REVOKE / RESTORE ACCESS
  // =====================================================

  const changeAccess = async () => {
    if (!selectedUser) return;

    const userId = getId(selectedUser);
    const restore = selectedUser.isRevoked === true;

    const message = restore
      ? `Restore login access for ${selectedUser.userName}?`
      : `Revoke login access for ${selectedUser.userName}?`;

    if (!window.confirm(message)) return;

    try {
      setChangingAccess(true);

      const endpoint = restore ? "restore-user" : "revoke-user";

      const response = await api.patch(`/auth/${endpoint}/${userId}`, {});

      const responseUser = response.data?.user || {};

      const updated: User = {
        ...selectedUser,
        ...responseUser,
        id: userId,
        _id: userId,
        isRevoked: !restore,
        revokedAt: restore
          ? null
          : responseUser.revokedAt || new Date().toISOString(),
        revokedReason: restore
          ? null
          : (responseUser.revokedReason ?? selectedUser.revokedReason ?? null),
      };

      setSelectedUser(updated);

      setUsers((previous) =>
        previous.map((item) => (getId(item) === userId ? updated : item)),
      );

      notify(
        response.data?.message ||
          (restore ? "Account access restored." : "Account access revoked."),
      );

      await getUsers();
    } catch (error) {
      notify(getError(error));
    } finally {
      setChangingAccess(false);
    }
  };

  // =====================================================
  // DOCUMENT UPLOAD
  // =====================================================

  const uploadDocuments = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedUser || selectedUser.role !== "employee") return;

    if (!documentTitle.trim()) {
      return notify("Please enter a document title.");
    }

    if (!documentFiles.length) {
      return notify("Please select at least one document.");
    }

    if (documentFiles.length > 10) {
      return notify("You can upload a maximum of 10 files.");
    }

    const formData = new FormData();

    formData.append("employeeId", getId(selectedUser));
    formData.append("title", documentTitle.trim());

    documentFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      setUploading(true);

      await api.post("/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      notify("Documents uploaded successfully.");

      setShowUploadModal(false);
      setDocumentTitle("");
      setDocumentFiles([]);
    } catch (error) {
      notify(getError(error));
    } finally {
      setUploading(false);
    }
  };

  // =====================================================
  // FILTERING
  // =====================================================

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "revoked"
            ? item.isRevoked
            : item.role === filter;

      const searchValue = search.toLowerCase();

      const matchesSearch =
        item.userName?.toLowerCase().includes(searchValue) ||
        item.email?.toLowerCase().includes(searchValue) ||
        item.organisation?.name?.toLowerCase().includes(searchValue) ||
        item.designation?.toLowerCase().includes(searchValue);

      return matchesFilter && matchesSearch;
    });
  }, [users, filter, search]);

  const clientsCount = users.filter((item) => item.role === "client").length;

  const employeesCount = users.filter(
    (item) => item.role === "employee",
  ).length;

  const revokedCount = users.filter((item) => item.isRevoked).length;

  // =====================================================
  // UI HELPERS
  // =====================================================

  const updateForm = (key: keyof typeof form, value: any) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateEditForm = (key: keyof typeof editForm, value: any) => {
    setEditForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const toggleAssignedEmployee = (id: string) => {
    setForm((previous) => ({
      ...previous,
      assignedEmployee: previous.assignedEmployee.includes(id)
        ? previous.assignedEmployee.filter((item) => item !== id)
        : [...previous.assignedEmployee, id],
    }));
  };

  const toggleEditEmployee = (id: string) => {
    setEditForm((previous) => ({
      ...previous,
      assignedEmployee: previous.assignedEmployee.includes(id)
        ? previous.assignedEmployee.filter((item) => item !== id)
        : [...previous.assignedEmployee, id],
    }));
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition";

  const labelClass =
    "um-label mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500";

  const primaryButton =
    "um-primary-button inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50";

  const secondaryButton =
    "um-secondary-button inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition";

  // =====================================================
  // ACCESS CONTROL
  // =====================================================

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  if (!canManageUsers) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-full bg-gray-100 p-5 text-3xl">🔒</div>
        <h2 className="text-xl font-bold text-gray-900">Access restricted</h2>
        <p className="mt-2 max-w-md text-sm text-gray-500">
          You do not have permission to manage users.
        </p>
      </div>
    );
  }

  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <div
      className="um-page min-h-screen px-4 py-6 sm:px-6 lg:px-8"
      style={
        {
          "--um-bg": theme.background,
          "--um-surface": theme.white,
          "--um-input": theme.input,
          "--um-text": theme.text,
          "--um-muted": theme.muted,
          "--um-light": theme.light,
          "--um-primary": theme.primary,
          "--um-primary-dark": theme.primaryDark,
          "--um-primary-soft": theme.primarySoft || theme.softPrimary,
          "--um-border": theme.border,
          "--um-divider": theme.divider,
          "--um-success": theme.success,
          "--um-warning": theme.warning,
          "--um-danger": theme.danger,
        } as React.CSSProperties
      }
    >
      <style>{`
        .um-page {
          background: var(--um-bg);
          color: var(--um-text);
          min-height: 100vh;
          color-scheme: light;
        }
        .um-page * { box-sizing: border-box; }
        .um-page input:not([type="checkbox"]):not([type="file"]),
        .um-page select,
        .um-page textarea {
          width: 100%;
          min-height: 46px;
          border: 1px solid var(--um-border);
          border-radius: 12px;
          background-color: var(--um-input);
          color: var(--um-text);
          padding: 11px 14px;
          font-size: 14px;
          line-height: 1.45;
          outline: none;
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .um-page input::placeholder { color: var(--um-muted); opacity: .8; }
        .um-page input:focus, .um-page select:focus, .um-page textarea:focus {
          border-color: var(--um-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--um-primary) 16%, transparent);
        }
        .um-page select {
          appearance: none;
          -webkit-appearance: none;
          padding-right: 42px;
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23807768' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 17px;
        }
        .um-page select option { background: var(--um-surface); color: var(--um-text); }
        .um-page input[type="checkbox"] {
          width: 17px; height: 17px; accent-color: var(--um-primary);
          cursor: pointer; flex: 0 0 auto;
        }
        .um-page input[type="file"] {
          width: 100%; min-height: 46px; border: 1px dashed var(--um-border);
          border-radius: 12px; padding: 10px; background: var(--um-input);
          color: var(--um-muted); font-size: 13px;
        }
        .um-page button {
          transition: transform .16s ease, box-shadow .16s ease, background .16s ease, border-color .16s ease;
        }
        .um-page button:not(:disabled):active { transform: translateY(1px); }
        .um-page button:focus-visible {
          outline: 3px solid color-mix(in srgb, var(--um-primary) 30%, transparent);
          outline-offset: 2px;
        }
        .um-page .bg-white { background-color: var(--um-surface) !important; }
        .um-page .bg-gray-50 { background-color: color-mix(in srgb, var(--um-surface) 88%, var(--um-bg)) !important; }
        .um-page .bg-gray-100 { background-color: color-mix(in srgb, var(--um-primary) 9%, var(--um-bg)) !important; }
        .um-page .border-gray-100, .um-page .border-gray-200 { border-color: var(--um-border) !important; }
        .um-page .divide-gray-100 > :not([hidden]) ~ :not([hidden]) { border-color: var(--um-divider) !important; }
        .um-page .text-gray-900, .um-page .text-gray-800, .um-page .text-gray-700 { color: var(--um-text) !important; }
        .um-page .text-gray-600, .um-page .text-gray-500, .um-page .text-gray-400 { color: var(--um-muted) !important; }
        .um-page .hover\\:bg-gray-50:hover, .um-page .hover\\:bg-gray-100:hover { background-color: color-mix(in srgb, var(--um-primary) 8%, var(--um-surface)) !important; }
        .um-page .bg-gray-900 { background-color: var(--um-primary-dark) !important; }
        .um-page .hover\\:bg-gray-700:hover { background-color: var(--um-primary) !important; }
        .um-page .text-white { color: #fff !important; }
        .um-page .rounded-2xl.border { box-shadow: 0 5px 22px rgba(30, 25, 18, .035); }
        .um-page table thead { background: color-mix(in srgb, var(--um-primary) 7%, var(--um-bg)); }
        .um-page tbody tr:hover { background: color-mix(in srgb, var(--um-primary) 5%, var(--um-surface)); }
        .um-page .um-modal-backdrop {
          background: rgba(13, 15, 13, .62);
          backdrop-filter: blur(7px);
          -webkit-backdrop-filter: blur(7px);
          padding: 18px;
        }
        .um-page .um-modal-panel {
          background: var(--um-surface) !important;
          color: var(--um-text);
          border: 1px solid var(--um-border);
          border-radius: 22px !important;
          box-shadow: 0 24px 80px rgba(0, 0, 0, .24);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .um-page .um-modal-header {
          background: var(--um-surface) !important;
          border-color: var(--um-divider) !important;
          padding: 20px 24px;
        }
        .um-page .um-modal-header h2 { color: var(--um-text) !important; letter-spacing: -.02em; }
        .um-page .um-modal-body {
          min-height: 0;
          flex: 1 1 auto;
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          padding: 24px;
        }
        .um-page .um-modal-body > :last-child { margin-bottom: 0; }
        .um-page .um-modal-body::-webkit-scrollbar { width: 7px; }
        .um-page .um-modal-body::-webkit-scrollbar-thumb {
          background: color-mix(in srgb, var(--um-muted) 35%, transparent);
          border-radius: 999px;
        }
        .um-page .um-label { color: var(--um-muted) !important; letter-spacing: .09em; }
        .um-page .um-primary-button {
          background: var(--um-primary-dark) !important;
          color: #fff !important;
          border: 1px solid var(--um-primary-dark);
          box-shadow: 0 4px 12px color-mix(in srgb, var(--um-primary) 18%, transparent);
        }
        .um-page .um-primary-button:hover:not(:disabled) { background: var(--um-primary) !important; }
        .um-page .um-secondary-button {
          background: var(--um-surface) !important;
          color: var(--um-text) !important;
          border: 1px solid var(--um-border) !important;
        }
        .um-page .um-secondary-button:hover:not(:disabled) {
          background: var(--um-primary-soft) !important;
          border-color: var(--um-primary) !important;
        }
        .um-page .um-filter-active { background: var(--um-primary-dark) !important; color: #fff !important; }
        .um-page .um-filter-idle { background: var(--um-bg) !important; color: var(--um-muted) !important; }
        .um-page .um-status-active { background: color-mix(in srgb, var(--um-success) 12%, transparent) !important; color: var(--um-success) !important; }
        .um-page .um-status-revoked { background: color-mix(in srgb, var(--um-danger) 12%, transparent) !important; color: var(--um-danger) !important; }
        .um-page .um-muted-panel { background: var(--um-bg) !important; border-color: var(--um-border) !important; }
        @media (max-width: 640px) {
          .um-page .um-modal-backdrop { padding: 8px; align-items: flex-end; }
          .um-page .um-modal-panel { max-height: 94vh !important; border-radius: 20px 20px 12px 12px !important; }
          .um-page .um-modal-header { padding: 17px 18px; }
          .um-page .um-modal-body { padding: 18px; }
        }
      `}</style>
      <div className="mx-auto max-w-375 space-y-6">
        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-medium text-gray-400">
              SP Infocom / Management
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              User Management
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage employees, clients and organisations.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className={secondaryButton}
              onClick={() => setShowOrganisationModal(true)}
            >
              + Organisation
            </button>

            <button
              className={secondaryButton}
              onClick={() => openCreateUser("client")}
            >
              + Add Client
            </button>

            <button
              className={primaryButton}
              onClick={() => openCreateUser("employee")}
            >
              + Add Employee
            </button>
          </div>
        </div>

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Users",
              value: totalUsers,
              description: "Registered accounts",
            },
            {
              label: "Clients",
              value: clientsCount,
              description: "Client accounts loaded",
            },
            {
              label: "Employees",
              value: employeesCount,
              description: "Employee accounts loaded",
            },
            {
              label: "Revoked",
              value: revokedCount,
              description: "Restricted accounts loaded",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>

              <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
                {stat.value}
              </p>

              <p className="mt-1 text-xs text-gray-400">{stat.description}</p>
            </div>
          ))}
        </div>

        {/* USER DIRECTORY */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                User Directory
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                View and manage registered accounts.
              </p>
            </div>

            <div className="w-full lg:max-w-sm">
              <input
                className={inputClass}
                placeholder="Search name, email or organisation..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {/* FILTERS */}

          <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-4">
            {(
              [
                ["all", "All users"],
                ["client", "Clients"],
                ["employee", "Employees"],
                ["revoked", "Revoked"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  filter === value
                    ? "um-filter-active bg-gray-900 text-white"
                    : "um-filter-idle bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5 text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Organisation</th>
                  <th className="px-6 py-4 font-semibold">Designation</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((item) => (
                  <tr key={getId(item)} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 font-bold text-gray-700">
                          {item.userName?.charAt(0)?.toUpperCase() || "U"}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {item.userName}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {item.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold capitalize text-gray-700">
                        {item.role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.organisation?.name || "—"}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.designation || "—"}
                    </td>

                    <td className="px-6 py-4">
                      {item.isRevoked ? (
                        <span className="um-status-revoked rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                          Revoked
                        </span>
                      ) : (
                        <span className="um-status-active rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openDetails(item)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}

                {!filteredUsers.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center text-sm text-gray-400"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Showing {users.length} of {totalUsers} users
            </p>

            {hasMore && (
              <button
                className={secondaryButton}
                disabled={loadingMore}
                onClick={() => void getUsers(page + 1, true)}
              >
                {loadingMore ? "Loading..." : "Load more users"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          CREATE USER MODAL
      ===================================================== */}

      {showUserModal && (
        <Modal
          title={`Create ${createRole === "client" ? "Client" : "Employee"}`}
          onClose={() => !saving && setShowUserModal(false)}
        >
          <form onSubmit={createUser} className="space-y-4">
            <div>
              <label className={labelClass}>Username</label>
              <input
                className={inputClass}
                value={form.userName}
                onChange={(e) => updateForm("userName", e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Email address</label>
              <input
                className={inputClass}
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <input
                className={inputClass}
                type="password"
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
                placeholder="Create password"
                required
              />
            </div>

            {createRole === "client" && (
              <>
                <div>
                  <label className={labelClass}>Organisation</label>

                  <select
                    className={inputClass}
                    value={form.organisation}
                    onChange={(e) => {
                      updateForm("organisation", e.target.value);
                      updateForm("assignedEmployee", []);
                    }}
                    required
                  >
                    <option value="">Select organisation</option>

                    {organisations.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} {item.orgType ? `(${item.orgType})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Assign SP Infocom Employees
                  </label>

                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-3">
                    {spinfocomEmployees.map((employee) => (
                      <label
                        key={employee._id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={form.assignedEmployee.includes(employee._id)}
                          onChange={() => toggleAssignedEmployee(employee._id)}
                        />

                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {employee.userName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {employee.designation || employee.email}
                          </p>
                        </div>
                      </label>
                    ))}

                    {!spinfocomEmployees.length && (
                      <p className="text-sm text-gray-400">
                        No SP Infocom employees available.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {createRole === "employee" && (
              <>
                <div>
                  <label className={labelClass}>Mobile number</label>
                  <input
                    className={inputClass}
                    value={form.mobileNumber}
                    onChange={(e) =>
                      updateForm(
                        "mobileNumber",
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Designation</label>
                  <DesignationPicker
                    value={form.designation}
                    onChange={(value) => updateForm("designation", value)}
                    isSuperAdmin={isSuperAdmin}
                    canManageUsers={canManageUsers}
                    managementLevel={Number(
                      (currentUser as any)?.managementLevel ?? 0,
                    )}
                    allowCreate
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Select an existing designation or create one if your
                    permissions allow it.
                  </p>
                </div>

                <div className="um-muted-panel rounded-xl border bg-gray-50 p-3 text-sm text-gray-600">
                  Organisation: <strong>SP Infocom</strong>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                className={`${secondaryButton} flex-1`}
                onClick={() => setShowUserModal(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={`${primaryButton} flex-1`}
                disabled={saving}
              >
                {saving ? "Creating..." : "Create account"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================
          CREATE ORGANISATION MODAL
      ===================================================== */}

      {showOrganisationModal && (
        <Modal
          title="Create Organisation"
          onClose={() => !saving && setShowOrganisationModal(false)}
          width="max-w-lg"
        >
          <form onSubmit={createOrganisation} className="space-y-4">
            <div>
              <label className={labelClass}>Organisation name</label>
              <input
                className={inputClass}
                value={organisationName}
                onChange={(e) => setOrganisationName(e.target.value)}
                placeholder="Enter organisation name"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Organisation type</label>

              <select
                className={inputClass}
                value={organisationType}
                onChange={(e) => setOrganisationType(e.target.value)}
                required
              >
                <option value="">Select organisation type</option>

                {ORGANISATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                className={`${secondaryButton} flex-1`}
                onClick={() => setShowOrganisationModal(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={`${primaryButton} flex-1`}
                disabled={saving}
              >
                {saving ? "Creating..." : "Create organisation"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================
          USER DETAILS MODAL
      ===================================================== */}

      {showDetails && selectedUser && (
        <Modal
          title="User Details"
          onClose={() => setShowDetails(false)}
          width="max-w-2xl"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-xl font-bold text-gray-700">
                {selectedUser.userName?.charAt(0)?.toUpperCase()}
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedUser.userName}
                </h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Role", selectedUser.role],
                ["Mobile", selectedUser.mobileNumber || "—"],
                ["Organisation", selectedUser.organisation?.name || "—"],
                [
                  "Organisation type",
                  selectedUser.organisation?.orgType || "—",
                ],
                ["Designation", selectedUser.designation || "—"],
                [
                  "Account status",
                  selectedUser.isRevoked ? "Revoked" : "Active",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-100 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-semibold capitalize text-gray-800">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {selectedUser.role === "client" && (
              <div>
                <h4 className="mb-3 text-sm font-bold text-gray-800">
                  Assigned Employees
                </h4>

                <div className="space-y-2">
                  {selectedUser.assignedEmployee?.map((employee) => (
                    <div
                      key={employee._id}
                      className="rounded-xl border border-gray-100 p-3"
                    >
                      <p className="text-sm font-semibold text-gray-800">
                        {employee.userName}
                      </p>
                      <p className="text-xs text-gray-500">{employee.email}</p>
                    </div>
                  ))}

                  {!selectedUser.assignedEmployee?.length && (
                    <p className="text-sm text-gray-400">
                      No employees assigned.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
              <button className={secondaryButton} onClick={openEdit}>
                Edit user
              </button>

              {selectedUser.role === "employee" && (
                <>
                  <button
                    className={secondaryButton}
                    onClick={() => {
                      setShowDetails(false);
                      setShowAttendanceHistory(true);
                    }}
                  >
                    View Attendance History
                  </button>

                  <button
                    className={secondaryButton}
                    onClick={() => {
                      setDocumentTitle("");
                      setDocumentFiles([]);
                      setShowUploadModal(true);
                    }}
                  >
                    Upload documents
                  </button>
                </>
              )}

              <button
                disabled={changingAccess}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  selectedUser.isRevoked
                    ? "bg-green-700 hover:bg-green-800"
                    : "bg-red-700 hover:bg-red-800"
                }`}
                onClick={changeAccess}
              >
                {changingAccess
                  ? "Please wait..."
                  : selectedUser.isRevoked
                    ? "Restore account access"
                    : "Revoke account access"}
              </button>

              <button
                className={secondaryButton}
                onClick={() => setShowDetails(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =====================================================
          EDIT USER MODAL
      ===================================================== */}

      {showEditModal && selectedUser && (
        <Modal
          title={`Edit ${selectedUser.role}`}
          onClose={() => !saving && setShowEditModal(false)}
        >
          <form onSubmit={updateUser} className="space-y-4">
            <div>
              <label className={labelClass}>Username</label>
              <input
                className={inputClass}
                value={editForm.userName}
                onChange={(e) => updateEditForm("userName", e.target.value)}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                className={inputClass}
                type="email"
                value={editForm.email}
                onChange={(e) => updateEditForm("email", e.target.value)}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Mobile number</label>
              <input
                className={inputClass}
                value={editForm.mobileNumber}
                onChange={(e) =>
                  updateEditForm(
                    "mobileNumber",
                    e.target.value.replace(/\D/g, "").slice(0, 10),
                  )
                }
                maxLength={10}
              />
            </div>

            {selectedUser.role === "employee" && (
              <div>
                <label className={labelClass}>Designation</label>
                <DesignationPicker
                  value={editForm.designation}
                  onChange={(value) => updateEditForm("designation", value)}
                  isSuperAdmin={isSuperAdmin}
                  canManageUsers={canManageUsers}
                  managementLevel={Number(
                    (currentUser as any)?.managementLevel ?? 0,
                  )}
                  allowCreate
                />
                <p className="mt-2 text-xs text-gray-500">
                  Available designations are filtered by your management level.
                </p>
              </div>
            )}

            {selectedUser.role === "client" && (
              <div>
                <label className={labelClass}>Assigned Employees</label>

                <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-3">
                  {spinfocomEmployees.map((employee) => (
                    <label
                      key={employee._id}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={editForm.assignedEmployee.includes(
                          employee._id,
                        )}
                        onChange={() => toggleEditEmployee(employee._id)}
                      />
                      <span className="text-sm text-gray-700">
                        {employee.userName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {isSuperAdmin && (
              <div>
                <label className={labelClass}>New password (optional)</label>
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="new-password"
                  value={editForm.password}
                  onChange={(e) => updateEditForm("password", e.target.value)}
                  placeholder="Leave blank to keep current password"
                />
              </div>
            )}

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                className={`${secondaryButton} flex-1`}
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={`${primaryButton} flex-1`}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================
          DOCUMENT UPLOAD MODAL
      ===================================================== */}

      {showUploadModal && selectedUser && (
        <Modal
          title="Upload Employee Documents"
          onClose={() => !uploading && setShowUploadModal(false)}
        >
          <form onSubmit={uploadDocuments} className="space-y-4">
            <div>
              <label className={labelClass}>Employee</label>
              <div className="um-muted-panel rounded-xl border px-4 py-3 text-sm font-semibold text-gray-800">
                {selectedUser.userName}
              </div>
            </div>

            <div>
              <label className={labelClass}>Document title</label>
              <input
                className={inputClass}
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Enter document title"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Select files (maximum 10)</label>
              <input
                type="file"
                multiple
                className={inputClass}
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  setDocumentFiles((previous) =>
                    [
                      ...previous,
                      ...selected.filter(
                        (file) =>
                          !previous.some(
                            (existing) =>
                              existing.name === file.name &&
                              existing.size === file.size,
                          ),
                      ),
                    ].slice(0, 10),
                  );
                  e.target.value = "";
                }}
              />
            </div>

            {documentFiles.length > 0 && (
              <div className="space-y-2">
                {documentFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>

                    <button
                      type="button"
                      className="ml-3 text-sm font-semibold text-red-600"
                      onClick={() =>
                        setDocumentFiles((previous) =>
                          previous.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                className={`${secondaryButton} flex-1`}
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={`${primaryButton} flex-1`}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload documents"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================
          EMPLOYEE ATTENDANCE HISTORY MODAL
      ===================================================== */}

      {showAttendanceHistory && selectedUser && (
        <Modal
          title={`${selectedUser.userName} - Attendance History`}
          onClose={() => setShowAttendanceHistory(false)}
          width="max-w-6xl"
        >
          <AttendanceHistory
            employeeId={getId(selectedUser)}
            employeeName={selectedUser.userName}
          />
        </Modal>
      )}
    </div>
  );
}
