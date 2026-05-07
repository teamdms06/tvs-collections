package com.tvscollections.backend.service;

import com.tvscollections.backend.dto.FeedbackRequestDto;
import com.tvscollections.backend.model.Feedback;
import com.tvscollections.backend.model.UploadFileData;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.FeedbackRepository;
import com.tvscollections.backend.repository.UploadFileDataRepository;
import com.tvscollections.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@Service
public class UploadFileDataService {

    private final UploadFileDataRepository uploadFileDataRepository;
    private final UserRepository userRepository;
    private final FeedbackRepository feedbackRepository;

    public UploadFileDataService(UploadFileDataRepository uploadFileDataRepository,
                                 UserRepository userRepository,
                                 FeedbackRepository feedbackRepository) {
        this.uploadFileDataRepository = uploadFileDataRepository;
        this.userRepository = userRepository;
        this.feedbackRepository = feedbackRepository;
    }

    public List<UploadFileData> searchLeads(String productCode, String query) {
        return uploadFileDataRepository.searchByProductAndQuery(productCode, query);
    }

    public UploadFileData getLeadById(String productCode, Long id) {
        return uploadFileDataRepository.findByIdAndProduct_Code(id, productCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead record not found"));
    }

    @Transactional
    public void addFeedback(String productCode, Long id, String agentEmail, FeedbackRequestDto feedbackDto) {
        UploadFileData lead = getLeadById(productCode, id);
        User agent = userRepository.findByEmail(agentEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found"));

        Feedback feedback = new Feedback();
        feedback.uploadFileData = lead;
        feedback.agent = agent;
        feedback.disposition = feedbackDto.disposition;
        feedback.subDisposition = feedbackDto.subDisposition;
        feedback.paymentMode = feedbackDto.paymentMode;
        feedback.nonPaymentReason = feedbackDto.nonPaymentReason;
        feedback.bouncingReason = feedbackDto.bouncingReason;
        feedback.ptpAmount = feedbackDto.ptpAmount;
        feedback.ptpDate = feedbackDto.ptpDate;
        feedback.pickupTime = feedbackDto.pickupTime;
        feedback.pickupAddress = feedbackDto.pickupAddress;
        feedback.transactionReceiptNo = feedbackDto.transactionReceiptNo;
        feedback.paidToName = feedbackDto.paidToName;
        feedback.paidToContact = feedbackDto.paidToContact;
        feedback.paidShowroom = feedbackDto.paidShowroom;
        feedback.callBackDate = feedbackDto.callBackDate;
        feedback.callBackTime = feedbackDto.callBackTime;
        feedback.alternateMobileNumber = feedbackDto.alternateMobileNumber;
        feedback.remark = feedbackDto.remark;

        Feedback saved = feedbackRepository.save(feedback);
        lead.latestFeedback = saved;
        uploadFileDataRepository.save(lead);
    }
}
