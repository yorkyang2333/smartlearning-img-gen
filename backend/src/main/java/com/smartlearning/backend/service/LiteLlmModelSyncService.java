package com.smartlearning.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartlearning.backend.entity.Model;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.util.ModelConfigUtil;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class LiteLlmModelSyncService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final LiteLlmConfigService liteLlmConfigService;
    private final ModelRepository modelRepository;

    public LiteLlmModelSyncService(LiteLlmConfigService liteLlmConfigService, ModelRepository modelRepository) {
        this.liteLlmConfigService = liteLlmConfigService;
        this.modelRepository = modelRepository;
    }

    public Map<String, Object> syncModels() {
        List<DiscoveredModel> discoveredModels = discoverModels();
        List<Model> existingModels = modelRepository.findAllByOrderBySortOrderAsc();
        Map<String, Model> existingByModelId = new HashMap<>();
        existingModels.forEach(model -> existingByModelId.put(model.getModelId(), model));

        int created = 0;
        int updated = 0;
        int nextSortOrder = existingModels.stream()
            .map(Model::getSortOrder)
            .filter(value -> value != null)
            .max(Comparator.naturalOrder())
            .orElse(0) + 1;

        List<Model> toSave = new ArrayList<>();
        List<Map<String, Object>> synced = new ArrayList<>();

        for (DiscoveredModel discovered : discoveredModels) {
            Model existing = existingByModelId.get(discovered.modelId());
            if (existing == null) {
                Model model = new Model();
                model.setName(discovered.name());
                model.setModelId(discovered.modelId());
                model.setType(discovered.type());
                model.setProvider(discovered.provider());
                model.setDescription(discovered.description());
                model.setConfig(ModelConfigUtil.buildImageConfigJson(discovered.modelId(), "openai"));
                if (!"TEXT_TO_IMAGE".equals(discovered.type()) && !"BOTH".equals(discovered.type())) {
                    model.setConfig("{}");
                }
                model.setIsActive(true);
                model.setSortOrder(nextSortOrder++);
                model.setApiFormat("openai");
                model.setApiEndpointId(null);
                toSave.add(model);
                created++;
                synced.add(toSummary(model, true));
                continue;
            }

            boolean changed = false;
            if (!discovered.name().equals(existing.getName())) {
                existing.setName(discovered.name());
                changed = true;
            }
            if (!discovered.provider().equals(existing.getProvider())) {
                existing.setProvider(discovered.provider());
                changed = true;
            }
            if (!discovered.type().equals(existing.getType())) {
                existing.setType(discovered.type());
                changed = true;
            }
            String normalizedConfig = ModelConfigUtil.normalizeConfig(
                existing.getModelId(),
                existing.getType(),
                "openai",
                existing.getConfig()
            );
            if (!normalizedConfig.equals(existing.getConfig())) {
                existing.setConfig(normalizedConfig);
                changed = true;
            }
            existing.setApiFormat("openai");
            existing.setApiEndpointId(null);

            if (changed) {
                toSave.add(existing);
                updated++;
            }
            synced.add(toSummary(existing, false));
        }

        if (!toSave.isEmpty()) {
            modelRepository.saveAll(toSave);
        }

        return Map.of(
            "success", true,
            "created", created,
            "updated", updated,
            "totalSynced", discoveredModels.size(),
            "models", synced
        );
    }

    private List<DiscoveredModel> discoverModels() {
        List<DiscoveredModel> models = fetchFromModelInfo();
        if (!models.isEmpty()) {
            return dedupe(models);
        }
        return dedupe(fetchFromV1Models());
    }

    private List<DiscoveredModel> fetchFromModelInfo() {
        try {
            LiteLlmConfigService.ResolvedLiteLlmConfig config = requireEnabledConfig();
            JsonNode root = getJson(config.baseUrl() + "/model/info");
            List<DiscoveredModel> models = new ArrayList<>();
            JsonNode dataNode = root.has("data") ? root.get("data") : root;
            if (dataNode.isArray()) {
                for (JsonNode item : dataNode) {
                    String modelId = textOf(item, "model_name");
                    if (modelId.isBlank()) {
                        modelId = textOf(item, "id");
                    }
                    if (modelId.isBlank()) {
                        continue;
                    }

                    String provider = textOf(item, "litellm_provider");
                    if (provider.isBlank()) {
                        provider = textOf(item.path("model_info"), "litellm_provider");
                    }

                    models.add(new DiscoveredModel(
                        modelId,
                        prettyName(modelId),
                        provider.isBlank() ? inferProvider(modelId) : provider,
                        inferType(modelId),
                        "从 LiteLLM 网关同步的模型"
                    ));
                }
            }
            return models;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<DiscoveredModel> fetchFromV1Models() {
        try {
            LiteLlmConfigService.ResolvedLiteLlmConfig config = requireEnabledConfig();
            JsonNode root = getJson(config.baseUrl() + "/v1/models");
            List<DiscoveredModel> models = new ArrayList<>();
            JsonNode dataNode = root.has("data") ? root.get("data") : root;
            if (dataNode.isArray()) {
                for (JsonNode item : dataNode) {
                    String modelId = textOf(item, "id");
                    if (modelId.isBlank()) {
                        continue;
                    }

                    String provider = textOf(item, "owned_by");
                    models.add(new DiscoveredModel(
                        modelId,
                        prettyName(modelId),
                        provider.isBlank() ? inferProvider(modelId) : provider,
                        inferType(modelId),
                        "从 LiteLLM 网关同步的模型"
                    ));
                }
            }
            return models;
        } catch (Exception e) {
            throw new RuntimeException("从 LiteLLM 同步模型失败: " + e.getMessage());
        }
    }

    private JsonNode getJson(String url) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        String apiKey = liteLlmConfigService.getResolvedConfig().apiKey();
        if (!apiKey.isBlank()) {
            headers.setBearerAuth(apiKey);
        }
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        return objectMapper.readTree(Optional.ofNullable(response.getBody()).orElse("{}"));
    }

    private List<DiscoveredModel> dedupe(List<DiscoveredModel> models) {
        Map<String, DiscoveredModel> deduped = new LinkedHashMap<>();
        for (DiscoveredModel model : models) {
            deduped.putIfAbsent(model.modelId(), model);
        }
        return new ArrayList<>(deduped.values());
    }

    private String inferType(String modelId) {
        String lowerId = modelId.toLowerCase();
        if (lowerId.contains("gpt-image")) {
            return "BOTH";
        }
        if (lowerId.contains("dall-e") ||
            lowerId.contains("stable-diffusion") ||
            lowerId.contains("flux") ||
            lowerId.contains("midjourney") ||
            lowerId.contains("imagen") ||
            ModelConfigUtil.isGeminiImageModel(modelId) ||
            (lowerId.contains("image") && !lowerId.contains("embedding"))) {
            return "TEXT_TO_IMAGE";
        }
        return "TEXT_GENERATION";
    }

    private String inferProvider(String modelId) {
        String lowerId = modelId.toLowerCase();
        if (lowerId.contains("gpt") || lowerId.contains("dall-e") || lowerId.contains("openai")) return "openai";
        if (lowerId.contains("claude") || lowerId.contains("anthropic")) return "anthropic";
        if (lowerId.contains("gemini") || lowerId.contains("google")) return "google";
        if (lowerId.contains("deepseek")) return "deepseek";
        if (lowerId.contains("qwen") || lowerId.contains("alibaba")) return "alibaba";
        if (lowerId.contains("llama") || lowerId.contains("meta")) return "meta";
        return "other";
    }

    private String prettyName(String modelId) {
        return modelId.replace('/', ' ').replace('-', ' ');
    }

    private String textOf(JsonNode node, String fieldName) {
        return node.has(fieldName) && !node.get(fieldName).isNull() ? node.get(fieldName).asText() : "";
    }

    private LiteLlmConfigService.ResolvedLiteLlmConfig requireEnabledConfig() {
        LiteLlmConfigService.ResolvedLiteLlmConfig config = liteLlmConfigService.getResolvedConfig();
        if (!config.enabled()) {
            throw new RuntimeException("LiteLLM 网关当前已关闭，请先在平台配置中启用。");
        }
        return config;
    }

    private Map<String, Object> toSummary(Model model, boolean isNew) {
        return Map.of(
            "id", model.getId() == null ? "" : model.getId(),
            "name", model.getName(),
            "modelId", model.getModelId(),
            "type", model.getType(),
            "provider", model.getProvider(),
            "isNew", isNew
        );
    }

    private record DiscoveredModel(String modelId, String name, String provider, String type, String description) {}
}
