package com.tvscollections.backend.service;

import com.tvscollections.backend.dto.AdminDashboardDto;
import com.tvscollections.backend.dto.ActiveUserDto;
import com.tvscollections.backend.dto.RecentUploadDto;
import com.tvscollections.backend.model.Feedback;
import com.tvscollections.backend.model.UploadFileData;
import com.tvscollections.backend.repository.FeedbackRepository;
import com.tvscollections.backend.repository.UploadFileDataRepository;
import com.tvscollections.backend.repository.UploadFileRepository;
import com.tvscollections.backend.repository.UserRepository;
import com.tvscollections.backend.model.UploadStatus;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class AdminDashboardService {
    private static final int EXPORT_PAGE_SIZE = 1000;
    private static final int EXPORT_ROW_WINDOW_SIZE = 100;

    private static final String[] FEEDBACK_EXPORT_HEADERS = {
            "UID",
            "list id",
            "Call Date",
            "Call Time",
            "Agreement Number",
            "Full Name",
            "Status",
            "Disposition",
            "Customer Name",
            "Mobile Number",
            "Alternate Mobile Number",
            "Portfolio",
            "Address",
            "CITY",
            "PINCODE",
            "Region",
            "Zone",
            "Language",
            "Product",
            "Model",
            "EMI",
            "Askable",
            "CBC Charges",
            "Total Outstanding",
            "PTP/Paid/Pickup Amount",
            "PTP/Paid/Pickup Date",
            "Transaction Receipt No",
            "Pickup Time",
            "Pickup Address",
            "Payment Mode",
            "Paid to whom (Name)",
            "Paid to whom (Contact no)",
            "Paid Showroom",
            "Call Back Date",
            "Call Back Time",
            "Non Payment reason (WHY Customer Refusing Pay)",
            "Customer Bouncing Reason (Why Emi Is Bounced)",
            "Remark",
            "Agent Name"
    };

    private final UploadFileRepository uploadFileRepository;
    private final UploadFileDataRepository uploadFileDataRepository;
    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final ActiveUserTrackerService activeUserTrackerService;

    public AdminDashboardService(UploadFileRepository uploadFileRepository,
                                 UploadFileDataRepository uploadFileDataRepository,
                                 FeedbackRepository feedbackRepository,
                                 UserRepository userRepository,
                                 ActiveUserTrackerService activeUserTrackerService) {
        this.uploadFileRepository = uploadFileRepository;
        this.uploadFileDataRepository = uploadFileDataRepository;
        this.feedbackRepository = feedbackRepository;
        this.userRepository = userRepository;
        this.activeUserTrackerService = activeUserTrackerService;
    }

    @Transactional(readOnly = true)
    public AdminDashboardDto getDashboard() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime tomorrowStart = todayStart.plusDays(1);
        List<ActiveUserDto> activeNonAdminUsers = getActiveNonAdminUsers();

        return new AdminDashboardDto(
                uploadFileRepository.countByStatusNot(UploadStatus.inactive),
                uploadFileDataRepository.countByUploadFile_StatusNot(UploadStatus.inactive),
                feedbackRepository.count(),
                feedbackRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(todayStart, tomorrowStart),
                userRepository.countNotAdminRole(),
                userRepository.countByIsActiveTrueNotAdminRole(),
                (long) activeNonAdminUsers.size(),
                uploadFileRepository.countByUploadedAtGreaterThanEqualAndUploadedAtLessThan(todayStart, tomorrowStart),
                LocalDateTime.now(),
                uploadFileDataRepository.countLeadsByProduct(UploadStatus.inactive),
                activeNonAdminUsers,
                uploadFileRepository.findRecentUploads(PageRequest.of(0, 5))
        );
    }

    @Transactional(readOnly = true)
    public List<RecentUploadDto> getUploadedFiles() {
        return uploadFileRepository.findUploadSummaries(PageRequest.of(0, 50));
    }

    private List<ActiveUserDto> getActiveNonAdminUsers() {
        List<ActiveUserDto> activeUsers = activeUserTrackerService.getActiveUsers();
        if (activeUsers.isEmpty()) {
            return List.of();
        }

        List<String> usernames = activeUsers.stream()
                .map(user -> user.username)
                .filter(username -> username != null && !username.isBlank())
                .map(username -> username.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();

        if (usernames.isEmpty()) {
            return activeUsers;
        }

        Set<String> adminUsernames = new HashSet<>(userRepository.findAdminUsernames(usernames));
        return activeUsers.stream()
                .filter(user -> user.username == null
                        || !adminUsernames.contains(user.username.toLowerCase(Locale.ROOT)))
                .toList();
    }

    @Transactional(readOnly = true)
    public void exportFeedback(LocalDate startDate, LocalDate endDate, OutputStream outputStream) {
        if (startDate == null || endDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date and end date are required");
        }

        if (endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date must be after start date");
        }

        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime endExclusive = endDate.plusDays(1).atStartOfDay();

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(EXPORT_ROW_WINDOW_SIZE)) {
            workbook.setCompressTempFiles(true);
            Sheet sheet = workbook.createSheet("Feedback Export");
            CellStyle[] headerStyles = createHeaderStyles(workbook);
            Row headerRow = sheet.createRow(0);

            for (int columnIndex = 0; columnIndex < FEEDBACK_EXPORT_HEADERS.length; columnIndex++) {
                headerRow.createCell(columnIndex).setCellValue(FEEDBACK_EXPORT_HEADERS[columnIndex]);
                headerRow.getCell(columnIndex).setCellStyle(headerStyles[getHeaderStyleGroup(columnIndex)]);
            }

            int rowIndex = 1;
            Pageable pageable = PageRequest.of(0, EXPORT_PAGE_SIZE);
            Slice<Feedback> feedbackRows;
            do {
                feedbackRows = feedbackRepository.findExportRowsByCreatedAtBetween(start, endExclusive, pageable);
                for (Feedback feedback : feedbackRows.getContent()) {
                    writeFeedbackExportRow(sheet.createRow(rowIndex++), feedback);
                }
                pageable = feedbackRows.nextPageable();
            } while (feedbackRows.hasNext());

            for (int columnIndex = 0; columnIndex < FEEDBACK_EXPORT_HEADERS.length; columnIndex++) {
                sheet.setColumnWidth(columnIndex, getExportColumnWidth(columnIndex));
            }


            workbook.write(outputStream);
            outputStream.flush();
            workbook.dispose();
        } catch (IOException error) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not create export file", error);
        }
    }

    @Transactional
    public RecentUploadDto updateUploadStatus(Long uploadId, UploadStatus status) {
        if (status != UploadStatus.inactive && status != UploadStatus.completed) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only completed or inactive status is allowed here");
        }

        int updatedRows = uploadFileRepository.updateStatusById(uploadId, status);
        if (updatedRows == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Uploaded file not found");
        }

        return uploadFileRepository.findUploadSummaryById(uploadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Uploaded file not found"));
    }

    private CellStyle[] createHeaderStyles(Workbook workbook) {
        return new CellStyle[] {
                createHeaderStyle(workbook, IndexedColors.ROSE, IndexedColors.BLACK),
                createHeaderStyle(workbook, IndexedColors.BLUE_GREY, IndexedColors.WHITE),
                createHeaderStyle(workbook, IndexedColors.ROYAL_BLUE, IndexedColors.WHITE),
                createHeaderStyle(workbook, IndexedColors.LIGHT_GREEN, IndexedColors.BLACK),
                createHeaderStyle(workbook, IndexedColors.YELLOW, IndexedColors.BLACK),
                createHeaderStyle(workbook, IndexedColors.PALE_BLUE, IndexedColors.BLACK),
                createHeaderStyle(workbook, IndexedColors.GOLD, IndexedColors.BLACK)
        };
    }

    private CellStyle createHeaderStyle(Workbook workbook, IndexedColors background, IndexedColors fontColor) {
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(fontColor.getIndex());

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(background.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private int getHeaderStyleGroup(int columnIndex) {
        if (columnIndex <= 18) {
            return 0;
        }
        if (columnIndex <= 22) {
            return 1;
        }
        if (columnIndex <= 25) {
            return 2;
        }
        if (columnIndex <= 28) {
            return 3;
        }
        if (columnIndex <= 31) {
            return 4;
        }
        if (columnIndex <= 33) {
            return 5;
        }
        return 6;
    }

    private int getExportColumnWidth(int columnIndex) {
        return switch (columnIndex) {
            case 4, 9, 10, 26, 31 -> 18 * 256;
            case 5, 8, 12, 28, 35, 36, 37 -> 28 * 256;
            default -> 16 * 256;
        };
    }

    private void writeFeedbackExportRow(Row row, Feedback feedback) {
        UploadFileData lead = feedback.uploadFileData;

        if (lead == null) {
            writeFeedbackExportRowWithoutLead(row, feedback);
            return;
        }

        int column = 0;
        row.createCell(column++).setCellValue(textValue(leadText(lead, "uid")));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "listId")));
        row.createCell(column++).setCellValue(textValue(feedback.createdAt == null ? null : feedback.createdAt.toLocalDate()));
        row.createCell(column++).setCellValue(textValue(feedback.createdAt == null ? null : feedback.createdAt.toLocalTime()));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "agreementNumber")));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "customerName")));
        row.createCell(column++).setCellValue(textValue(feedback.disposition));
        row.createCell(column++).setCellValue(textValue(feedback.subDisposition));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "customerName")));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "mobileNumber")));
        row.createCell(column++).setCellValue(textValue(feedback.alternateMobileNumber));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "portfolio")));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "address")));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "city")));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "pincode")));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "region")));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "zone")));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "language")));
        row.createCell(column++).setCellValue(textValue(lead == null || lead.product == null ? null : lead.product.name));
        row.createCell(column++).setCellValue(textValue(leadText(lead, "model")));
        row.createCell(column++).setCellValue(numberValue(leadNumber(lead, "emi")));
        row.createCell(column++).setCellValue(numberValue(leadNumber(lead, "askable")));
        row.createCell(column++).setCellValue(numberValue(leadNumber(lead, "cbcCharges")));
        row.createCell(column++).setCellValue(numberValue(leadNumber(lead, "totalOverdue")));
        row.createCell(column++).setCellValue(numberValue(feedback.ptpAmount));
        row.createCell(column++).setCellValue(textValue(feedback.ptpDate));
        row.createCell(column++).setCellValue(textValue(feedback.transactionReceiptNo));
        row.createCell(column++).setCellValue(textValue(feedback.pickupTime));
        row.createCell(column++).setCellValue(textValue(feedback.pickupAddress));
        row.createCell(column++).setCellValue(textValue(feedback.paymentMode));
        row.createCell(column++).setCellValue(textValue(feedback.paidToName));
        row.createCell(column++).setCellValue(textValue(feedback.paidToContact));
        row.createCell(column++).setCellValue(textValue(feedback.paidShowroom));
        row.createCell(column++).setCellValue(textValue(feedback.callBackDate));
        row.createCell(column++).setCellValue(textValue(feedback.callBackTime));
        row.createCell(column++).setCellValue(textValue(feedback.nonPaymentReason));
        row.createCell(column++).setCellValue(textValue(feedback.bouncingReason));
        row.createCell(column++).setCellValue(textValue(feedback.remark));
        row.createCell(column).setCellValue(textValue(agentName(feedback)));
    }

    private void writeFeedbackExportRowWithoutLead(Row row, Feedback feedback) {
        int column = 0;
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue(textValue(feedback.createdAt == null ? null : feedback.createdAt.toLocalDate()));
        row.createCell(column++).setCellValue(textValue(feedback.createdAt == null ? null : feedback.createdAt.toLocalTime()));
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue(textValue(feedback.disposition));
        row.createCell(column++).setCellValue(textValue(feedback.subDisposition));
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue(textValue(feedback.alternateMobileNumber));
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue("");
        row.createCell(column++).setCellValue(0);
        row.createCell(column++).setCellValue(0);
        row.createCell(column++).setCellValue(0);
        row.createCell(column++).setCellValue(0);
        row.createCell(column++).setCellValue(numberValue(feedback.ptpAmount));
        row.createCell(column++).setCellValue(textValue(feedback.ptpDate));
        row.createCell(column++).setCellValue(textValue(feedback.transactionReceiptNo));
        row.createCell(column++).setCellValue(textValue(feedback.pickupTime));
        row.createCell(column++).setCellValue(textValue(feedback.pickupAddress));
        row.createCell(column++).setCellValue(textValue(feedback.paymentMode));
        row.createCell(column++).setCellValue(textValue(feedback.paidToName));
        row.createCell(column++).setCellValue(textValue(feedback.paidToContact));
        row.createCell(column++).setCellValue(textValue(feedback.paidShowroom));
        row.createCell(column++).setCellValue(textValue(feedback.callBackDate));
        row.createCell(column++).setCellValue(textValue(feedback.callBackTime));
        row.createCell(column++).setCellValue(textValue(feedback.nonPaymentReason));
        row.createCell(column++).setCellValue(textValue(feedback.bouncingReason));
        row.createCell(column++).setCellValue(textValue(feedback.remark));
        row.createCell(column).setCellValue(textValue(agentName(feedback)));
    }

    private String agentName(Feedback feedback) {
        if (feedback == null || feedback.agent == null) {
            return null;
        }

        return feedback.agent.name;
    }

    private String leadText(UploadFileData lead, String fieldName) {
        if (lead == null) {
            return null;
        }

        return switch (fieldName) {
            case "uid" -> lead.uid;
            case "listId" -> lead.listId;
            case "agreementNumber" -> lead.agreementNumber;
            case "customerName" -> lead.customerName;
            case "mobileNumber" -> lead.mobileNumber;
            case "portfolio" -> lead.portfolio;
            case "address" -> lead.address;
            case "city" -> lead.city;
            case "pincode" -> lead.pincode;
            case "region" -> lead.region;
            case "zone" -> lead.zone;
            case "language" -> lead.language;
            case "model" -> lead.model;
            default -> null;
        };
    }

    private Number leadNumber(UploadFileData lead, String fieldName) {
        if (lead == null) {
            return null;
        }

        return switch (fieldName) {
            case "emi" -> lead.emi;
            case "askable" -> lead.askable;
            case "cbcCharges" -> lead.cbcCharges;
            case "totalOverdue" -> lead.totalOverdue;
            default -> null;
        };
    }

    private String textValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private double numberValue(Number value) {
        return value == null ? 0 : value.doubleValue();
    }
}
