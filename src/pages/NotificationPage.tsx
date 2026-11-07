import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Tag,
  Ticket,
  X,
} from "lucide-react";
import { api } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "../styles/NotificationPage.css";

interface NotificationItem {
  _id?: string;
  id?: string;
  title: string;
  body: string;
  type: "NEW_TICKET" | "STATUS_UPDATE" | "CUSTOM" | "ANNOUNCEMENT" | "OFFER";
  read: boolean;
  complaintId?: string | null;
  offerId?: string | null;
  complaint?: {
    _id?: string;
    id?: string;
    module?: string;
    problem?: string;
    status?: string;
  } | null;
  offer?: {
    _id?: string;
    id?: string;
    title?: string;
  } | null;
  createdAt: string;
}

type FilterType = "ALL" | "UNREAD";

const getId = (item: NotificationItem) => item._id || item.id || "";

const getNotificationIcon = (type: NotificationItem["type"]) => {
  switch (type) {
    case "NEW_TICKET":
      return Ticket;
    case "STATUS_UPDATE":
      return Check;
    case "OFFER":
      return Tag;
    case "ANNOUNCEMENT":
      return Bell;
    default:
      return Bell;
  }
};

const getStatusLabel = (status?: string) => {
  if (!status) return "";

  return status
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatTime = (date: string) => {
  const notificationDate = new Date(date);

  if (Number.isNaN(notificationDate.getTime())) return "";

  const difference = Math.max(0, Date.now() - notificationDate.getTime());
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return notificationDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const NotificationPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/notification/getAll");
      const result = response.data?.notifications;

      setNotifications(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("FETCH NOTIFICATIONS ERROR:", err);
      setError("Unable to load notifications. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const matchesFilter = filter === "ALL" || !item.read;
      const matchesSearch =
        !query ||
        item.title?.toLowerCase().includes(query) ||
        item.body?.toLowerCase().includes(query) ||
        item.type?.toLowerCase().includes(query) ||
        item.complaint?.module?.toLowerCase().includes(query) ||
        item.offer?.title?.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [notifications, filter, search]);

  const markAsRead = async (notificationId: string) => {
    if (!notificationId || markingIds.includes(notificationId)) return;

    setMarkingIds((previous) => [...previous, notificationId]);

    try {
      await api.patch(`/notification/${notificationId}/read`);

      setNotifications((previous) =>
        previous.map((item) =>
          getId(item) === notificationId ? { ...item, read: true } : item,
        ),
      );
    } catch (err) {
      console.error("MARK READ ERROR:", err);
    } finally {
      setMarkingIds((previous) =>
        previous.filter((id) => id !== notificationId),
      );
    }
  };

  const markAllAsRead = async () => {
    if (markingAll || unreadCount === 0) return;

    try {
      setMarkingAll(true);
      await api.patch("/notification/read-all");

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, read: true })),
      );
    } catch (err) {
      console.error("MARK ALL READ ERROR:", err);
      setError("Unable to mark notifications as read. Please try again.");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    const notificationId = getId(item);

    if (!item.read && notificationId) {
      await markAsRead(notificationId);
    }

    const complaintId =
      item.complaintId || item.complaint?._id || item.complaint?.id;
    const offerId = item.offerId || item.offer?._id || item.offer?.id;

    if (complaintId) {
      navigate("/tickets", {
        state: { openTicketId: String(complaintId) },
      });
      return;
    }

    if (offerId) {
      navigate("/offers", {
        state: { openOfferId: String(offerId) },
      });
    }
  };

  const handleNotificationKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    item: NotificationItem,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void handleNotificationClick(item);
    }
  };

  const pageStyle: React.CSSProperties = {
    background: theme.background,
    color: theme.text,
    minHeight: "100%",
    ["--notification-bg" as any]: theme.background,
    ["--notification-surface" as any]: theme.white,
    ["--notification-input" as any]: theme.input,
    ["--notification-text" as any]: theme.text,
    ["--notification-muted" as any]: theme.muted,
    ["--notification-border" as any]: theme.border,
    ["--notification-divider" as any]: theme.divider,
    ["--notification-primary" as any]: theme.primary,
    ["--notification-primary-soft" as any]: theme.primarySoft,
    ["--notification-danger" as any]: theme.danger,
    ["--notification-danger-soft" as any]: theme.dangerSoft,
  };

  const surfaceStyle: React.CSSProperties = {
    background: theme.white,
    border: `1px solid ${theme.border}`,
    color: theme.text,
  };

  const secondaryButtonStyle: React.CSSProperties = {
    background: theme.white,
    color: theme.text,
    border: `1px solid ${theme.border}`,
  };

  return (
    <div className="notification-page" style={pageStyle}>
      <div className="notification-header">
        <div>
          <div className="notification-heading">
            <h1 style={{ color: theme.text }}>Notifications</h1>

            {unreadCount > 0 && (
              <span
                className="notification-count"
                style={{
                  background: theme.primarySoft,
                  color: theme.primaryDark,
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>

          <p style={{ color: theme.muted }}>
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${
                  unreadCount > 1 ? "s" : ""
                }`
              : "You're all caught up"}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="mark-all-button"
            onClick={() => void markAllAsRead()}
            disabled={markingAll}
            style={{
              background: theme.primary,
              color: theme.everWhite || "#FFFFFF",
              opacity: markingAll ? 0.7 : 1,
            }}
          >
            {markingAll ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCheck size={16} />
            )}
            {markingAll ? "Please wait..." : "Mark all as read"}
          </button>
        )}
      </div>

      <div
        className="notification-toolbar"
        style={{
          ...surfaceStyle,
          borderRadius: 14,
          padding: 12,
        }}
      >
        <div className="notification-tabs">
          <button
            type="button"
            className={filter === "ALL" ? "active" : ""}
            onClick={() => setFilter("ALL")}
            style={{
              color: filter === "ALL" ? theme.primaryDark : theme.muted,
              background: filter === "ALL" ? theme.primarySoft : "transparent",
            }}
          >
            All <span>{notifications.length}</span>
          </button>

          <button
            type="button"
            className={filter === "UNREAD" ? "active" : ""}
            onClick={() => setFilter("UNREAD")}
            style={{
              color: filter === "UNREAD" ? theme.primaryDark : theme.muted,
              background:
                filter === "UNREAD" ? theme.primarySoft : "transparent",
            }}
          >
            Unread <span>{unreadCount}</span>
          </button>
        </div>

        <div
          className="notification-search"
          style={{
            background: theme.input,
            border: `1px solid ${theme.border}`,
            color: theme.muted,
          }}
        >
          <Search size={17} />
          <input
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search notifications"
            style={{
              background: "transparent",
              color: theme.text,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              style={{ color: theme.muted }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={() => {
            setRefreshing(true);
            void fetchNotifications();
          }}
          disabled={refreshing}
          title="Refresh notifications"
          aria-label="Refresh notifications"
          style={{
            ...secondaryButtonStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 42,
            height: 42,
            minWidth: 42,
            padding: 0,
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          <RefreshCw
            size={17}
            className={refreshing ? "animate-spin" : ""}
            style={{ display: "block", flexShrink: 0 }}
          />
        </button>
      </div>

      {error && (
        <div
          className="notification-error"
          role="alert"
          style={{
            background: theme.dangerSoft,
            color: theme.danger,
            border: `1px solid ${theme.danger}30`,
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchNotifications()}
            style={{ color: theme.danger }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="notification-list">
        {loading ? (
          <div className="notification-state" style={surfaceStyle}>
            <Loader2
              className="animate-spin"
              size={28}
              style={{ color: theme.primary }}
            />
            <p style={{ color: theme.muted }}>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notification-state" style={surfaceStyle}>
            <div
              className="empty-notification-icon"
              style={{
                background: theme.primarySoft,
                color: theme.primary,
              }}
            >
              <Bell size={25} />
            </div>
            <h3 style={{ color: theme.text }}>
              {search
                ? "No matching notifications"
                : filter === "UNREAD"
                  ? "No unread notifications"
                  : "No notifications yet"}
            </h3>
            <p style={{ color: theme.muted }}>
              {search
                ? "Try searching with a different keyword."
                : "New updates and alerts will appear here."}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ color: theme.primary, fontWeight: 600 }}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const Icon = getNotificationIcon(item.type);
            const notificationId = getId(item);
            const isMarking = markingIds.includes(notificationId);
            const hasDestination = Boolean(
              item.complaintId ||
              item.complaint?._id ||
              item.complaint?.id ||
              item.offerId ||
              item.offer?._id ||
              item.offer?.id,
            );

            return (
              <div
                key={notificationId || `${item.createdAt}-${item.title}`}
                className={`notification-item ${!item.read ? "unread" : ""}`}
                onClick={() => void handleNotificationClick(item)}
                onKeyDown={(event) => handleNotificationKeyDown(event, item)}
                role="button"
                tabIndex={0}
                style={{
                  ...surfaceStyle,
                  borderLeft: !item.read
                    ? `3px solid ${theme.primary}`
                    : `1px solid ${theme.border}`,
                  cursor: hasDestination ? "pointer" : "default",
                  opacity: isMarking ? 0.75 : 1,
                }}
              >
                <div
                  className="notification-icon"
                  style={{
                    background: theme.primarySoft,
                    color: theme.primary,
                  }}
                >
                  <Icon size={20} />
                </div>

                <div className="notification-details">
                  <div className="notification-title-row">
                    <h3 style={{ color: theme.text }}>{item.title}</h3>

                    {!item.read && (
                      <span
                        className="unread-indicator"
                        style={{ background: theme.primary }}
                        aria-label="Unread"
                      />
                    )}
                  </div>

                  <p
                    className="notification-body"
                    style={{ color: theme.muted }}
                  >
                    {item.body}
                  </p>

                  {item.complaint && (
                    <div className="notification-meta">
                      {item.complaint.module && (
                        <span
                          className="notification-module"
                          style={{
                            background: theme.primarySoft,
                            color: theme.primaryDark,
                          }}
                        >
                          {item.complaint.module}
                        </span>
                      )}

                      {item.complaint.status && (
                        <span
                          className="notification-status"
                          style={{
                            background: theme.input,
                            color: theme.muted,
                          }}
                        >
                          {getStatusLabel(item.complaint.status)}
                        </span>
                      )}
                    </div>
                  )}

                  {item.offer?.title && (
                    <div className="notification-meta">
                      <span
                        className="notification-module"
                        style={{
                          background: theme.primarySoft,
                          color: theme.primaryDark,
                        }}
                      >
                        {item.offer.title}
                      </span>
                    </div>
                  )}

                  <span
                    className="notification-time"
                    style={{ color: theme.light }}
                  >
                    <Clock3 size={13} />
                    {formatTime(item.createdAt)}
                  </span>
                </div>

                <div
                  className="notification-arrow"
                  style={{ color: theme.muted }}
                >
                  {isMarking ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : hasDestination ? (
                    <ChevronRight size={19} />
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationPage;
