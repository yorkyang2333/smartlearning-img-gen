package com.smartlearning.backend.service;

import com.smartlearning.backend.entity.Model;
import com.smartlearning.backend.util.ModelConfigUtil;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpMethod;

@Service
public class NewApiGatewayClient implements GatewayAiClient {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final long TASK_POLL_INTERVAL_MS = 2_000L;
    private static final long TASK_POLL_TIMEOUT_MS = 300_000L;

    private final RestTemplate restTemplate = new RestTemplate();
    private final GatewayConfigService gatewayConfigService;

    public NewApiGatewayClient(GatewayConfigService gatewayConfigService) {
        this.gatewayConfigService = gatewayConfigService;
    }

    @Override
    public String generateImage(String prompt, Model model, Map<String, Object> config) {
        String modelId = model.getModelId();
        
        // Smart Routing: If it's a text model or gemini/claude, we route it to the chat endpoint
        if ("TEXT_GENERATION".equals(model.getType()) || modelId.toLowerCase().contains("gemini") || modelId.toLowerCase().contains("claude") || modelId.toLowerCase().contains("gpt-4")) {
            String systemPrompt = "你是一个绘图助手。请直接回复 markdown 格式的图片链接 `![desc](url)`，不要有任何多余的解释文字。";
            return generateChatResponse(systemPrompt, prompt, modelId);
        }

        HttpHeaders headers = buildHeaders();
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("prompt", applyPromptSizeHint(prompt, modelId, config));
        requestBody.put("model", modelId);

        Map<String, Object> configMap = new HashMap<>();
        configMap.put("n", 1);
        if (config != null) {
            configMap.putAll(config);
        }
        requestBody.putAll(configMap);

        try {
            GatewayConfigService.ResolvedGatewayConfig configInfo = requireEnabledConfig();
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                configInfo.baseUrl() + "/v1/images/generations",
                request,
                String.class
            );
            return resolveAsyncImageResponse(response.getBody(), configInfo);
        } catch (Exception e) {
            throw new RuntimeException("Image generation failed via AI Gateway: " + e.getMessage());
        }
    }

    @Override
    public String editImage(String prompt, Model model, byte[] imageBytes, String filename, String contentType, Map<String, Object> config) {
        String modelId = model.getModelId();
        HttpHeaders headers = buildHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("prompt", applyPromptSizeHint(prompt, modelId, config));
        body.add("model", modelId);
        ByteArrayResource imageResource = new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return filename;
            }

            @Override
            public long contentLength() {
                return imageBytes.length;
            }
        };
        HttpHeaders fileHeaders = new HttpHeaders();
        if (contentType != null && !contentType.isBlank()) {
            fileHeaders.setContentType(MediaType.parseMediaType(contentType));
        }
        body.add("image", new HttpEntity<>(imageResource, fileHeaders));

        if (config != null) {
            config.forEach((key, value) -> {
                if (value != null) {
                    body.add(key, String.valueOf(value));
                }
            });
        }

        try {
            GatewayConfigService.ResolvedGatewayConfig configInfo = requireEnabledConfig();
            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                configInfo.baseUrl() + "/v1/images/edits",
                request,
                String.class
            );
            return resolveAsyncImageResponse(response.getBody(), configInfo);
        } catch (Exception e) {
            throw new RuntimeException("Image edit failed via AI Gateway: " + e.getMessage());
        }
    }

    @Override
    public String generateChatResponse(String systemPrompt, String userMessage, String modelName) {
        HttpHeaders headers = buildHeaders();
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", modelName);
        requestBody.put("messages", List.of(
            Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : "You are a helpful AI tutor."),
            Map.of("role", "user", "content", userMessage)
        ));

        try {
            GatewayConfigService.ResolvedGatewayConfig configInfo = requireEnabledConfig();
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                configInfo.baseUrl() + "/v1/chat/completions",
                request,
                String.class
            );
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Chat generation failed via AI Gateway: " + e.getMessage());
        }
    }

    @Override
    public String generateChatResponseWithImage(String systemPrompt, String userMessage, String imageUrl, String modelName) {
        HttpHeaders headers = buildHeaders();
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", modelName);

        List<Map<String, Object>> contentParts = new ArrayList<>();
        contentParts.add(Map.of("type", "text", "text", userMessage));
        contentParts.add(Map.of("type", "image_url", "image_url", Map.of("url", imageUrl)));

        requestBody.put("messages", List.of(
            Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : "You are a helpful AI tutor."),
            Map.of("role", "user", "content", contentParts)
        ));

        try {
            GatewayConfigService.ResolvedGatewayConfig configInfo = requireEnabledConfig();
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                configInfo.baseUrl() + "/v1/chat/completions",
                request,
                String.class
            );
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Multimodal chat generation failed via AI Gateway: " + e.getMessage());
        }
    }

    @Override
    public void generateChatStream(String systemPrompt, String userMessage, String modelName, java.util.function.Consumer<String> onNext, Runnable onComplete, java.util.function.Consumer<Throwable> onError) {
        try {
            GatewayConfigService.ResolvedGatewayConfig configInfo = requireEnabledConfig();
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", modelName);
            requestBody.put("stream", true);
            requestBody.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : "You are a helpful AI tutor."),
                Map.of("role", "user", "content", userMessage)
            ));

            String jsonBody = new ObjectMapper().writeValueAsString(requestBody);

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(configInfo.baseUrl() + "/v1/chat/completions"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody));

            String apiKey = configInfo.apiKey();
            if (!apiKey.isBlank()) {
                requestBuilder.header("Authorization", "Bearer " + apiKey);
            }

            HttpRequest request = requestBuilder.build();
            HttpClient client = HttpClient.newBuilder().build();

            client.sendAsync(request, HttpResponse.BodyHandlers.ofLines())
                    .thenAccept(response -> {
                        if (response.statusCode() != 200) {
                            onError.accept(new RuntimeException("API error: " + response.statusCode()));
                            return;
                        }
                        response.body().forEach(line -> {
                            if (!line.isBlank()) {
                                if (line.startsWith("data: ")) {
                                    String dataStr = line.substring(6);
                                    if ("[DONE]".equals(dataStr)) {
                                        return;
                                    }
                                    onNext.accept(dataStr);
                                } else if (line.startsWith("data:")) {
                                    String dataStr = line.substring(5);
                                    if ("[DONE]".equals(dataStr)) {
                                        return;
                                    }
                                    onNext.accept(dataStr);
                                }
                            }
                        });
                        onComplete.run();
                    })
                    .exceptionally(ex -> {
                        onError.accept(ex);
                        return null;
                    });
        } catch (Exception e) {
            onError.accept(e);
        }
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String apiKey = gatewayConfigService.getResolvedConfig().apiKey();
        if (!apiKey.isBlank()) {
            headers.setBearerAuth(apiKey);
        }
        return headers;
    }

    private GatewayConfigService.ResolvedGatewayConfig requireEnabledConfig() {
        GatewayConfigService.ResolvedGatewayConfig config = gatewayConfigService.getResolvedConfig();
        if (!config.enabled()) {
            throw new RuntimeException("AI Gateway 网关当前已关闭，请先在平台配置中启用。");
        }
        return config;
    }

    private String applyPromptSizeHint(String prompt, String modelId, Map<String, Object> config) {
        if (config == null) {
            return prompt;
        }

        Object selectedSize = config.get("size");
        if (!(selectedSize instanceof String sizeValue)) {
            return prompt;
        }

        String hint = ModelConfigUtil.buildAspectRatioPromptHint(sizeValue);
        return hint.isBlank() ? prompt : prompt + hint;
    }

    private String resolveAsyncImageResponse(String body, GatewayConfigService.ResolvedGatewayConfig configInfo) {
        if (body == null || body.isBlank()) {
            return body;
        }
        String taskId = extractTaskId(body);
        if (taskId == null) {
            return body;
        }
        return pollTaskUntilDone(taskId, configInfo);
    }

    private String extractTaskId(String body) {
        try {
            JsonNode root = JSON.readTree(body);
            JsonNode dataNode = root.get("data");
            if (dataNode == null) {
                return null;
            }
            JsonNode candidate = dataNode.isArray() && dataNode.size() > 0 ? dataNode.get(0) : dataNode;
            if (candidate != null && candidate.has("task_id")) {
                return candidate.get("task_id").asText(null);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private String pollTaskUntilDone(String taskId, GatewayConfigService.ResolvedGatewayConfig configInfo) {
        HttpHeaders headers = new HttpHeaders();
        String apiKey = configInfo.apiKey();
        if (!apiKey.isBlank()) {
            headers.setBearerAuth(apiKey);
        }
        HttpEntity<Void> request = new HttpEntity<>(headers);
        String pollUrl = configInfo.baseUrl() + "/v1/tasks/" + taskId;
        long deadline = System.currentTimeMillis() + TASK_POLL_TIMEOUT_MS;

        while (System.currentTimeMillis() < deadline) {
            ResponseEntity<String> response = restTemplate.exchange(pollUrl, HttpMethod.GET, request, String.class);
            String body = response.getBody();
            if (body == null || body.isBlank()) {
                sleep(TASK_POLL_INTERVAL_MS);
                continue;
            }
            try {
                JsonNode root = JSON.readTree(body);
                JsonNode data = root.get("data");
                String status = data != null && data.has("status") ? data.get("status").asText("") : "";

                if ("completed".equals(status)) {
                    return convertTaskResultToOpenAIFormat(data);
                }
                if ("failed".equals(status) || "cancelled".equals(status)) {
                    String message = "task " + status;
                    if (data.has("error") && data.get("error").has("message")) {
                        message = data.get("error").get("message").asText(message);
                    }
                    throw new RuntimeException("Image task " + status + ": " + message);
                }
            } catch (RuntimeException re) {
                throw re;
            } catch (Exception parseEx) {
                throw new RuntimeException("Failed to parse task status: " + parseEx.getMessage());
            }
            sleep(TASK_POLL_INTERVAL_MS);
        }
        throw new RuntimeException("Image task " + taskId + " timed out after " + (TASK_POLL_TIMEOUT_MS / 1000) + "s");
    }

    private String convertTaskResultToOpenAIFormat(JsonNode data) {
        JsonNode result = data.get("result");
        ObjectNode envelope = JSON.createObjectNode();
        envelope.put("created", System.currentTimeMillis() / 1000);
        ArrayNode dataArr = envelope.putArray("data");

        if (result != null && result.has("images") && result.get("images").isArray()) {
            for (JsonNode imageNode : result.get("images")) {
                JsonNode urls = imageNode.get("url");
                if (urls == null) {
                    continue;
                }
                if (urls.isArray()) {
                    for (JsonNode urlNode : urls) {
                        if (urlNode.isTextual()) {
                            dataArr.addObject().put("url", urlNode.asText());
                        }
                    }
                } else if (urls.isTextual()) {
                    dataArr.addObject().put("url", urls.asText());
                }
            }
        }

        if (dataArr.size() == 0) {
            throw new RuntimeException("Image task completed but result contained no image URLs");
        }
        return envelope.toString();
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Image task polling interrupted");
        }
    }
}
