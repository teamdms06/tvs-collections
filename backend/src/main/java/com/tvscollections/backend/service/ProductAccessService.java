package com.tvscollections.backend.service;

import com.tvscollections.backend.model.Product;
import com.tvscollections.backend.model.Role;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.ProductRepository;
import com.tvscollections.backend.repository.RoleProductAccessRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ProductAccessService {

    private final RoleProductAccessRepository roleProductAccessRepository;
    private final ProductRepository productRepository;

    public ProductAccessService(RoleProductAccessRepository roleProductAccessRepository,
                                ProductRepository productRepository) {
        this.roleProductAccessRepository = roleProductAccessRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<String> getAccessibleProductCodes(User user) {
        Set<String> codes = new HashSet<>();

        for (Role role : user.getRoles()) {
            if (role == null || !StringUtils.hasText(role.name)) {
                continue;
            }

            if ("admin".equalsIgnoreCase(role.name.trim())) {
                return productRepository.findAll().stream()
                        .filter(Product::isActive)
                        .map(product -> normalizeProductCode(product.code))
                        .filter(StringUtils::hasText)
                        .sorted()
                        .collect(Collectors.toList());
            }

            roleProductAccessRepository.findByRoleId(role.id).stream()
                    .map(access -> access.product)
                    .filter(Product::isActive)
                    .map(product -> normalizeProductCode(product.code))
                    .filter(StringUtils::hasText)
                    .forEach(codes::add);
        }

        return codes.stream().sorted().collect(Collectors.toList());
    }

    private String normalizeProductCode(String productCode) {
        return StringUtils.hasText(productCode) ? productCode.trim().toLowerCase() : "";
    }
}
