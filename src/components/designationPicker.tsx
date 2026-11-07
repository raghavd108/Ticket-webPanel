import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Plus,
  X,
  ShieldCheck,
  Pencil,
  Loader2,
  RefreshCw,
  LockKeyhole,
} from "lucide-react";

import { api } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// =====================================================
// TYPES
// =====================================================

type Designation = {
  id: number;
  name: string;
  canViewAllTickets: boolean;
  canAssignTickets: boolean;
  canManageUsers: boolean;
  canPublishOffers: boolean;
  canNotifyEmployees: boolean;
  managementLevel: number;
  userCount?: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;

  isSuperAdmin?: boolean;
  canManageUsers?: boolean;
  managementLevel?: number;

  allowCreate?: boolean;
  className?: string;
};

type PermissionKey =
  | "canViewAllTickets"
  | "canAssignTickets"
  | "canManageUsers"
  | "canPublishOffers"
  | "canNotifyEmployees";

type Permissions = Record<PermissionKey, boolean>;

// =====================================================
// INITIAL PERMISSIONS
// =====================================================

const initialPermissions: Permissions = {
  canViewAllTickets: false,
  canAssignTickets: false,
  canManageUsers: false,
  canPublishOffers: false,
  canNotifyEmployees: false,
};

// =====================================================
// PERMISSION OPTIONS
// =====================================================

const permissionOptions: {
  key: PermissionKey;
  title: string;
  description: string;
}[] = [
  {
    key: "canViewAllTickets",
    title: "View All Tickets",
    description: "Can view all organisation tickets.",
  },
  {
    key: "canAssignTickets",
    title: "Assign Tickets",
    description: "Can assign tickets to employees.",
  },
  {
    key: "canManageUsers",
    title: "Manage Users",
    description: "Can access user management operations.",
  },
  {
    key: "canPublishOffers",
    title: "Publish Offers",
    description: "Can create and publish company offers.",
  },
  {
    key: "canNotifyEmployees",
    title: "Send Employee Notifications",
    description: "Can send notifications to employees.",
  },
];

// =====================================================
// TOGGLE COMPONENT
// =====================================================

const ToggleRow = ({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-[var(--theme-border)] py-3 last:border-0 dark:border-[var(--theme-border)]">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[var(--theme-ink)] dark:text-[var(--theme-ink)]">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-[var(--theme-muted)] dark:text-[var(--theme-muted)]">
        {description}
      </p>
    </div>

    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[var(--theme-primary)]" : "bg-[var(--theme-border)]"
      }`}
    >
      <span
        className={`pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--theme-white)] shadow-sm transition-transform duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

// =====================================================
// MAIN COMPONENT
// =====================================================

const DesignationPicker: React.FC<Props> = ({
  value,
  onChange,
  disabled = false,
  isSuperAdmin = false,
  canManageUsers = false,
  managementLevel = 0,
  allowCreate = false,
  className = "",
}) => {
  const { theme } = useTheme();

  // =====================================================
  // STATES
  // =====================================================

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // CREATE FORM

  const [newName, setNewName] = useState("");

  const [newPermissions, setNewPermissions] = useState<Permissions>({
    ...initialPermissions,
  });

  const [newManagementLevel, setNewManagementLevel] = useState("0");

  // EDIT FORM

  const [editingId, setEditingId] = useState<number | null>(null);

  const [editPermissions, setEditPermissions] = useState<Permissions>({
    ...initialPermissions,
  });

  const [editManagementLevel, setEditManagementLevel] = useState("0");

  const canCreateDesignation = allowCreate && canManageUsers && !disabled;

  // =====================================================
  // LOAD DESIGNATIONS
  // =====================================================

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/designations");

      const records: Designation[] = Array.isArray(response.data?.designations)
        ? response.data.designations
        : [];

      setDesignations(records);
    } catch (err: any) {
      console.error("GET DESIGNATIONS ERROR:", err?.response?.data || err);

      setError(err?.response?.data?.message || "Unable to load designations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // =====================================================
  // FILTER DESIGNATIONS
  // =====================================================

  const availableDesignations = useMemo(() => {
    if (isSuperAdmin) {
      return designations;
    }

    const actorLevel = Number(managementLevel || 0);

    return designations.filter((item) => {
      const designationLevel = Number(item.managementLevel || 0);

      return designationLevel < actorLevel;
    });
  }, [designations, isSuperAdmin, managementLevel]);

  const selected = availableDesignations.find((item) => item.name === value);

  // =====================================================
  // VALIDATE MANAGEMENT LEVEL
  // =====================================================

  const validateLevel = (value: string) => {
    const level = Number(value);

    return Number.isInteger(level) && level >= 0 && level <= 1000;
  };

  // =====================================================
  // RESET CREATE FORM
  // =====================================================

  const resetCreateForm = () => {
    setNewName("");
    setNewPermissions({ ...initialPermissions });
    setNewManagementLevel("0");
    setAdding(false);
  };

  // =====================================================
  // UPDATE PERMISSIONS
  // =====================================================

  const updateNewPermission = (key: PermissionKey, checked: boolean) => {
    setNewPermissions((previous) => ({
      ...previous,
      [key]: checked,
    }));
  };

  const updateEditPermission = (key: PermissionKey, checked: boolean) => {
    setEditPermissions((previous) => ({
      ...previous,
      [key]: checked,
    }));
  };

  // =====================================================
  // CREATE DESIGNATION
  // =====================================================

  const createDesignation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newName.trim();

    if (!canCreateDesignation) {
      setError("You do not have permission to create designations.");
      return;
    }

    if (!name) {
      setError("Enter a designation name.");
      return;
    }

    const level = Number(newManagementLevel);

    if (!validateLevel(newManagementLevel)) {
      setError("Management level must be a whole number between 0 and 1000.");
      return;
    }

    // Only SuperAdmin can grant elevated permissions.

    if (
      !isSuperAdmin &&
      (newPermissions.canViewAllTickets ||
        newPermissions.canManageUsers ||
        newPermissions.canPublishOffers ||
        newPermissions.canNotifyEmployees ||
        level > 0)
    ) {
      setError(
        "Only SuperAdmin can create designations with elevated permissions or a management level.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name,

        canAssignTickets: newPermissions.canAssignTickets,

        ...(isSuperAdmin
          ? {
              canViewAllTickets: newPermissions.canViewAllTickets,

              canManageUsers: newPermissions.canManageUsers,

              canPublishOffers: newPermissions.canPublishOffers,

              canNotifyEmployees: newPermissions.canNotifyEmployees,

              managementLevel: level,
            }
          : {}),
      };

      const response = await api.post("/designations", payload);

      const created: Designation | undefined = response.data?.designation;

      if (!created) {
        throw new Error("Designation was not returned by the server.");
      }

      setDesignations((previous) =>
        [...previous, created].sort((a, b) => a.name.localeCompare(b.name)),
      );

      onChange(created.name);

      resetCreateForm();

      setSuccess("Designation created successfully.");
    } catch (err: any) {
      console.error("CREATE DESIGNATION ERROR:", err?.response?.data || err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to create designation.",
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // START EDITING
  // =====================================================

  const startEditing = (item: Designation) => {
    if (!isSuperAdmin || disabled) return;

    setEditingId(item.id);

    setEditPermissions({
      canViewAllTickets: item.canViewAllTickets === true,
      canAssignTickets: item.canAssignTickets === true,
      canManageUsers: item.canManageUsers === true,
      canPublishOffers: item.canPublishOffers === true,
      canNotifyEmployees: item.canNotifyEmployees === true,
    });

    setEditManagementLevel(String(item.managementLevel ?? 0));

    setAdding(false);
    setError("");
    setSuccess("");
  };

  // =====================================================
  // CANCEL EDITING
  // =====================================================

  const cancelEditing = () => {
    if (saving) return;

    setEditingId(null);
  };

  // =====================================================
  // UPDATE DESIGNATION
  // =====================================================

  const updateDesignation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSuperAdmin || editingId === null) {
      setError("Only SuperAdmin can edit designation permissions.");
      return;
    }

    if (!validateLevel(editManagementLevel)) {
      setError("Management level must be a whole number between 0 and 1000.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api.patch(`/designations/${editingId}`, {
        ...editPermissions,
        managementLevel: Number(editManagementLevel),
      });

      const updated: Designation | undefined = response.data?.designation;

      if (!updated) {
        throw new Error("Updated designation was not returned by the server.");
      }

      setDesignations((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );

      setEditingId(null);

      setSuccess("Designation permissions updated successfully.");
    } catch (err: any) {
      console.error("UPDATE DESIGNATION ERROR:", err?.response?.data || err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to update designation.",
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DESIGNATION DESCRIPTION
  // =====================================================

  const getDesignationDescription = (designation: Designation) => {
    const permissions: string[] = [];

    if (designation.canViewAllTickets) permissions.push("View all tickets");

    if (designation.canAssignTickets) permissions.push("Assign tickets");

    if (designation.canManageUsers) permissions.push("Manage users");

    if (designation.canPublishOffers) permissions.push("Publish offers");

    if (designation.canNotifyEmployees)
      permissions.push("Send employee notifications");

    if (permissions.length === 0) {
      return "Can access tickets according to assigned client permissions.";
    }

    return permissions.join(" • ");
  };

  // =====================================================
  // RENDER PERMISSIONS
  // =====================================================

  const renderPermissionOptions = (
    permissions: Permissions,
    update: (key: PermissionKey, checked: boolean) => void,
    showAll: boolean,
  ) => {
    const options = showAll
      ? permissionOptions
      : permissionOptions.filter((item) => item.key === "canAssignTickets");

    return options.map((item) => (
      <ToggleRow
        key={item.key}
        title={item.title}
        description={item.description}
        checked={permissions[item.key]}
        onChange={(checked) => update(item.key, checked)}
        disabled={saving}
      />
    ));
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className={`w-full space-y-4 ${className}`}
      style={
        {
          "--theme-background": theme.background,
          "--theme-white": theme.white,
          "--theme-ink": theme.ink,
          "--theme-text": theme.text,
          "--theme-muted": theme.muted,
          "--theme-light": theme.light,
          "--theme-primary": theme.primary,
          "--theme-primary-dark": theme.primaryDark,
          "--theme-primary-soft": theme.primarySoft,
          "--theme-border": theme.border,
          "--theme-input": theme.input,
          "--theme-danger": theme.danger,
          "--theme-danger-soft": theme.dangerSoft,
          "--theme-success": theme.success,
          "--theme-success-soft": theme.successSoft,
        } as React.CSSProperties
      }
    >
      {/* STATUS MESSAGES */}

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-[var(--theme-danger)]/30 bg-[var(--theme-danger-soft)] px-4 py-3 text-sm text-[var(--theme-danger)] dark:border-[var(--theme-danger)]/40 dark:bg-[var(--theme-danger-soft)] dark:text-[var(--theme-danger)]"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--theme-success)]/30 bg-[var(--theme-success-soft)] px-4 py-3 text-sm text-[var(--theme-success)] dark:border-[var(--theme-success)]/40 dark:bg-[var(--theme-success-soft)] dark:text-[var(--theme-success)]"
        >
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* DESIGNATION PICKER */}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-[var(--theme-ink)] dark:text-[var(--theme-ink)]">
            Designation
          </label>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--theme-muted)] transition hover:text-[var(--theme-primary)] disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-5 text-sm text-[var(--theme-muted)]">
            <Loader2 size={17} className="animate-spin" />
            Loading designations...
          </div>
        ) : error && designations.length === 0 ? (
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-[var(--theme-border)] px-4 py-3 text-sm font-medium text-[var(--theme-primary)] hover:bg-[var(--theme-background)] dark:border-[var(--theme-border)]"
          >
            Retry loading designations
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableDesignations.map((item) => {
              const isSelected = item.name === value;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(item.name);
                    setError("");
                    setSuccess("");
                    setEditingId(null);
                  }}
                  aria-pressed={isSelected}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSelected
                      ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-white shadow-sm"
                      : "border-[var(--theme-border)] bg-[var(--theme-white)] text-[var(--theme-text)] hover:border-[var(--theme-primary)] hover:bg-[var(--theme-background)] dark:border-[var(--theme-border)] dark:bg-[var(--theme-white)] dark:text-[var(--theme-text)] dark:hover:border-[var(--theme-primary)]"
                  }`}
                >
                  {isSelected && <Check size={14} />}
                  {item.name}
                </button>
              );
            })}

            {availableDesignations.length === 0 && (
              <p className="py-2 text-sm text-[var(--theme-muted)]">
                No available designations.
              </p>
            )}

            {/* NEW BUTTON */}

            {canCreateDesignation && !adding && (
              <button
                type="button"
                onClick={() => {
                  setAdding(true);
                  setEditingId(null);
                  setError("");
                  setSuccess("");
                }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-primary)] transition hover:bg-[var(--theme-primary-soft)]"
              >
                <Plus size={15} />
                New
              </button>
            )}
          </div>
        )}
      </div>

      {/* SELECTED DESIGNATION DETAILS */}

      {selected && !adding && editingId === null && (
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-4 dark:border-[var(--theme-border)] dark:bg-[var(--theme-white)]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-[var(--theme-primary)]" />

            <h4 className="text-sm font-bold text-[var(--theme-ink)] dark:text-[var(--theme-ink)]">
              {selected.name}
            </h4>
          </div>

          <p className="mt-2 text-xs leading-5 text-[var(--theme-muted)] dark:text-[var(--theme-muted)]">
            {getDesignationDescription(selected)}
          </p>

          {isSuperAdmin && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] pt-3 dark:border-[var(--theme-border)]">
              <span className="text-xs font-semibold text-[var(--theme-primary)]">
                Management level: {selected.managementLevel}
              </span>

              <button
                type="button"
                onClick={() => startEditing(selected)}
                disabled={saving || disabled}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--theme-primary)]/40 px-3 py-2 text-xs font-semibold text-[var(--theme-primary)] transition hover:bg-[var(--theme-primary-soft)] disabled:opacity-50"
              >
                <Pencil size={13} />
                Edit Permissions
              </button>
            </div>
          )}
        </div>
      )}

      {/* EDIT DESIGNATION FORM */}

      {editingId !== null && isSuperAdmin && (
        <form
          onSubmit={updateDesignation}
          className="space-y-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-white)] p-5 shadow-sm dark:border-[var(--theme-border)] dark:bg-[var(--theme-white)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--theme-ink)] dark:text-[var(--theme-ink)]">
                Edit Designation Permissions
              </h3>

              <p className="mt-1 text-xs text-[var(--theme-muted)]">
                Changes apply to all users assigned to this designation.
              </p>
            </div>

            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="rounded-lg p-2 text-[var(--theme-muted)] transition hover:bg-[var(--theme-background)] dark:hover:bg-[var(--theme-background)]"
              aria-label="Close edit form"
            >
              <X size={18} />
            </button>
          </div>

          {renderPermissionOptions(editPermissions, updateEditPermission, true)}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--theme-ink)] dark:text-[var(--theme-ink)]">
              Management Level
            </label>

            <input
              type="number"
              min="0"
              max="1000"
              step="1"
              value={editManagementLevel}
              onChange={(e) => setEditManagementLevel(e.target.value)}
              disabled={saving}
              className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 py-3 text-sm text-[var(--theme-ink)] outline-none transition focus:border-[var(--theme-primary)] dark:border-[var(--theme-border)] dark:bg-[var(--theme-input)] dark:text-white"
            />

            <p className="text-xs text-[var(--theme-muted)]">
              Higher numbers represent greater management authority.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--theme-border)] pt-4 dark:border-[var(--theme-border)]">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--theme-muted)] hover:bg-[var(--theme-background)] dark:hover:bg-[var(--theme-background)]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--theme-primary-dark)] disabled:opacity-60"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* CREATE DESIGNATION FORM */}

      {adding && canCreateDesignation && (
        <form
          onSubmit={createDesignation}
          className="space-y-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-white)] p-5 shadow-sm dark:border-[var(--theme-border)] dark:bg-[var(--theme-white)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--theme-ink)] dark:text-[var(--theme-ink)]">
                New Designation
              </h3>

              <p className="mt-1 text-xs text-[var(--theme-muted)]">
                Configure designation name and permissions.
              </p>
            </div>

            <button
              type="button"
              onClick={resetCreateForm}
              disabled={saving}
              className="rounded-lg p-2 text-[var(--theme-muted)] transition hover:bg-[var(--theme-background)] dark:hover:bg-[var(--theme-background)]"
              aria-label="Close create form"
            >
              <X size={18} />
            </button>
          </div>

          {/* DESIGNATION NAME */}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--theme-ink)] dark:text-[var(--theme-ink)]">
              Designation Name
            </label>

            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Project Manager"
              autoCapitalize="words"
              disabled={saving}
              className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 py-3 text-sm text-[var(--theme-ink)] outline-none transition placeholder:text-[var(--theme-light)] focus:border-[var(--theme-primary)] dark:border-[var(--theme-border)] dark:bg-[var(--theme-input)] dark:text-white"
            />
          </div>

          {/* ASSIGN TICKETS */}

          {renderPermissionOptions(newPermissions, updateNewPermission, false)}

          {/* SUPERADMIN PERMISSIONS */}

          {isSuperAdmin && (
            <div className="space-y-3 border-t border-[var(--theme-border)] pt-4 dark:border-[var(--theme-border)]">
              <div className="flex items-center gap-2">
                <LockKeyhole
                  size={15}
                  className="text-[var(--theme-primary)]"
                />

                <h4 className="text-sm font-bold text-[var(--theme-primary)]">
                  SuperAdmin Permissions
                </h4>
              </div>

              {permissionOptions
                .filter((item) => item.key !== "canAssignTickets")
                .map((item) => (
                  <ToggleRow
                    key={item.key}
                    title={item.title}
                    description={item.description}
                    checked={newPermissions[item.key]}
                    onChange={(checked) =>
                      updateNewPermission(item.key, checked)
                    }
                    disabled={saving}
                  />
                ))}

              {/* MANAGEMENT LEVEL */}

              <div className="space-y-2 pt-2">
                <label className="block text-sm font-semibold text-[var(--theme-ink)] dark:text-[var(--theme-ink)]">
                  Management Level
                </label>

                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  value={newManagementLevel}
                  onChange={(e) => setNewManagementLevel(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 py-3 text-sm text-[var(--theme-ink)] outline-none focus:border-[var(--theme-primary)] dark:border-[var(--theme-border)] dark:bg-[var(--theme-input)] dark:text-white"
                />

                <p className="text-xs text-[var(--theme-muted)]">
                  Higher numbers represent greater management authority.
                </p>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}

          <div className="flex justify-end gap-3 border-t border-[var(--theme-border)] pt-4">
            <button
              type="button"
              onClick={resetCreateForm}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--theme-muted)] hover:bg-[var(--theme-background)] dark:hover:bg-[var(--theme-background)]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--theme-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Create Designation
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default DesignationPicker;
