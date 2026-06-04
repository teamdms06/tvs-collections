package com.tvscollections.backend.service;

import com.tvscollections.backend.dto.UploadProgressDto;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UploadProgressService {
    private final Map<String, UploadProgressDto> progressById = new ConcurrentHashMap<>();

    public void start(String progressId, String fileName) {
        if (isBlank(progressId)) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        progressById.put(progressId, new UploadProgressDto(
                progressId,
                "uploading",
                "running",
                fileName,
                null,
                null,
                0,
                0,
                "Uploading file to server",
                now,
                now
        ));
    }

    public void processing(String progressId, Long uploadFileId, Integer estimatedTotalRecords) {
        update(progressId, progress -> {
            progress.phase = "processing";
            progress.status = "running";
            progress.uploadFileId = uploadFileId;
            progress.estimatedTotalRecords = estimatedTotalRecords;
            progress.message = "Reading Excel rows and saving records";
        });
    }

    public void batchSaved(String progressId, int recordsRead, int recordsSaved) {
        update(progressId, progress -> {
            progress.phase = "processing";
            progress.status = "running";
            progress.recordsRead = recordsRead;
            progress.recordsSaved = recordsSaved;
            progress.message = recordsSaved + " records saved";
        });
    }

    public void complete(String progressId, int recordsSaved) {
        update(progressId, progress -> {
            progress.phase = "completed";
            progress.status = "completed";
            progress.recordsRead = recordsSaved;
            progress.recordsSaved = recordsSaved;
            progress.estimatedTotalRecords = recordsSaved;
            progress.message = "Upload completed";
        });
    }

    public void fail(String progressId, String message) {
        update(progressId, progress -> {
            progress.phase = "failed";
            progress.status = "failed";
            progress.message = message == null || message.isBlank() ? "Upload failed" : message;
        });
    }

    public UploadProgressDto get(String progressId) {
        if (isBlank(progressId)) {
            return null;
        }

        return progressById.get(progressId);
    }

    private void update(String progressId, ProgressUpdater updater) {
        if (isBlank(progressId)) {
            return;
        }

        progressById.computeIfPresent(progressId, (id, progress) -> {
            updater.update(progress);
            progress.updatedAt = LocalDateTime.now();
            return progress;
        });
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    @FunctionalInterface
    private interface ProgressUpdater {
        void update(UploadProgressDto progress);
    }
}
