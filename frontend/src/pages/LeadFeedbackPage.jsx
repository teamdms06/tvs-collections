import { useMemo, useState } from "react";
import {
  getConsumerLeadById,
  saveConsumerFeedback,
  searchConsumerLeads,
} from "../api/leads";

const initialFeedback = {
  status: "",
  disposition: "",
  subDisposition: "",
  paymentMode: "",
  reason: "",
};

function FieldValue({ label, value, highlight }) {
  return (
    <div className={highlight ? "data-row data-row--highlight" : "data-row"}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function SelectField({ field, value, onChange }) {
  const sortedOptions = [...field.options].sort((first, second) =>
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
  const [feedbackValues, setFeedbackValues] = useState(initialFeedback);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const selectedGroup = useMemo(
    () =>
      config.dispositionGroups.find(
        (group) => group.name === feedbackValues.disposition,
      ),
    [config.dispositionGroups, feedbackValues.disposition],
  );

  const subDispositionOptions = selectedGroup?.options || [];
  const lead = activeLead || config.emptyLead;

  const goDashboard = () => {
    setActiveLead(null);
    setPreviewLead(null);
    setSearchResults([]);
    setSearchQuery("");
    setFeedbackValues(initialFeedback);
    setNotice("");
  };

  const onSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    console.log(searchQuery);
    console.log(config.key);
    try {
      const results = await searchConsumerLeads(searchQuery, config.key);
      setSearchResults(results);

      if (results.length === 1) {
        setPreviewLead(results[0]);
      }

      if (results.length === 0) {
        setNotice(
          "No record found for this mobile number or loan account number.",
        );
      }
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openLead = async (leadId) => {
    setLoading(true);
    setNotice("");

    try {
      const fullLead = await getConsumerLeadById(leadId, config.key);
      const bestDispoGroup = config.dispositionGroups.find((group) =>
        group.options.includes(fullLead.bestDispoInternal),
      );
      setActiveLead(fullLead);
      setPreviewLead(null);
      setFeedbackValues({
        ...initialFeedback,
        status: bestDispoGroup?.name || "",
        disposition: bestDispoGroup?.name || "",
        subDisposition: fullLead.bestDispoInternal || "",
      });
    } catch (error) {
      setNotice(error.message);
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
    if (!activeLead) {
      setNotice("Search and open a record before saving feedback.");
      return;
    }

    setLoading(true);
    setNotice("");

    try {
      await saveConsumerFeedback(activeLead.id, feedbackValues, config.key);
      const refreshedLead = await getConsumerLeadById(
        activeLead.id,
        config.key,
      );
      setActiveLead(refreshedLead);
      setNotice("Feedback saved for this lead.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="workspace-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Collections feedback</p>
          <h1>{config.label}</h1>
        </div>
        {notice && <p className="notice">{notice}</p>}
        <nav aria-label="Role based forms">
          <button
            className="access-pill access-pill--active"
            onClick={goDashboard}
            type="button"
          >
            Dashboard
          </button>
          <form className="search-box" onSubmit={onSearch}>
            <label>
              <span>Search record</span>
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
          <button className="secondary-action" onClick={onLogout} type="button">
            Logout
          </button>
        </nav>
      </header>

      {searchResults.length > 1 && (
        <section className="results-panel" aria-label="Search results">
          {searchResults.map((result) => (
            <button
              className="result-row"
              key={result.id}
              onClick={() => setPreviewLead(result)}
              type="button"
            >
              <strong>{result.customerName}</strong>
              <span>{result.agreementNumber}</span>
              <span>{result.mobileNumber}</span>
              <b>Preview</b>
            </button>
          ))}
        </section>
      )}

      {!activeLead && (
        <section className="empty-state">
          <h2>{user.name} Dashboard</h2>
          <p>Search and open a {config.label} lead to start feedback.</p>
        </section>
      )}

      {activeLead && (
        <>
          <section className="lead-strip" aria-label="Current lead">
            <FieldValue label="Portfolio" value={lead.portfolio} />
            <FieldValue label="DFX Bucket" value={lead.bucket} />
            <FieldValue label="Agreement Number" value={lead.agreementNumber} />
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
                  <span>Fetched from upload data</span>
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
                  <span>Fetched from database</span>
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

              <section className="panel history-panel">
                <div className="panel-title">
                  <h2>History</h2>
                  <span>Previous attempts</span>
                </div>
                <ol>
                  {lead.history.map((item) => (
                    <li key={`${item.date}-${item.disposition}-${item.remark}`}>
                      <time>{item.date}</time>
                      <strong>{item.disposition}</strong>
                      <span>{item.remark}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </aside>

            <section
              className="panel feedback-panel"
              aria-label="Feedback form"
            >
              <div className="feedback-heading">
                <div>
                  <p className="eyebrow">Agent editable fields</p>
                  <h2>Feedback Form</h2>
                </div>
                <div className="status-card">
                  <span>Status</span>
                  <strong>
                    {selectedGroup?.name || feedbackValues.status || "-"}
                  </strong>
                </div>
              </div>

              <form className="feedback-form">
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
                <SelectField
                  field={{
                    label: "Payment Mode",
                    name: "paymentMode",
                    options: config.paymentModes,
                    required: true,
                    help: "Dropdown required for payment or pickup dispositions.",
                  }}
                  onChange={onFeedbackChange}
                  value={feedbackValues.paymentMode}
                />
                <SelectField
                  field={{
                    label: config.reasonLabel,
                    name: "reason",
                    options: config.reasonOptions,
                    required: true,
                    help: "Dropdown for non-payment or refusal reason.",
                  }}
                  onChange={onFeedbackChange}
                  value={feedbackValues.reason}
                />

                {config.editableFields.map((field) =>
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
                <button className="secondary-action" type="button">
                  Save Draft
                </button>
                <button
                  className="primary-action"
                  onClick={saveFeedback}
                  type="button"
                >
                  Submit Feedback
                </button>
              </div>
            </section>
          </section>
        </>
      )}

      <SearchModal
        lead={previewLead}
        onClose={() => setPreviewLead(null)}
        onOpen={openLead}
      />
    </main>
  );
}
