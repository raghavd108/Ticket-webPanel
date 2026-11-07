import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { api } from "../context/AuthContext";
import { useAuth } from "../context/AuthContext";

type DayType = "HOLIDAY" | "WORKING_DAY";

interface CalendarEntry {
  id: string;
  date: string;
  type: DayType;
  name: string;
  description?: string | null;
  isCustom?: boolean;
  isDefaultHoliday?: boolean;
}

interface CalendarResponse {
  calendar?: CalendarEntry[];
  entries?: CalendarEntry[];
  message?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad = (value: number) => String(value).padStart(2, "0");

const dateKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};

const formatDate = (value: string) =>
  parseDate(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const CompanyCalendar = () => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();

  const role = String(user?.role || "")
    .toLowerCase()
    .trim();
  const designation = String(user?.designation || "")
    .toLowerCase()
    .trim();

  const canManageCalendar =
    role === "admin" ||
    (role === "employee" && ["ceo", "cto"].includes(designation));

  const today = useMemo(() => {
    const now = new Date();
    return dateKey(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);

  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState<DayType>("HOLIDAY");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<CalendarResponse>("/company-calendar", {
        params: {
          month: month + 1,
          year,
        },
      });

      setCalendar(response.data.calendar || []);
      setEntries(response.data.entries || []);

      setSelectedDate((current) => {
        if (current?.startsWith(`${year}-${pad(month + 1)}-`)) {
          return current;
        }
        return null;
      });
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const calendarByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry>();

    calendar.forEach((item) => map.set(item.date, item));

    return map;
  }, [calendar]);

  const selectedItem = selectedDate
    ? calendarByDate.get(selectedDate)
    : undefined;

  const selectedEntry = selectedDate
    ? entries.find((entry) => entry.date === selectedDate)
    : undefined;

  const stats = useMemo(() => {
    return {
      holidays: calendar.filter((item) => item.type === "HOLIDAY").length,
      workingOverrides: calendar.filter(
        (item) => item.isCustom && item.type === "WORKING_DAY",
      ).length,
    };
  }, [calendar]);

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const mondayOffset = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const result: Array<{ day: number; date: string } | null> =
      Array(mondayOffset).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      result.push({
        day,
        date: dateKey(year, month, day),
      });
    }

    while (result.length % 7 !== 0) {
      result.push(null);
    }

    return result;
  }, [year, month]);

  const changeMonth = (direction: number) => {
    const next = new Date(year, month + direction, 1);

    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelectedDate(null);
  };

  const openCreateModal = (date: string) => {
    if (!canManageCalendar) return;

    const existing = entries.find((entry) => entry.date === date);

    setEditingEntry(existing || null);
    setFormDate(date);
    setFormType(existing?.type || "HOLIDAY");
    setFormName(existing?.name || "");
    setFormDescription(existing?.description || "");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingEntry(null);
  };

  const saveEntry = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formDate || !formName.trim()) {
      window.alert("Please enter a date and name.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        date: formDate,
        type: formType,
        name: formName.trim(),
        description: formDescription.trim(),
      };

      if (editingEntry) {
        await api.patch(`/company-calendar/${editingEntry.id}`, payload);
      } else {
        await api.post("/company-calendar", payload);
      }

      setModalOpen(false);
      setEditingEntry(null);
      await loadCalendar();
    } catch (err: any) {
      window.alert(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async () => {
    if (!editingEntry) return;

    const confirmed = window.confirm(
      `Delete "${editingEntry.name}" on ${formatDate(editingEntry.date)}?`,
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await api.delete(`/company-calendar/${editingEntry.id}`);
      setModalOpen(false);
      setEditingEntry(null);
      await loadCalendar();
    } catch (err: any) {
      window.alert(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const selectedIsHoliday = selectedItem?.type === "HOLIDAY";

  return (
    <div
      className="company-calendar"
      style={
        {
          "--text": theme.text,
          "--muted": theme.muted,
          "--subtle": theme.primarySoft,
          "--surface": theme.white,
          "--border": theme.border,
          "--accent": theme.primary,
          "--holiday-bg": theme.dangerSoft,
          "--holiday-border": theme.danger,
          "--holiday-text": theme.danger,
          "--working-bg": theme.successSoft,
          "--working-border": theme.success,
          "--working-text": theme.success,
          "--button-bg": theme.primary,
          "--input-bg": theme.input,
        } as React.CSSProperties
      }
      data-theme={isDarkMode ? "dark" : "light"}
    >
      <style>{`
        .company-calendar {
          max-width: 1250px;
          margin: 0 auto;
          padding: 30px;
          color: var(--text, #171717);
        }

        .cc-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
        }

        .cc-header-icon {
          width: 52px;
          height: 52px;
          border-radius: 15px;
          background: var(--subtle, #f5f5f5);
          display: grid;
          place-items: center;
          font-size: 25px;
        }

        .cc-eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
          color: var(--muted, #737373);
          margin-bottom: 4px;
        }

        .cc-title {
          font-size: 26px;
          font-weight: 750;
          letter-spacing: -0.7px;
          margin: 0;
        }

        .cc-subtitle {
          color: var(--muted, #737373);
          font-size: 13px;
          margin: 6px 0 0;
        }

        .cc-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .cc-stat {
          padding: 19px;
          border: 1px solid var(--border, #e5e5e5);
          background: var(--surface, #fff);
          border-radius: 14px;
        }

        .cc-stat-label {
          color: var(--muted, #737373);
          font-size: 12px;
          font-weight: 550;
        }

        .cc-stat-value {
          font-size: 28px;
          font-weight: 750;
          margin-top: 7px;
        }

        .cc-card {
          border: 1px solid var(--border, #e5e5e5);
          background: var(--surface, #fff);
          border-radius: 17px;
          padding: 22px;
        }

        .cc-month-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .cc-month-name {
          text-align: center;
          font-size: 19px;
          font-weight: 750;
        }

        .cc-month-year {
          text-align: center;
          font-size: 12px;
          color: var(--muted, #737373);
          margin-top: 4px;
        }

        .cc-arrow {
          width: 38px;
          height: 38px;
          border: 1px solid var(--border, #e5e5e5);
          background: var(--surface, #fff);
          color: inherit;
          border-radius: 10px;
          cursor: pointer;
          font-size: 23px;
        }

        .cc-weekdays,
        .cc-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 7px;
        }

        .cc-weekdays {
          margin-bottom: 9px;
        }

        .cc-weekday {
          text-align: center;
          color: var(--muted, #737373);
          font-size: 11px;
          font-weight: 700;
          padding: 8px 0;
        }

        .cc-day {
          position: relative;
          min-width: 0;
          min-height: 72px;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 11px;
          background: var(--surface, #fff);
          color: inherit;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          cursor: pointer;
          transition: border-color .15s, background .15s;
        }

        .cc-day:hover {
          border-color: var(--accent, #737373);
        }

        .cc-day.empty {
          border-color: transparent;
          background: transparent;
          cursor: default;
        }

        .cc-day.holiday {
          background: var(--holiday-bg, #fff1f0);
          border-color: var(--holiday-border, #f5d0cc);
          color: var(--holiday-text, #c24135);
        }

        .cc-day.working {
          background: var(--working-bg, #edf8f0);
          border-color: var(--working-border, #c8e8d0);
          color: var(--working-text, #15803d);
        }

        .cc-day.selected {
          outline: 2px solid var(--accent, #525252);
          outline-offset: 1px;
        }

        .cc-day.today .cc-day-number {
          text-decoration: underline;
          text-underline-offset: 3px;
          font-weight: 850;
        }

        .cc-day-number {
          font-size: 14px;
          font-weight: 650;
        }

        .cc-day-label {
          font-size: 9px;
          font-weight: 650;
          max-width: 90%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .cc-today-dot {
          position: absolute;
          top: 7px;
          right: 8px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--muted, #737373);
        }

        .cc-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 17px;
          border-top: 1px solid var(--border, #e5e5e5);
          margin-top: 18px;
          padding-top: 15px;
        }

        .cc-legend-item {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--muted, #737373);
          font-size: 11px;
        }

        .cc-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .cc-details {
          margin-top: 17px;
          padding: 20px;
          border: 1px solid var(--border, #e5e5e5);
          background: var(--surface, #fff);
          border-radius: 15px;
        }

        .cc-detail-top {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .cc-date-box {
          width: 65px;
          height: 70px;
          flex-shrink: 0;
          border-radius: 12px;
          background: var(--subtle, #f5f5f5);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .cc-date-number {
          font-size: 27px;
          font-weight: 800;
        }

        .cc-date-month {
          font-size: 10px;
          color: var(--muted, #737373);
          font-weight: 750;
        }

        .cc-detail-title {
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 5px;
        }

        .cc-detail-muted {
          font-size: 12px;
          color: var(--muted, #737373);
        }

        .cc-pill {
          display: inline-block;
          padding: 5px 9px;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 750;
          margin-top: 8px;
        }

        .cc-description {
          font-size: 13px;
          line-height: 1.6;
          margin: 15px 0 0;
          color: var(--muted, #737373);
        }

        .cc-actions {
          display: flex;
          gap: 10px;
          margin-top: 17px;
        }

        .cc-button {
          padding: 11px 16px;
          border: none;
          border-radius: 9px;
          background: var(--button-bg, #171717);
          color: white;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
        }

        .cc-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .cc-button.secondary {
          color: var(--text, #404040);
          background: var(--subtle, #f5f5f5);
          border: 1px solid var(--border, #e5e5e5);
        }

        .cc-button.danger {
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .cc-footer {
          text-align: center;
          color: var(--muted, #737373);
          font-size: 11px;
          margin: 20px 0 5px;
        }

        .cc-empty,
        .cc-loading,
        .cc-error {
          text-align: center;
          padding: 45px 15px;
          color: var(--muted, #737373);
          font-size: 13px;
        }

        .cc-empty strong {
          display: block;
          color: var(--text, #262626);
          font-size: 15px;
          margin-bottom: 7px;
        }

        .cc-add {
          margin-top: 17px;
        }

        .cc-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, .45);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .cc-modal {
          width: 100%;
          max-width: 490px;
          max-height: 90vh;
          overflow-y: auto;
          background: var(--surface, #fff);
          color: var(--text, #171717);
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 17px;
          padding: 25px;
          box-shadow: 0 20px 60px rgba(0,0,0,.18);
        }

        .cc-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 22px;
          gap: 15px;
        }

        .cc-modal-title {
          font-size: 19px;
          font-weight: 750;
          margin: 0 0 6px;
        }

        .cc-close {
          border: none;
          background: transparent;
          color: inherit;
          font-size: 25px;
          cursor: pointer;
        }

        .cc-field {
          margin-bottom: 17px;
        }

        .cc-field label {
          display: block;
          font-size: 12px;
          font-weight: 650;
          margin-bottom: 8px;
        }

        .cc-field input,
        .cc-field textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 12px;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 9px;
          background: var(--input-bg, var(--surface, #fff));
          color: inherit;
          font: inherit;
          font-size: 13px;
          outline: none;
        }

        .cc-field input:focus,
        .cc-field textarea:focus {
          border-color: var(--accent, #737373);
        }

        .cc-field textarea {
          resize: vertical;
          min-height: 85px;
        }

        .cc-type-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .cc-type-option {
          text-align: left;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 10px;
          background: var(--surface, #fff);
          color: inherit;
          padding: 13px;
          cursor: pointer;
        }

        .cc-type-option.active-holiday {
          background: var(--holiday-bg, #fff1f0);
          border-color: var(--holiday-border, #f5d0cc);
          color: var(--holiday-text, #c24135);
        }

        .cc-type-option.active-working {
          background: var(--working-bg, #edf8f0);
          border-color: var(--working-border, #c8e8d0);
          color: var(--working-text, #15803d);
        }

        .cc-type-option strong {
          display: block;
          font-size: 12px;
        }

        .cc-type-option span {
          display: block;
          font-size: 10px;
          margin-top: 5px;
          opacity: .75;
        }

        .cc-modal-actions {
          display: flex;
          gap: 9px;
          margin-top: 22px;
        }

        .cc-modal-actions .cc-button {
          flex: 1;
        }

        @media (max-width: 700px) {
          .company-calendar {
            padding: 20px 14px;
          }

          .cc-card {
            padding: 12px;
          }

          .cc-day {
            min-height: 58px;
            border-radius: 8px;
          }

          .cc-day-label {
            font-size: 8px;
          }

          .cc-weekdays,
          .cc-grid {
            gap: 4px;
          }

          .cc-title {
            font-size: 22px;
          }
        }

        @media (max-width: 420px) {
          .cc-day {
            min-height: 49px;
          }

          .cc-day-label {
            display: none;
          }

          .cc-stat {
            padding: 14px;
          }

          .cc-stat-value {
            font-size: 24px;
          }
        }
      `}</style>

      {/* Header */}
      <header className="cc-header">
        <div className="cc-header-icon">✦</div>
        <div>
          <div className="cc-eyebrow">SP INFOCOM</div>
          <h1 className="cc-title">Company Calendar</h1>
          <p className="cc-subtitle">Company holidays and working days</p>
        </div>
      </header>

      {/* Statistics */}
      <div className="cc-stats">
        <div className="cc-stat">
          <div className="cc-stat-label">Holidays this month</div>
          <div className="cc-stat-value">{stats.holidays}</div>
        </div>

        <div className="cc-stat">
          <div className="cc-stat-label">Custom working days</div>
          <div className="cc-stat-value" style={{ color: theme.success }}>
            {stats.workingOverrides}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <section className="cc-card">
        <div className="cc-month-header">
          <button
            className="cc-arrow"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            ‹
          </button>

          <div>
            <div className="cc-month-name">{MONTHS[month]}</div>
            <div className="cc-month-year">{year}</div>
          </div>

          <button
            className="cc-arrow"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="cc-weekdays">
          {WEEKDAYS.map((day) => (
            <div className="cc-weekday" key={day}>
              {day}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="cc-loading">Loading calendar...</div>
        ) : error ? (
          <div className="cc-error">
            <strong>Calendar unavailable</strong>
            <p>{error}</p>
            <button className="cc-button" onClick={loadCalendar}>
              Try again
            </button>
          </div>
        ) : (
          <div className="cc-grid">
            {cells.map((cell, index) => {
              if (!cell) {
                return <div className="cc-day empty" key={`empty-${index}`} />;
              }

              const item = calendarByDate.get(cell.date);
              const isHoliday = item?.type === "HOLIDAY";
              const isWorking = item?.type === "WORKING_DAY" && item?.isCustom;

              const classes = [
                "cc-day",
                isHoliday ? "holiday" : "",
                isWorking ? "working" : "",
                selectedDate === cell.date ? "selected" : "",
                today === cell.date ? "today" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={cell.date}
                  className={classes}
                  onClick={() => setSelectedDate(cell.date)}
                  onDoubleClick={() =>
                    canManageCalendar && openCreateModal(cell.date)
                  }
                  title={
                    item ? `${item.name} — ${item.type}` : formatDate(cell.date)
                  }
                >
                  {today === cell.date && <span className="cc-today-dot" />}

                  <span className="cc-day-number">{cell.day}</span>

                  {item?.isCustom && (
                    <span className="cc-day-label">{item.name}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="cc-legend">
          <div className="cc-legend-item">
            <span
              className="cc-legend-dot"
              style={{ background: theme.danger }}
            />
            Holiday
          </div>

          <div className="cc-legend-item">
            <span
              className="cc-legend-dot"
              style={{ background: theme.success }}
            />
            Working override
          </div>

          <div className="cc-legend-item">
            <span
              className="cc-legend-dot"
              style={{ background: theme.muted }}
            />
            Today
          </div>
        </div>
      </section>

      {/* Selected date details */}
      {!loading && !error && (
        <section className="cc-details">
          {!selectedDate ? (
            <div className="cc-empty">
              <strong>Choose a date</strong>
              Select a day to see its holiday or working-day details.
            </div>
          ) : (
            <>
              <div className="cc-detail-top">
                <div className="cc-date-box">
                  <div className="cc-date-number">
                    {parseDate(selectedDate).getDate()}
                  </div>
                  <div className="cc-date-month">
                    {MONTHS[month].slice(0, 3).toUpperCase()}
                  </div>
                </div>

                <div>
                  <h3 className="cc-detail-title">
                    {selectedItem?.name || "Regular working day"}
                  </h3>

                  <div className="cc-detail-muted">
                    {formatDate(selectedDate)}
                  </div>

                  <span
                    className="cc-pill"
                    style={{
                      color: selectedIsHoliday ? theme.danger : theme.success,
                      background: selectedIsHoliday
                        ? theme.dangerSoft
                        : theme.successSoft,
                    }}
                  >
                    {selectedIsHoliday ? "Holiday" : "Working day"}
                  </span>
                </div>
              </div>

              {selectedItem?.description && (
                <p className="cc-description">{selectedItem.description}</p>
              )}

              {selectedItem?.isDefaultHoliday && (
                <p className="cc-description">
                  This is a default weekend holiday. Add a working-day override
                  if SP Infocom needs to operate on this date.
                </p>
              )}

              {canManageCalendar && (
                <div className="cc-actions">
                  <button
                    className="cc-button secondary"
                    onClick={() => openCreateModal(selectedDate)}
                  >
                    {selectedEntry ? "Edit entry" : "Set date"}
                  </button>
                </div>
              )}

              {!canManageCalendar && !selectedItem?.isCustom && (
                <p className="cc-description">
                  {selectedItem?.isDefaultHoliday
                    ? "Regular company weekend holiday."
                    : "No custom calendar entry for this date."}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {/* Add button */}
      {canManageCalendar && !loading && !error && (
        <button
          className="cc-button cc-add"
          onClick={() =>
            openCreateModal(selectedDate || dateKey(year, month, 1))
          }
        >
          + Add holiday / working day
        </button>
      )}

      <p className="cc-footer">
        Company-wide calendar for SP Infocom. Client organisations do not have
        separate holiday schedules.
      </p>

      {/* Create / Edit modal */}
      {modalOpen && (
        <div
          className="cc-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <form className="cc-modal" onSubmit={saveEntry}>
            <div className="cc-modal-header">
              <div>
                <h2 className="cc-modal-title">
                  {editingEntry ? "Edit calendar entry" : "Add calendar entry"}
                </h2>
                <div className="cc-detail-muted">
                  Configure a company holiday or working day.
                </div>
              </div>

              <button
                type="button"
                className="cc-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <div className="cc-field">
              <label htmlFor="calendar-date">Date</label>
              <input
                id="calendar-date"
                type="date"
                value={formDate}
                onChange={(event) => setFormDate(event.target.value)}
                required
              />
            </div>

            <div className="cc-field">
              <label>Day type</label>

              <div className="cc-type-options">
                <button
                  type="button"
                  className={`cc-type-option ${
                    formType === "HOLIDAY" ? "active-holiday" : ""
                  }`}
                  onClick={() => setFormType("HOLIDAY")}
                >
                  <strong>Holiday</strong>
                  <span>Block attendance</span>
                </button>

                <button
                  type="button"
                  className={`cc-type-option ${
                    formType === "WORKING_DAY" ? "active-working" : ""
                  }`}
                  onClick={() => setFormType("WORKING_DAY")}
                >
                  <strong>Working day</strong>
                  <span>Override weekend rule</span>
                </button>
              </div>
            </div>

            <div className="cc-field">
              <label htmlFor="calendar-name">Name</label>
              <input
                id="calendar-name"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                placeholder={
                  formType === "HOLIDAY"
                    ? "e.g. Diwali Holiday"
                    : "e.g. Special Sunday Working"
                }
                maxLength={191}
                required
              />
            </div>

            <div className="cc-field">
              <label htmlFor="calendar-description">
                Description (optional)
              </label>
              <textarea
                id="calendar-description"
                value={formDescription}
                onChange={(event) => setFormDescription(event.target.value)}
                placeholder="Add a short note..."
              />
            </div>

            <div className="cc-modal-actions">
              <button
                type="button"
                className="cc-button secondary"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              {editingEntry && (
                <button
                  type="button"
                  className="cc-button danger"
                  onClick={deleteEntry}
                  disabled={saving}
                >
                  Delete
                </button>
              )}

              <button type="submit" className="cc-button" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingEntry
                    ? "Save changes"
                    : "Create entry"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CompanyCalendar;
