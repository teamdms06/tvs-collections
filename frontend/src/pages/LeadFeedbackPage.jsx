import { useEffect, useMemo, useRef, useState } from "react";
import {
  getConsumerLeadById,
  getUserDashboard,
  saveConsumerFeedback,
  searchConsumerLeads,
} from "../api/leads";

const initialFeedback = {
  uid: "",
  status: "",
  disposition: "",
  subDisposition: "",
  paymentMode: "",
  reason: "",
};

const paymentDispositionFields = ["amount", "actionDate", "paymentMode"];
const paidToFields = ["paidToName", "paidToContact", "paidShowroom"];
const callBackFields = ["callBackDate", "callBackTime"];
const refusalFields = ["nonPaymentReason", "customerBouncingReason"];

const FEEDBACK_FIELDS_BY_SUB_DISPOSITION = {
  OCP: [
    ...paymentDispositionFields,
    "receiptNo",
    ...refusalFields,
    "alternateMobile",
    "remark",
  ],
  BPTP: [
    ...paymentDispositionFields,
    ...refusalFields,
    "alternateMobile",
    "remark",
  ],
  ONKT: [
    ...paymentDispositionFields,
    ...refusalFields,
    "alternateMobile",
    "remark",
  ],
  Pickup: [
    ...paymentDispositionFields,
    "pickupTime",
    "pickupAddress",
    ...refusalFields,
    "alternateMobile",
    "remark",
  ],
  PTP: [
    ...paymentDispositionFields,
    ...refusalFields,
    "alternateMobile",
    "remark",
  ],
  LPTP: [
    ...paymentDispositionFields,
    ...refusalFields,
    "alternateMobile",
    "remark",
  ],
  AP: [
    ...paymentDispositionFields,
    "receiptNo",
    ...paidToFields,
    ...refusalFields,
    "alternateMobile",
    "remark",
  ],
  APCB: [
    ...paymentDispositionFields,
    ...paidToFields,
    ...refusalFields,
    "alternateMobile",
    "remark",
  ],
  CLBK: [...callBackFields, "alternateMobile", "remark"],
  CLBK_P: [
    ...paymentDispositionFields,
    "receiptNo",
    "pickupTime",
    "pickupAddress",
    ...paidToFields,
    ...callBackFields,
    ...refusalFields,
    "alternateMobile",
    "remark",
  ],
  LMG: [...callBackFields, "alternateMobile", "remark"],
  CD: ["alternateMobile", "remark"],
  RTP: [...refusalFields, "alternateMobile", "remark"],
  WRNG: ["alternateMobile", "remark"],
};

const REQUIRED_FIELDS_BY_SUB_DISPOSITION = {
  OCP: ["amount", "actionDate", "paymentMode", "receiptNo", "remark"],
  BPTP: ["amount", "actionDate", "paymentMode", "remark"],
  ONKT: ["amount", "actionDate", "paymentMode", "remark"],
  Pickup: [
    "amount",
    "actionDate",
    "paymentMode",
    "pickupTime",
    "pickupAddress",
    "remark",
  ],
  PTP: ["amount", "actionDate", "paymentMode", "remark"],
  LPTP: ["amount", "actionDate", "paymentMode", "remark"],
  AP: ["amount", "actionDate", "paymentMode", "receiptNo", "remark"],
  APCB: ["amount", "actionDate", "remark"],
  CLBK: ["callBackDate", "callBackTime", "remark"],
  CLBK_P: ["callBackDate", "callBackTime", "remark"],
  LMG: ["remark"],
  CD: ["remark"],
  RTP: ["nonPaymentReason", "customerBouncingReason", "remark"],
  WRNG: ["remark"],
};

const alwaysSubmittedFields = ["disposition", "subDisposition"];
const alwaysVisibleFeedbackFields = ["uid"];

function cleanFeedbackValue(value) {
  return value && value !== "-" ? value : "";
}

function cleanAlternateMobileValue(value) {
  const cleanedValue = cleanFeedbackValue(value);
  return cleanedValue === "0" ? "" : cleanedValue;
}

function createInitialFeedback(config, lead = {}) {
  const values = {
    ...initialFeedback,
    uid: cleanFeedbackValue(lead.uid),
    status: "",
    disposition: "",
    subDisposition: cleanFeedbackValue(lead.bestDispoInternal),
    paymentMode: "",
    reason: "",
    nonPaymentReason: "",
    customerBouncingReason: "",
  };

  for (const field of config.editableFields || []) {
    values[field.name] = "";
  }

  return values;
}

function getActiveFeedbackFieldNames(subDisposition) {
  return new Set([
    ...alwaysSubmittedFields,
    ...alwaysVisibleFeedbackFields,
    ...(FEEDBACK_FIELDS_BY_SUB_DISPOSITION[subDisposition] || ["remark"]),
  ]);
}

function getRequiredFeedbackFieldNames(subDisposition) {
  return new Set([
    ...alwaysSubmittedFields,
    ...(REQUIRED_FIELDS_BY_SUB_DISPOSITION[subDisposition] || ["remark"]),
  ]);
}

function isActiveFeedbackField(activeFieldNames, name) {
  return activeFieldNames.has(name);
}

function getFeedbackValue(feedbackValues, activeFieldNames, name) {
  return isActiveFeedbackField(activeFieldNames, name)
    ? feedbackValues[name]
    : "";
}

function toFeedbackRequest(feedbackValues, activeFieldNames) {
  return {
    uid: cleanFeedbackValue(feedbackValues.uid),
    disposition: cleanFeedbackValue(feedbackValues.disposition),
    subDisposition: cleanFeedbackValue(feedbackValues.subDisposition),
    paymentMode: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "paymentMode"),
    ),
    nonPaymentReason: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "nonPaymentReason"),
    ),
    bouncingReason: cleanFeedbackValue(
      getFeedbackValue(
        feedbackValues,
        activeFieldNames,
        "customerBouncingReason",
      ),
    ),
    ptpAmount: getFeedbackValue(feedbackValues, activeFieldNames, "amount")
      ? Number(feedbackValues.amount)
      : null,
    ptpDate: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "actionDate"),
    ),
    pickupTime: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "pickupTime"),
    ),
    pickupAddress: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "pickupAddress"),
    ),
    transactionReceiptNo: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "receiptNo"),
    ),
    paidToName: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "paidToName"),
    ),
    paidToContact: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "paidToContact"),
    ),
    paidShowroom: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "paidShowroom"),
    ),
    callBackDate: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "callBackDate"),
    ),
    callBackTime: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "callBackTime"),
    ),
    alternateMobileNumber: cleanAlternateMobileValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "alternateMobile"),
    ),
    remark: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "remark"),
    ),
  };
}

function getMissingRequiredFields(config, feedbackValues, requiredFieldNames) {
  const requiredFields = [
    { label: "Disposition", name: "disposition" },
    { label: "Sub Disposition", name: "subDisposition" },
    { label: "Payment Mode", name: "paymentMode" },
    ...(config.editableFields || []),
  ];

  return requiredFields
    .filter((field) => requiredFieldNames.has(field.name))
    .filter((field) => !cleanFeedbackValue(feedbackValues[field.name]))
    .map((field) => field.label);
}

function getMissingActiveAnswerFields(config, feedbackValues, activeFieldNames) {
  const answerFields = [
    ...(config.editableFields || []),
  ];

  return answerFields
    .filter((field) => field.name === "alternateMobile")
    .filter((field) => isActiveFeedbackField(activeFieldNames, field.name))
    .filter((field) => !cleanFeedbackValue(feedbackValues[field.name]))
    .map((field) => field.label);
}

function getValidationErrors(
  config,
  feedbackValues,
  activeFieldNames,
  requiredFieldNames,
) {
  const errors = getMissingRequiredFields(
    config,
    feedbackValues,
    requiredFieldNames,
  );
  errors.push(
    ...getMissingActiveAnswerFields(config, feedbackValues, activeFieldNames),
  );
  const amount = getFeedbackValue(feedbackValues, activeFieldNames, "amount");
  const paidToContact = getFeedbackValue(
    feedbackValues,
    activeFieldNames,
    "paidToContact",
  );
  const alternateMobile = getFeedbackValue(
    feedbackValues,
    activeFieldNames,
    "alternateMobile",
  );
  const uid = cleanFeedbackValue(feedbackValues.uid);

  if (amount && Number(amount) < 500) {
    errors.push("PTP/Paid/Pickup Amount must be at least 500");
  }

  if (paidToContact && !/^\d{10}$/.test(paidToContact)) {
    errors.push("Paid to whom (Contact no) must be 10 digits");
  }

  if (alternateMobile && alternateMobile !== "0" && !/^\d{10}$/.test(alternateMobile)) {
    errors.push("Alternate Mobile Number must be 10 digits, or enter 0 when not provided");
  }

  if (uid && !/^[A-Za-z]\d{19}$/.test(uid)) {
    errors.push("UID must start with 1 letter followed by 19 digits");
  }

  return errors;
}

function FieldValue({ label, value, highlight }) {
  return (
    <div className={highlight ? "data-row data-row--highlight" : "data-row"}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWorkingMinutes(minutes) {
  const totalMinutes = Number(minutes || 0);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function UserDashboard({ dashboard, fallbackName, loading, error }) {
  const stats = [
    {
      label: "Login time",
      value: formatDateTime(dashboard?.loginTime),
    },
    {
      label: "Today working hours",
      value: formatWorkingMinutes(dashboard?.todayWorkingMinutes),
    },
    {
      label: "Today's call attempts",
      value: dashboard?.todayCallAttempts ?? "-",
    },
    {
      label: "Monthly call attempts",
      value: dashboard?.monthlyCallAttempts ?? "-",
    },
  ];

  return (
    <section className="user-dashboard" aria-label="User analysis">
      <div className="user-dashboard__heading">
        <div>
          <p className="eyebrow">User analysis</p>
          <h2>{dashboard?.name || fallbackName || "My Dashboard"}</h2>
        </div>
        <span>{dashboard?.generatedAt ? `Updated ${formatDateTime(dashboard.generatedAt)}` : "Live"}</span>
      </div>
      {error && <p className="notice notice--error">{error}</p>}
      {loading && !dashboard && <p className="notice">Loading your dashboard...</p>}
      <div className="user-dashboard__grid">
        {stats.map((stat) => (
          <article className="user-stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
      <p>Search and open a lead to start feedback.</p>
    </section>
  );
}

function Toast({ notice, onClose }) {
  if (!notice) {
    return null;
  }

  return (
    <div className={`toast-notice toast-notice--${notice.type}`} role="alert">
      <div>
        <span>{notice.type}</span>
        <p>{notice.message}</p>
      </div>
      <button aria-label="Dismiss notification" onClick={onClose} type="button">
        x
      </button>
    </div>
  );
}

function SelectField({ field, value, onChange }) {
  const sortedOptions = [...(field.options || [])].sort((first, second) =>
    String(first).localeCompare(String(second)),
  );

  return (
    <label className="form-field">
      <span>
        {field.label}
        {field.required && <b>Required</b>}
      </span>
      <select
        value={value}
        required={field.required}
        onChange={(event) => onChange(field.name, event.target.value)}
      >
        <option value="">Select {field.label}</option>
        {sortedOptions.map((option, index) => (
          <option key={`${option}-${index}`} value={option}>
            {option}
          </option>
        ))}
      </select>
      <small>{field.help}</small>
    </label>
  );
}

function normalizeLead(lead) {
  if (!lead) {
    return lead;
  }

  const history = Array.isArray(lead.history)
    ? lead.history.map(normalizeHistoryItem).filter(Boolean)
    : [];

  return {
    ...lead,
    product:
      typeof lead.product === "string"
        ? lead.product
        : lead.product?.name || lead.product?.code || "",
    history,
    latestFeedback: normalizeHistoryItem(lead.latestFeedback),
  };
}

function getLeadLastRemark(lead) {
  return lead.latestFeedback?.remark || lead.history?.[0]?.remark || "";
}

function hasLeadFeedback(lead) {
  return Boolean(lead.latestFeedback || lead.history?.length);
}

function normalizeHistoryItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const normalized = {
    id: item.id,
    date: item.date || item.createdAt || item.created_at || "",
    disposition: item.disposition || "",
    subDisposition: item.subDisposition || item.sub_disposition || "",
    remark: item.remark || "",
  };

  const hasDisplayValue = [
    normalized.id,
    normalized.date,
    normalized.disposition,
    normalized.subDisposition,
    normalized.remark,
  ].some(Boolean);

  return hasDisplayValue ? normalized : null;
}

function TextField({ field, value, onChange }) {
  return (
    <label className="form-field">
      <span>
        {field.label}
        {field.required && <b>Required</b>}
      </span>
      <input
        type={field.type || "text"}
        value={value}
        placeholder={field.placeholder}
        minLength={field.minLength}
        maxLength={field.maxLength}
        required={field.required}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
      <small>{field.help}</small>
    </label>
  );
}

function SearchModal({ lead, onClose, onOpen }) {
  if (!lead) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="record-modal"
        aria-label="Searched lead preview"
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Record found</p>
            <h2>{lead.customerName}</h2>
          </div>
          <button
            aria-label="Close preview"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>
        <div className="modal-grid">
          <FieldValue label="Agreement Number" value={lead.agreementNumber} />
          <FieldValue label="Mobile Number" value={lead.mobileNumber} />
          <FieldValue label="Portfolio" value={lead.portfolio} />
          <FieldValue label="UID" value={lead.uid} highlight />
          <FieldValue
            label="Total Overdue"
            value={lead.totalOverdue}
            highlight
          />
          <FieldValue
            label="Best Dispo Internal"
            value={lead.bestDispoInternal}
          />
        </div>
        <div className="form-actions">
          <button className="secondary-action" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="primary-action"
            onClick={() => onOpen(lead.id)}
            type="button"
          >
            Open
          </button>
        </div>
      </section>
    </div>
  );
}

export default function LeadFeedbackPage({ config, onLogout, user }) {
  const [activeLead, setActiveLead] = useState(null);
  const [previewLead, setPreviewLead] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [feedbackValues, setFeedbackValues] = useState(() =>
    createInitialFeedback(config),
  );
  const [loading, setLoading] = useState(false);
  const [redirectingAfterSubmit, setRedirectingAfterSubmit] = useState(false);
  const [notice, setNotice] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const submitRedirectTimerRef = useRef(null);

  const notify = (message, type = "info") => {
    setNotice({ message, type });
  };

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadDashboard = async () => {
    try {
      setDashboard(await getUserDashboard());
      setDashboardError("");
    } catch (error) {
      setDashboardError(error.message || "Could not load dashboard data.");
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(loadDashboard, 0);
    const interval = window.setInterval(loadDashboard, 30000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(
    () => () => {
      if (submitRedirectTimerRef.current) {
        window.clearTimeout(submitRedirectTimerRef.current);
      }
    },
    [],
  );

  const selectedGroup = useMemo(
    () =>
      config.dispositionGroups.find(
        (group) => group.name === feedbackValues.disposition,
      ),
    [config.dispositionGroups, feedbackValues.disposition],
  );

  const subDispositionOptions = selectedGroup?.options || [];
  const activeFieldNames = useMemo(
    () => getActiveFeedbackFieldNames(feedbackValues.subDisposition),
    [feedbackValues.subDisposition],
  );
  const requiredFieldNames = useMemo(
    () => getRequiredFeedbackFieldNames(feedbackValues.subDisposition),
    [feedbackValues.subDisposition],
  );
  const editableFields = useMemo(
    () =>
      (config.editableFields || [])
        .filter((field) => field.name !== "reason")
        .filter((field) => isActiveFeedbackField(activeFieldNames, field.name))
        .map((field) => ({
          ...field,
          required: requiredFieldNames.has(field.name),
        })),
    [activeFieldNames, config.editableFields, requiredFieldNames],
  );
  const lead = activeLead || config.emptyLead;
  const shouldShowUidField = !cleanFeedbackValue(lead.uid);
  const goDashboard = () => {
    setActiveLead(null);
    setPreviewLead(null);
    setSearchResults([]);
    setSearchQuery("");
    setFeedbackValues(createInitialFeedback(config));
    setNotice(null);
  };

  const onSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      const results = await searchConsumerLeads(searchQuery, config.key);
      const normalizedResults = results.map(normalizeLead);
      setSearchResults(normalizedResults);

      console.log(normalizedResults);

      if (normalizedResults.length === 1) {
        setPreviewLead(normalizedResults[0]);
      }

      if (normalizedResults.length === 0) {
        notify(
          "No record found for this mobile number or loan account number.",
          "info",
        );
      }
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const openLead = async (leadId) => {
    setLoading(true);
    setNotice(null);

    try {
      const fullLead = normalizeLead(
        await getConsumerLeadById(leadId, config.key),
      );
      const bestDispoGroup = config.dispositionGroups.find((group) =>
        group.options.includes(fullLead.bestDispoInternal),
      );
      setActiveLead(fullLead);
      setPreviewLead(null);
      setSearchResults([]);
      setFeedbackValues({
        ...createInitialFeedback(config, fullLead),
        status: bestDispoGroup?.name || "",
        disposition: bestDispoGroup?.name || "",
        subDisposition: cleanFeedbackValue(fullLead.bestDispoInternal),
      });
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const onFeedbackChange = (name, value) => {
    setFeedbackValues((current) => {
      const nextValues = { ...current, [name]: value };

      if (name === "disposition") {
        nextValues.status = value;
        nextValues.subDisposition = "";
      }

      return nextValues;
    });
  };

  const saveFeedback = async () => {
    if (loading || redirectingAfterSubmit) {
      return;
    }

    if (!activeLead) {
      notify("Search and open a record before saving feedback.", "warning");
      return;
    }

    const validationErrors = getValidationErrors(
      config,
      feedbackValues,
      activeFieldNames,
      requiredFieldNames,
    );

    if (validationErrors.length > 0) {
      notify(
        `Please correct feedback: ${validationErrors.join(", ")}.`,
        "warning",
      );
      return;
    }

    setLoading(true);
    setNotice(null);
    const feedbackRequest = toFeedbackRequest(feedbackValues, activeFieldNames);
    const leadId = activeLead.id;
    try {
      await saveConsumerFeedback(leadId, feedbackRequest, config.key);
      loadDashboard();
      setRedirectingAfterSubmit(true);
      notify("Feedback submitted successfully. Returning to dashboard...", "success");
      submitRedirectTimerRef.current = window.setTimeout(() => {
        setActiveLead(null);
        setPreviewLead(null);
        setSearchResults([]);
        setSearchQuery("");
        setFeedbackValues(createInitialFeedback(config));
        setRedirectingAfterSubmit(false);
        submitRedirectTimerRef.current = null;
      }, 3000);
    } catch (error) {
      notify(error.message, "error");
      setRedirectingAfterSubmit(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="workspace-shell app-workspace">
      <Toast notice={notice} onClose={() => setNotice(null)} />
      <section className="app-shell app-shell--topbar">
        <header className="agent-topbar" aria-label="Agent workspace menu">
          <div className="agent-topbar__left">
            <div className="admin-brand">
              <span aria-hidden="true">TVS</span>
              <div>
                <strong>Collections Desk</strong>
                <small>Agent Portal</small>
              </div>
            </div>
            <nav className="admin-menu" aria-label="Agent navigation">
              <button
                className="admin-menu-item admin-menu-item--active"
                onClick={goDashboard}
                type="button"
              >
                Dashboard
              </button>
            </nav>
          </div>

          <form className="search-box agent-topbar__search" onSubmit={onSearch}>
            <label>
              {/* <span>Search record</span> */}
              <input
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Mobile number or loan account number"
                value={searchQuery}
              />
            </label>
            <button className="primary-action" disabled={loading} type="submit">
              {loading ? "Loading..." : "Search"}
            </button>
          </form>

          <div className="agent-topbar__right">
            <div>
              <strong>{user.name}</strong>
              <span>{config.label}</span>
            </div>
            <button
              className="secondary-action"
              onClick={onLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="app-content">
          <header className="admin-content-header">
            <div>
              <p className="eyebrow">Collections feedback</p>
              <h1>{config.label}</h1>
            </div>
          </header>

          {searchResults.length > 1 && (
            <section className="results-panel" aria-label="Search results">
              {searchResults.map((result, index) => {
                const lastRemark = getLeadLastRemark(result);
                const feedbackTaken = hasLeadFeedback(result);

                return (
                  <button
                    className="result-row result-row--detailed"
                    key={result.id}
                    onClick={() => setPreviewLead(result)}
                    type="button"
                  >
                    <strong>
                      {result.customerName}
                      {index === 0 && <em>Latest</em>}
                    </strong>
                    <span>{result.agreementNumber}</span>
                    <span>{result.mobileNumber}</span>
                    <span>{result.createdAt ? formatDateTime(result.createdAt) : "-"}</span>
                    <span
                      className={
                        feedbackTaken
                          ? "lead-feedback-tag lead-feedback-tag--taken"
                          : "lead-feedback-tag"
                      }
                    >
                      {feedbackTaken ? "Feedback Taken" : "No Feedback"}
                    </span>
                    <small>{lastRemark || "No previous remark"}</small>
                    <b>Preview</b>
                  </button>
                );
              })}
            </section>
          )}

          {!activeLead && (
            <UserDashboard
              dashboard={dashboard}
              fallbackName={`${user.name} Dashboard`}
              error={dashboardError}
              loading={dashboardLoading}
            />
          )}

          {activeLead && (
            <>
              <section className="lead-strip" aria-label="Current lead">
                <FieldValue label="Portfolio" value={lead.portfolio} />
                <FieldValue label="DFX Bucket" value={lead.bucket} />
                <FieldValue
                  label="Agreement Number"
                  value={lead.agreementNumber}
                />
                <FieldValue label="UID" value={lead.uid} highlight />
              </section>

              <section className="form-grid">
                <aside
                  className="info-column"
                  aria-label="Uploaded lead information"
                >
                  <section className="panel panel--compact">
                    <div className="panel-title">
                      <h2>Personal Information</h2>
                      {/* <span>Fetched from upload data</span> */}
                    </div>
                    <div className="data-list">
                      {config.personalFields.map((field) => (
                        <FieldValue
                          key={field.name}
                          label={field.label}
                          value={lead[field.name]}
                          highlight={field.highlight}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="panel panel--compact">
                    <div className="panel-title">
                      <h2>Loan Information</h2>
                      {/* <span>Fetched from database</span> */}
                    </div>
                    <div className="data-list">
                      {config.loanFields.map((field) => (
                        <FieldValue
                          key={field.name}
                          label={field.label}
                          value={lead[field.name]}
                          highlight={field.highlight}
                        />
                      ))}
                    </div>
                  </section>
                </aside>

                <section
                  className="panel feedback-panel"
                  aria-label="Feedback form"
                >
                  <div className="feedback-heading">
                    <div>
                      {/* <p className="eyebrow">Agent editable fields</p> */}
                      <h2>Feedback Form</h2>
                    </div>
                    <div className="status-card">
                      <span>Status</span>
                      <strong>
                        {selectedGroup?.name || feedbackValues.status || "-"}
                      </strong>
                    </div>
                  </div>

                  <form className="feedback-form" id="feedback-form">
                    {shouldShowUidField && (
                      <TextField
                        field={{
                          label: "UID",
                          name: "uid",
                          placeholder: "1 letter + 19 digits",
                          maxLength: 20,
                          help: "Optional. First character must be a letter followed by 19 digits.",
                        }}
                        onChange={onFeedbackChange}
                        value={feedbackValues.uid || ""}
                      />
                    )}
                    <SelectField
                      field={{
                        label: "Disposition",
                        name: "disposition",
                        options: config.dispositionGroups.map(
                          (group) => group.name,
                        ),
                        required: true,
                        help: "Dropdown. Select Positive, Contacted, Non Contacted, or Backend NC.",
                      }}
                      onChange={onFeedbackChange}
                      value={feedbackValues.disposition}
                    />
                    <SelectField
                      field={{
                        label: "Sub Disposition",
                        name: "subDisposition",
                        options: subDispositionOptions,
                        required: true,
                        help: "Dropdown. Options load based on selected disposition.",
                      }}
                      onChange={onFeedbackChange}
                      value={feedbackValues.subDisposition}
                    />
                    {isActiveFeedbackField(activeFieldNames, "paymentMode") && (
                      <SelectField
                        field={{
                          label: "Payment Mode",
                          name: "paymentMode",
                          options: config.paymentModes,
                          required: requiredFieldNames.has("paymentMode"),
                          help: requiredFieldNames.has("paymentMode")
                            ? "Dropdown required for this disposition."
                            : "Dropdown optional for this disposition.",
                        }}
                        onChange={onFeedbackChange}
                        value={feedbackValues.paymentMode}
                      />
                    )}

                    {editableFields.map((field) =>
                      field.options ? (
                        <SelectField
                          field={field}
                          key={field.name}
                          onChange={onFeedbackChange}
                          value={feedbackValues[field.name] || ""}
                        />
                      ) : (
                        <TextField
                          field={field}
                          key={field.name}
                          onChange={onFeedbackChange}
                          value={feedbackValues[field.name] || ""}
                        />
                      ),
                    )}
                  </form>

                  <div className="form-actions">
                    <button
                      className="secondary-action"
                      disabled={loading || redirectingAfterSubmit}
                      type="button"
                    >
                      Save Draft
                    </button>
                    <button
                      className="primary-action"
                      disabled={loading || redirectingAfterSubmit}
                      onClick={saveFeedback}
                      form="feedback-form"
                      type="button"
                    >
                      {loading || redirectingAfterSubmit
                        ? "Submitting..."
                        : "Submit Feedback"}
                    </button>
                  </div>
                </section>

                <section className="panel history-panel">
                  <div className="panel-title">
                    <h2>History</h2>
                    <span>Previous attempts</span>
                  </div>
                  <ol>
                    {lead.history.length === 0 && (
                      <li>
                        <time>-</time>
                        <strong>No previous feedback</strong>
                        <span>
                          This lead does not have any saved attempts yet.
                        </span>
                      </li>
                    )}
                    {lead.history.map((item) => {
                      const feedbackLabel = [
                        item.disposition,
                        item.subDisposition,
                      ]
                        .filter(Boolean)
                        .join(" / ");

                      return (
                        <li key={item.id || `${item.date}-${feedbackLabel}`}>
                          <time>{item.date || "-"}</time>
                          <strong>{feedbackLabel || "-"}</strong>
                          <span>{item.remark || "-"}</span>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              </section>
            </>
          )}
        </div>
      </section>

      <SearchModal
        lead={previewLead}
        onClose={() => setPreviewLead(null)}
        onOpen={openLead}
      />
    </main>
  );
}
