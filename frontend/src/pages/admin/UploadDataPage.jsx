import { useEffect, useMemo, useState } from "react";
import { getUploadedFiles, updateUploadedFileAccess } from "../../api/admin";
import { uploadLeadFile } from "../../api/leads";
import { productConfigs } from "../../data/formConfigs";
import { DataTable, StatusBadge } from "./shared";
import { formatDateTime, formatNumber } from "./utils";

export default function UploadDataPage({ notify, user }) {
  const accessibleProducts = useMemo(
    () =>
      user.accessProducts && user.accessProducts.length > 0
        ? user.accessProducts
        : Object.keys(productConfigs),
    [user.accessProducts],
  );
  const defaultProduct = accessibleProducts.includes("retail")
    ? "retail"
    : accessibleProducts[0] || "retail";
  const [selectedProduct, setSelectedProduct] = useState(defaultProduct);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadsError, setUploadsError] = useState("");
  const [updatingUploadId, setUpdatingUploadId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadUploadedFiles = async () => {
      setUploadsError("");

      try {
        const data = await getUploadedFiles();
        if (isActive) {
          setUploadedFiles(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isActive) {
          setUploadsError(error.message || "Could not load uploaded files.");
        }
      }
    };

    loadUploadedFiles();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const handleUpload = async (event) => {
    event.preventDefault();
    const uploadForm = event.currentTarget;

    if (!selectedFile) {
      notify("Please select an Excel file.", "warning");
      setUploadError("Please select an Excel file.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadResult(null);
    notify("Uploading file. Please wait.", "info");

    try {
      const result = await uploadLeadFile(selectedFile, selectedProduct);
      setUploadResult(result);
      setSelectedFile(null);
      setRefreshKey((current) => current + 1);
      uploadForm.reset();
      notify("Data uploaded successfully.", "success");
    } catch (error) {
      const message = error.message || "Upload failed.";
      setUploadError(message);
      notify(message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const changeUploadAccess = async (uploadId, isActive) => {
    setUpdatingUploadId(uploadId);
    setUploadsError("");

    try {
      const updatedUpload = await updateUploadedFileAccess(uploadId, isActive);
      setUploadedFiles((current) =>
        current.map((upload) => (upload.id === uploadId ? updatedUpload : upload)),
      );
      setRefreshKey((current) => current + 1);
      notify(
        isActive ? "Uploaded file activated." : "Uploaded file deactivated.",
        "success",
      );
    } catch (error) {
      const message = error.message || "Could not update uploaded file access.";
      setUploadsError(message);
      notify(message, "error");
    } finally {
      setUpdatingUploadId(null);
    }
  };

  return (
    <div className="admin-dashboard-stack">
      <section className="admin-card admin-card--wide">
        <h2>Upload Data</h2>
        <form className="admin-upload-form" onSubmit={handleUpload}>
          <label className="form-field">
            <span>Product</span>
            <select
              value={selectedProduct}
              onChange={(event) => setSelectedProduct(event.target.value)}
            >
              {accessibleProducts.map((productKey) => (
                <option key={productKey} value={productKey}>
                  {productConfigs[productKey]?.label || productKey}
                </option>
              ))}
            </select>
          </label>

          <label className="upload-box upload-box--admin">
            <span>Upload lead data</span>
            <input
              accept=".xlsx,.xls"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] || null);
                setUploadError("");
                setUploadResult(null);
              }}
              type="file"
            />
            <strong>
              {selectedFile ? selectedFile.name : "Excel file with Retail format columns"}
            </strong>
          </label>

          <button className="primary-action" disabled={isUploading} type="submit">
            {isUploading ? "Uploading..." : "Upload to Database"}
          </button>

          {uploadResult && (
            <div className="upload-summary">
              <span>Upload completed</span>
              <strong>{uploadResult.validRecords} records saved</strong>
              <p>
                File ID {uploadResult.uploadFileId} - Total {uploadResult.totalRecords} -
                Failed {uploadResult.failedRecords}
              </p>
            </div>
          )}
        </form>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Previously Uploaded Files</h2>
        {uploadsError && <p className="notice notice--error">{uploadsError}</p>}
        <DataTable
          columns={[
            {
              key: "fileName",
              label: "File",
              render: (upload) => <strong>{upload.fileName}</strong>,
            },
            {
              key: "productName",
              label: "Product",
              render: (upload) => upload.productName || upload.productCode || "-",
            },
            {
              key: "validRecords",
              label: "Records",
              render: (upload) =>
                `${formatNumber(upload.validRecords)} / ${formatNumber(upload.totalRecords)}`,
              sortValue: (upload) => upload.validRecords || 0,
            },
            {
              key: "status",
              label: "Status",
              render: (upload) => (
                <StatusBadge status={upload.status || "-"} inactive={upload.status === "inactive"} />
              ),
            },
            {
              key: "uploadedAt",
              label: "Uploaded",
              render: (upload) => formatDateTime(upload.uploadedAt),
              sortValue: (upload) => upload.uploadedAt || "",
            },
            {
              key: "action",
              label: "Action",
              searchable: false,
              sortable: false,
              render: (upload) => {
                const isInactive = upload.status === "inactive";
                const isUpdating = updatingUploadId === upload.id;

                return (
                  <button
                    className={isInactive ? "secondary-action" : "danger-action"}
                    disabled={isUpdating}
                    onClick={() => changeUploadAccess(upload.id, isInactive)}
                    type="button"
                  >
                    {isUpdating ? "Updating..." : isInactive ? "Activate" : "Deactivate"}
                  </button>
                );
              },
            },
          ]}
          emptyText="No uploaded files found."
          rows={uploadedFiles}
          searchPlaceholder="Search uploaded files"
        />
      </section>
    </div>
  );
}
