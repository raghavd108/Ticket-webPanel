import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { api } from "../context/AuthContext";
import "../styles/SendNotificationModal.css";
import { useTheme } from "../context/ThemeContext";

interface Recipient {
  id: string;
  name: string;
  designation?: string;
  organisation?: string;
}

type Audience = "ALL" | "SELECTED";
type RecipientType = "EMPLOYEE" | "CLIENT";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSent?: () => void;
}

const SendNotificationModal = ({ visible, onClose, onSent }: Props) => {
  const { theme, isDarkMode } = useTheme();

  // Theme values are exposed as CSS variables for the existing stylesheet.
  const themeStyles: CSSProperties = {
    "--text": theme.text,
    "--muted": theme.muted,
    "--surface": theme.white,
    "--border": theme.border,
    "--subtle": theme.primarySoft,
    "--accent": theme.primary,
    "--input-bg": theme.input,
    "--button-bg": theme.primary,
    "--holiday-bg": theme.dangerSoft,
    "--holiday-border": theme.dangerSoft,
    "--holiday-text": theme.danger,
    "--working-bg": theme.successSoft,
    "--working-border": theme.successSoft,
    "--working-text": theme.success,
    "--notification-overlay": isDarkMode
      ? "rgba(0, 0, 0, 0.76)"
      : "rgba(20, 20, 20, 0.45)",
    "--notification-shadow": isDarkMode
      ? "0 24px 70px rgba(0, 0, 0, 0.5)"
      : "0 20px 60px rgba(0, 0, 0, 0.18)",
  } as CSSProperties;

  // Explicit overrides ensure every part of the modal follows the app theme,
  // even if the base CSS contains fixed light-mode colours.
  const themedCss = `
    .notification-overlay {
      background: var(--notification-overlay) !important;
      color-scheme: ${isDarkMode ? "dark" : "light"};
    }
    .notification-modal {
      background: ${theme.white} !important;
      color: ${theme.text} !important;
      border: 1px solid ${theme.border} !important;
      box-shadow: ${
        isDarkMode
          ? "0 24px 70px rgba(0,0,0,.5)"
          : "0 20px 60px rgba(0,0,0,.18)"
      } !important;
    }
    .notification-modal-header,
    .notification-modal-footer {
      background: ${theme.white} !important;
      border-color: ${theme.border} !important;
    }
    .notification-modal h2,
    .notification-modal h3,
    .notification-modal strong,
    .notification-modal label {
      color: ${theme.ink} !important;
    }
    .notification-modal p,
    .notification-modal small,
    .notification-modal .notification-character-count,
    .notification-modal .recipient-filter-label,
    .notification-modal .recipient-list-toolbar {
      color: ${theme.muted} !important;
    }
    .notification-modal input,
    .notification-modal textarea,
    .notification-modal select,
    .notification-modal .recipient-search {
      background: ${theme.input} !important;
      color: ${theme.text} !important;
      border-color: ${theme.border} !important;
    }
    .notification-modal input::placeholder,
    .notification-modal textarea::placeholder {
      color: ${theme.muted} !important;
      opacity: .8;
    }
    .notification-modal .notification-choice,
    .notification-modal .recipient-row,
    .notification-modal .recipient-filter-list button,
    .notification-modal .notification-cancel-button {
      background: ${theme.white} !important;
      color: ${theme.text} !important;
      border-color: ${theme.border} !important;
    }
    .notification-modal .notification-choice.active,
    .notification-modal .recipient-row.selected,
    .notification-modal .recipient-filter-list button.active {
      background: ${theme.primarySoft} !important;
      color: ${theme.primaryDark} !important;
      border-color: ${theme.primary} !important;
    }
    .notification-modal .notification-choice-icon,
    .notification-modal .notification-radio,
    .notification-modal .recipient-checkbox,
    .notification-modal .notification-summary-icon {
      color: ${theme.primary} !important;
    }
    .notification-modal .recipient-avatar {
      background: ${theme.primarySoft} !important;
      color: ${theme.primaryDark} !important;
    }
    .notification-modal .notification-recipient-summary {
      background: ${theme.primarySoft} !important;
      border-color: ${theme.border} !important;
      color: ${theme.text} !important;
    }
    .notification-modal .notification-send-button {
      background: ${theme.primary} !important;
      color: #FFFFFF !important;
      border-color: ${theme.primary} !important;
    }
    .notification-modal .notification-send-button:hover {
      background: ${theme.primaryDark} !important;
    }
    .notification-modal .notification-error {
      background: ${theme.dangerSoft} !important;
      color: ${theme.danger} !important;
      border-color: ${theme.danger} !important;
    }
    .notification-modal .recipient-list,
    .notification-modal .recipient-list-toolbar,
    .notification-modal .recipient-section,
    .notification-modal .notification-section {
      border-color: ${theme.border} !important;
    }
    .notification-modal button:focus-visible,
    .notification-modal input:focus-visible,
    .notification-modal textarea:focus-visible {
      outline: 2px solid ${theme.primary} !important;
      outline-offset: 2px;
    }
  `;
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [recipientType, setRecipientType] = useState<RecipientType>("EMPLOYEE");

  const [audience, setAudience] = useState<Audience>("ALL");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const fetchDirectory = useCallback(async (type: RecipientType) => {
    try {
      setDirectoryLoading(true);
      setError("");

      const response = await api.get("/notification/employee-directory", {
        params: { recipientType: type },
      });

      const list =
        response.data?.recipients ||
        (type === "EMPLOYEE"
          ? response.data?.employees
          : response.data?.clients) ||
        response.data?.data ||
        [];

      const formatted: Recipient[] = list
        .map((item: any) => ({
          id: String(item.id || item._id || ""),
          name: item.name || item.userName || "Unknown",
          designation: item.designation || undefined,
          organisation:
            item.organisation?.name ||
            item.organisationName ||
            item.organisation ||
            undefined,
        }))
        .filter((item: Recipient) => item.id);

      setRecipients(formatted);
    } catch (err: any) {
      console.error("RECIPIENT DIRECTORY ERROR:", err?.response?.data || err);

      setRecipients([]);
      setError(
        err?.response?.data?.message ||
          "Unable to load recipients. Please try again.",
      );
    } finally {
      setDirectoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    setTitle("");
    setMessage("");
    setRecipientType("EMPLOYEE");
    setAudience("ALL");
    setSelectedRecipients([]);
    setSearch("");
    setSelectedFilter("All");
    setError("");

    fetchDirectory("EMPLOYEE");
  }, [visible, fetchDirectory]);

  const filters = useMemo(() => {
    const values = recipients.map((item) =>
      recipientType === "EMPLOYEE"
        ? item.designation || "Unassigned"
        : item.organisation || "Unassigned Organisation",
    );

    return ["All", ...Array.from(new Set(values)).sort()];
  }, [recipients, recipientType]);

  const filteredRecipients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return recipients.filter((item) => {
      const searchableText = [
        item.name,
        item.designation || "",
        item.organisation || "",
      ]
        .join(" ")
        .toLowerCase();

      const group =
        recipientType === "EMPLOYEE"
          ? item.designation || "Unassigned"
          : item.organisation || "Unassigned Organisation";

      return (
        searchableText.includes(query) &&
        (selectedFilter === "All" || selectedFilter === group)
      );
    });
  }, [recipients, search, selectedFilter, recipientType]);

  const toggleRecipient = (id: string) => {
    setSelectedRecipients((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const selectAllVisible = () => {
    setSelectedRecipients((current) =>
      Array.from(
        new Set([...current, ...filteredRecipients.map((item) => item.id)]),
      ),
    );
  };

  const changeRecipientType = (type: RecipientType) => {
    if (type === recipientType) return;

    setRecipientType(type);
    setSelectedRecipients([]);
    setSearch("");
    setSelectedFilter("All");
    setError("");

    fetchDirectory(type);
  };

  const close = () => {
    if (!sending) onClose();
  };

  const recipientCount =
    audience === "ALL" ? recipients.length : selectedRecipients.length;

  const sendNotification = async () => {
    if (!title.trim()) {
      setError("Please enter a notification title.");
      return;
    }

    if (!message.trim()) {
      setError("Please enter a notification message.");
      return;
    }

    if (audience === "SELECTED" && selectedRecipients.length === 0) {
      setError(
        `Please select at least one ${
          recipientType === "EMPLOYEE" ? "employee" : "client"
        }.`,
      );
      return;
    }

    if (recipientCount === 0) {
      setError("No eligible recipients were found.");
      return;
    }

    const recipientLabel = recipientType === "EMPLOYEE" ? "employee" : "client";

    const confirmed = window.confirm(
      `You are about to send this notification to ${recipientCount} ${recipientLabel}${
        recipientCount !== 1 ? "s" : ""
      }.\n\nTitle: ${title.trim()}\n\nDo you want to continue?`,
    );

    if (!confirmed) return;

    try {
      setSending(true);
      setError("");

      const response = await api.post("/notification/employees", {
        title: title.trim(),
        message: message.trim(),
        audience,
        recipientType,
        employeeIds:
          recipientType === "EMPLOYEE" && audience === "SELECTED"
            ? selectedRecipients
            : [],
        clientIds:
          recipientType === "CLIENT" && audience === "SELECTED"
            ? selectedRecipients
            : [],
      });

      const sentCount = response.data?.recipientCount ?? recipientCount;

      window.alert(
        `Notification successfully sent to ${sentCount} ${recipientLabel}${
          sentCount !== 1 ? "s" : ""
        }.`,
      );

      onSent?.();
      onClose();
    } catch (err: any) {
      console.error("SEND NOTIFICATION ERROR:", err?.response?.data || err);

      setError(
        err?.response?.data?.message ||
          "Unable to send notification. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="notification-overlay"
      style={themeStyles}
      onMouseDown={close}
    >
      <style>{themedCss}</style>\n{" "}
      <div
        className="notification-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="notification-modal-header">
          <div>
            <h2>Send Notification</h2>
            <p>Choose who should receive this notification</p>
          </div>

          <button
            type="button"
            className="notification-close"
            onClick={close}
            disabled={sending}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="notification-modal-body">
          <div className="notification-field">
            <label htmlFor="notification-title">Notification Title</label>
            <input
              id="notification-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter notification title"
              maxLength={100}
            />
            <span className="notification-character-count">
              {title.length}/100
            </span>
          </div>

          <div className="notification-field">
            <label htmlFor="notification-message">Message</label>
            <textarea
              id="notification-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write your notification..."
              maxLength={500}
              rows={4}
            />
            <span className="notification-character-count">
              {message.length}/500
            </span>
          </div>

          <section className="notification-section">
            <h3>Send To</h3>

            <div className="notification-choice-grid">
              <button
                type="button"
                className={`notification-choice ${
                  recipientType === "EMPLOYEE" ? "active" : ""
                }`}
                onClick={() => changeRecipientType("EMPLOYEE")}
              >
                <span className="notification-choice-icon">♙</span>
                <span className="notification-choice-content">
                  <strong>Employees</strong>
                  <small>Notify company employees</small>
                </span>
                <span className="notification-radio">
                  {recipientType === "EMPLOYEE" ? "●" : "○"}
                </span>
              </button>

              <button
                type="button"
                className={`notification-choice ${
                  recipientType === "CLIENT" ? "active" : ""
                }`}
                onClick={() => changeRecipientType("CLIENT")}
              >
                <span className="notification-choice-icon">▦</span>
                <span className="notification-choice-content">
                  <strong>Clients</strong>
                  <small>Notify client users</small>
                </span>
                <span className="notification-radio">
                  {recipientType === "CLIENT" ? "●" : "○"}
                </span>
              </button>
            </div>
          </section>

          <section className="notification-section">
            <h3>Select Audience</h3>

            <div className="notification-choice-grid">
              <button
                type="button"
                className={`notification-choice ${
                  audience === "ALL" ? "active" : ""
                }`}
                onClick={() => setAudience("ALL")}
              >
                <span className="notification-choice-icon">♧</span>
                <span className="notification-choice-content">
                  <strong>
                    All {recipientType === "EMPLOYEE" ? "Employees" : "Clients"}
                  </strong>
                  <small>Send to all eligible recipients</small>
                </span>
                <span className="notification-radio">
                  {audience === "ALL" ? "●" : "○"}
                </span>
              </button>

              <button
                type="button"
                className={`notification-choice ${
                  audience === "SELECTED" ? "active" : ""
                }`}
                onClick={() => setAudience("SELECTED")}
              >
                <span className="notification-choice-icon">☷</span>
                <span className="notification-choice-content">
                  <strong>
                    Selected{" "}
                    {recipientType === "EMPLOYEE" ? "Employees" : "Clients"}
                  </strong>
                  <small>Choose specific recipients</small>
                </span>
                <span className="notification-radio">
                  {audience === "SELECTED" ? "●" : "○"}
                </span>
              </button>
            </div>
          </section>

          {audience === "SELECTED" && (
            <section className="notification-section recipient-section">
              <div className="recipient-section-heading">
                <h3>
                  Select{" "}
                  {recipientType === "EMPLOYEE" ? "Employees" : "Clients"}
                </h3>
                <span className="selected-recipient-count">
                  {selectedRecipients.length} selected
                </span>
              </div>

              <div className="recipient-search">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${
                    recipientType === "EMPLOYEE" ? "employees" : "clients"
                  }...`}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              <label className="recipient-filter-label">
                Filter by{" "}
                {recipientType === "EMPLOYEE" ? "designation" : "organisation"}
              </label>

              <div className="recipient-filter-list">
                {filters.map((filter) => (
                  <button
                    type="button"
                    key={filter}
                    className={selectedFilter === filter ? "active" : ""}
                    onClick={() => setSelectedFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="recipient-list-toolbar">
                <span>{filteredRecipients.length} found</span>

                <div>
                  <button type="button" onClick={selectAllVisible}>
                    Select visible
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRecipients([])}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="recipient-list">
                {directoryLoading ? (
                  <div className="recipient-state">Loading recipients...</div>
                ) : filteredRecipients.length === 0 ? (
                  <div className="recipient-state">No recipients found.</div>
                ) : (
                  filteredRecipients.map((item) => {
                    const selected = selectedRecipients.includes(item.id);

                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={`recipient-row ${selected ? "selected" : ""}`}
                        onClick={() => toggleRecipient(item.id)}
                      >
                        <span className="recipient-avatar">
                          {item.name.charAt(0).toUpperCase()}
                        </span>

                        <span className="recipient-details">
                          <strong>{item.name}</strong>
                          <small>
                            {recipientType === "EMPLOYEE"
                              ? item.designation || "Unassigned"
                              : item.organisation || "Client"}
                          </small>
                        </span>

                        <span className="recipient-checkbox">
                          {selected ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          )}

          <div className="notification-recipient-summary">
            <div className="notification-summary-icon">♧</div>
            <div>
              <strong>Notification Recipients</strong>
              <p>
                {recipientCount}{" "}
                {recipientType === "EMPLOYEE" ? "employee" : "client"}
                {recipientCount !== 1 ? "s" : ""} will receive this
                notification.
              </p>
            </div>
          </div>

          {error && (
            <div className="notification-error" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="notification-modal-footer">
          <button
            type="button"
            className="notification-cancel-button"
            onClick={close}
            disabled={sending}
          >
            Cancel
          </button>

          <button
            type="button"
            className="notification-send-button"
            onClick={sendNotification}
            disabled={sending || directoryLoading}
          >
            {sending ? "Sending..." : "➤  Send Notification"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendNotificationModal;
