package com.tvscollections.backend.dto;

public class ProductCountDto {
    public String productCode;
    public String productName;
    public Long leads;

    public ProductCountDto(String productCode, String productName, Long leads) {
        this.productCode = productCode;
        this.productName = productName;
        this.leads = leads;
    }
}
