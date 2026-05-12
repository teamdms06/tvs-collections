package com.tvscollections.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class DialerProxyService {
    private final HttpClient httpClient;
    private final String host;
    private final String user;
    private final String password;
    private final Duration timeout;

    public DialerProxyService(@Value("${vicidial.host}") String host,
                              @Value("${vicidial.api-user}") String user,
                              @Value("${vicidial.api-pass}") String password,
                              @Value("${vicidial.timeout-seconds:10}") long timeoutSeconds) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
        this.host = host;
        this.user = user;
        this.password = password;
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

    private String fetchFromVicidial(String function, String agentUser) {
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

        URI uri = builder.build().encode().toUri();
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
