import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../context/AuthContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "../styles/OfferPage.css";

type OfferStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type OfferAudience =
  | "ALL_CLIENTS"
  | "ORGANISATION_CATEGORIES"
  | "SELECTED_ORGANISATIONS";

interface OfferImage {
  id?: string;
  fileName: string;
  url?: string;
}

interface Organisation {
  id: string;
  name: string;
  orgType?: string;
}

interface Offer {
  id: string;
  title: string;
  description?: string;
  status: OfferStatus;
  audience: OfferAudience;
  expiresAt?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  images: OfferImage[];
  categories?: string[];
  organisations?: Organisation[];
}

interface OfferForm {
  title: string;
  description: string;
  audience: OfferAudience;
  expiresAt: string;
  images: string[];
  categories: string[];
  organisationIds: string[];
}

interface UploadedImage {
  fileName: string;
  url?: string;
}

const EMPTY_FORM: OfferForm = {
  title: "",
  description: "",
  audience: "ALL_CLIENTS",
  expiresAt: "",
  images: [],
  categories: [],
  organisationIds: [],
};

const MAX_IMAGES = 5;

const formatDate = (value?: string | null) => {
  if (!value) return "No expiry";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No expiry";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getOfferId = (offer: any) => String(offer?.id || offer?._id || "");

const getImageUrl = (image?: OfferImage) => image?.url || "";

const OfferPage = () => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();

  const currentUser = user as any;

  const offerThemeStyles = `
    .offer-page {
      background: ${theme.background};
      color: ${theme.text};
      min-height: 100%;
      color-scheme: ${isDarkMode ? "dark" : "light"};
    }
    .offer-page .offer-header h1,
    .offer-page .offer-card-heading h3,
    .offer-page .offer-modal-header h2,
    .offer-page .offer-preview-title,
    .offer-page .offer-empty h2,
    .offer-page .offer-stat strong,
    .offer-page .offer-form-section label,
    .offer-page .offer-label-row strong,
    .offer-page .offer-organisation-option strong,
    .offer-page .offer-audience-option strong {
      color: ${theme.ink};
    }
    .offer-page .offer-header p,
    .offer-page .offer-modal-header p,
    .offer-page .offer-stat span,
    .offer-page .offer-empty p,
    .offer-page .offer-muted,
    .offer-page .offer-form-section small,
    .offer-page .offer-audience-option small,
    .offer-page .offer-organisation-option small,
    .offer-page .offer-preview-info small,
    .offer-page .offer-card-footer small {
      color: ${theme.muted};
    }
    .offer-page .offer-stat,
    .offer-page .offer-card,
    .offer-page .offer-toolbar,
    .offer-page .offer-modal,
    .offer-page .offer-search,
    .offer-page .offer-organisation-list,
    .offer-page .offer-upload-box,
    .offer-page .offer-audience-option,
    .offer-page .offer-organisation-option,
    .offer-page .offer-preview-info > div {
      background: ${theme.white};
      border-color: ${theme.border};
      color: ${theme.text};
    }
    .offer-page .offer-tabs {
      background: ${theme.primarySoft};
      border-color: ${theme.border};
    }
    .offer-page .offer-tabs button {
      color: ${theme.muted};
    }
    .offer-page .offer-tabs button.active,
    .offer-page .offer-audience-option.selected,
    .offer-page .offer-category-list button.selected {
      background: ${theme.primarySoft};
      color: ${theme.primaryDark};
      border-color: ${theme.primary};
    }
    .offer-page input,
    .offer-page textarea,
    .offer-page select,
    .offer-page .offer-input,
    .offer-page .offer-search input {
      background: ${theme.input};
      color: ${theme.text};
      border-color: ${theme.border};
    }
    .offer-page input::placeholder,
    .offer-page textarea::placeholder,
    .offer-page .offer-search input::placeholder {
      color: ${theme.muted};
      opacity: .8;
    }
    .offer-page .offer-secondary-button,
    .offer-page .offer-refresh,
    .offer-page .offer-text-button,
    .offer-page .offer-close,
    .offer-page .offer-category-list button {
      background: ${theme.white};
      color: ${theme.ink};
      border-color: ${theme.border};
    }
    .offer-page .offer-primary-button {
      background: ${theme.primary};
      color: #FFFFFF;
      border-color: ${theme.primary};
    }
    .offer-page .offer-primary-button:hover {
      background: ${theme.primaryDark};
    }
    .offer-page .offer-danger-button {
      background: ${theme.dangerSoft};
      color: ${theme.danger};
      border-color: ${theme.border};
    }
    .offer-page .offer-error {
      background: ${theme.dangerSoft};
      color: ${theme.danger};
      border-color: ${theme.border};
    }
    .offer-page .offer-modal-overlay {
      background: ${isDarkMode ? "rgba(0,0,0,.72)" : "rgba(25,25,20,.48)"};
    }
    .offer-page .offer-cover-placeholder,
    .offer-page .offer-image-placeholder,
    .offer-page .offer-empty-icon {
      background: ${theme.primarySoft};
      color: ${theme.primary};
    }
    .offer-page .offer-card-footer,
    .offer-page .offer-preview-info {
      border-color: ${theme.divider};
    }
    .offer-page .offer-card-heading > span,
    .offer-page .offer-image-count {
      color: ${theme.muted};
    }
    .offer-page .offer-description,
    .offer-page .offer-preview-description {
      color: ${theme.text};
    }
    .offer-page .offer-organisation-option:hover,
    .offer-page .offer-category-list button:hover,
    .offer-page .offer-secondary-button:hover,
    .offer-page .offer-refresh:hover {
      background: ${theme.primarySoft};
    }
    .offer-page .offer-uploaded-image {
      border-color: ${theme.border};
    }
    .offer-page .offer-uploaded-image button {
      background: ${theme.danger};
      color: #FFFFFF;
    }
    .offer-page .offer-status.draft {
      background: ${theme.warningSoft};
      color: ${theme.warning};
    }
    .offer-page .offer-status.published {
      background: ${theme.successSoft};
      color: ${theme.success};
    }
    .offer-page .offer-status.archived {
      background: ${theme.primarySoft};
      color: ${theme.muted};
    }
    .offer-page button:disabled {
      opacity: .55;
      cursor: not-allowed;
    }
    .offer-page button:focus-visible,
    .offer-page input:focus-visible,
    .offer-page textarea:focus-visible {
      outline: 2px solid ${theme.primary};
      outline-offset: 2px;
    }

    .offer-page {
      --offer-bg: ${theme.background};
      --offer-surface: ${theme.white};
      --offer-text: ${theme.text};
      --offer-heading: ${theme.ink};
      --offer-muted: ${theme.muted};
      --offer-border: ${theme.border};
      --offer-primary: ${theme.primary};
      --offer-primary-soft: ${theme.primarySoft};
      isolation: isolate;
    }
    .offer-page *,
    .offer-page *::before,
    .offer-page *::after {
      box-sizing: border-box;
    }
    .offer-page .offer-card,
    .offer-page .offer-stat,
    .offer-page .offer-toolbar,
    .offer-page .offer-modal,
    .offer-page .offer-search,
    .offer-page .offer-organisation-list,
    .offer-page .offer-preview-info > div {
      box-shadow: ${isDarkMode ? "0 8px 24px rgba(0,0,0,.18)" : "0 8px 24px rgba(36,39,32,.045)"};
    }
    .offer-page .offer-modal-body {
      color: ${theme.text};
      scrollbar-color: ${theme.muted} ${theme.white};
    }
    .offer-page .offer-form-section,
    .offer-page .offer-label-row,
    .offer-page .offer-card-content,
    .offer-page .offer-preview-info {
      color: ${theme.text};
    }
    .offer-page .offer-form-section label,
    .offer-page .offer-label-row label {
      color: ${theme.ink};
    }
    .offer-page input[type="checkbox"],
    .offer-page input[type="radio"] {
      accent-color: ${theme.primary};
    }
    .offer-page input[type="date"] {
      color-scheme: ${isDarkMode ? "dark" : "light"};
    }
    .offer-page .offer-category-list button,
    .offer-page .offer-audience-option,
    .offer-page .offer-organisation-option,
    .offer-page .offer-secondary-button,
    .offer-page .offer-refresh,
    .offer-page .offer-close,
    .offer-page .offer-text-button {
      transition: background-color .18s ease, border-color .18s ease, color .18s ease;
    }
    .offer-page .offer-tabs button.active {
      color: ${theme.primaryDark};
    }
    .offer-page .offer-empty {
      background: ${theme.white};
      color: ${theme.text};
      border: 1px solid ${theme.border};
    }

    .offer-page .offer-empty h2 {
      color: ${theme.ink};
    }

    .offer-page .offer-empty p {
      color: ${theme.muted};
    }

    .offer-page .offer-empty .offer-empty-icon {
      background: ${theme.primarySoft};
      color: ${theme.primary};
    }
    .offer-page .offer-uploading {
      color: ${theme.primary};
    }
    .offer-page .offer-error button {
      color: ${theme.danger};
    }
    .offer-page .offer-search:focus-within,
    .offer-page .offer-form-section input:focus,
    .offer-page .offer-form-section textarea:focus,
    .offer-page .offer-form-section select:focus {
      border-color: ${theme.primary};
    }
    .offer-page .offer-upload-box:hover {
      border-color: ${theme.primary};
      background: ${theme.primarySoft};
    }
    .offer-page .offer-image-placeholder,
    .offer-page .offer-cover-placeholder {
      color: ${theme.primary};
    }
    .offer-page .offer-modal-header,
    .offer-page .offer-modal-footer {
      border-color: ${theme.divider};
    }
    .offer-page .offer-modal-header,
    .offer-page .offer-modal-footer {
      background: ${theme.white};
    }
    .offer-page .offer-preview-info strong,
    .offer-page .offer-card-footer strong {
      color: ${theme.ink};
    }
    .offer-page .offer-card-cover img,
    .offer-page .offer-uploaded-image img,
    .offer-page .offer-preview-images img {
      background: ${theme.input};
    }
    @media (prefers-reduced-motion: reduce) {
      .offer-page *,
      .offer-page *::before,
      .offer-page *::after {
        transition-duration: .01ms !important;
        animation-duration: .01ms !important;
      }
    }
  `;

  const canManageOffers =
    currentUser?.isSuperAdmin === true ||
    currentUser?.permissions?.canPublishOffers === true ||
    currentUser?.designationRef?.canPublishOffers === true ||
    currentUser?.canPublishOffers === true;

  const [activeTab, setActiveTab] = useState<OfferStatus>("DRAFT");

  const [offers, setOffers] = useState<Offer[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const [form, setForm] = useState<OfferForm>(EMPTY_FORM);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [categoryInput, setCategoryInput] = useState("");

  const [organisationSearch, setOrganisationSearch] = useState("");

  // --------------------------------------------------
  // FETCH OFFERS
  // --------------------------------------------------

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/offers/admin", {
        params: { status: activeTab },
      });

      const data = response.data;

      const list = Array.isArray(data)
        ? data
        : data?.offers || data?.data || [];

      setOffers(
        list.map((item: any) => ({
          ...item,
          id: getOfferId(item),
          images: item.images || [],
          organisations: item.organisations || [],
          categories: item.categories || [],
        })),
      );
    } catch (err: any) {
      console.error("FETCH OFFERS ERROR:", err);
      setError(err?.response?.data?.message || "Unable to load offers.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // --------------------------------------------------
  // FETCH ORGANISATIONS
  // --------------------------------------------------

  const fetchOrganisations = useCallback(async () => {
    try {
      const response = await api.get("/org/get-org");

      const list =
        response.data?.org ||
        response.data?.organisations ||
        response.data?.data ||
        [];

      setOrganisations(
        Array.isArray(list)
          ? list
              .map((item: any) => ({
                id: String(item.id || item._id || ""),
                name: item.name || "Unnamed organisation",
                orgType: item.orgType || "",
              }))
              .filter((item: Organisation) => item.id)
          : [],
      );
    } catch (err) {
      console.error("FETCH ORGANISATIONS ERROR:", err);
    }
  }, []);

  useEffect(() => {
    if (canManageOffers) {
      fetchOffers();
      fetchOrganisations();
    } else {
      setLoading(false);
    }
  }, [canManageOffers, fetchOffers, fetchOrganisations]);

  // --------------------------------------------------
  // FORM HELPERS
  // --------------------------------------------------

  const updateForm = <K extends keyof OfferForm>(
    key: K,
    value: OfferForm[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setUploadedImages([]);
    setCategoryInput("");
    setOrganisationSearch("");
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (offer: Offer) => {
    if (offer.status !== "DRAFT") return;

    setEditingId(offer.id);

    setForm({
      title: offer.title || "",
      description: offer.description || "",
      audience: offer.audience,
      expiresAt: offer.expiresAt
        ? new Date(offer.expiresAt).toLocaleDateString("en-CA")
        : "",
      images: (offer.images || []).map((image) => image.fileName),
      categories: offer.categories || [],
      organisationIds: (offer.organisations || []).map(
        (organisation) => organisation.id,
      ),
    });

    setUploadedImages(offer.images || []);
    setCategoryInput((offer.categories || []).join(", "));
    setOrganisationSearch("");

    setFormOpen(true);
  };

  // --------------------------------------------------
  // IMAGE UPLOAD
  // --------------------------------------------------

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    const remaining = MAX_IMAGES - form.images.length;

    if (remaining <= 0) {
      alert("You can upload a maximum of 5 images.");
      event.target.value = "";
      return;
    }

    const selectedFiles = files.slice(0, remaining);

    if (files.length > remaining) {
      alert(`Only ${remaining} more image(s) can be uploaded.`);
    }

    const invalidFile = selectedFiles.find(
      (file) => !file.type.startsWith("image/"),
    );

    if (invalidFile) {
      alert("Please select image files only.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("image", file);
      });

      // Backend expects upload.array("image", 5).
      const response = await api.post("/offers/upload-images", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const images = Array.isArray(response.data?.images)
        ? response.data.images
        : [];

      const uploaded: UploadedImage[] = images
        .filter((image: any) => image?.fileName)
        .map((image: any) => ({
          fileName: String(image.fileName),
          url: image.url,
        }));

      if (!response.data?.success || uploaded.length !== selectedFiles.length) {
        throw new Error(
          response.data?.message || "Image upload was incomplete.",
        );
      }

      setUploadedImages((previous) => [...previous, ...uploaded]);

      setForm((previous) => ({
        ...previous,
        images: [
          ...previous.images,
          ...uploaded.map((image) => image.fileName),
        ].slice(0, MAX_IMAGES),
      }));
    } catch (err: any) {
      console.error("OFFER IMAGE UPLOAD ERROR:", err);

      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to upload images.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removeImage = (fileName: string) => {
    setForm((previous) => ({
      ...previous,
      images: previous.images.filter((image) => image !== fileName),
    }));

    setUploadedImages((previous) =>
      previous.filter((image) => image.fileName !== fileName),
    );
  };

  // --------------------------------------------------
  // AUDIENCE
  // --------------------------------------------------

  const availableOrganisationTypes = useMemo(
    () =>
      Array.from(
        new Set(
          organisations
            .map((organisation) => organisation.orgType?.trim())
            .filter((type): type is string => Boolean(type)),
        ),
      ).sort(),
    [organisations],
  );

  const selectedCategories = categoryInput
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const toggleCategory = (category: string) => {
    const exists = selectedCategories.some(
      (item) => item.toLowerCase() === category.toLowerCase(),
    );

    const next = exists
      ? selectedCategories.filter(
          (item) => item.toLowerCase() !== category.toLowerCase(),
        )
      : [...selectedCategories, category];

    setCategoryInput(next.join(", "));
  };

  const toggleOrganisation = (id: string) => {
    setForm((previous) => ({
      ...previous,
      organisationIds: previous.organisationIds.includes(id)
        ? previous.organisationIds.filter((item) => item !== id)
        : [...previous.organisationIds, id],
    }));
  };

  const filteredOrganisations = organisations.filter((organisation) => {
    const query = organisationSearch.trim().toLowerCase();

    if (!query) return true;

    return (
      organisation.name.toLowerCase().includes(query) ||
      (organisation.orgType || "").toLowerCase().includes(query)
    );
  });

  // --------------------------------------------------
  // SAVE OFFER
  // --------------------------------------------------

  const getPayload = () => ({
    title: form.title.trim(),
    description: form.description.trim(),
    audience: form.audience,
    expiresAt: form.expiresAt
      ? new Date(`${form.expiresAt}T23:59:59.000+05:30`).toISOString()
      : null,
    images: form.images,
    categories:
      form.audience === "ORGANISATION_CATEGORIES" ? selectedCategories : [],
    organisationIds:
      form.audience === "SELECTED_ORGANISATIONS" ? form.organisationIds : [],
  });

  const validateForm = () => {
    if (!form.title.trim()) {
      alert("Please enter an offer title.");
      return false;
    }

    if (form.title.trim().length > 191) {
      alert("Offer title must be 191 characters or fewer.");
      return false;
    }

    if (
      form.audience === "ORGANISATION_CATEGORIES" &&
      selectedCategories.length === 0
    ) {
      alert("Select at least one organisation category.");
      return false;
    }

    if (
      form.audience === "SELECTED_ORGANISATIONS" &&
      form.organisationIds.length === 0
    ) {
      alert("Select at least one organisation.");
      return false;
    }

    if (form.expiresAt) {
      const selectedDate = new Date(`${form.expiresAt}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (Number.isNaN(selectedDate.getTime()) || selectedDate < today) {
        alert("Please select a valid expiry date.");
        return false;
      }
    }

    return true;
  };

  const saveOffer = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = getPayload();

      if (editingId) {
        await api.patch(`/offers/${editingId}`, payload);
      } else {
        await api.post("/offers", payload);
      }

      setFormOpen(false);
      resetForm();

      await fetchOffers();

      alert(
        editingId
          ? "Offer draft updated successfully."
          : "Offer draft created successfully.",
      );
    } catch (err: any) {
      console.error("SAVE OFFER ERROR:", err);

      alert(err?.response?.data?.message || "Unable to save offer.");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // PREVIEW
  // --------------------------------------------------

  const openPreview = (offer: Offer) => {
    setSelectedOffer(offer);
    setPreviewOpen(true);
  };

  const previewForm = () => {
    if (!validateForm()) return;

    const payload = getPayload();

    setSelectedOffer({
      id: editingId || "",
      title: payload.title,
      description: payload.description,
      audience: payload.audience,
      expiresAt: payload.expiresAt,
      status: "DRAFT",
      images: uploadedImages,
      categories: payload.categories,
      organisations: organisations.filter((organisation) =>
        payload.organisationIds.includes(organisation.id),
      ),
    });

    setPreviewOpen(true);
  };

  // --------------------------------------------------
  // PUBLISH
  // --------------------------------------------------

  const publishOffer = async (offerId: string) => {
    const confirmed = window.confirm(
      "Publish this offer? Notifications will be sent to the targeted clients.",
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const response = await api.post(`/offers/${offerId}/publish`, {});

      const recipientCount =
        response.data?.notifiedClients ?? response.data?.recipientCount;

      setPreviewOpen(false);
      setActiveTab("PUBLISHED");

      alert(
        `Offer published successfully.${
          recipientCount !== undefined
            ? ` Targeted clients: ${recipientCount}.`
            : ""
        }`,
      );

      await fetchOffers();
    } catch (err: any) {
      console.error("PUBLISH OFFER ERROR:", err);

      alert(err?.response?.data?.message || "Unable to publish offer.");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // ARCHIVE
  // --------------------------------------------------

  const archiveOffer = async (offerId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to archive this offer?",
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      await api.patch(`/offers/${offerId}/archive`, {});

      setPreviewOpen(false);
      setActiveTab("ARCHIVED");

      await fetchOffers();

      alert("Offer archived successfully.");
    } catch (err: any) {
      console.error("ARCHIVE OFFER ERROR:", err);

      alert(err?.response?.data?.message || "Unable to archive offer.");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const audienceLabel = (audience: OfferAudience) => {
    switch (audience) {
      case "ALL_CLIENTS":
        return "All clients";
      case "ORGANISATION_CATEGORIES":
        return "Organisation categories";
      case "SELECTED_ORGANISATIONS":
        return "Selected organisations";
    }
  };

  const filteredOffers = offers.filter((offer) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      offer.title.toLowerCase().includes(query) ||
      (offer.description || "").toLowerCase().includes(query) ||
      audienceLabel(offer.audience).toLowerCase().includes(query)
    );
  });

  // --------------------------------------------------
  // PERMISSION
  // --------------------------------------------------

  if (!canManageOffers) {
    return (
      <div className="offer-page">
        <style>{offerThemeStyles}</style>
        <div className="offer-empty">
          <div className="offer-empty-icon">🔒</div>
          <h2>Access restricted</h2>
          <p>You do not have permission to manage offers.</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="offer-page">
      <style>{offerThemeStyles}</style>
      <div className="offer-header">
        <div>
          <h1>Offers</h1>
          <p>Manage client offers and promotions</p>
        </div>

        <button className="offer-primary-button" onClick={openCreateForm}>
          <span>＋</span> Create offer
        </button>
      </div>

      <div className="offer-stats">
        <div className="offer-stat">
          <span>Total drafts</span>
          <strong>{activeTab === "DRAFT" ? offers.length : "—"}</strong>
        </div>

        <div className="offer-stat">
          <span>Current section</span>
          <strong>
            {activeTab === "DRAFT"
              ? "Drafts"
              : activeTab === "PUBLISHED"
                ? "Published"
                : "Archived"}
          </strong>
        </div>

        <div className="offer-stat">
          <span>Organisations</span>
          <strong>{organisations.length}</strong>
        </div>
      </div>

      <div className="offer-toolbar">
        <div className="offer-tabs">
          {(["DRAFT", "PUBLISHED", "ARCHIVED"] as OfferStatus[]).map(
            (status) => (
              <button
                key={status}
                className={activeTab === status ? "active" : ""}
                onClick={() => setActiveTab(status)}
              >
                {status === "DRAFT"
                  ? "Drafts"
                  : status === "PUBLISHED"
                    ? "Published"
                    : "Archived"}
              </button>
            ),
          )}
        </div>

        <div className="offer-search">
          <span>⌕</span>
          <input
            placeholder="Search offers..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <button className="offer-refresh" onClick={fetchOffers} title="Refresh">
          ↻
        </button>
      </div>

      {error && (
        <div className="offer-error">
          {error}
          <button onClick={fetchOffers}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="offer-empty">
          <div className="offer-spinner" />
          <p>Loading offers...</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="offer-empty">
          <div className="offer-empty-icon">🏷</div>
          <h2>No {activeTab.toLowerCase()} offers</h2>
          <p>
            {search
              ? "No offers match your search."
              : "Offers in this section will appear here."}
          </p>

          {activeTab === "DRAFT" && (
            <button className="offer-primary-button" onClick={openCreateForm}>
              Create your first offer
            </button>
          )}
        </div>
      ) : (
        <div className="offer-grid">
          {filteredOffers.map((offer) => (
            <article className="offer-card" key={offer.id}>
              <div
                className="offer-card-cover"
                role="button"
                tabIndex={0}
                aria-label={`Preview ${offer.title}`}
                onClick={() => openPreview(offer)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openPreview(offer);
                  }
                }}
              >
                {offer.images?.[0]?.url ? (
                  <img src={getImageUrl(offer.images[0])} alt={offer.title} />
                ) : (
                  <div className="offer-cover-placeholder">
                    <span>🏷</span>
                    <small>Offer preview</small>
                  </div>
                )}

                <span className={`offer-status ${offer.status.toLowerCase()}`}>
                  {offer.status}
                </span>
              </div>

              <div className="offer-card-content">
                <div className="offer-card-heading">
                  <h3>{offer.title}</h3>
                  <span>{audienceLabel(offer.audience)}</span>
                </div>

                {offer.description && (
                  <p className="offer-description">{offer.description}</p>
                )}

                {offer.images?.length > 0 && (
                  <div className="offer-image-count">
                    <span>▧</span>
                    {offer.images.length} image(s)
                  </div>
                )}

                <div className="offer-card-footer">
                  <div>
                    <small>Expires</small>
                    <strong>{formatDate(offer.expiresAt)}</strong>
                  </div>

                  <button
                    className="offer-text-button"
                    onClick={() => openPreview(offer)}
                  >
                    View details →
                  </button>
                </div>

                <div className="offer-card-actions">
                  {offer.status === "DRAFT" && (
                    <>
                      <button
                        className="offer-secondary-button"
                        onClick={() => openEditForm(offer)}
                      >
                        Edit draft
                      </button>

                      <button
                        className="offer-primary-button"
                        onClick={() => openPreview(offer)}
                      >
                        Review & publish
                      </button>
                    </>
                  )}

                  {offer.status === "PUBLISHED" && (
                    <button
                      className="offer-secondary-button"
                      onClick={() => openPreview(offer)}
                    >
                      View / archive
                    </button>
                  )}

                  {offer.status === "ARCHIVED" && (
                    <button
                      className="offer-secondary-button"
                      onClick={() => openPreview(offer)}
                    >
                      View details
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}

      {formOpen && (
        <div
          className="offer-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setFormOpen(false);
            }
          }}
        >
          <div className="offer-modal offer-form-modal">
            <div className="offer-modal-header">
              <div>
                <h2>{editingId ? "Edit offer draft" : "Create offer"}</h2>
                <p>Create a promotion for your clients</p>
              </div>

              <button
                className="offer-close"
                onClick={() => setFormOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="offer-modal-body">
              <div className="offer-form-section">
                <label>Offer title *</label>
                <input
                  className="offer-input"
                  maxLength={191}
                  placeholder="Enter offer title"
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                />
                <small>{form.title.length}/191 characters</small>
              </div>

              <div className="offer-form-section">
                <label>Description</label>
                <textarea
                  className="offer-input offer-textarea"
                  placeholder="Write offer details..."
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                />
              </div>

              <div className="offer-form-section">
                <div className="offer-label-row">
                  <label>Offer images</label>
                  <small>{form.images.length}/5 images</small>
                </div>

                <div className="offer-upload-grid">
                  {uploadedImages.map((image) => (
                    <div className="offer-uploaded-image" key={image.fileName}>
                      {image.url ? (
                        <img src={image.url} alt="Offer" />
                      ) : (
                        <div className="offer-image-placeholder">
                          Image uploaded
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeImage(image.fileName)}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {form.images.length < MAX_IMAGES && (
                    <label className="offer-upload-box">
                      <span>＋</span>
                      <strong>Add image</strong>
                      <small>PNG, JPG or WEBP</small>

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploading}
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}
                </div>

                {uploading && (
                  <p className="offer-uploading">Uploading images...</p>
                )}

                <small>
                  Maximum 5 images. Images are uploaded before saving the offer.
                </small>
              </div>

              <div className="offer-form-section">
                <label>Target audience *</label>

                <div className="offer-audience-options">
                  {(
                    [
                      {
                        value: "ALL_CLIENTS",
                        title: "All clients",
                        description: "Send to every client organisation",
                      },
                      {
                        value: "ORGANISATION_CATEGORIES",
                        title: "Organisation categories",
                        description: "Target selected organisation types",
                      },
                      {
                        value: "SELECTED_ORGANISATIONS",
                        title: "Selected organisations",
                        description: "Choose specific organisations",
                      },
                    ] as {
                      value: OfferAudience;
                      title: string;
                      description: string;
                    }[]
                  ).map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={`offer-audience-option ${
                        form.audience === option.value ? "selected" : ""
                      }`}
                      onClick={() => updateForm("audience", option.value)}
                    >
                      <span className="offer-radio">
                        {form.audience === option.value ? "●" : "○"}
                      </span>

                      <span>
                        <strong>{option.title}</strong>
                        <small>{option.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {form.audience === "ORGANISATION_CATEGORIES" && (
                <div className="offer-form-section">
                  <label>Organisation categories *</label>

                  <div className="offer-category-list">
                    {availableOrganisationTypes.map((type) => (
                      <button
                        type="button"
                        key={type}
                        className={
                          selectedCategories.some(
                            (item) => item.toLowerCase() === type.toLowerCase(),
                          )
                            ? "selected"
                            : ""
                        }
                        onClick={() => toggleCategory(type)}
                      >
                        {type}
                        {selectedCategories.some(
                          (item) => item.toLowerCase() === type.toLowerCase(),
                        ) && <span> ✓</span>}
                      </button>
                    ))}
                  </div>

                  <input
                    className="offer-input"
                    placeholder="Or enter categories separated by commas"
                    value={categoryInput}
                    onChange={(event) => setCategoryInput(event.target.value)}
                  />

                  <small>
                    Select available organisation types or enter custom
                    categories.
                  </small>
                </div>
              )}

              {form.audience === "SELECTED_ORGANISATIONS" && (
                <div className="offer-form-section">
                  <div className="offer-label-row">
                    <label>Choose organisations *</label>
                    <strong>{form.organisationIds.length} selected</strong>
                  </div>

                  <input
                    className="offer-input"
                    placeholder="Search organisations..."
                    value={organisationSearch}
                    onChange={(event) =>
                      setOrganisationSearch(event.target.value)
                    }
                  />

                  <div className="offer-organisation-list">
                    {filteredOrganisations.length === 0 ? (
                      <p className="offer-muted">No organisations found.</p>
                    ) : (
                      filteredOrganisations.map((organisation) => (
                        <label
                          key={organisation.id}
                          className="offer-organisation-option"
                        >
                          <input
                            type="checkbox"
                            checked={form.organisationIds.includes(
                              organisation.id,
                            )}
                            onChange={() => toggleOrganisation(organisation.id)}
                          />

                          <span>
                            <strong>{organisation.name}</strong>
                            <small>
                              {organisation.orgType || "Type not set"}
                            </small>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="offer-form-section">
                <label>Expiry date</label>
                <input
                  className="offer-input offer-date-input"
                  type="date"
                  min={new Date().toLocaleDateString("en-CA")}
                  value={form.expiresAt}
                  onChange={(event) =>
                    updateForm("expiresAt", event.target.value)
                  }
                />
                <small>
                  Leave empty if the offer does not have an expiry date.
                </small>
              </div>
            </div>

            <div className="offer-modal-footer">
              <button
                className="offer-secondary-button"
                onClick={previewForm}
                disabled={uploading || saving}
              >
                Preview
              </button>

              <button
                className="offer-primary-button"
                onClick={saveOffer}
                disabled={saving || uploading}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update draft"
                    : "Save draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}

      {previewOpen && selectedOffer && (
        <div
          className="offer-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewOpen(false);
            }
          }}
        >
          <div className="offer-modal offer-preview-modal">
            <div className="offer-modal-header">
              <div>
                <h2>Offer preview</h2>
                <p>Review offer details and audience</p>
              </div>

              <button
                className="offer-close"
                onClick={() => setPreviewOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="offer-modal-body">
              <span
                className={`offer-status ${selectedOffer.status.toLowerCase()}`}
              >
                {selectedOffer.status}
              </span>

              <h2 className="offer-preview-title">{selectedOffer.title}</h2>

              {selectedOffer.description && (
                <p className="offer-preview-description">
                  {selectedOffer.description}
                </p>
              )}

              {selectedOffer.images?.length > 0 && (
                <div className="offer-preview-images">
                  {selectedOffer.images.map((image, index) =>
                    image.url ? (
                      <img
                        key={`${image.fileName}-${index}`}
                        src={image.url}
                        alt={selectedOffer.title}
                      />
                    ) : (
                      <div
                        className="offer-image-placeholder"
                        key={`${image.fileName}-${index}`}
                      >
                        Uploaded image
                      </div>
                    ),
                  )}
                </div>
              )}

              <div className="offer-preview-info">
                <div>
                  <small>Target audience</small>
                  <strong>{audienceLabel(selectedOffer.audience)}</strong>
                </div>

                <div>
                  <small>Expiry</small>
                  <strong>{formatDate(selectedOffer.expiresAt)}</strong>
                </div>

                {selectedOffer.categories?.length ? (
                  <div>
                    <small>Categories</small>
                    <strong>{selectedOffer.categories.join(", ")}</strong>
                  </div>
                ) : null}

                {selectedOffer.organisations?.length ? (
                  <div>
                    <small>Selected organisations</small>
                    <strong>
                      {selectedOffer.organisations
                        .map((organisation) => organisation.name)
                        .join(", ")}
                    </strong>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="offer-modal-footer">
              <button
                className="offer-secondary-button"
                onClick={() => setPreviewOpen(false)}
              >
                Close
              </button>

              {selectedOffer.id && selectedOffer.status === "DRAFT" && (
                <button
                  className="offer-primary-button"
                  disabled={saving}
                  onClick={() => publishOffer(selectedOffer.id)}
                >
                  {saving ? "Publishing..." : "Publish offer"}
                </button>
              )}

              {selectedOffer.id && selectedOffer.status === "PUBLISHED" && (
                <button
                  className="offer-danger-button"
                  disabled={saving}
                  onClick={() => archiveOffer(selectedOffer.id)}
                >
                  {saving ? "Archiving..." : "Archive offer"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferPage;
