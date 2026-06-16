package com.tvscollections.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tvscollections.backend.dto.NcRecordUploadResultDto;
import com.tvscollections.backend.model.Feedback;
import com.tvscollections.backend.model.Product;
import com.tvscollections.backend.model.UploadFile;
import com.tvscollections.backend.model.UploadFileData;
import com.tvscollections.backend.model.UploadStatus;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.FeedbackRepository;
import com.tvscollections.backend.repository.UploadFileDataRepository;
import com.tvscollections.backend.repository.UploadFileRepository;
import com.tvscollections.backend.service.UploadProgressService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.apache.poi.openxml4j.exceptions.OpenXML4JException;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.ooxml.util.SAXHelper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.xssf.eventusermodel.ReadOnlySharedStringsTable;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.apache.poi.xssf.model.StylesTable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.xml.sax.ContentHandler;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.XMLReader;

import javax.xml.parsers.ParserConfigurationException;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class NcRecordUploadService {

    // -----------------------------------------------------------------------
    // Tune this value based on your DB server and available heap.
    // 500 is a safe starting point; increase toward 1000 if DB round-trips
    // are the bottleneck, decrease toward 100 if heap is still tight.
    // Must match (or be a divisor of) spring.jpa.properties.hibernate.jdbc.batch_size
    // in application.properties.
    // -----------------------------------------------------------------------
    private static final int BATCH_SIZE = 500;

    private final UploadFileDataRepository uploadFileDataRepository;
    private final FeedbackRepository feedbackRepository;
    private final com.tvscollections.backend.repository.ProductRepository productRepository;
    private final UploadFileRepository uploadFileRepository;
    private final ObjectMapper objectMapper;
    private final UploadProgressService uploadProgressService;

    // EntityManager is needed so we can flush + clear Hibernate's first-level
    // cache after every batch.  Without this the session accumulates every
    // managed entity for the life of the transaction and causes the OOM.
    @PersistenceContext
    private EntityManager entityManager;

    private static final org.slf4j.Logger logger =
            org.slf4j.LoggerFactory.getLogger(NcRecordUploadService.class);

    public NcRecordUploadService(UploadFileDataRepository uploadFileDataRepository,
            FeedbackRepository feedbackRepository,
            com.tvscollections.backend.repository.ProductRepository productRepository,
            UploadFileRepository uploadFileRepository,
            ObjectMapper objectMapper,
            UploadProgressService uploadProgressService) {
        this.uploadFileDataRepository = uploadFileDataRepository;
        this.feedbackRepository = feedbackRepository;
        this.productRepository = productRepository;
        this.uploadFileRepository = uploadFileRepository;
        this.objectMapper = objectMapper;
        this.uploadProgressService = uploadProgressService;
    }

    // -----------------------------------------------------------------------
    // Public entry point
    // -----------------------------------------------------------------------

    @Transactional
    public NcRecordUploadResultDto uploadNcRecords(MultipartFile file, User uploadedBy, String productKey, String progressId) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NC Excel file is required");
        }

        Product product = productRepository.findByCode(productKey)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Invalid product key: " + productKey));

        String fileName = file.getOriginalFilename() == null ? "nc-records.xlsx" : file.getOriginalFilename();
        String lowerFileName = fileName.toLowerCase(Locale.ROOT);
        if (!lowerFileName.endsWith(".xlsx") && !lowerFileName.endsWith(".xls")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only .xls and .xlsx files are supported");
        }

        UploadFile uploadFile = new UploadFile();
        uploadFile.product = product;
        uploadFile.uploadedBy = uploadedBy;
        uploadFile.fileName = fileName;
        uploadFile.fileSize = file.getSize();
        uploadFile.status = UploadStatus.processing;
        uploadFile = uploadFileRepository.save(uploadFile);

        uploadProgressService.start(progressId, fileName);

        try {
            NcImportStats stats = lowerFileName.endsWith(".xlsx")
                    ? readXlsxStreaming(file, uploadedBy, product, uploadFile, progressId)
                    : readWorkbook(file, uploadedBy, product, uploadFile, progressId);

            uploadFile.status = UploadStatus.completed;
            uploadFile.totalRecords = stats.totalRecords;
            uploadFile.validRecords = stats.updatedRecords;
            uploadFile.failedRecords = stats.failedRecords;
            uploadFileRepository.save(uploadFile);

            uploadProgressService.complete(progressId, stats.updatedRecords);

            return new NcRecordUploadResultDto(
                    stats.totalRecords,
                    stats.matchedRecords,
                    stats.updatedRecords,
                    stats.unmatchedRecords,
                    stats.failedRecords);
        } catch (IOException error) {
            uploadProgressService.fail(progressId, "Could not read NC Excel file: " + error.getMessage());
            uploadFile.status = UploadStatus.failed;
            uploadFileRepository.save(uploadFile);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Could not read NC Excel file: " + error.getMessage(), error);
        }
    }

    // -----------------------------------------------------------------------
    // Workbook reader (.xls / small .xlsx)
    // -----------------------------------------------------------------------

    private NcImportStats readWorkbook(MultipartFile file, User uploadedBy, Product product,
            UploadFile uploadFile, String progressId) throws IOException {
        try (InputStream inputStream = file.getInputStream();
                Workbook workbook = WorkbookFactory.create(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            int headerRowIndex = findHeaderRowIndex(sheet, formatter);
            if (headerRowIndex < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NC header row not found");
            }

            Map<Integer, String> headers = readHeaders(sheet.getRow(headerRowIndex), formatter);
            validateHeaders(headers);

            int estimatedTotalRecords = Math.max(0, sheet.getLastRowNum() - headerRowIndex);
            uploadProgressService.processing(progressId, uploadFile.id, estimatedTotalRecords);

            NcImportStats stats = new NcImportStats();

            // Pending rows for the current batch
            List<Map<String, String>> batch = new ArrayList<>(BATCH_SIZE);

            for (int rowIndex = headerRowIndex + 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isBlankRow(row, formatter)) {
                    continue;
                }
                batch.add(readRowValues(row, headers, formatter));

                if (batch.size() >= BATCH_SIZE) {
                    processBatch(batch, uploadedBy, product, uploadFile, stats);
                    batch.clear();
                    uploadProgressService.batchSaved(progressId, stats.totalRecords, stats.updatedRecords);
                }
            }

            // Flush any remaining rows
            if (!batch.isEmpty()) {
                processBatch(batch, uploadedBy, product, uploadFile, stats);
                uploadProgressService.batchSaved(progressId, stats.totalRecords, stats.updatedRecords);
            }

            return stats;
        }
    }

    // -----------------------------------------------------------------------
    // XLSX streaming reader (SAX / event model)
    // -----------------------------------------------------------------------

    private NcImportStats readXlsxStreaming(MultipartFile file, User uploadedBy, Product product,
            UploadFile uploadFile, String progressId) throws IOException {
        try (InputStream inputStream = file.getInputStream();
                OPCPackage opcPackage = OPCPackage.open(inputStream)) {

            ReadOnlySharedStringsTable sharedStrings = new ReadOnlySharedStringsTable(opcPackage);
            XSSFReader reader = new XSSFReader(opcPackage);
            StylesTable styles = reader.getStylesTable();
            XSSFReader.SheetIterator sheets = (XSSFReader.SheetIterator) reader.getSheetsData();

            if (!sheets.hasNext()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NC Excel sheet not found");
            }

            NcSheetHandler sheetHandler = new NcSheetHandler(uploadedBy, product, uploadFile, progressId);
            XMLReader parser = SAXHelper.newXMLReader();
            ContentHandler handler = new XSSFSheetXMLHandler(
                    styles, null, sharedStrings, sheetHandler, new DataFormatter(), false);
            parser.setContentHandler(handler);

            try (InputStream sheetInputStream = sheets.next()) {
                parser.parse(new InputSource(sheetInputStream));
            }

            // Flush any rows that did not fill a complete batch
            if (!sheetHandler.pendingBatch.isEmpty()) {
                processBatch(sheetHandler.pendingBatch, uploadedBy, product, uploadFile, sheetHandler.stats);
                uploadProgressService.batchSaved(progressId, sheetHandler.stats.totalRecords, sheetHandler.stats.updatedRecords);
            }

            if (!sheetHandler.headerFound) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NC header row not found");
            }
            validateHeaders(sheetHandler.headers);

            return sheetHandler.stats;

        } catch (OpenXML4JException | ParserConfigurationException | SAXException error) {
            throw new IOException("Could not stream NC Excel file", error);
        }
    }

    // -----------------------------------------------------------------------
    // Core batch processing
    //
    // Strategy:
    //   1. Build + save all UploadFileData objects (no FK to Feedback yet).
    //   2. Build + save all Feedback objects (FK to UploadFileData already set).
    //   3. Back-fill latestFeedback on each UploadFileData and saveAll again.
    //   4. flush() + clear() to release the Hibernate session cache.
    //
    // This reduces per-row DB round-trips from 3 down to 3 bulk operations
    // per batch regardless of batch size.
    // -----------------------------------------------------------------------

    private void processBatch(List<Map<String, String>> batch, User uploadedBy, Product product,
            UploadFile uploadFile, NcImportStats stats) {

        List<UploadFileData> leads = new ArrayList<>(batch.size());
        List<Feedback> feedbacks = new ArrayList<>(batch.size());

        // ---- Phase 1: build UploadFileData objects ----
        for (Map<String, String> values : batch) {
            stats.totalRecords++;

            String listId      = textOrNull(value(values, "listid"));
            String mobileNumber = textOrNull(value(values, "mobilenumber", "mobile", "customermobile"));
            String dispo       = textOrNull(value(values, "disposition", "dispo"));
            String subDispo    = textOrNull(value(values, "subdisposition", "subdispo"));
            String remark      = textOrNull(value(values, "remark", "remarks"));
            String callDtStr = textOrNull(value(values, "calldatetime", "datetime", "calltime"));
            String uid = textOrNull(value(values, "uid","UID"));

            LocalDateTime callDateTime = parseCallDateTime(callDtStr);
            if (callDateTime == null) {
                callDateTime = currentTimestamp();
                logger.warn("NC row {} has missing/invalid Call Date Time value={}; using upload time {}",
                        stats.totalRecords, callDtStr, callDateTime);
            }

            if (dispo == null || subDispo == null) {
                logger.warn("NC row {} has blank disposition/subdisposition; inserting without those values",
                        stats.totalRecords);
            }

            UploadFileData lead = buildLead(values, uploadFile, product, listId, mobileNumber, callDateTime);
            leads.add(lead);

            // Capture feedback data alongside the lead (index-matched)
            Feedback feedback = new Feedback();
            feedback.agent         = uploadedBy;
            feedback.disposition   = dispo;
            feedback.subDisposition = subDispo;
            feedback.remark        = remark != null ? remark : "";
            feedback.createdAt = callDateTime;
            feedback.uid = uid;
            feedbacks.add(feedback);
        }

        // ---- Phase 2: bulk-save leads (assigns IDs) ----
        List<UploadFileData> savedLeads = uploadFileDataRepository.saveAll(leads);

        // ---- Phase 3: link feedback → lead, bulk-save feedbacks ----
        for (int i = 0; i < savedLeads.size(); i++) {
            feedbacks.get(i).uploadFileData = savedLeads.get(i);
        }
        List<Feedback> savedFeedbacks = feedbackRepository.saveAll(feedbacks);

        // ---- Phase 4: back-fill latestFeedback, bulk-save leads again ----
        for (int i = 0; i < savedLeads.size(); i++) {
            savedLeads.get(i).latestFeedback = savedFeedbacks.get(i);
        }
        uploadFileDataRepository.saveAll(savedLeads);

        stats.updatedRecords += savedLeads.size();
        logger.info("Batch saved: {} leads (running total: {})", savedLeads.size(), stats.totalRecords);

        // ---- Phase 5: release Hibernate 1st-level cache to free heap ----
        entityManager.flush();
        entityManager.clear();
    }

    // -----------------------------------------------------------------------
    // Lead builder — extracted from processRow for clarity
    // -----------------------------------------------------------------------

    private UploadFileData buildLead(Map<String, String> values, UploadFile uploadFile, Product product,
            String listId, String mobileNumber, LocalDateTime callDateTime) {

        UploadFileData lead = new UploadFileData();
        lead.uploadFile    = uploadFile;
        lead.listId        = listId;
        lead.mobileNumber  = mobileNumber;
        lead.createdAt     = callDateTime;
        lead.updatedAt     = callDateTime;
        lead.productId       = product;
        lead.rawData       = toJson(values);

        lead.agreementNumber      = textOrNull(value(values, "agreementnumber"));
        lead.customerName         = textOrNull(value(values, "customername"));
        lead.address              = textOrNull(value(values, "address"));
        lead.city                 = textOrNull(value(values, "city"));
        lead.pincode              = textOrNull(value(values, "pincode"));
        lead.dealerCode           = textOrNull(value(values, "dealercode"));
        lead.dealerName           = textOrNull(value(values, "dealername"));
        lead.portfolio            = textOrNull(value(values, "portofolio", "portfolio"));
        lead.firstEmiDate         = normalizeDate(value(values, "firstemidate"));
        lead.lastEmiDate          = normalizeDate(value(values, "lastemidate"));
        lead.bounceReason         = textOrNull(value(values, "bouncerreason", "bouncereason"));
        lead.otherDetails         = textOrNull(value(values, "otherdetails"));
        lead.finalOpeningBktStatus = textOrNull(value(values, "finalopeningbktstatus"));
        lead.product              = textOrNull(value(values, "product"));
        lead.model                = textOrNull(value(values, "model"));
        lead.dpdDelString         = textOrNull(value(values, "dpddelstring"));
        lead.branchName           = textOrNull(value(values, "branchnname", "branchname"));
        lead.region               = textOrNull(value(values, "region"));
        lead.zone                 = textOrNull(value(values, "zone"));
        lead.language             = textOrNull(value(values, "language"));
        lead.settlementMonth      = textOrNull(value(values, "settlementmonth"));
        lead.fceName              = textOrNull(value(values, "fcename"));
        lead.fceNumber            = textOrNull(value(values, "fcenumber"));
        lead.tcmName              = textOrNull(value(values, "tcmname"));
        lead.tcmNumber            = textOrNull(value(values, "tcmnumber"));
        lead.acmName              = textOrNull(value(values, "acmname"));
        lead.acmNumber            = textOrNull(value(values, "acmnumber"));
        lead.bestDispoInternal    = textOrNull(value(values, "bestdispointernal"));
        lead.uid                  = textOrNull(value(values, "uid","UID"));

        trySetInt(values, "amountfinanaced", v -> lead.amountFinanced = v);
        trySetInt(values, "tenor",          v -> lead.tenor          = v);
        trySetInt(values, "emi",            v -> lead.emi            = v);
        trySetInt(values, "totaloverdue",   v -> lead.totalOverdue   = v);
        trySetInt(values, "cbccharges",     v -> lead.cbcCharges     = v);
        trySetInt(values, "askable",        v -> lead.askable        = v);

        return lead;
    }

    /** Parse and apply an integer field without scattering try/catch blocks everywhere. */
    private void trySetInt(Map<String, String> values, String key,
            java.util.function.IntConsumer setter) {
        String raw = value(values, key);
        if (raw == null) return;
        try {
            setter.accept(Integer.parseInt(raw.trim()));
        } catch (NumberFormatException ignored) { }
    }

    /**
     * Normalize any date string from Excel to the canonical "yyyy-MM-dd" format
     * that MySQL's DATE column expects.
     *
     * POI's DataFormatter can produce many different representations depending on
     * the cell's number format:
     *   - "2026-08-05"   (ISO — already correct)
     *   - "8/5/2026"     (M/d/yyyy — US locale short date)
     *   - "1/5/32"       (M/d/yy where the 2-digit year was mis-read as 2032)
     *   - "05-Aug-2026"  (d-MMM-yyyy)
     *   - "05/08/2026"   (dd/MM/yyyy — day-first)
     *   etc.
     *
     * Returns null if the value is blank or cannot be parsed rather than letting
     * a garbage string reach MySQL.
     */
    private static final DateTimeFormatter DATE_OUTPUT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter[] DATE_INPUT_FORMATTERS = {
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("M/d/yyyy"),
            DateTimeFormatter.ofPattern("M/d/yy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("d-M-yyyy"),
            new DateTimeFormatterBuilder().parseCaseInsensitive()
                    .appendPattern("d-MMM-yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive()
                    .appendPattern("d-MMM-yy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive()
                    .appendPattern("dd MMM yyyy").toFormatter(Locale.ENGLISH),
    };

    private String normalizeDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String trimmed = raw.trim();
        for (DateTimeFormatter fmt : DATE_INPUT_FORMATTERS) {
            try {
                return LocalDate.parse(trimmed, fmt).format(DATE_OUTPUT);
            } catch (Exception ignored) { }
        }
        // As a last resort try parsing a full datetime and extracting the date part
        LocalDateTime dt = parseCallDateTime(trimmed);
        if (dt != null) return dt.toLocalDate().format(DATE_OUTPUT);

        logger.warn("Could not parse date value '{}'; storing null to avoid DB truncation", trimmed);
        return null;
    }

    // -----------------------------------------------------------------------
    // Header utilities (unchanged from original)
    // -----------------------------------------------------------------------

    private int findHeaderRowIndex(Sheet sheet, DataFormatter formatter) {
        for (int rowIndex = sheet.getFirstRowNum(); rowIndex <= sheet.getLastRowNum(); rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null) continue;

            List<String> normalizedCells = new ArrayList<>();
            for (Cell cell : row) {
                normalizedCells.add(normalizeHeader(formatter.formatCellValue(cell)));
            }
            if (hasRequiredHeaders(normalizedCells)) return rowIndex;
        }
        return -1;
    }

    private boolean hasRequiredHeaders(List<String> headers) {
        boolean hasIdentifier = headers.contains("listid") || headers.contains("listname")
                || headers.contains("agreementnumber") || headers.contains("mobilenumber")
                || headers.contains("mobile") || headers.contains("customermobile");
        boolean hasFeedback = headers.contains("disposition") || headers.contains("dispo")
                || headers.contains("subdisposition") || headers.contains("subdispo")
                || headers.contains("remark") || headers.contains("remarks");
        boolean hasCallDateTime = headers.contains("calldatetime") || headers.contains("datetime")
                || headers.contains("calltime");
        return hasCallDateTime || (hasIdentifier && hasFeedback);
    }

    private Map<Integer, String> readHeaders(Row headerRow, DataFormatter formatter) {
        Map<Integer, String> headers = new HashMap<>();
        for (Cell cell : headerRow) {
            String header = normalizeHeader(formatter.formatCellValue(cell));
            if (!header.isBlank()) headers.put(cell.getColumnIndex(), header);
        }
        return headers;
    }

    private void validateHeaders(Map<Integer, String> headers) {
        if (!hasRequiredHeaders(new ArrayList<>(headers.values()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NC header row not found");
        }
    }

    private Map<String, String> readRowValues(Row row, Map<Integer, String> headers, DataFormatter formatter) {
        Map<String, String> values = new HashMap<>();
        for (Map.Entry<Integer, String> header : headers.entrySet()) {
            Cell cell = row.getCell(header.getKey());
            values.put(header.getValue(), cell == null ? "" : formatter.formatCellValue(cell).trim());
        }
        return values;
    }

    private boolean isBlankRow(Row row, DataFormatter formatter) {
        for (Cell cell : row) {
            if (!formatter.formatCellValue(cell).trim().isBlank()) return false;
        }
        return true;
    }

    // -----------------------------------------------------------------------
    // Value helpers (unchanged from original)
    // -----------------------------------------------------------------------

    private String value(Map<String, String> values, String... keys) {
        for (String key : keys) {
            String v = values.get(key);
            if (v != null && !v.isBlank()) return v.trim();
        }
        return null;
    }

    private String textOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private String normalizeHeader(String header) {
        if (header == null) return "";
        return header.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private LocalDateTime parseCallDateTime(String value) {
        if (value == null || value.isBlank()) return null;
        try { return normalizeTimestamp(LocalDateTime.parse(value.trim())); } catch (Exception ignored) { }

        DateTimeFormatter[] formatters = {
                DateTimeFormatter.ofPattern("M/d/yyyy H:m"),
                DateTimeFormatter.ofPattern("M/d/yyyy H:m:s"),
                DateTimeFormatter.ofPattern("M/d/yy H:m"),
                DateTimeFormatter.ofPattern("M/d/yy H:m:s"),
                DateTimeFormatter.ofPattern("M/d/yyyy h:m a", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("M/d/yyyy h:m:s a", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("M/d/yy h:m a", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("M/d/yy h:m:s a", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("yyyy-MM-dd H:m"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd H:m:s"),
                DateTimeFormatter.ofPattern("dd-MM-yyyy H:m"),
                DateTimeFormatter.ofPattern("dd-MM-yyyy H:m:s"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy H:m"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy H:m:s"),
                new DateTimeFormatterBuilder().parseCaseInsensitive()
                        .appendPattern("d-MMM-yyyy H:m").optionalStart().appendPattern(":s").optionalEnd()
                        .toFormatter(Locale.ENGLISH),
                new DateTimeFormatterBuilder().parseCaseInsensitive()
                        .appendPattern("d-MMM-yy H:m").optionalStart().appendPattern(":s").optionalEnd()
                        .toFormatter(Locale.ENGLISH)
        };

        for (DateTimeFormatter formatter : formatters) {
            try { return normalizeTimestamp(LocalDateTime.parse(value.trim(), formatter)); }
            catch (Exception ignored) { }
        }
        return null;
    }

    private LocalDateTime currentTimestamp() {
        return normalizeTimestamp(LocalDateTime.now());
    }

    private LocalDateTime normalizeTimestamp(LocalDateTime ts) {
        return ts.truncatedTo(ChronoUnit.SECONDS);
    }

    private String toJson(Map<String, String> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Could not serialize NC row data", error);
        }
    }

    // -----------------------------------------------------------------------
    // Stats container
    // -----------------------------------------------------------------------

    private static class NcImportStats {
        int totalRecords   = 0;
        int matchedRecords = 0;
        int updatedRecords = 0;
        int unmatchedRecords = 0;
        int failedRecords  = 0;
    }

    // -----------------------------------------------------------------------
    // SAX sheet handler for XLSX streaming
    // -----------------------------------------------------------------------

    private class NcSheetHandler implements XSSFSheetXMLHandler.SheetContentsHandler {

        private final User uploadedBy;
        private final Product product;
        private final UploadFile uploadFile;
        private final String progressId;
        final NcImportStats stats = new NcImportStats();
        final Map<Integer, String> headers = new HashMap<>();

        // Rows accumulate here until a full batch is ready
        final List<Map<String, String>> pendingBatch = new ArrayList<>(BATCH_SIZE);

        private Map<Integer, String> currentRowValues = new HashMap<>();
        boolean headerFound = false;

        NcSheetHandler(User uploadedBy, Product product, UploadFile uploadFile, String progressId) {
            this.uploadedBy = uploadedBy;
            this.product    = product;
            this.uploadFile = uploadFile;
            this.progressId = progressId;
        }

        @Override
        public void startRow(int rowNum) {
            currentRowValues = new HashMap<>();
        }

        @Override
        public void endRow(int rowNum) {
            if (!headerFound) {
                readStreamingHeader();
                return;
            }
            if (isBlankStreamingRow()) return;

            pendingBatch.add(readStreamingRowValues());

            // Flush when the batch is full
            if (pendingBatch.size() >= BATCH_SIZE) {
                processBatch(pendingBatch, uploadedBy, product, uploadFile, stats);
                pendingBatch.clear();
                uploadProgressService.batchSaved(progressId, stats.totalRecords, stats.updatedRecords);
            }
        }

        @Override
        public void cell(String cellReference, String formattedValue,
                org.apache.poi.xssf.usermodel.XSSFComment comment) {
            int columnIndex = cellReference == null
                    ? currentRowValues.size()
                    : new CellReference(cellReference).getCol();
            currentRowValues.put(columnIndex, formattedValue == null ? "" : formattedValue.trim());
        }

        @Override
        public void headerFooter(String text, boolean isHeader, String tagName) { }

        private void readStreamingHeader() {
            List<String> normalizedCells = new ArrayList<>();
            for (String v : currentRowValues.values()) normalizedCells.add(normalizeHeader(v));
            if (!hasRequiredHeaders(normalizedCells)) return;

            for (Map.Entry<Integer, String> cell : currentRowValues.entrySet()) {
                String header = normalizeHeader(cell.getValue());
                if (!header.isBlank()) headers.put(cell.getKey(), header);
            }
            headerFound = true;
            uploadProgressService.processing(progressId, uploadFile.id, null);
        }

        private boolean isBlankStreamingRow() {
            for (String v : currentRowValues.values()) {
                if (v != null && !v.trim().isBlank()) return false;
            }
            return true;
        }

        private Map<String, String> readStreamingRowValues() {
            Map<String, String> values = new HashMap<>();
            for (Map.Entry<Integer, String> header : headers.entrySet()) {
                values.put(header.getValue(), currentRowValues.getOrDefault(header.getKey(), ""));
            }
            return values;
        }
    }
}