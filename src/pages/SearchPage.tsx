import { useCallback, useRef, useState, type CSSProperties } from "react";
import { api } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

interface Organisation {
  _id: string;
  name: string;
  orgType?: string;
}

interface User {
  _id: string;
  userName: string;
  email?: string;
}

interface Complaint {
  _id: string;
  module: string;
  problem: string;
  status: string;
  statusName?: string | null;
  createdAt?: string;
  organisation?: Organisation | null;
  user?: User | null;
}

interface Pagination {
  currentPage: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const PAGE_SIZE = 10;

const getStatusColor = (
  status: string,
  colors: { success: string; warning: string; danger: string; muted: string },
) => {
  switch (status?.toLowerCase()) {
    case "resolved":
      return colors.success;
    case "in-progress":
      return colors.warning;
    case "pending":
      return colors.danger;
    default:
      return colors.muted;
  }
};

const getStatusName = (status: string) => {
  switch (status?.toLowerCase()) {
    case "in-progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    case "pending":
      return "Pending";
    default:
      return status || "Unknown";
  }
};

const SearchPage = () => {
  const { theme } = useTheme();

  const pageStyle = {
    "--search-bg": theme.background,
    "--search-surface": theme.white,
    "--search-input": theme.input,
    "--search-text": theme.text,
    "--search-muted": theme.muted,
    "--search-light": theme.light,
    "--search-primary": theme.primary,
    "--search-primary-soft": theme.primarySoft,
    "--search-border": theme.border,
    "--search-divider": theme.divider,
    "--search-success": theme.success,
    "--search-warning": theme.warning,
    "--search-danger": theme.danger,
  } as CSSProperties;

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const currentPageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);

  const fetchResults = async (
    page: number,
    query: string,
    append = false,
    requestId?: number,
  ) => {
    try {
      if (append) {
        if (loadingMoreRef.current || !hasMoreRef.current) return;

        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError("");
      }

      const response = await api.get("/complain/search", {
        params: {
          q: query,
          page,
          limit: PAGE_SIZE,
        },
      });

      if (requestId !== undefined && requestId !== requestIdRef.current) {
        return;
      }

      const complaints: Complaint[] =
        response.data?.complaint ?? response.data?.complains ?? [];

      const pagination: Pagination | undefined = response.data?.pagination;

      if (append) {
        setResults((previous) => {
          const existingIds = new Set(previous.map((item) => item._id));

          return [
            ...previous,
            ...complaints.filter((item) => !existingIds.has(item._id)),
          ];
        });
      } else {
        setResults(complaints);
      }

      const nextPageAvailable =
        pagination?.hasNextPage ?? complaints.length === PAGE_SIZE;

      hasMoreRef.current = nextPageAvailable;
      setHasMore(nextPageAvailable);
      currentPageRef.current = page;

      setTotalRecords(
        pagination?.totalRecords ??
          (append ? results.length + complaints.length : complaints.length),
      );

      setSearched(true);
    } catch (err: any) {
      if (requestId !== undefined && requestId !== requestIdRef.current) {
        return;
      }

      console.error("SEARCH ERROR:", err.response?.data || err.message);

      if (!append) {
        setResults([]);
        setTotalRecords(0);
        setSearched(true);
      }

      setError(
        err.response?.data?.message ||
          "Unable to search tickets. Please try again.",
      );
    } finally {
      if (append) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const onSearch = async () => {
    const query = search.trim();

    if (!query) {
      requestIdRef.current += 1;
      setResults([]);
      setSearched(false);
      setTotalRecords(0);
      setHasMore(false);
      hasMoreRef.current = false;
      return;
    }

    const requestId = ++requestIdRef.current;

    currentPageRef.current = 1;
    hasMoreRef.current = false;
    loadingMoreRef.current = false;

    setHasMore(false);
    setLoadingMore(false);
    setResults([]);
    setTotalRecords(0);
    setSearched(false);

    await fetchResults(1, query, false, requestId);
  };

  const loadMore = useCallback(() => {
    const query = search.trim();

    if (!query || loading || loadingMoreRef.current || !hasMoreRef.current) {
      return;
    }

    fetchResults(currentPageRef.current + 1, query, true, requestIdRef.current);
  }, [search, loading]);

  const clearSearch = () => {
    requestIdRef.current += 1;

    setSearch("");
    setResults([]);
    setSearched(false);
    setError("");
    setTotalRecords(0);
    setHasMore(false);

    currentPageRef.current = 1;
    hasMoreRef.current = false;
    loadingMoreRef.current = false;
    setLoading(false);
    setLoadingMore(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      onSearch();
    }
  };

  return (
    <div className="search-page" style={pageStyle}>
      <style>{`
        .search-page {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px;
          color: var(--search-text);
        }

        .search-heading {
          margin: 0;
          color: var(--search-text);
          font-size: 27px;
          font-weight: 700;
          letter-spacing: -0.7px;
        }

        .search-subtitle {
          color: var(--search-muted);
          font-size: 14px;
          margin: 8px 0 26px;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          background: var(--search-surface);
          border: 1px solid var(--search-border);
          border-radius: 14px;
          max-width: 720px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.025);
          transition: border-color .2s, box-shadow .2s;
        }

        .search-bar:focus-within {
          border-color: var(--search-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--search-primary) 13%, transparent);
        }

        .search-input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: var(--search-text);
          font-size: 14px;
          padding: 10px;
        }

        .search-input::placeholder { color: var(--search-muted); }

        .clear-btn {
          border: none;
          background: transparent;
          color: var(--search-muted);
          cursor: pointer;
          font-size: 20px;
          padding: 5px 9px;
          border-radius: 8px;
        }
        .clear-btn:hover { background: var(--search-bg); color: var(--search-text); }

        .search-btn {
          border: none;
          border-radius: 10px;
          background: var(--search-primary);
          color: #fff;
          padding: 11px 22px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
          transition: opacity .2s, transform .2s;
        }
        .search-btn:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
        .search-btn:disabled { opacity: .55; cursor: not-allowed; }

        .result-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 27px 0 15px;
          font-size: 13px;
          color: var(--search-muted);
        }

        .result-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .result-card {
          background: var(--search-surface);
          border: 1px solid var(--search-border);
          border-radius: 16px;
          padding: 20px;
          transition: border-color .2s, transform .2s, box-shadow .2s;
        }
        .result-card:hover {
          border-color: var(--search-primary);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,.045);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .organisation-name {
          color: var(--search-text);
          font-size: 15px;
          font-weight: 650;
          margin: 0;
          overflow-wrap: anywhere;
        }

        .organisation-type {
          font-size: 12px;
          color: var(--search-muted);
          margin-top: 5px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 650;
        }

        .problem-text {
          font-size: 13px;
          line-height: 1.7;
          color: var(--search-text);
          opacity: .82;
          margin: 19px 0;
          overflow-wrap: anywhere;
        }

        .card-divider {
          height: 1px;
          background: var(--search-divider);
          margin-bottom: 14px;
        }

        .card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 20px;
          font-size: 12px;
          color: var(--search-muted);
        }

        .card-meta strong {
          color: var(--search-text);
          font-weight: 600;
        }

        .card-date {
          margin-top: 14px;
          font-size: 11px;
          color: var(--search-muted);
        }

        .empty-state {
          padding: 65px 20px;
          text-align: center;
          color: var(--search-muted);
          background: var(--search-surface);
          border: 1px dashed var(--search-border);
          border-radius: 16px;
          margin-top: 22px;
        }

        .empty-icon {
          width: 54px;
          height: 54px;
          margin: 0 auto 17px;
          border-radius: 15px;
          background: var(--search-primary-soft);
          color: var(--search-primary);
          display: grid;
          place-items: center;
          font-size: 26px;
        }

        .empty-title {
          color: var(--search-text);
          font-size: 16px;
          font-weight: 650;
          margin: 0 0 8px;
        }

        .empty-description {
          font-size: 13px;
          line-height: 1.6;
          max-width: 380px;
          margin: 0 auto;
        }

        .load-more-wrap {
          display: flex;
          justify-content: center;
          padding: 25px 0;
        }

        .load-more-btn {
          border: 1px solid var(--search-border);
          background: var(--search-surface);
          color: var(--search-text);
          padding: 11px 24px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color .2s, background .2s;
        }
        .load-more-btn:hover:not(:disabled) {
          border-color: var(--search-primary);
          background: var(--search-primary-soft);
        }
        .load-more-btn:disabled { opacity: .6; cursor: wait; }

        .search-error {
          color: var(--search-danger);
          font-size: 13px;
          margin-top: 12px;
        }

        .search-loader {
          text-align: center;
          padding: 35px;
          color: var(--search-muted);
          font-size: 13px;
        }

        @media (max-width: 760px) {
          .search-page { padding: 22px 16px; }
          .result-grid { grid-template-columns: 1fr; }
          .search-heading { font-size: 23px; }
        }

        @media (max-width: 440px) {
          .search-bar { gap: 3px; }
          .search-btn { padding: 10px 14px; }
          .result-card { padding: 16px; }
          .card-header { flex-direction: column; }
        }
      `}</style>

      <h1 className="search-heading">Search Tickets</h1>

      <p className="search-subtitle">
        Search complaints by organisation, module, problem or client.
      </p>

      <div className="search-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search tickets..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        {search.length > 0 && (
          <button
            type="button"
            className="clear-btn"
            onClick={clearSearch}
            title="Clear search"
          >
            ×
          </button>
        )}

        <button
          type="button"
          className="search-btn"
          onClick={onSearch}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <p className="search-error">{error}</p>}

      {searched && !loading && (
        <div className="result-info">
          <span>
            {totalRecords}{" "}
            {totalRecords === 1 ? "result found" : "results found"}
          </span>
        </div>
      )}

      {loading ? (
        <div className="search-loader">Searching tickets...</div>
      ) : results.length > 0 ? (
        <>
          <div className="result-grid">
            {results.map((item) => {
              const statusColor = getStatusColor(item.status, {
                success: theme.success,
                warning: theme.warning,
                danger: theme.danger,
                muted: theme.muted,
              });

              return (
                <article className="result-card" key={item._id}>
                  <div className="card-header">
                    <div>
                      <h3 className="organisation-name">
                        {item.organisation?.name || "Unknown Organisation"}
                      </h3>

                      {item.organisation?.orgType && (
                        <div className="organisation-type">
                          {item.organisation.orgType}
                        </div>
                      )}
                    </div>

                    <span
                      className="status-badge"
                      style={{
                        color: statusColor,
                        backgroundColor: `${statusColor}18`,
                      }}
                    >
                      {item.statusName || getStatusName(item.status)}
                    </span>
                  </div>

                  <p className="problem-text">
                    {item.problem || "No description available"}
                  </p>

                  <div className="card-divider" />

                  <div className="card-meta">
                    <span>
                      Module: <strong>{item.module || "N/A"}</strong>
                    </span>

                    {item.user?.userName && (
                      <span>
                        Client: <strong>{item.user.userName}</strong>
                      </span>
                    )}
                  </div>

                  {item.createdAt && (
                    <div className="card-date">
                      Created: {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {hasMore && (
            <div className="load-more-wrap">
              <button
                type="button"
                className="load-more-btn"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More Tickets"}
              </button>
            </div>
          )}

          {!hasMore && <div className="search-loader">All results loaded</div>}
        </>
      ) : searched && !error ? (
        <div className="empty-state">
          <div className="empty-icon">⌕</div>
          <h3 className="empty-title">No tickets found</h3>
          <p className="empty-description">
            No matching tickets were found for "{search}". Try a different
            search term.
          </p>
        </div>
      ) : !searched ? (
        <div className="empty-state">
          <div className="empty-icon">⌕</div>
          <h3 className="empty-title">Search your tickets</h3>
          <p className="empty-description">
            Enter an organisation, module, client name or problem description to
            find matching tickets.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default SearchPage;
