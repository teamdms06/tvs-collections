import { useState } from "react";
import { exportFeedbackData } from "../../api/admin";

export default function ExportDataPage({ notify }) {
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [, setExportError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (mode = "all") => {
    const today = new Date().toISOString().slice(0, 10);
    const hasStartDate = Boolean(exportStartDate);
    const hasEndDate = Boolean(exportEndDate);
    const effectiveStartDate = hasStartDate || hasEndDate ? exportStartDate : today;
    const effectiveEndDate = hasStartDate || hasEndDate ? exportEndDate : today;

    if (!effectiveStartDate || !effectiveEndDate) {
      notify("Select both start date and end date.", "warning");
      setExportError("Select both start date and end date.");
      return;
    }

    if (effectiveEndDate < effectiveStartDate) {
      notify("End date must be after start date.", "warning");
      setExportError("End date must be after start date.");
      return;
    }

    setIsExporting(true);
    setExportError("");
    notify("Preparing feedback Excel.", "info");

    try {
      const { blob, fileName } = await exportFeedbackData(
        effectiveStartDate,
        effectiveEndDate,
        mode,
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify(
        mode === "latest"
          ? "Latest record Excel exported successfully."
          : "All feedback Excel exported successfully.",
        "success",
      );
    } catch (error) {
      const message = error.message || "Could not export feedback data.";
      setExportError(message);
      notify(message, "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="admin-card admin-card--wide">
      <h2>Export Data</h2>
      <form className="admin-export-form" onSubmit={(event) => event.preventDefault()}>
        <label className="form-field">
          <span>Start date</span>
          <input
            onChange={(event) => {
              setExportStartDate(event.target.value);
              setExportError("");
            }}
            type="date"
            value={exportStartDate}
          />
        </label>
        <label className="form-field">
          <span>End date</span>
          <input
            onChange={(event) => {
              setExportEndDate(event.target.value);
              setExportError("");
            }}
            type="date"
            value={exportEndDate}
          />
        </label>
        <button
          className="primary-action"
          disabled={isExporting}
          onClick={() => handleExport("all")}
          type="button"
        >
          {isExporting ? "Exporting..." : "Export All Feedback"}
        </button>
        <button
          className="secondary-action"
          disabled={isExporting}
          onClick={() => handleExport("latest")}
          type="button"
        >
          {isExporting ? "Exporting..." : "Export Latest Records"}
        </button>
      </form>
    </section>
  );
}
