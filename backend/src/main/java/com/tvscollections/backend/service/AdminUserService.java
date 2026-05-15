package com.tvscollections.backend.service;

import com.tvscollections.backend.dto.AdminUserDto;
import com.tvscollections.backend.dto.AdminUserOptionsDto;
import com.tvscollections.backend.dto.AdminUserRequestDto;
import com.tvscollections.backend.dto.ProductSummaryDto;
import com.tvscollections.backend.model.Product;
import com.tvscollections.backend.model.Role;
import com.tvscollections.backend.model.RoleProductAccess;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.model.UserRole;
import com.tvscollections.backend.repository.ProductRepository;
import com.tvscollections.backend.repository.RoleRepository;
import com.tvscollections.backend.repository.RoleProductAccessRepository;
import com.tvscollections.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class AdminUserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ProductRepository productRepository;
    private final ProductAccessService productAccessService;
    private final PasswordEncoder passwordEncoder;
    private final RoleProductAccessRepository roleProductAccessRepository;

    public AdminUserService(UserRepository userRepository,
                            RoleRepository roleRepository,
                            ProductRepository productRepository,
                            ProductAccessService productAccessService,
                            PasswordEncoder passwordEncoder,
                            RoleProductAccessRepository roleProductAccessRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.productRepository = productRepository;
        this.productAccessService = productAccessService;
        this.passwordEncoder = passwordEncoder;
        this.roleProductAccessRepository = roleProductAccessRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminUserDto> getUsers() {
        return userRepository.findAllNonAdminWithRoles().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminUserOptionsDto getOptions() {
        List<String> roles = roleRepository.findAll().stream()
                .map(role -> role.name)
                .filter(StringUtils::hasText)
                .sorted(String::compareToIgnoreCase)
                .toList();
        List<ProductSummaryDto> products = productRepository.findAll().stream()
                .filter(product -> Boolean.TRUE.equals(product.isActive))
                .map(ProductSummaryDto::new)
                .toList();

        return new AdminUserOptionsDto(roles, products);
    }

    @Transactional
    public AdminUserDto createUser(AdminUserRequestDto request) {
        validateUserRequest(request, true);

        if (userRepository.findByUsername(request.username.trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username already exists");
        }

        String email = resolveEmailForCreate(request);

        User user = new User();
        user.name = request.name.trim();
        user.username = request.username.trim();
        user.dialerUser = request.dialerUser.trim();
        user.email = email;
        user.passwordHash = passwordEncoder.encode(request.password);
        user.isActive = request.isActive == null || Boolean.TRUE.equals(request.isActive);
        assignRoles(user, request.roles);
        syncRoleProductAccess(user.getRoles(), request.accessProducts);

        return toDto(userRepository.save(user));
    }

    @Transactional
    public AdminUserDto updateUser(Long userId, AdminUserRequestDto request) {
        validateUserRequest(request, false);

        User user = userRepository.findByIdWithRoles(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        userRepository.findByUsername(request.username.trim())
                .filter(existing -> !existing.id.equals(userId))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username already exists");
                });

        user.name = request.name.trim();
        user.username = request.username.trim();
        user.dialerUser = request.dialerUser.trim();
        if (StringUtils.hasText(request.email)) {
            String email = request.email.trim();
            userRepository.findByEmail(email)
                    .filter(existing -> !existing.id.equals(userId))
                    .ifPresent(existing -> {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already exists");
                    });
            user.email = email;
        }
        user.isActive = request.isActive == null || Boolean.TRUE.equals(request.isActive);

        if (StringUtils.hasText(request.password)) {
            user.passwordHash = passwordEncoder.encode(request.password);
        }

        replaceRoles(user, request.roles);
        syncRoleProductAccess(user.getRoles(), request.accessProducts);
        return toDto(userRepository.save(user));
    }

    @Transactional
    public AdminUserDto updateUserActiveStatus(Long userId, boolean isActive) {
        User user = userRepository.findByIdWithRoles(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.isActive = isActive;
        return toDto(userRepository.save(user));
    }

    private void validateUserRequest(AdminUserRequestDto request, boolean requirePassword) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User details are required");
        }

        if (!StringUtils.hasText(request.name)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }

        if (!StringUtils.hasText(request.username)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }

        if (!StringUtils.hasText(request.dialerUser)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dialer user is required");
        }

        if (requirePassword && !StringUtils.hasText(request.password)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }

        if (request.roles == null || request.roles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one role is required");
        }
    }

    private void assignRoles(User user, List<String> roleNames) {
        user.userRoles.clear();
        Set<String> assignedRoleNames = new HashSet<>();

        for (String roleName : roleNames) {
            if (!StringUtils.hasText(roleName)) {
                continue;
            }

            String normalizedRoleName = normalizeRoleName(roleName);
            if (!assignedRoleNames.add(normalizedRoleName)) {
                continue;
            }

            Role role = roleRepository.findByName(roleName.trim())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role not found: " + roleName));
            user.userRoles.add(new UserRole(user, role));
        }
    }

    private void replaceRoles(User user, List<String> roleNames) {
        Set<String> requestedRoleNames = new HashSet<>();
        for (String roleName : roleNames) {
            if (StringUtils.hasText(roleName)) {
                requestedRoleNames.add(normalizeRoleName(roleName));
            }
        }

        user.userRoles.removeIf(userRole ->
                userRole.role == null
                        || !StringUtils.hasText(userRole.role.name)
                        || !requestedRoleNames.contains(normalizeRoleName(userRole.role.name))
        );

        Set<String> existingRoleNames = new HashSet<>();
        for (UserRole userRole : user.userRoles) {
            if (userRole.role != null && StringUtils.hasText(userRole.role.name)) {
                existingRoleNames.add(normalizeRoleName(userRole.role.name));
            }
        }

        for (String roleName : roleNames) {
            if (!StringUtils.hasText(roleName)) {
                continue;
            }

            String normalizedRoleName = normalizeRoleName(roleName);
            if (existingRoleNames.contains(normalizedRoleName)) {
                continue;
            }

            Role role = roleRepository.findByName(roleName.trim())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role not found: " + roleName));
            user.userRoles.add(new UserRole(user, role));
            existingRoleNames.add(normalizedRoleName);
        }
    }

    private String resolveEmailForCreate(AdminUserRequestDto request) {
        String email = StringUtils.hasText(request.email)
                ? request.email.trim()
                : generateInternalEmail(request.username);

        userRepository.findByEmail(email)
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already exists");
                });

        return email;
    }

    private String generateInternalEmail(String username) {
        return username.trim().toLowerCase(Locale.ROOT) + "@tvs.local";
    }

    private void syncRoleProductAccess(Set<Role> roles, List<String> requestedProductCodes) {
        List<Product> activeProducts = productRepository.findAll().stream()
                .filter(Product::isActive)
                .toList();
        Set<String> activeProductCodes = activeProducts.stream()
                .map(product -> normalizeProductCode(product.code))
                .filter(StringUtils::hasText)
                .collect(java.util.stream.Collectors.toSet());
        Set<String> requestedCodes = normalizeProductCodes(requestedProductCodes);
        if (!requestedCodes.isEmpty() && !activeProductCodes.containsAll(requestedCodes)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid product access selection");
        }

        for (Role role : roles) {
            if (role == null || role.id == null || !StringUtils.hasText(role.name)) {
                continue;
            }

            Set<String> targetCodes = new HashSet<>();
            if ("admin".equalsIgnoreCase(role.name.trim())) {
                activeProducts.stream()
                        .map(product -> normalizeProductCode(product.code))
                        .filter(StringUtils::hasText)
                        .forEach(targetCodes::add);
            } else if (!requestedCodes.isEmpty()) {
                targetCodes.addAll(requestedCodes);
            } else {
                String normalizedRoleName = normalizeRoleName(role.name);
                activeProducts.stream()
                        .map(product -> normalizeProductCode(product.code))
                        .filter(StringUtils::hasText)
                        .filter(productCode -> normalizedRoleName.contains(productCode))
                        .forEach(targetCodes::add);
            }

            if (targetCodes.isEmpty()) {
                continue;
            }

            activeProducts.stream()
                    .filter(product -> targetCodes.contains(normalizeProductCode(product.code)))
                    .filter(product -> !roleProductAccessRepository.existsByRoleIdAndProductId(role.id, product.id))
                    .map(product -> new RoleProductAccess(role, product))
                    .forEach(roleProductAccessRepository::save);
        }
    }

    private Set<String> normalizeProductCodes(List<String> productCodes) {
        Set<String> normalizedCodes = new HashSet<>();
        if (productCodes == null) {
            return normalizedCodes;
        }

        for (String productCode : productCodes) {
            String normalizedCode = normalizeProductCode(productCode);
            if (StringUtils.hasText(normalizedCode)) {
                normalizedCodes.add(normalizedCode);
            }
        }

        return normalizedCodes;
    }

    private String normalizeRoleName(String roleName) {
        return roleName.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeProductCode(String productCode) {
        return StringUtils.hasText(productCode) ? productCode.trim().toLowerCase(Locale.ROOT) : "";
    }

    private AdminUserDto toDto(User user) {
        List<String> roles = user.getRoles().stream()
                .map(role -> role.name)
                .filter(StringUtils::hasText)
                .sorted(String::compareToIgnoreCase)
                .toList();

        return new AdminUserDto(
                user.id,
                user.name,
                user.username,
                user.dialerUser,
                user.email,
                user.isActive,
                user.createdAt,
                user.updatedAt,
                roles,
                productAccessService.getAccessibleProductCodes(user)
        );
    }
}
