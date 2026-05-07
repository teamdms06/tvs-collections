package com.tvscollections.backend.model;

import com.fasterxml.jackson.annotation.JsonAutoDetect;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class FeedbackRequest {
    public String status;
    public String disposition;
    public String subDisposition;
    public String paymentMode;
    public String reason;
    public String remark;

    public FeedbackRequest() {
    }
}
