import { useEffect, useState } from "react";
import LeaveRequest from "./LeaveRequest";
import {
  UserRound,
  Mail,
  BriefcaseBusiness,
  Building2,
  ShieldCheck,
  LockKeyhole,
  Pencil,
  X,
  Check,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  CalendarDays,
  Settings2,
  BadgeCheck,
} from "lucide-react";

import { api, useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

interface ProfileUser {
  id?: string;
  _id?: string;
  userName?: string;
  email?: string;
  role?: string;
  designation?: string;
  organisation?:
    | {
        id?: string;
        name?: string;
        orgType?: string;
      }
    | string;
  permissions?: {
    canViewAllTickets?: boolean;
    canAssignTickets?: boolean;
    canManageUsers?: boolean;
    canPublishOffers?: boolean;
    canNotifyEmployees?: boolean;
    managementLevel?: number;
  };
  isSuperAdmin?: boolean;
  createdAt?: string;
}

type ProfileForm = {
  userName: string;
  email: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const ProfilePage = () => {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [profile, setProfile] = useState<ProfileUser | null>(
    (user as ProfileUser) || null,
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    userName: "",
    email: "",
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (user) {
      setProfile(user as ProfileUser);
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/auth/me");
      const fetchedUser = response.data?.user || response.data;

      if (fetchedUser) {
        setProfile(fetchedUser);
        setProfileForm({
          userName: fetchedUser.userName || "",
          email: fetchedUser.email || "",
        });
      }
    } catch (err: any) {
      console.error("FETCH PROFILE ERROR:", err?.response?.data || err);

      setError(err?.response?.data?.message || "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    setProfileForm({
      userName: profile?.userName || "",
      email: profile?.email || "",
    });

    setError("");
    setSuccess("");
    setEditMode(true);
    setPasswordMode(false);
  };

  const cancelEditing = () => {
    setEditMode(false);
    setError("");
    setProfileForm({
      userName: profile?.userName || "",
      email: profile?.email || "",
    });
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const userName = profileForm.userName.trim();
    const email = profileForm.email.trim();

    if (!userName || !email) {
      setError("Username and email are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api.patch("/auth/update-profile", {
        userName,
        email,
      });

      const updatedUser = response.data?.user || response.data?.data?.user;

      if (updatedUser) {
        setProfile((previous) => ({
          ...previous,
          ...updatedUser,
        }));
      } else {
        setProfile((previous) => ({
          ...previous,
          userName,
          email,
        }));
      }

      setEditMode(false);
      setSuccess("Your profile has been updated successfully.");
    } catch (err: any) {
      console.error("UPDATE PROFILE ERROR:", err?.response?.data || err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to update profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from the current password.");
      return;
    }

    try {
      setChangingPassword(true);
      setError("");
      setSuccess("");

      await api.patch("/auth/update-password", {
        currentPassword,
        newPassword,
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordMode(false);
      setSuccess("Your password has been changed successfully.");
    } catch (err: any) {
      console.error("UPDATE PASSWORD ERROR:", err?.response?.data || err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to update password.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const organisationName =
    typeof profile?.organisation === "object"
      ? profile.organisation?.name || "Not assigned"
      : profile?.organisation || "Not assigned";

  const organisationType =
    typeof profile?.organisation === "object"
      ? profile.organisation?.orgType || ""
      : "";

  const roleName = profile?.isSuperAdmin
    ? "Super Administrator"
    : profile?.role || "Employee";

  // Leave requests are available only to regular employee accounts.
  const isEmployee =
    !profile?.isSuperAdmin && profile?.role?.toLowerCase() === "employee";

  const initials = (profile?.userName || "U")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const permissionItems = [
    {
      label: "View All Tickets",
      key: "canViewAllTickets",
    },
    {
      label: "Assign Tickets",
      key: "canAssignTickets",
    },
    {
      label: "Manage Users",
      key: "canManageUsers",
    },
    {
      label: "Publish Offers",
      key: "canPublishOffers",
    },
    {
      label: "Send Notifications",
      key: "canNotifyEmployees",
    },
  ] as const;

  const hasPermission = (key: (typeof permissionItems)[number]["key"]) =>
    profile?.isSuperAdmin === true || profile?.permissions?.[key] === true;

  const closePasswordModal = () => {
    if (changingPassword) return;

    setPasswordMode(false);
    setError("");

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const closeProfileModal = () => {
    if (saving) return;
    cancelEditing();
  };

  if (loading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        style={{ background: theme.background, color: theme.text }}
      >
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: theme.primary }}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center"
        style={{ background: theme.background, color: theme.text }}
      >
        <UserRound className="mb-3 h-12 w-12" style={{ color: theme.muted }} />
        <h2 className="font-bold" style={{ color: theme.text }}>
          Profile unavailable
        </h2>
        <button
          onClick={() => void fetchProfile()}
          className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: theme.primary }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      id="profile-page"
      className="min-h-full px-5 py-7 sm:px-8 lg:px-10"
      style={{
        background: theme.background,
        color: theme.text,
        ["--profile-bg" as any]: theme.background,
        ["--profile-surface" as any]: theme.white,
        ["--profile-input" as any]: theme.input,
        ["--profile-text" as any]: theme.text,
        ["--profile-muted" as any]: theme.muted,
        ["--profile-border" as any]: theme.border,
        ["--profile-divider" as any]: theme.divider,
        ["--profile-primary" as any]: theme.primary,
        ["--profile-primary-dark" as any]: theme.primaryDark,
        ["--profile-primary-soft" as any]: theme.primarySoft,
        ["--profile-success" as any]: theme.success,
        ["--profile-success-soft" as any]: theme.successSoft,
        ["--profile-danger" as any]: theme.danger,
        ["--profile-danger-soft" as any]: theme.dangerSoft,
      }}
    >
      <style>{`
        #profile-page { color: var(--profile-text); }
        #profile-page .rounded-2xl.border,
        #profile-page .rounded-2xl.border.border-gray-200,
        #profile-page .rounded-2xl.border.border-gray-200.bg-white,
        #profile-page .rounded-2xl.border.bg-white {
          background: var(--profile-surface) !important;
          border-color: var(--profile-border) !important;
          color: var(--profile-text) !important;
        }
        #profile-page .text-gray-900,
        #profile-page .text-gray-800,
        #profile-page .text-gray-700,
        #profile-page .text-gray-600,
        #profile-page .dark\\:text-white,
        #profile-page .dark\\:text-gray-200,
        #profile-page .dark\\:text-gray-300 { color: var(--profile-text) !important; }
        #profile-page .text-gray-500,
        #profile-page .text-gray-400,
        #profile-page .dark\\:text-gray-400 { color: var(--profile-muted) !important; }
        #profile-page .border-gray-100,
        #profile-page .border-gray-200,
        #profile-page .dark\\:border-white\\/10 { border-color: var(--profile-border) !important; }
        #profile-page .bg-gray-50,
        #profile-page .bg-gray-50\\/70,
        #profile-page .dark\\:bg-white\\/5,
        #profile-page .dark\\:bg-white\\/\\[0\\.03\\] { background: var(--profile-input) !important; }
        #profile-page input {
          background: var(--profile-input) !important;
          color: var(--profile-text) !important;
          border-color: var(--profile-border) !important;
        }
        #profile-page input::placeholder { color: var(--profile-muted) !important; }
        #profile-page .profile-theme-primary { background: var(--profile-primary) !important; color: #fff !important; }
        #profile-page .profile-theme-primary-text { color: var(--profile-primary) !important; }
        #profile-page .profile-theme-soft { background: var(--profile-primary-soft) !important; color: var(--profile-primary-dark) !important; }
      `}</style>
      {/* HEADER */}
      <div className="mb-8">
        <div
          className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest"
          style={{ color: theme.primary }}
        >
          <UserRound size={15} />
          Account
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          My Profile
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Manage your personal information and account security.
        </p>
      </div>

      {/* ALERTS */}
      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
          <Check size={17} />
          {success}
          <button onClick={() => setSuccess("")} className="ml-auto">
            <X size={17} />
          </button>
        </div>
      )}

      {error && !editMode && !passwordMode && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
          <button onClick={() => setError("")} className="ml-auto">
            <X size={17} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        {/* LEFT PROFILE CARD */}
        <div className="space-y-6 xl:col-span-1">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#151922]">
            <div
              className="h-28"
              style={{
                background: `linear-gradient(120deg, ${theme.primaryDark}, ${theme.primary})`,
              }}
            />

            <div className="px-6 pb-6">
              <div className="-mt-12 flex items-end justify-between">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 text-3xl font-bold"
                  style={{
                    borderColor: theme.white,
                    background: theme.primarySoft,
                    color: theme.primaryDark,
                  }}
                >
                  {initials}
                </div>

                <span
                  className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: theme.successSoft,
                    color: theme.success,
                  }}
                >
                  <BadgeCheck size={14} />
                  Active Account
                </span>
              </div>

              <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                {profile.userName || "User"}
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {profile.designation || roleName}
              </p>

              <div className="mt-5 space-y-3 border-t border-gray-100 pt-5 dark:border-white/10">
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={17} className="text-gray-400" />
                  <span className="break-all text-gray-600 dark:text-gray-300">
                    {profile.email || "No email"}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Building2 size={17} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {organisationName}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <ShieldCheck size={17} className="text-gray-400" />
                  <span className="capitalize text-gray-600 dark:text-gray-300">
                    {roleName}
                  </span>
                </div>
              </div>

              <button
                onClick={startEditing}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition"
                style={{
                  borderColor: theme.border,
                  background: theme.input,
                  color: theme.primary,
                }}
              >
                <Pencil size={16} />
                Edit Profile
              </button>

              {isEmployee && (
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(true)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition"
                  style={{
                    borderColor: theme.border,
                    background: theme.primarySoft,
                    color: theme.primaryDark,
                  }}
                >
                  <CalendarDays size={17} />
                  Leave Requests
                </button>
              )}
            </div>
          </div>

          {/* ACCOUNT SECURITY */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-[#151922]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <LockKeyhole className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Account Security
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Protect your account
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 p-4 dark:bg-white/5">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Password
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Update your password regularly to keep your account secure.
              </p>
            </div>

            <button
              onClick={() => {
                setError("");
                setSuccess("");
                setPasswordMode(true);
                setEditMode(false);
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition"
              style={{ background: theme.primary }}
            >
              <KeyRound size={16} />
              Change Password
            </button>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="space-y-6 xl:col-span-2">
          {/* PERSONAL INFORMATION */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-[#151922] sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Personal Information
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your registered account details.
                </p>
              </div>

              <button
                onClick={startEditing}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
              >
                <Pencil size={14} />
                Edit
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InfoItem
                label="Username"
                value={profile.userName}
                icon={UserRound}
              />

              <InfoItem
                label="Email Address"
                value={profile.email}
                icon={Mail}
              />

              <InfoItem
                label="Designation"
                value={profile.designation}
                icon={BriefcaseBusiness}
              />

              <InfoItem
                label="Account Role"
                value={roleName}
                icon={ShieldCheck}
              />

              <InfoItem
                label="Organisation"
                value={organisationName}
                icon={Building2}
              />

              {organisationType && (
                <InfoItem
                  label="Organisation Type"
                  value={organisationType}
                  icon={LayersIcon}
                />
              )}
            </div>
          </div>

          {/* ORGANISATION DETAILS */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-[#151922] sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Organisation Details
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your organisation association.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-white/5 dark:bg-white/3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Organisation Name
              </p>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                {organisationName}
              </p>

              {organisationType && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {organisationType}
                </p>
              )}
            </div>
          </div>

          {/* PERMISSIONS */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-[#151922] sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
                <Settings2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Access & Permissions
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Features available under your account.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {permissionItems.map((item) => {
                const enabled = hasPermission(item.key);

                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-white/5"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        enabled
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                      }`}
                    >
                      {enabled ? "Allowed" : "Restricted"}
                    </span>
                  </div>
                );
              })}
            </div>

            {profile.permissions?.managementLevel !== undefined && (
              <div className="mt-5 border-t border-gray-100 pt-4 dark:border-white/10">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Management Level
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {profile.isSuperAdmin
                    ? "999999"
                    : profile.permissions.managementLevel}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {editMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeProfileModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl"
            style={{
              background: theme.white,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-white/10">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Edit Profile
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Update your personal details.
                </p>
              </div>

              <button
                onClick={closeProfileModal}
                disabled={saving}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={updateProfile} className="space-y-5 p-6">
              <FormField
                label="Username"
                value={profileForm.userName}
                placeholder="Enter username"
                onChange={(value) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    userName: value,
                  }))
                }
              />

              <FormField
                label="Email Address"
                value={profileForm.email}
                placeholder="Enter email address"
                type="email"
                onChange={(value) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    email: value,
                  }))
                }
              />

              {error && <ErrorMessage message={error} />}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeProfileModal}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="profile-theme-primary flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Check size={17} />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE LEAVE REQUEST MODAL */}
      {isEmployee && leaveModalOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setLeaveModalOpen(false);
            }
          }}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
            style={{
              background: theme.white,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            {/* MODAL HEADER */}
            <div
              className="z-20 flex shrink-0 items-center justify-between border-b px-5 py-4 sm:px-7"
              style={{ background: theme.white, borderColor: theme.border }}
            >
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Leave Requests
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Apply for leave and track your applications.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                aria-label="Close leave requests"
                className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X size={21} />
              </button>
            </div>

            {/* EXISTING LEAVE REQUEST PAGE */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <LeaveRequest />
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {passwordMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePasswordModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl"
            style={{
              background: theme.white,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-white/10">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Change Password
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter your current and new password.
                </p>
              </div>

              <button
                onClick={closePasswordModal}
                disabled={changingPassword}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={updatePassword} className="space-y-5 p-6">
              <PasswordField
                label="Current Password"
                value={passwordForm.currentPassword}
                show={showPasswords.current}
                toggle={() =>
                  setShowPasswords((prev) => ({
                    ...prev,
                    current: !prev.current,
                  }))
                }
                onChange={(value) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: value,
                  }))
                }
              />

              <PasswordField
                label="New Password"
                value={passwordForm.newPassword}
                show={showPasswords.new}
                toggle={() =>
                  setShowPasswords((prev) => ({
                    ...prev,
                    new: !prev.new,
                  }))
                }
                onChange={(value) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: value,
                  }))
                }
              />

              <PasswordField
                label="Confirm New Password"
                value={passwordForm.confirmPassword}
                show={showPasswords.confirm}
                toggle={() =>
                  setShowPasswords((prev) => ({
                    ...prev,
                    confirm: !prev.confirm,
                  }))
                }
                onChange={(value) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: value,
                  }))
                }
              />

              {error && <ErrorMessage message={error} />}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={changingPassword}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="profile-theme-primary flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {changingPassword ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <LockKeyhole size={16} />
                  )}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// REUSABLE COMPONENTS

const InfoItem = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string;
  icon: React.ElementType;
}) => (
  <div className="flex items-start gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5">
      <Icon size={17} className="text-gray-500 dark:text-gray-400" />
    </div>

    <div className="min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 wrap-break-word text-sm font-semibold text-gray-900 dark:text-white">
        {value || "Not available"}
      </p>
    </div>
  </div>
);

const FormField = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4"
      style={{
        borderColor: "var(--profile-border)",
        background: "var(--profile-input)",
        color: "var(--profile-text)",
      }}
    />
  </div>
);

const PasswordField = ({
  label,
  value,
  show,
  toggle,
  onChange,
}: {
  label: string;
  value: string;
  show: boolean;
  toggle: () => void;
  onChange: (value: string) => void;
}) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
      {label}
    </label>

    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}`}
        autoComplete="off"
        className="w-full rounded-xl border px-4 py-3 pr-12 text-sm outline-none transition focus:ring-4"
        style={{
          borderColor: "var(--profile-border)",
          background: "var(--profile-input)",
          color: "var(--profile-text)",
        }}
      />

      <button
        type="button"
        onClick={toggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
    {message}
  </div>
);

const LayersIcon = Building2;

export default ProfilePage;
