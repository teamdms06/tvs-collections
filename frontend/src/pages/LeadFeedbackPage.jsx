import { useEffect, useMemo, useRef, useState } from "react";
import {
  getConsumerLeadById,
  getUserDashboard,
  saveConsumerFeedback,
  searchConsumerLeads,
} from "../api/leads";
import { getMyDialerAgentStatus } from "../api/dialer";

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
const refusalFields = ["nonPaymentReason"];

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
  RTP: ["nonPaymentReason", "remark"],
  WRNG: ["remark"],
};

const alwaysSubmittedFields = ["disposition", "subDisposition"];
const alwaysVisibleFeedbackFields = ["uid"];
const WEBHOOK_SOCKET_URL = import.meta.env.VITE_WEBHOOK_SOCKET_URL || "http://192.168.114.241:3001";
const AGENT_CALL_STATUS_ATTEMPTS = 8;
const AGENT_CALL_STATUS_RETRY_MS = 1000;
const ASSIGNED_CALL_SEARCH_DELAY_MS = 3000;
const DIALER_SCRIPT_ID = "vd-dialer-script";

function cleanFeedbackValue(value) {
  const cleanedValue = value == null ? "" : String(value).trim();
  return cleanedValue && cleanedValue !== "-" ? cleanedValue : "";
}

function cleanUidValue(value) {
  const cleanedValue = cleanFeedbackValue(value);
  const match = cleanedValue.match(/[A-Za-z]\d{19}/);
  return match ? match[0] : cleanedValue.replace(/^:+/, "").trim();
}

function normalizePhoneValue(value) {
  return String(value || "").replace(/\D/g, "");
}

function getComparablePhoneValue(value) {
  const phoneValue = normalizePhoneValue(value);
  return phoneValue.length > 10 ? phoneValue.slice(-10) : phoneValue;
}

function loadSocketIoClient(serverUrl) {
  if (window.io) {
    return Promise.resolve(window.io);
  }

  const existingScript = document.querySelector(`script[data-socket-io-client="${serverUrl}"]`);

  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(window.io), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${serverUrl}/socket.io/socket.io.js`;
    script.async = true;
    script.dataset.socketIoClient = serverUrl;
    script.onload = () => resolve(window.io);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function parseDialerAgentStatusCsv(text) {
  const rows = String(text || "")
    .trim()
    .split("\n")
    .map((line) => line.split(",").map((part) => part.trim()))
    .filter((parts) => parts.some(Boolean));

  if (rows.length === 0) {
    return null;
  }

  const headerRow = rows[0].map((header) => header.toLowerCase());
  const valueRow = headerRow.includes("status") ? rows[1] : rows[0];

  if (!valueRow) {
    return null;
  }

  const fieldNames = headerRow.includes("status")
    ? headerRow
    : [
        "status",
        "callerid",
        "lead_id",
        "campaign_id",
        "calls_today",
        "full_name",
        "user_group",
        "user_level",
        "pause_code",
        "real_time_sub_status",
        "phone_number",
        "vendor_lead_code",
        "session_id",
      ];

  return fieldNames.reduce((detail, fieldName, index) => {
    detail[fieldName] = valueRow[index] || "";
    return detail;
  }, {});
}

function cleanAlternateMobileValue(value) {
  const cleanedValue = cleanFeedbackValue(value);
  return cleanedValue === "0" ? "" : cleanedValue;
}

function createInitialFeedback(config, lead = {}) {
  const values = {
    ...initialFeedback,
    uid: "",
    status: "",
    disposition: "",
    subDisposition: cleanFeedbackValue(lead.bestDispoInternal),
    paymentMode: "",
    reason: "",
    nonPaymentReason: "",
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

function requiresNonPaymentReason(disposition) {
  return ["Positive", "Contacted"].includes(disposition);
}

function toFeedbackRequest(feedbackValues, activeFieldNames) {
  return {
    uid: cleanUidValue(feedbackValues.uid),
    disposition: cleanFeedbackValue(feedbackValues.disposition),
    subDisposition: cleanFeedbackValue(feedbackValues.subDisposition),
    paymentMode: cleanFeedbackValue(
      getFeedbackValue(feedbackValues, activeFieldNames, "paymentMode"),
    ),
    nonPaymentReason: cleanFeedbackValue(
      requiresNonPaymentReason(feedbackValues.disposition)
        ? feedbackValues.nonPaymentReason
        : getFeedbackValue(feedbackValues, activeFieldNames, "nonPaymentReason"),
    ),
    bouncingReason: "",
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
    { label: "UID", name: "uid" },
    { label: "Disposition", name: "disposition" },
    { label: "Sub Disposition", name: "subDisposition" },
    { label: "Payment Mode", name: "paymentMode" },
    ...(config.editableFields || []),
  ];

  return requiredFields
    .filter((field) => requiredFieldNames.has(field.name))
    .filter((field) => {
      const value =
        field.name === "uid"
          ? cleanUidValue(feedbackValues[field.name])
          : cleanFeedbackValue(feedbackValues[field.name]);
      return !value;
    })
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
  const uid = cleanUidValue(feedbackValues.uid);

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

  if (
    requiresNonPaymentReason(feedbackValues.disposition) &&
    !cleanFeedbackValue(feedbackValues.nonPaymentReason)
  ) {
    errors.push("Non Payment Reason");
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

function maskMobileNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length <= 4) {
    return digits;
  }

  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

function getLeadDisplayValue(lead, fieldName) {
  if (fieldName === "mobileNumber") {
    return maskMobileNumber(lead?.[fieldName]);
  }

  return lead?.[fieldName];
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
      label: "First login",
      value: formatDateTime(dashboard?.loginTime),
    },
    {
      label: "Last logout",
      value: formatDateTime(dashboard?.logoutTime),
    },
    {
      label: "Work duration",
      value: formatWorkingMinutes(dashboard?.todayWorkingMinutes),
    },
    {
      label: "Idle time",
      value: formatWorkingMinutes(dashboard?.todayIdleMinutes),
    },
    {
      label: "First login to last logout",
      value: formatWorkingMinutes(dashboard?.totalSpanMinutes),
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
      <div className="activity-punches" aria-label="Login logout punches">
        <div className="activity-punches__header">
          <strong>Login - Logout Punches</strong>
          <span>{dashboard?.activity?.punchCount || 0} today</span>
        </div>
        <div className="activity-punches__rows">
          {(dashboard?.activity?.punches || []).length === 0 && (
            <p>No punches recorded yet.</p>
          )}
          {(dashboard?.activity?.punches || []).map((punch, index) => (
            <div className="activity-punch-row" key={`${punch.loginAt}-${index}`}>
              <span>{index + 1}</span>
              <strong>{formatDateTime(punch.loginAt)}</strong>
              <strong>{punch.logoutAt ? formatDateTime(punch.logoutAt) : "Active"}</strong>
              <small>{formatWorkingMinutes(punch.workMinutes)} work</small>
              <small>{formatWorkingMinutes(punch.idleMinutes)} idle</small>
            </div>
          ))}
        </div>
      </div>
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
    uid: item.uid || "",
    disposition: item.disposition || "",
    subDisposition: item.subDisposition || item.sub_disposition || "",
    remark: item.remark || "",
  };

  const hasDisplayValue = [
    normalized.id,
    normalized.date,
    normalized.uid,
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
        readOnly={field.readOnly}
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
          <FieldValue
            label="Mobile Number"
            value={maskMobileNumber(lead.mobileNumber)}
          />
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
  const [searchDisplayQuery, setSearchDisplayQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [feedbackValues, setFeedbackValues] = useState(() =>
    createInitialFeedback(config),
  );
  const [loading, setLoading] = useState(false);
  const [redirectingAfterSubmit, setRedirectingAfterSubmit] = useState(false);
  const [assignedUidReadOnly, setAssignedUidReadOnly] = useState(false);
  const [pendingAssignedCallDetail, setPendingAssignedCallDetail] = useState(null);
  const [assignedCallLoader, setAssignedCallLoader] = useState(null);
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

  useEffect(() => {
    let isMounted = true;

    const appendDialerScript = () => {
      if (!isMounted || document.getElementById(DIALER_SCRIPT_ID)) {
        return;
      }

      const script = document.createElement("script");
      script.id = DIALER_SCRIPT_ID;
      script.src = `${import.meta.env.BASE_URL}dialerJs.js`;
      script.async = false;
      document.body.appendChild(script);
    };

    loadSocketIoClient(WEBHOOK_SOCKET_URL)
      .then(appendDialerScript)
      .catch((error) => {
        console.warn("[Campaign Webhook] Socket.IO client could not be loaded before dialer UI:", error);
        appendDialerScript();
      });

    return () => {
      isMounted = false;
      [
        DIALER_SCRIPT_ID,
        "vd-dialerStyle",
        "vd-dialerToggle",
        "vd-incomingCall",
        "vd-dialerPanel",
        "vd-dispositionModal",
        "vd-pauseModal",
      ].forEach((elementId) => {
        document.getElementById(elementId)?.remove();
      });

      delete window.dialerAPI;
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

  useEffect(() => {
    let socket;
    let isMounted = true;
    const retryTimers = [];

    const logAssignedCallDetail = async (callData, attempt = 1) => {
      try {
        const agentStatus = parseDialerAgentStatusCsv(await getMyDialerAgentStatus());
        const webhookMobileNumber = getComparablePhoneValue(callData?.caller);
        const agentMobileNumber = getComparablePhoneValue(agentStatus?.phone_number);
        const isMatchingAssignedCall =
          agentStatus?.status?.toUpperCase() === "INCALL" &&
          webhookMobileNumber &&
          agentMobileNumber === webhookMobileNumber;

        if (isMatchingAssignedCall) {
          console.log(
            `[Campaign Webhook] Selected agent live call detail: ${user.dialerUser || user.username} (${agentStatus.full_name || user.name})`,
            {
              agentName: agentStatus.full_name || user.name,
              mobileNumber: agentStatus.phone_number || callData.caller,
              callerId: agentStatus.callerid,
              vendorLeadCode: agentStatus.vendor_lead_code,
            },
          );
          setPendingAssignedCallDetail({
            callerId: agentStatus.callerid,
            vendorLeadCode: agentStatus.vendor_lead_code,
          });
          return;
        }

        if (attempt < AGENT_CALL_STATUS_ATTEMPTS) {
          retryTimers.push(
            window.setTimeout(
              () => logAssignedCallDetail(callData, attempt + 1),
              AGENT_CALL_STATUS_RETRY_MS,
            ),
          );
        } else if (agentStatus?.status?.toUpperCase() === "INCALL") {
          console.warn(
            "[Campaign Webhook] Agent is INCALL, but phone number did not match webhook caller.",
            {
              webhookMobileNumber,
              agentMobileNumber,
              agentName: agentStatus.full_name || user.name,
              callerId: agentStatus.callerid,
              vendorLeadCode: agentStatus.vendor_lead_code,
            },
          );
        }
      } catch (error) {
        if (attempt < AGENT_CALL_STATUS_ATTEMPTS) {
          retryTimers.push(
            window.setTimeout(
              () => logAssignedCallDetail(callData, attempt + 1),
              AGENT_CALL_STATUS_RETRY_MS,
            ),
          );
        } else {
          console.warn("[Campaign Webhook] Could not fetch assigned call detail.", error.message);
        }
      }
    };

    loadSocketIoClient(WEBHOOK_SOCKET_URL)
      .then((io) => {
        if (!isMounted || !io) {
          return;
        }

        socket = io(WEBHOOK_SOCKET_URL);
        socket.on("connect", () => {
          console.log("[Campaign Webhook] Agent listener connected", WEBHOOK_SOCKET_URL);
        });
        socket.on("campaign_call_observed", (callData) => {
          logAssignedCallDetail(callData);
        });
        socket.on("connect_error", (error) => {
          console.warn("[Campaign Webhook] Agent listener connection failed:", error.message);
        });
      })
      .catch((error) => {
        console.warn("[Campaign Webhook] Socket.IO client could not be loaded:", error);
      });

    return () => {
      isMounted = false;
      retryTimers.forEach((timerId) => window.clearTimeout(timerId));

      if (socket) {
        socket.disconnect();
      }
    };
  }, [user.dialerUser, user.name, user.username]);

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
  const baseRequiredFieldNames = useMemo(
    () => getRequiredFeedbackFieldNames(feedbackValues.subDisposition),
    [feedbackValues.subDisposition],
  );
  const lead = activeLead || config.emptyLead;
  const requiredFieldNames = useMemo(() => {
    const nextRequiredFieldNames = new Set(baseRequiredFieldNames);
    nextRequiredFieldNames.add("uid");
    return nextRequiredFieldNames;
  }, [baseRequiredFieldNames]);
  const editableFields = useMemo(
    () =>
      (config.editableFields || [])
        .filter((field) => field.name !== "reason")
        .filter((field) => field.name !== "nonPaymentReason")
        .filter((field) => isActiveFeedbackField(activeFieldNames, field.name))
        .map((field) => ({
          ...field,
          required: requiredFieldNames.has(field.name),
        })),
    [activeFieldNames, config.editableFields, requiredFieldNames],
  );
  const goDashboard = () => {
    setActiveLead(null);
    setPreviewLead(null);
    setSearchResults([]);
    setSearchQuery("");
    setSearchDisplayQuery("");
    setFeedbackValues(createInitialFeedback(config));
    setAssignedUidReadOnly(false);
    setNotice(null);
  };

  const updateSearchQuery = (value) => {
    const nextValue = value == null ? "" : String(value);

    if (/^\d+$/.test(nextValue)) {
      setSearchQuery(nextValue);
      setSearchDisplayQuery(maskMobileNumber(nextValue));
      return;
    }

    setSearchQuery(nextValue);
    setSearchDisplayQuery(nextValue);
  };

  const handleSearchChange = (event) => {
    const nextDisplayValue = event.target.value;

    if (!/^\d+$/.test(searchQuery) || !nextDisplayValue.includes("*")) {
      updateSearchQuery(nextDisplayValue);
    }
  };

  const handleSearchKeyDown = (event) => {
    if (!/^\d+$/.test(searchQuery)) {
      return;
    }

    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? searchDisplayQuery.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      updateSearchQuery(
        `${searchQuery.slice(0, selectionStart)}${event.key}${searchQuery.slice(selectionEnd)}`,
      );
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      if (selectionStart !== selectionEnd) {
        updateSearchQuery(`${searchQuery.slice(0, selectionStart)}${searchQuery.slice(selectionEnd)}`);
      } else {
        updateSearchQuery(`${searchQuery.slice(0, Math.max(0, selectionStart - 1))}${searchQuery.slice(selectionEnd)}`);
      }
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      if (selectionStart !== selectionEnd) {
        updateSearchQuery(`${searchQuery.slice(0, selectionStart)}${searchQuery.slice(selectionEnd)}`);
      } else {
        updateSearchQuery(`${searchQuery.slice(0, selectionStart)}${searchQuery.slice(selectionEnd + 1)}`);
      }
    }
  };

  const handleSearchPaste = (event) => {
    const pastedText = event.clipboardData.getData("text").trim();

    if (!pastedText) {
      return;
    }

    event.preventDefault();
    updateSearchQuery(pastedText);
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

  const openLead = async (leadId, options = {}) => {
    setLoading(true);
    setNotice(null);

    try {
      const uidOverride = cleanUidValue(options.uid);
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
        ...(uidOverride ? { uid: uidOverride } : {}),
        status: bestDispoGroup?.name || "",
        disposition: bestDispoGroup?.name || "",
        subDisposition: cleanFeedbackValue(fullLead.bestDispoInternal),
      });
      setAssignedUidReadOnly(Boolean(uidOverride));
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pendingAssignedCallDetail) {
      return undefined;
    }

    let isCancelled = false;

    const openAssignedLead = async () => {
      const vendorLeadCode = cleanFeedbackValue(pendingAssignedCallDetail.vendorLeadCode);
      const callerId = cleanUidValue(pendingAssignedCallDetail.callerId);

      if (!vendorLeadCode) {
        setPendingAssignedCallDetail(null);
        return;
      }

      updateSearchQuery(vendorLeadCode);
      setAssignedCallLoader({ vendorLeadCode, callerId });
      setLoading(true);
      setNotice(null);

      try {
        await new Promise((resolve) =>
          window.setTimeout(resolve, ASSIGNED_CALL_SEARCH_DELAY_MS),
        );

        if (isCancelled) {
          return;
        }

        const results = await searchConsumerLeads(vendorLeadCode, config.key);
        const normalizedResults = results.map(normalizeLead);

        if (isCancelled) {
          return;
        }

        setPreviewLead(null);
        setSearchResults([]);

        if (normalizedResults.length === 0) {
          notify(`No record found for vendor lead code ${vendorLeadCode}.`, "warning");
          return;
        }

        await openLead(normalizedResults[0].id, { uid: callerId });
      } catch (error) {
        if (!isCancelled) {
          notify(error.message, "error");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setAssignedCallLoader(null);
          setPendingAssignedCallDetail(null);
        }
      }
    };

    openAssignedLead();

    return () => {
      isCancelled = true;
    };
  }, [pendingAssignedCallDetail]);

  const onFeedbackChange = (name, value) => {
    if (name === "uid" && assignedUidReadOnly) {
      return;
    }

    setFeedbackValues((current) => {
      const nextValues = {
        ...current,
        [name]: name === "uid" ? cleanUidValue(value) : value,
      };

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
        setSearchDisplayQuery("");
        setFeedbackValues(createInitialFeedback(config));
        setAssignedUidReadOnly(false);
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
      {assignedCallLoader && (
        <div
          className="assigned-call-loader"
          role="status"
          aria-live="polite"
          aria-label="Opening assigned call"
        >
          <div className="assigned-call-loader__panel">
            <span className="assigned-call-loader__spinner" aria-hidden="true" />
            <strong>Opening assigned call</strong>
            <p>
              Searching lead{" "}
              <span>{assignedCallLoader.vendorLeadCode}</span>
            </p>
          </div>
        </div>
      )}
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
              <div className="search-mask-field">
                <input
                  autoComplete="off"
                  className="search-mask-field__input"
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onPaste={handleSearchPaste}
                  placeholder="Mobile number or loan account number"
                  type="text"
                  value={searchDisplayQuery}
                />
              </div>
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
                    <span>{maskMobileNumber(result.mobileNumber)}</span>
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
                          value={getLeadDisplayValue(lead, field.name)}
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
                    <TextField
                      field={{
                        label: "UID",
                        name: "uid",
                        placeholder: "1 letter + 19 digits",
                        maxLength: 20,
                        required: true,
                        readOnly: assignedUidReadOnly,
                        help: "Required. First character must be a letter followed by 19 digits.",
                      }}
                      onChange={onFeedbackChange}
                      value={feedbackValues.uid || ""}
                    />
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
                    {(requiresNonPaymentReason(feedbackValues.disposition) ||
                      isActiveFeedbackField(activeFieldNames, "nonPaymentReason")) && (
                      <SelectField
                        field={{
                          label: "Non Payment Reason",
                          name: "nonPaymentReason",
                          options: config.reasonOptions || [],
                          required: requiresNonPaymentReason(feedbackValues.disposition),
                          help: requiresNonPaymentReason(feedbackValues.disposition)
                            ? "Dropdown. Mandatory for Positive and Contacted dispositions."
                            : "Dropdown. Reason customer refused or could not pay.",
                        }}
                        onChange={onFeedbackChange}
                        value={feedbackValues.nonPaymentReason || ""}
                      />
                    )}
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
