package com.tvscollections.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tvscollections.backend.dto.UploadResultDto;
import com.tvscollections.backend.dto.FeedbackRequestDto;
import com.tvscollections.backend.dto.FeedbackHistoryDto;
import com.tvscollections.backend.dto.LeadResponseDto;
import com.tvscollections.backend.dto.ProductSummaryDto;
import com.tvscollections.backend.model.Feedback;
import com.tvscollections.backend.model.Product;
import com.tvscollections.backend.model.UploadFile;
import com.tvscollections.backend.model.UploadFileData;
import com.tvscollections.backend.model.UploadStatus;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.FeedbackRepository;
import com.tvscollections.backend.repository.ProductRepository;
import com.tvscollections.backend.repository.UploadFileRepository;
import com.tvscollections.backend.repository.UploadFileDataRepository;
import com.tvscollections.backend.repository.UserRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class UploadFileDataService {
    private static final int INSERT_BATCH_SIZE = 1000;
    private static final int SEARCH_RESULT_LIMIT = 50;

    private final UploadFileDataRepository uploadFileDataRepository;
    private final UploadFileRepository uploadFileRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final FeedbackRepository feedbackRepository;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    public UploadFileDataService(UploadFileDataRepository uploadFileDataRepository,
                                 UploadFileRepository uploadFileRepository,
                                 ProductRepository productRepository,
                                 UserRepository userRepository,
                                 FeedbackRepository feedbackRepository,
                                 ObjectMapper objectMapper,
                                 JdbcTemplate jdbcTemplate) {
        this.uploadFileDataRepository = uploadFileDataRepository;
        this.uploadFileRepository = uploadFileRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.feedbackRepository = feedbackRepository;
        this.objectMapper = objectMapper;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<LeadResponseDto> searchLeads(String productCode, String query) {
        String normalizedQuery = query == null ? "" : query.trim();
        Product product = getProduct(productCode);

        if (isFullMobileNumber(normalizedQuery)) {
            List<LeadResponseDto> exactMobileMatches = findLatestLeadByExactMobileNumber(
                    product,
                    normalizedQuery
            );

            if (!exactMobileMatches.isEmpty()) {
                return withLatestFeedback(exactMobileMatches);
            }
        }

        List<LeadResponseDto> exactAgreementMatches = findLatestLeadByExactAgreementNumber(
                product,
                normalizedQuery
        );

        if (!exactAgreementMatches.isEmpty()) {
            return withLatestFeedback(exactAgreementMatches);
        }

        List<LeadResponseDto> matchingLeads = searchLeadSummaries(
                product,
                normalizedQuery,
                SEARCH_RESULT_LIMIT
        );
        return withLatestFeedback(matchingLeads);
    }

    private boolean isFullMobileNumber(String query) {
        return query.matches("\\d{10,}");
    }

    @Transactional(readOnly = true)
    public LeadResponseDto getLeadById(String productCode, Long id) {
        Product product = getProduct(productCode);
        LeadResponseDto lead = findLeadSummaryById(product, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead record not found"));
        List<FeedbackHistoryDto> history = feedbackRepository.findHistoryByUploadFileDataId(lead.id);
        lead.latestFeedback = history.isEmpty() ? null : history.get(0);
        lead.history = history;
        return lead;
    }

    private Product getProduct(String productCode) {
        return productRepository.findByCode(productCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private List<LeadResponseDto> findLatestLeadByExactMobileNumber(Product product, String mobileNumber) {
        return jdbcTemplate.query(
                leadSummarySql("""
                            AND u.mobile_number = ?
                        ORDER BY uf.uploaded_at DESC, uf.id DESC, u.id DESC
                        LIMIT 1
                        """),
                (resultSet, rowNumber) -> mapLeadSummary(resultSet, product),
                product.id,
                UploadStatus.inactive.name(),
                mobileNumber
        );
    }

    private List<LeadResponseDto> findLatestLeadByExactAgreementNumber(Product product, String agreementNumber) {
        return jdbcTemplate.query(
                leadSummarySql("""
                            AND u.agreement_number = ?
                        ORDER BY uf.uploaded_at DESC, uf.id DESC, u.id DESC
                        LIMIT 1
                        """),
                (resultSet, rowNumber) -> mapLeadSummary(resultSet, product),
                product.id,
                UploadStatus.inactive.name(),
                agreementNumber
        );
    }

    private Optional<LeadResponseDto> findLeadSummaryById(Product product, Long id) {
        List<LeadResponseDto> leads = jdbcTemplate.query(
                leadSummarySql("""
                            AND u.id = ?
                        LIMIT 1
                        """),
                (resultSet, rowNumber) -> mapLeadSummary(resultSet, product),
                product.id,
                UploadStatus.inactive.name(),
                id
        );
        return leads.stream().findFirst();
    }

    private List<LeadResponseDto> searchLeadSummaries(Product product, String query, int limit) {
        String likeQuery = "%" + query + "%";
        return jdbcTemplate.query(
                leadSummarySql("""
                            AND (
                                u.agreement_number LIKE ?
                                OR u.mobile_number LIKE ?
                            )
                        ORDER BY uf.uploaded_at DESC, uf.id DESC, u.id DESC
                        LIMIT ?
                        """),
                (resultSet, rowNumber) -> mapLeadSummary(resultSet, product),
                product.id,
                UploadStatus.inactive.name(),
                likeQuery,
                likeQuery,
                limit
        );
    }

    private String leadSummarySql(String extraWhereAndOrder) {
        return """
                SELECT
                    u.id,
                    u.list_id,
                    u.agreement_number,
                    u.uid,
                    u.customer_name,
                    u.mobile_number,
                    u.address,
                    u.city,
                    u.pincode,
                    u.dealer_code,
                    u.dealer_name,
                    u.portfolio,
                    u.amount_financed,
                    u.first_emi_date,
                    u.last_emi_date,
                    u.bounce_reason,
                    u.tenor,
                    u.emi,
                    u.other_details,
                    u.final_opening_bkt_status,
                    u.model,
                    u.dpd_del_string,
                    u.branch_name,
                    u.region,
                    u.zone,
                    u.language,
                    u.total_overdue,
                    u.cbc_charges,
                    u.askable,
                    u.settlement_month,
                    u.fce_name,
                    u.fce_number,
                    u.tcm_name,
                    u.tcm_number,
                    u.acm_name,
                    u.acm_number,
                    u.best_dispo_internal,
                    u.created_at,
                    u.updated_at
                FROM upload_file_data u
                JOIN upload_files uf ON uf.id = u.upload_file_id
                WHERE u.product_id = ?
                    AND uf.status <> ?
                """ + extraWhereAndOrder;
    }

    private LeadResponseDto mapLeadSummary(ResultSet resultSet, Product product) throws SQLException {
        LeadResponseDto lead = new LeadResponseDto();
        lead.id = resultSet.getLong("id");
        lead.product = new ProductSummaryDto(product);
        lead.listId = resultSet.getString("list_id");
        lead.agreementNumber = resultSet.getString("agreement_number");
        lead.uid = resultSet.getString("uid");
        lead.customerName = resultSet.getString("customer_name");
        lead.mobileNumber = resultSet.getString("mobile_number");
        lead.address = resultSet.getString("address");
        lead.city = resultSet.getString("city");
        lead.pincode = resultSet.getString("pincode");
        lead.dealerCode = resultSet.getString("dealer_code");
        lead.dealerName = resultSet.getString("dealer_name");
        lead.portfolio = resultSet.getString("portfolio");
        lead.amountFinanced = integerOrNull(resultSet, "amount_financed");
        lead.firstEmiDate = resultSet.getString("first_emi_date");
        lead.lastEmiDate = resultSet.getString("last_emi_date");
        lead.bounceReason = resultSet.getString("bounce_reason");
        lead.tenor = integerOrNull(resultSet, "tenor");
        lead.emi = integerOrNull(resultSet, "emi");
        lead.otherDetails = resultSet.getString("other_details");
        lead.finalOpeningBktStatus = resultSet.getString("final_opening_bkt_status");
        lead.model = resultSet.getString("model");
        lead.dpdDelString = resultSet.getString("dpd_del_string");
        lead.branchName = resultSet.getString("branch_name");
        lead.region = resultSet.getString("region");
        lead.zone = resultSet.getString("zone");
        lead.language = resultSet.getString("language");
        lead.totalOverdue = integerOrNull(resultSet, "total_overdue");
        lead.cbcCharges = integerOrNull(resultSet, "cbc_charges");
        lead.askable = integerOrNull(resultSet, "askable");
        lead.settlementMonth = resultSet.getString("settlement_month");
        lead.fceName = resultSet.getString("fce_name");
        lead.fceNumber = resultSet.getString("fce_number");
        lead.tcmName = resultSet.getString("tcm_name");
        lead.tcmNumber = resultSet.getString("tcm_number");
        lead.acmName = resultSet.getString("acm_name");
        lead.acmNumber = resultSet.getString("acm_number");
        lead.bestDispoInternal = resultSet.getString("best_dispo_internal");
        lead.createdAt = timestampOrNull(resultSet, "created_at");
        lead.updatedAt = timestampOrNull(resultSet, "updated_at");
        lead.history = List.of();
        return lead;
    }

    private Integer integerOrNull(ResultSet resultSet, String columnName) throws SQLException {
        int value = resultSet.getInt(columnName);
        return resultSet.wasNull() ? null : value;
    }

    private LocalDateTime timestampOrNull(ResultSet resultSet, String columnName) throws SQLException {
        Timestamp timestamp = resultSet.getTimestamp(columnName);
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private List<LeadResponseDto> withLatestFeedback(List<LeadResponseDto> leads) {
        if (leads.isEmpty()) {
            return leads;
        }

        List<Long> leadIds = leads.stream()
                .map(lead -> lead.id)
                .toList();
        Map<Long, FeedbackHistoryDto> latestFeedbackByLeadId = new LinkedHashMap<>();

        for (FeedbackHistoryDto history : feedbackRepository.findHistoryByUploadFileDataIds(leadIds)) {
            if (history.uploadFileDataId != null) {
                latestFeedbackByLeadId.putIfAbsent(history.uploadFileDataId, history);
            }
        }

        for (LeadResponseDto lead : leads) {
            FeedbackHistoryDto latestFeedback = latestFeedbackByLeadId.get(lead.id);
            lead.latestFeedback = latestFeedback;
            lead.history = latestFeedback == null ? List.of() : List.of(latestFeedback);
        }

        return leads;
    }

    private UploadFileData getLeadEntityById(String productCode, Long id) {
        return uploadFileDataRepository.findActiveByIdAndProductCode(id, productCode, UploadStatus.inactive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead record not found"));
    }

    @Transactional
    public UploadResultDto uploadExcel(String productCode, User uploadedBy, MultipartFile file) {
        String fileName = file.getOriginalFilename() == null ? "upload.xlsx" : file.getOriginalFilename();
        String lowerFileName = fileName.toLowerCase(Locale.ROOT);

        if (!lowerFileName.endsWith(".xlsx") && !lowerFileName.endsWith(".xls")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only .xls and .xlsx files are supported");
        }

        Product product = productRepository.findByCode(productCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        UploadFile uploadFile = new UploadFile();
        uploadFile.product = product;
        uploadFile.uploadedBy = uploadedBy;
        uploadFile.fileName = fileName;
        uploadFile.fileSize = file.getSize();
        uploadFile.status = UploadStatus.processing;
        uploadFile = uploadFileRepository.save(uploadFile);

        List<UploadFileData> rows;
        try {
            rows = readExcelRows(file, product, uploadFile);
        } catch (ResponseStatusException error) {
            uploadFile.status = UploadStatus.failed;
            uploadFileRepository.save(uploadFile);
            throw error;
        } catch (IOException error) {
            uploadFile.status = UploadStatus.failed;
            uploadFileRepository.save(uploadFile);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read Excel file: " + error.getMessage(), error);
        }

        uploadFile.totalRecords = rows.size();
        uploadFile.validRecords = rows.size();
        uploadFile.duplicateRecords = 0;
        uploadFile.failedRecords = 0;
        uploadFile.status = UploadStatus.completed;

        batchInsertRows(rows);
        UploadFile savedUpload = uploadFileRepository.save(uploadFile);

        return new UploadResultDto(
                savedUpload.id,
                savedUpload.fileName,
                savedUpload.totalRecords,
                savedUpload.validRecords,
                savedUpload.duplicateRecords,
                savedUpload.failedRecords,
                savedUpload.status.name()
        );
    }

    @Transactional
    public void addFeedback(String productCode, Long id, String agentEmail, FeedbackRequestDto feedbackDto) {
        System.out.println("\n\n Adding feedback for lead ID: " + id + " by agent: " + agentEmail + " with feedback: " + feedbackDto+"\n\n");
        String feedbackUid = textOrNull(feedbackDto.uid);
        if (feedbackUid == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "UID is required");
        }
        if (!feedbackUid.matches("[A-Za-z]\\d{19}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "UID must start with 1 letter followed by 19 digits");
        }

        UploadFileData lead = getLeadEntityById(productCode, id);
        User agent = userRepository.findByUsername(agentEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found"));

        Feedback feedback = new Feedback();
        feedback.uploadFileData = lead;
        feedback.agent = agent;
        feedback.uid = feedbackUid;
        feedback.disposition = textOrNull(feedbackDto.disposition);
        feedback.subDisposition = textOrNull(feedbackDto.subDisposition);
        feedback.paymentMode = textOrNull(feedbackDto.paymentMode);
        feedback.nonPaymentReason = textOrNull(feedbackDto.nonPaymentReason);
        feedback.bouncingReason = textOrNull(feedbackDto.bouncingReason);
        feedback.ptpAmount = feedbackDto.ptpAmount;
        feedback.ptpDate = dateOrNull(feedbackDto.ptpDate, "ptpDate");
        feedback.pickupTime = timeOrNull(feedbackDto.pickupTime, "pickupTime");
        feedback.pickupAddress = textOrNull(feedbackDto.pickupAddress);
        feedback.transactionReceiptNo = textOrNull(feedbackDto.transactionReceiptNo);
        feedback.paidToName = textOrNull(feedbackDto.paidToName);
        feedback.paidToContact = textOrNull(feedbackDto.paidToContact);
        feedback.paidShowroom = textOrNull(feedbackDto.paidShowroom);
        feedback.callBackDate = dateOrNull(feedbackDto.callBackDate, "callBackDate");
        feedback.callBackTime = timeOrNull(feedbackDto.callBackTime, "callBackTime");
        feedback.alternateMobileNumber = textOrNull(feedbackDto.alternateMobileNumber);
        feedback.remark = textOrNull(feedbackDto.remark);

        Feedback saved = feedbackRepository.save(feedback);
        lead.uid = feedbackUid;
        lead.latestFeedback = saved;
        uploadFileDataRepository.save(lead);
    }

    private String textOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private String dateOrNull(String value, String fieldName) {
        String normalizedValue = textOrNull(value);

        if (normalizedValue == null || isEmptyPlaceholder(normalizedValue)) {
            return null;
        }

        try {
            return LocalDate.parse(normalizedValue, DateTimeFormatter.ISO_LOCAL_DATE).toString();
        } catch (DateTimeParseException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must use yyyy-MM-dd format", error);
        }
    }

    private String timeOrNull(String value, String fieldName) {
        String normalizedValue = textOrNull(value);

        if (normalizedValue == null || isEmptyPlaceholder(normalizedValue)) {
            return null;
        }

        try {
            return LocalTime.parse(normalizedValue, DateTimeFormatter.ISO_LOCAL_TIME).toString();
        } catch (DateTimeParseException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must use HH:mm format", error);
        }
    }

    private boolean isEmptyPlaceholder(String value) {
        String normalizedValue = value.trim().toLowerCase(Locale.ROOT);
        return normalizedValue.equals("null")
                || normalizedValue.equals("undefined")
                || normalizedValue.equals("invalid date")
                || normalizedValue.equals("-");
    }

    private List<UploadFileData> readExcelRows(MultipartFile file, Product product, UploadFile uploadFile) throws IOException {
        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            int headerRowIndex = findHeaderRowIndex(sheet, formatter);

            if (headerRowIndex < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Header row not found");
            }

            Map<Integer, String> headers = readHeaders(sheet.getRow(headerRowIndex), formatter);
            List<UploadFileData> records = new ArrayList<>();

            for (int rowIndex = headerRowIndex + 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isBlankRow(row, formatter)) {
                    continue;
                }

                UploadFileData record = new UploadFileData();
                record.uploadFile = uploadFile;
                record.product = product;

                Map<String, String> values = readRowValues(row, headers, formatter);
                mapValues(record, values);
                record.rawData = toJson(values);
                records.add(record);
            }

            return records;
        }
    }

    private int findHeaderRowIndex(Sheet sheet, DataFormatter formatter) {
        for (int rowIndex = sheet.getFirstRowNum(); rowIndex <= sheet.getLastRowNum(); rowIndex++) {
            Row row = sheet.getRow(rowIndex);

            if (row == null) {
                continue;
            }

            List<String> normalizedCells = new ArrayList<>();
            for (Cell cell : row) {
                normalizedCells.add(normalizeHeader(formatter.formatCellValue(cell)));
            }

            if (normalizedCells.contains("agreementnumber")
                    && (normalizedCells.contains("customermobile")
                    || normalizedCells.contains("mobilenumber"))) {
                return rowIndex;
            }
        }

        return -1;
    }

    private Map<Integer, String> readHeaders(Row headerRow, DataFormatter formatter) {
        Map<Integer, String> headers = new HashMap<>();

        for (Cell cell : headerRow) {
            String header = normalizeHeader(formatter.formatCellValue(cell));
            if (!header.isBlank()) {
                headers.put(cell.getColumnIndex(), header);
            }
        }

        return headers;
    }

    private Map<String, String> readRowValues(Row row, Map<Integer, String> headers, DataFormatter formatter) {
        Map<String, String> values = new HashMap<>();

        for (Map.Entry<Integer, String> header : headers.entrySet()) {
            Cell cell = row.getCell(header.getKey());
            values.put(header.getValue(), getCellValue(cell, formatter));
        }

        return values;
    }

    private void mapValues(UploadFileData record, Map<String, String> values) {
        record.listId = value(values, "listid");
        record.agreementNumber = value(values, "agreementnumber");
        record.customerName = value(values, "customername");
        record.mobileNumber = value(values, "mobilenumber", "customermobile");
        record.address = value(values, "address");
        record.city = value(values, "city");
        record.pincode = value(values, "pincode");
        record.dealerCode = value(values, "dealercode");
        record.dealerName = value(values, "dealername");
        record.portfolio = value(values, "portfolio");
        record.amountFinanced = integerValue(values, "amountfinanced");
        record.firstEmiDate = value(values, "firstemidate");
        record.lastEmiDate = value(values, "lastemidate");
        record.bounceReason = value(values, "bouncereason");
        record.tenor = integerValue(values, "tenor");
        record.emi = integerValue(values, "emi");
        record.otherDetails = value(values, "otherdetails");
        record.finalOpeningBktStatus = value(values, "finalopeningbktstatus");
        record.model = value(values, "model");
        record.dpdDelString = value(values, "dpddelstring");
        record.branchName = value(values, "branchname");
        record.region = value(values, "region");
        record.zone = value(values, "zone");
        record.language = value(values, "language");
        record.totalOverdue = integerValue(values, "totaloverdue");
        record.cbcCharges = integerValue(values, "cbccharges");
        record.askable = integerValue(values, "askable");
        record.settlementMonth = value(values, "settlementmonth");
        record.fceName = value(values, "fcename");
        record.fceNumber = value(values, "fcenumber");
        record.tcmName = value(values, "tcmname");
        record.tcmNumber = value(values, "tcmnumber");
        record.acmName = value(values, "acmname");
        record.acmNumber = value(values, "acmnumber");
        record.bestDispoInternal = value(values, "bestdispointernal");
    }

    private String getCellValue(Cell cell, DataFormatter formatter) {
        if (cell == null) {
            return "";
        }

        CellType cellType = cell.getCellType();
        CellType effectiveCellType = cellType == CellType.FORMULA ? cell.getCachedFormulaResultType() : cellType;

        if (effectiveCellType == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
        }

        return formatter.formatCellValue(cell).trim();
    }

    private boolean isBlankRow(Row row, DataFormatter formatter) {
        for (Cell cell : row) {
            if (!formatter.formatCellValue(cell).trim().isBlank()) {
                return false;
            }
        }

        return true;
    }

    private String normalizeHeader(String header) {
        if (header == null) {
            return "";
        }

        return header.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private String value(Map<String, String> values, String... keys) {
        for (String key : keys) {
            String value = values.get(key);
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }

        return null;
    }

    private Integer integerValue(Map<String, String> values, String key) {
        String value = value(values, key);

        if (value == null) {
            return null;
        }

        try {
            String numericValue = value.replace(",", "").replaceAll("[^0-9.-]", "");
            if (numericValue.isBlank()) {
                return null;
            }

            return new BigDecimal(numericValue).intValue();
        } catch (NumberFormatException error) {
            return null;
        }
    }

    private String toJson(Map<String, String> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not serialize row data", error);
        }
    }

    private void batchInsertRows(List<UploadFileData> rows) {
        if (rows.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        String sql = """
                INSERT INTO upload_file_data (
                    upload_file_id,
                    product_id,
                    list_id,
                    agreement_number,
                    uid,
                    customer_name,
                    mobile_number,
                    address,
                    city,
                    pincode,
                    dealer_code,
                    dealer_name,
                    portfolio,
                    amount_financed,
                    first_emi_date,
                    last_emi_date,
                    bounce_reason,
                    tenor,
                    emi,
                    other_details,
                    final_opening_bkt_status,
                    model,
                    dpd_del_string,
                    branch_name,
                    region,
                    zone,
                    language,
                    total_overdue,
                    cbc_charges,
                    askable,
                    settlement_month,
                    fce_name,
                    fce_number,
                    tcm_name,
                    tcm_number,
                    acm_name,
                    acm_number,
                    best_dispo_internal,
                    latest_feedback_id,
                    raw_data,
                    created_at,
                    updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
                """;

        jdbcTemplate.batchUpdate(sql, rows, INSERT_BATCH_SIZE, (statement, row) -> {
            int index = 1;
            statement.setLong(index++, row.uploadFile.id);
            statement.setLong(index++, row.product.id);
            statement.setString(index++, row.listId);
            statement.setString(index++, row.agreementNumber);
            statement.setString(index++, row.uid);
            statement.setString(index++, row.customerName);
            statement.setString(index++, row.mobileNumber);
            statement.setString(index++, row.address);
            statement.setString(index++, row.city);
            statement.setString(index++, row.pincode);
            statement.setString(index++, row.dealerCode);
            statement.setString(index++, row.dealerName);
            statement.setString(index++, row.portfolio);
            statement.setObject(index++, row.amountFinanced);
            statement.setString(index++, row.firstEmiDate);
            statement.setString(index++, row.lastEmiDate);
            statement.setString(index++, row.bounceReason);
            statement.setObject(index++, row.tenor);
            statement.setObject(index++, row.emi);
            statement.setString(index++, row.otherDetails);
            statement.setString(index++, row.finalOpeningBktStatus);
            statement.setString(index++, row.model);
            statement.setString(index++, row.dpdDelString);
            statement.setString(index++, row.branchName);
            statement.setString(index++, row.region);
            statement.setString(index++, row.zone);
            statement.setString(index++, row.language);
            statement.setObject(index++, row.totalOverdue);
            statement.setObject(index++, row.cbcCharges);
            statement.setObject(index++, row.askable);
            statement.setString(index++, row.settlementMonth);
            statement.setString(index++, row.fceName);
            statement.setString(index++, row.fceNumber);
            statement.setString(index++, row.tcmName);
            statement.setString(index++, row.tcmNumber);
            statement.setString(index++, row.acmName);
            statement.setString(index++, row.acmNumber);
            statement.setString(index++, row.bestDispoInternal);
            statement.setNull(index++, Types.BIGINT);
            statement.setString(index++, row.rawData);
            statement.setTimestamp(index++, Timestamp.valueOf(now));
            statement.setTimestamp(index, Timestamp.valueOf(now));
        });
    }
}
