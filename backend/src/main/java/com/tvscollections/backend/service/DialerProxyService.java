package com.tvscollections.backend.service;

import com.tvscollections.backend.dto.DialerActionRequestDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class DialerProxyService {
    private final HttpClient httpClient;
    private final String host;
    private final String user;
    private final String password;
    private final String agentApiHost;
    private final String agentApiUser;
    private final String agentApiPassword;
    private final Duration timeout;

    public DialerProxyService(@Value("${vicidial.host}") String host,
                              @Value("${vicidial.api-user}") String user,
                              @Value("${vicidial.api-pass}") String password,
                              @Value("${vicidial.agent-api-host}") String agentApiHost,
                              @Value("${vicidial.agent-api-user}") String agentApiUser,
                              @Value("${vicidial.agent-api-pass}") String agentApiPassword,
                              @Value("${vicidial.timeout-seconds:10}") long timeoutSeconds) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
        this.host = host;
        this.user = user;
        this.password = password;
        this.agentApiHost = agentApiHost;
        this.agentApiUser = agentApiUser;
        this.agentApiPassword = agentApiPassword;
        this.timeout = Duration.ofSeconds(timeoutSeconds);
    }

    public String getLoggedInAgents() {
        return fetchFromVicidial("logged_in_agents", null);
    }

    public String getAgentStatus(String agentUser) {
        if (agentUser == null || agentUser.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing agent user");
        }

        return fetchFromVicidial("agent_status", agentUser.trim());
    }

    public Map<String, String> getAgentStatuses(List<String> agentUsers) {
        if (agentUsers == null || agentUsers.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing agent users");
        }

        List<String> normalizedAgentUsers = agentUsers.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .filter(agentUser -> agentUser.matches("[A-Za-z0-9_.-]{1,64}"))
                .collect(Collectors.collectingAndThen(
                        Collectors.toCollection(LinkedHashSet::new),
                        List::copyOf
                ));

        if (normalizedAgentUsers.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing valid agent users");
        }

        Map<String, CompletableFuture<String>> pendingStatuses = new LinkedHashMap<>();
        for (String agentUser : normalizedAgentUsers) {
            pendingStatuses.put(agentUser, fetchFromVicidialAsync("agent_status", agentUser));
        }

        Map<String, String> statuses = new LinkedHashMap<>();
        for (Map.Entry<String, CompletableFuture<String>> entry : pendingStatuses.entrySet()) {
            try {
                statuses.put(entry.getKey(), entry.getValue().join());
            } catch (Exception error) {
                statuses.put(entry.getKey(), "");
            }
        }

        return statuses;
    }

    public String getAgentStatsExport(LocalDate startDate, LocalDate endDate, String agentUser) {
        if (startDate == null || endDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start and end dates are required");
        }
        if (endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date must be on or after start date");
        }
        if (StringUtils.hasText(agentUser) && !agentUser.trim().matches("[A-Za-z0-9_.-]{1,64}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent user is invalid");
        }

        UriComponentsBuilder builder = UriComponentsBuilder.newInstance()
                .scheme("http")
                .host(host)
                .path("/vicidial/non_agent_api.php")
                .queryParam("source", "test")
                .queryParam("user", user)
                .queryParam("pass", password)
                .queryParam("function", "agent_stats_export")
                .queryParam("time_format", "M")
                .queryParam("stage", "pipe")
                .queryParam("datetime_start", startDate + " 00:00:00")
                .queryParam("datetime_end", endDate + " 23:59:59")
                .queryParam("header", "YES");

        if (StringUtils.hasText(agentUser)) {
            builder.queryParam("agent_user", agentUser.trim());
        }

        return fetch(builder.build().encode().toUri());
    }

    public String getAgentStatsExport(LocalDate startDate, LocalDate endDate, List<String> agentUsers) {
        if (agentUsers == null || agentUsers.isEmpty()) {
            return getAgentStatsExport(startDate, endDate, (String) null);
        }

        List<String> normalizedAgentUsers = agentUsers.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .filter(agentUser -> agentUser.matches("[A-Za-z0-9_.-]{1,64}"))
                .collect(Collectors.collectingAndThen(
                        Collectors.toCollection(LinkedHashSet::new),
                        List::copyOf
                ));

        if (normalizedAgentUsers.isEmpty()) {
            return getAgentStatsExport(startDate, endDate, (String) null);
        }

        StringBuilder mergedExport = new StringBuilder();
        boolean hasHeader = false;

        for (String normalizedAgentUser : normalizedAgentUsers) {
            String exportText = getAgentStatsExport(startDate, endDate, normalizedAgentUser);
            for (String line : exportText.split("\\R")) {
                String trimmedLine = line.trim();

                if (trimmedLine.isEmpty()) {
                    continue;
                }

                boolean isHeader = trimmedLine.toLowerCase().startsWith("user|full_name|");
                if (isHeader) {
                    if (hasHeader) {
                        continue;
                    }
                    hasHeader = true;
                }

                mergedExport.append(trimmedLine).append(System.lineSeparator());
            }
        }

        return mergedExport.toString();
    }

    public String performAgentAction(String agentUser, DialerActionRequestDto request) {
        if (!StringUtils.hasText(agentUser)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing agent user");
        }
        if (request == null || !StringUtils.hasText(request.action)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dialer action is required");
        }

        String action = request.action.trim();
        return switch (action) {
            case "dial" -> dialAgent(agentUser.trim(), request.phoneNumber);
            case "hangup" -> callAgentApi(agentUser.trim(), "external_hangup", "1");
            case "pause" -> callAgentApi(agentUser.trim(), "external_pause", "PAUSE");
            case "resume" -> callAgentApi(agentUser.trim(), "external_pause", "RESUME");
            case "park" -> callAgentApi(agentUser.trim(), "park_call", "PARK_CUSTOMER");
            case "grab" -> callAgentApi(agentUser.trim(), "park_call", "GRAB_CUSTOMER");
            case "conference" -> callAgentApi(agentUser.trim(), "conference", "");
            case "disposition" -> callAgentApi(agentUser.trim(), "external_status", requireCode(request.value, "Disposition"));
            case "pauseCode" -> callAgentApi(agentUser.trim(), "pause_code", requireCode(request.value, "Pause code"));
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported dialer action");
        };
    }

    private String dialAgent(String agentUser, String phoneNumber) {
        String normalizedPhoneNumber = phoneNumber == null ? "" : phoneNumber.replaceAll("\\D", "");
        if (!normalizedPhoneNumber.matches("\\d{10}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number must have 10 digits");
        }

        UriComponentsBuilder builder = createAgentApiBuilder(agentUser, "external_dial", normalizedPhoneNumber)
                .queryParam("phone_code", "91")
                .queryParam("search", "YES")
                .queryParam("preview", "NO")
                .queryParam("focus", "NO");
        return fetch(builder.build().encode().toUri());
    }

    private String callAgentApi(String agentUser, String function, String value) {
        return fetch(createAgentApiBuilder(agentUser, function, value).build().encode().toUri());
    }

    private UriComponentsBuilder createAgentApiBuilder(String agentUser, String function, String value) {
        if (!StringUtils.hasText(agentApiHost) || !StringUtils.hasText(agentApiUser) || !StringUtils.hasText(agentApiPassword)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "ViciDial agent API is not configured");
        }

        return UriComponentsBuilder.newInstance()
                .scheme("http")
                .host(agentApiHost)
                .path("/agc/api.php")
                .queryParam("source", "tvs-collections")
                .queryParam("user", agentApiUser)
                .queryParam("pass", agentApiPassword)
                .queryParam("agent_user", agentUser)
                .queryParam("function", function)
                .queryParam("value", value);
    }

    private String requireCode(String value, String label) {
        String code = value == null ? "" : value.trim();
        if (!code.matches("[A-Za-z0-9_-]{1,32}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " is invalid");
        }
        return code;
    }

    private String fetchFromVicidial(String function, String agentUser) {
        return fetch(createVicidialUri(function, agentUser));
    }

    private CompletableFuture<String> fetchFromVicidialAsync(String function, String agentUser) {
        HttpRequest request = HttpRequest.newBuilder(createVicidialUri(function, agentUser))
                .timeout(timeout)
                .GET()
                .build();

        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(response -> {
                    if (response.statusCode() < 200 || response.statusCode() >= 300) {
                        throw new ResponseStatusException(
                                HttpStatus.BAD_GATEWAY,
                                "Dialer upstream failed with HTTP " + response.statusCode()
                        );
                    }

                    return response.body();
                });
    }

    private URI createVicidialUri(String function, String agentUser) {
        UriComponentsBuilder builder = UriComponentsBuilder.newInstance()
                .scheme("http")
                .host(host)
                .path("/vicidial/non_agent_api.php")
                .queryParam("source", "test")
                .queryParam("user", user)
                .queryParam("pass", password)
                .queryParam("stage", "csv")
                .queryParam("header", "YES")
                .queryParam("function", function);

        if (agentUser != null) {
            builder.queryParam("agent_user", agentUser);
        }

        return builder.build().encode().toUri();
    }

    private String fetch(URI uri) {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(timeout)
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Dialer upstream failed with HTTP " + response.statusCode()
                );
            }

            return response.body();
        } catch (IOException error) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Dialer upstream is unreachable", error);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Dialer upstream request was interrupted", error);
        }
    }
}
