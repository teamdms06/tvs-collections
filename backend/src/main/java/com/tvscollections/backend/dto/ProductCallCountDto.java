package com.tvscollections.backend.dto;

public class ProductCallCountDto {
    public String productCode;
    public String productName;
    public Long calls;

    public ProductCallCountDto(String productCode, String productName, Long calls) {
        this.productCode = productCode;
        this.productName = productName;
        this.calls = calls;
    }
}
