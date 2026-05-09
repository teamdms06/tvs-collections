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
        List<Product> activeProducts = productRepository.findAll().stream()
                .filter(Product::isActive)
                .toList();

        for (Role role : user.getRoles()) {
            if (role == null || !StringUtils.hasText(role.name)) {
                continue;
            }

            if ("admin".equalsIgnoreCase(role.name.trim())) {
                return activeProducts.stream()
                        .map(product -> normalizeProductCode(product.code))
                        .filter(StringUtils::hasText)
                        .sorted()
                        .collect(Collectors.toList());
            }

            int accessCountBeforeRole = codes.size();
            roleProductAccessRepository.findByRoleId(role.id).stream()
                    .map(access -> access.product)
                    .filter(Product::isActive)
                    .map(product -> normalizeProductCode(product.code))
                    .filter(StringUtils::hasText)
                    .forEach(codes::add);

            if (codes.size() == accessCountBeforeRole) {
                addInferredProductAccess(codes, activeProducts, role.name);
            }
        }

        return codes.stream().sorted().collect(Collectors.toList());
    }

    private void addInferredProductAccess(Set<String> codes, List<Product> activeProducts, String roleName) {
        String normalizedRoleName = normalizeRoleName(roleName);

        activeProducts.stream()
                .map(product -> normalizeProductCode(product.code))
                .filter(StringUtils::hasText)
                .filter(productCode -> normalizedRoleName.contains(productCode))
                .forEach(codes::add);
    }

    private String normalizeProductCode(String productCode) {
        return StringUtils.hasText(productCode) ? productCode.trim().toLowerCase() : "";
    }

    private String normalizeRoleName(String roleName) {
        return StringUtils.hasText(roleName)
                ? roleName.trim().toLowerCase().replaceAll("[^a-z0-9]", "")
                : "";
    }
}
