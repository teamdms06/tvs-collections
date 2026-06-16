import { useEffect, useMemo, useState } from "react";
import { getUploadedFiles, updateUploadedFileAccess, uploadNcRecordFile, getUploadProgress } from "../../api/admin";
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
  const [selectedNcProduct, setSelectedNcProduct] = useState(defaultProduct);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedNcFile, setSelectedNcFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [ncUploadResult, setNcUploadResult] = useState(null);
  const [, setUploadError] = useState("");
  const [, setNcUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingNcRecords, setIsUploadingNcRecords] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [ncUploadProgress, setNcUploadProgress] = useState(null);
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

  const resetUploadProgress = () => {
    setUploadProgress(null);
  };

  const resetNcUploadProgress = () => {
    setNcUploadProgress(null);
  };

  const formatFileSize = (bytes) => {
    const size = Number(bytes || 0);

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getRecordPercent = (progress) => {
    if (!progress?.estimatedTotalRecords) {
      return progress?.status === "completed" ? 100 : 0;
    }

    return Math.min(
      100,
      Math.round(((progress.recordsSaved || 0) / progress.estimatedTotalRecords) * 100),
    );
  };

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
    const progressId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let progressTimer = null;
    setUploadProgress({
      progressId,
      phase: "uploading",
      status: "running",
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      uploadPercent: 0,
      recordsSaved: 0,
      estimatedTotalRecords: null,
      message: "Preparing upload",
    });
    notify("Uploading file. Please wait.", "info");

    try {
      progressTimer = window.setInterval(async () => {
        try {
          const progress = await getUploadProgress(progressId);
          setUploadProgress((current) => ({
            ...(current || {}),
            ...progress,
            uploadPercent: current?.uploadPercent ?? 100,
          }));
        } catch {
          // The backend creates the progress entry after the file reaches the server.
        }
      }, 700);

      const result = await uploadLeadFile(selectedFile, selectedProduct, {
        progressId,
        onUploadProgress: (progress) => {
          setUploadProgress((current) => ({
            ...(current || {}),
            phase: progress.percent >= 100 ? "processing" : "uploading",
            status: "running",
            uploadPercent: progress.percent,
            uploadedBytes: progress.loaded,
            fileSize: progress.total || selectedFile.size,
            message:
              progress.percent >= 100
                ? "File uploaded. Reading Excel rows..."
                : "Uploading file to server",
          }));
        },
      });
      setUploadResult(result);
      setUploadProgress((current) => ({
        ...(current || {}),
        phase: "completed",
        status: "completed",
        uploadPercent: 100,
        recordsSaved: result.validRecords || 0,
        recordsRead: result.totalRecords || 0,
        estimatedTotalRecords: result.totalRecords || 0,
        uploadFileId: result.uploadFileId,
        message: "Upload completed",
      }));
      setSelectedFile(null);
      setRefreshKey((current) => current + 1);
      uploadForm.reset();
      notify("Data uploaded successfully.", "success");
    } catch (error) {
      const message = error.message || "Upload failed.";
      setUploadError(message);
      setUploadProgress((current) => ({
        ...(current || {}),
        phase: "failed",
        status: "failed",
        message,
      }));
      notify(message, "error");
    } finally {
      if (progressTimer) {
        window.clearInterval(progressTimer);
      }
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

  const handleNcUpload = async (event) => {
    event.preventDefault();
    const uploadForm = event.currentTarget;

    if (!selectedNcFile) {
      notify("Please select an NC Excel file.", "warning");
      setNcUploadError("Please select an NC Excel file.");
      return;
    }

    setIsUploadingNcRecords(true);
    setNcUploadError("");
    setNcUploadResult(null);
    const progressId = `nc-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let progressTimer = null;
    setNcUploadProgress({
      progressId,
      phase: "uploading",
      status: "running",
      fileName: selectedNcFile.name,
      fileSize: selectedNcFile.size,
      uploadPercent: 0,
      recordsSaved: 0,
      estimatedTotalRecords: null,
      message: "Preparing upload",
    });
    notify("Uploading NC records. Please wait.", "info");

    try {
      progressTimer = window.setInterval(async () => {
        try {
          const progress = await getUploadProgress(progressId);
          setNcUploadProgress((current) => ({
            ...(current || {}),
            ...progress,
            uploadPercent: current?.uploadPercent ?? 100,
          }));
        } catch {
          // The backend creates the progress entry after the file reaches the server.
        }
      }, 700);

      const result = await uploadNcRecordFile(selectedNcFile, selectedNcProduct, {
        progressId,
        onUploadProgress: (progress) => {
          setNcUploadProgress((current) => ({
            ...(current || {}),
            phase: progress.percent >= 100 ? "processing" : "uploading",
            status: "running",
            uploadPercent: progress.percent,
            uploadedBytes: progress.loaded,
            fileSize: progress.total || selectedNcFile.size,
            message:
              progress.percent >= 100
                ? "File uploaded. Reading Excel rows..."
                : "Uploading file to server",
          }));
        },
      });
      setNcUploadResult(result);
      setNcUploadProgress((current) => ({
        ...(current || {}),
        phase: "completed",
        status: "completed",
        uploadPercent: 100,
        recordsSaved: result.updatedRecords || 0,
        recordsRead: result.totalRecords || 0,
        estimatedTotalRecords: result.totalRecords || 0,
        message: "Upload completed",
      }));
      setSelectedNcFile(null);
      setRefreshKey((current) => current + 1);
      uploadForm.reset();
      notify("NC records uploaded successfully.", "success");
    } catch (error) {
      const message = error.message || "NC record upload failed.";
      setNcUploadError(message);
      setNcUploadProgress((current) => ({
        ...(current || {}),
        phase: "failed",
        status: "failed",
        message,
      }));
      notify(message, "error");
    } finally {
      if (progressTimer) {
        window.clearInterval(progressTimer);
      }
      setIsUploadingNcRecords(false);
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
                resetUploadProgress();
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

          {uploadProgress && (
            <div className={`upload-progress upload-progress--${uploadProgress.status}`}>
              <div className="upload-progress__header">
                <div>
                  <span>{uploadProgress.status === "failed" ? "Upload failed" : "Upload progress"}</span>
                  <strong>{uploadProgress.fileName || selectedFile?.name || "Selected file"}</strong>
                </div>
                <b>
                  {formatFileSize(uploadProgress.uploadedBytes || 0)} /{" "}
                  {formatFileSize(uploadProgress.fileSize || selectedFile?.size || 0)}
                </b>
              </div>

              <div className="upload-progress__steps" aria-label="Upload progress">
                <div
                  className={
                    uploadProgress.uploadPercent >= 100
                      ? "upload-progress-step upload-progress-step--done"
                      : "upload-progress-step upload-progress-step--active"
                  }
                >
                  <span>1</span>
                  <strong>Transfer file</strong>
                  <small>{uploadProgress.uploadPercent || 0}%</small>
                </div>
                <div
                  className={
                    uploadProgress.phase === "completed"
                      ? "upload-progress-step upload-progress-step--done"
                      : uploadProgress.phase === "processing"
                        ? "upload-progress-step upload-progress-step--active"
                        : "upload-progress-step"
                  }
                >
                  <span>2</span>
                  <strong>Read and save rows</strong>
                  <small>{formatNumber(uploadProgress.recordsSaved || 0)} saved</small>
                </div>
                <div
                  className={
                    uploadProgress.phase === "completed"
                      ? "upload-progress-step upload-progress-step--done"
                      : "upload-progress-step"
                  }
                >
                  <span>3</span>
                  <strong>Complete</strong>
                  <small>{uploadProgress.uploadFileId ? `File ID ${uploadProgress.uploadFileId}` : "Waiting"}</small>
                </div>
              </div>

              <div className="upload-progress__bar" aria-hidden="true">
                <span style={{ width: `${uploadProgress.uploadPercent || 0}%` }} />
              </div>
              <div className="upload-progress__bar upload-progress__bar--records" aria-hidden="true">
                <span style={{ width: `${getRecordPercent(uploadProgress)}%` }} />
              </div>

              <p>
                {uploadProgress.message || "Working..."}
                {uploadProgress.estimatedTotalRecords
                  ? ` (${formatNumber(uploadProgress.recordsSaved || 0)} of ${formatNumber(uploadProgress.estimatedTotalRecords)} records)`
                  : ""}
              </p>
            </div>
          )}

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
        <h2>Upload NC Records</h2>
        <form className="admin-upload-form" onSubmit={handleNcUpload}>
          <label className="form-field">
            <span>Product</span>
            <select
                value={selectedNcProduct}
                onChange={(event) => setSelectedNcProduct(event.target.value)}
              >
                {accessibleProducts.map((productKey) => (
                  <option key={productKey} value={productKey}>
                    {productConfigs[productKey]?.label || productKey}
                  </option>
                ))}
              </select>
          </label>
          <label className="upload-box upload-box--admin">
            <span>Upload NC data</span>
            <input
              accept=".xlsx,.xls"
              onChange={(event) => {
                setSelectedNcFile(event.target.files?.[0] || null);
                setNcUploadError("");
                setNcUploadResult(null);
                resetNcUploadProgress();
              }}
              type="file"
            />
            <strong>
              {selectedNcFile ? selectedNcFile.name : "Excel file with listid, mobile number, dispo, UID"}
            </strong>
          </label>

          <button className="primary-action" disabled={isUploadingNcRecords} type="submit">
            {isUploadingNcRecords ? "Uploading..." : "Upload NC Records"}
          </button>

          {ncUploadProgress && (
            <div className={`upload-progress upload-progress--${ncUploadProgress.status}`}>
              <div className="upload-progress__header">
                <div>
                  <span>{ncUploadProgress.status === "failed" ? "Upload failed" : "Upload progress"}</span>
                  <strong>{ncUploadProgress.fileName || selectedNcFile?.name || "Selected file"}</strong>
                </div>
                <b>
                  {formatFileSize(ncUploadProgress.uploadedBytes || 0)} /{" "}
                  {formatFileSize(ncUploadProgress.fileSize || selectedNcFile?.size || 0)}
                </b>
              </div>

              <div className="upload-progress__steps" aria-label="Upload progress">
                <div
                  className={
                    ncUploadProgress.uploadPercent >= 100
                      ? "upload-progress-step upload-progress-step--done"
                      : "upload-progress-step upload-progress-step--active"
                  }
                >
                  <span>1</span>
                  <strong>Transfer file</strong>
                  <small>{ncUploadProgress.uploadPercent || 0}%</small>
                </div>
                <div
                  className={
                    ncUploadProgress.phase === "completed"
                      ? "upload-progress-step upload-progress-step--done"
                      : ncUploadProgress.phase === "processing"
                        ? "upload-progress-step upload-progress-step--active"
                        : "upload-progress-step"
                  }
                >
                  <span>2</span>
                  <strong>Read and save rows</strong>
                  <small>{formatNumber(ncUploadProgress.recordsSaved || 0)} saved</small>
                </div>
                <div
                  className={
                    ncUploadProgress.phase === "completed"
                      ? "upload-progress-step upload-progress-step--done"
                      : "upload-progress-step"
                  }
                >
                  <span>3</span>
                  <strong>Complete</strong>
                  <small>{ncUploadProgress.uploadFileId ? `File ID ${ncUploadProgress.uploadFileId}` : "Waiting"}</small>
                </div>
              </div>

              <div className="upload-progress__bar" aria-hidden="true">
                <span style={{ width: `${ncUploadProgress.uploadPercent || 0}%` }} />
              </div>
              <div className="upload-progress__bar upload-progress__bar--records" aria-hidden="true">
                <span style={{ width: `${getRecordPercent(ncUploadProgress)}%` }} />
              </div>

              <p>
                {ncUploadProgress.message || "Working..."}
                {ncUploadProgress.estimatedTotalRecords
                  ? ` (${formatNumber(ncUploadProgress.recordsSaved || 0)} of ${formatNumber(ncUploadProgress.estimatedTotalRecords)} records)`
                  : ""}
              </p>
            </div>
          )}

          {ncUploadResult && (
            <div className="upload-summary">
              <span>NC upload completed</span>
              <strong>{formatNumber(ncUploadResult.updatedRecords)} records uploaded</strong>
              <p>
                Total {formatNumber(ncUploadResult.totalRecords)} - Uploaded{" "}
                {formatNumber(ncUploadResult.updatedRecords)} - Failed {formatNumber(ncUploadResult.failedRecords)}
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
