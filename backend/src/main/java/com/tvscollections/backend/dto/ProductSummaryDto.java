package com.tvscollections.backend.dto;

import com.tvscollections.backend.model.Product;

public class ProductSummaryDto {
    public Long id;
    public String code;
    public String name;
    public Boolean isActive;

    public ProductSummaryDto(Product product) {
        this.id = product.id;
        this.code = product.code;
        this.name = product.name;
        this.isActive = product.isActive;
    }
}
