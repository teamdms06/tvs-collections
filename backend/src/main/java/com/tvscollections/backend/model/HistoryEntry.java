package com.tvscollections.backend.model;

import com.fasterxml.jackson.annotation.JsonAutoDetect;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class HistoryEntry {
    public String date;
    public String disposition;
    public String remark;

    public HistoryEntry() {
    }

    public HistoryEntry(String date, String disposition, String remark) {
        this.date = date;
        this.disposition = disposition;
        this.remark = remark;
    }
}
