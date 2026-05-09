package com.tvscollections.backend.dto;

import java.util.List;

public class AdminUserOptionsDto {
    public List<String> roles;
    public List<ProductSummaryDto> products;

    public AdminUserOptionsDto(List<String> roles, List<ProductSummaryDto> products) {
        this.roles = roles;
        this.products = products;
    }
}
