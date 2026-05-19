package com.smartlearning.backend.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class ModelConfigUtil {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private ModelConfigUtil() {}

    public static String normalizeConfig(String modelId, String type, String apiFormat, String configJson) {
        try {
            ObjectNode configNode = parseConfig(configJson);

            if (!isImageGenerationType(type)) {
                return configNode.toString();
            }

            List<String> inferredSizes = inferSupportedSizes(modelId, apiFormat);
            if (inferredSizes.isEmpty()) {
                return configNode.toString();
            }

            List<String> existingSizes = readSizes(configNode.get("sizes"));
            boolean shouldReplaceSizes = existingSizes.isEmpty()
                || (existingSizes.size() == 1 && "1024x1024".equals(existingSizes.get(0)) && inferredSizes.size() > 1);

            if (shouldReplaceSizes) {
                ArrayNode sizesNode = configNode.putArray("sizes");
                inferredSizes.forEach(sizesNode::add);
            }

            return configNode.toString();
        } catch (Exception e) {
            return buildImageConfigJson(modelId, apiFormat);
        }
    }

    public static String buildImageConfigJson(String modelId, String apiFormat) {
        try {
            ObjectNode configNode = OBJECT_MAPPER.createObjectNode();
            ArrayNode sizesNode = configNode.putArray("sizes");
            inferSupportedSizes(modelId, apiFormat).forEach(sizesNode::add);
            return configNode.toString();
        } catch (Exception e) {
            return "{\"sizes\":[\"1024x1024\"]}";
        }
    }

    public static List<String> inferSupportedSizes(String modelId, String apiFormat) {
        String lowerModelId = modelId == null ? "" : modelId.toLowerCase();

        if (lowerModelId.contains("dall-e-2")) {
            return List.of("256x256", "512x512", "1024x1024");
        }

        if (lowerModelId.contains("dall-e-3")) {
            return List.of("1024x1024", "1792x1024", "1024x1792");
        }

        if (lowerModelId.contains("gpt-image") || lowerModelId.contains("chatgpt-image")) {
            return List.of("1024x1024", "1536x1024", "1024x1536", "2048x2048");
        }

        if (lowerModelId.contains("flux")) {
            return List.of("1024x1024", "1024x768", "768x1024", "1536x1024", "1024x1536");
        }

        if (lowerModelId.contains("ideogram")) {
            return List.of("1024x1024", "1344x768", "768x1344", "1152x896", "896x1152");
        }

        if (lowerModelId.contains("midjourney") || lowerModelId.contains("mj")) {
            return List.of("1024x1024", "1792x1024", "1024x1792");
        }

        if (isGeminiImageModel(modelId)) {
            if (lowerModelId.contains("gemini-2.5-flash-image")) {
                return List.of(
                    "1024x1024",
                    "1248x832",
                    "832x1248",
                    "1184x864",
                    "864x1184",
                    "1152x896",
                    "896x1152",
                    "768x1344",
                    "1344x768",
                    "1536x672"
                );
            }

            return List.of(
                "1024x1024",
                "1264x848",
                "848x1264",
                "1200x896",
                "896x1200",
                "1152x928",
                "928x1152",
                "768x1376",
                "1376x768",
                "1584x672"
            );
        }

        return List.of("1024x1024");
    }

    public static boolean isGeminiImageModel(String modelId) {
        String lowerModelId = modelId == null ? "" : modelId.toLowerCase();
        return lowerModelId.contains("gemini") && (
            lowerModelId.contains("image")
                || lowerModelId.contains("flash-exp")
        );
    }

    public static boolean shouldUseImagesEndpoint(String modelId) {
        String lowerModelId = modelId == null ? "" : modelId.toLowerCase();
        return lowerModelId.contains("dall-e")
            || lowerModelId.contains("gpt-image")
            || lowerModelId.contains("chatgpt-image")
            || lowerModelId.contains("stable-diffusion")
            || lowerModelId.contains("flux")
            || lowerModelId.contains("midjourney")
            || lowerModelId.contains("mj")
            || lowerModelId.contains("ideogram")
            || lowerModelId.contains("imagen");
    }

    public static Map<String, Object> buildGeminiResponseFormat(String modelId, String size) {
        String aspectRatio = inferAspectRatio(size);
        if (aspectRatio == null) {
            return Map.of();
        }

        Map<String, Object> imageConfig = new HashMap<>();
        imageConfig.put("aspectRatio", aspectRatio);

        String lowerModelId = modelId == null ? "" : modelId.toLowerCase();
        if (lowerModelId.contains("gemini-3.1") || lowerModelId.contains("gemini-3-pro")) {
            imageConfig.put("imageSize", "1K");
        }

        return Map.of("image", imageConfig);
    }

    public static String buildAspectRatioPromptHint(String size) {
        String aspectRatio = inferAspectRatio(size);
        if (aspectRatio == null) {
            return "";
        }

        return switch (aspectRatio) {
            case "1:1" -> " 输出为1:1正方形构图。";
            case "2:3" -> " 输出为2:3竖版构图。";
            case "3:2" -> " 输出为3:2横版构图。";
            case "3:4" -> " 输出为3:4竖版构图。";
            case "4:3" -> " 输出为4:3横版构图。";
            case "4:5" -> " 输出为4:5竖版构图。";
            case "5:4" -> " 输出为5:4横版构图。";
            case "9:16" -> " 输出为9:16手机竖屏构图。";
            case "16:9" -> " 输出为16:9宽画幅构图。";
            case "21:9" -> " 输出为21:9电影宽屏构图。";
            default -> "";
        };
    }

    private static boolean isImageGenerationType(String type) {
        return "TEXT_TO_IMAGE".equals(type) || "BOTH".equals(type);
    }

    private static String inferAspectRatio(String size) {
        int[] dimensions = parseDimensions(size);
        if (dimensions == null) {
            return null;
        }

        int width = dimensions[0];
        int height = dimensions[1];
        double ratio = (double) width / height;

        String bestRatio = null;
        double bestDiff = Double.MAX_VALUE;

        Map<String, Double> supportedRatios = Map.of(
            "1:1", 1.0,
            "2:3", 2d / 3d,
            "3:2", 3d / 2d,
            "3:4", 3d / 4d,
            "4:3", 4d / 3d,
            "4:5", 4d / 5d,
            "5:4", 5d / 4d,
            "9:16", 9d / 16d,
            "16:9", 16d / 9d,
            "21:9", 21d / 9d
        );

        for (Map.Entry<String, Double> entry : supportedRatios.entrySet()) {
            double diff = Math.abs(ratio - entry.getValue());
            if (diff < bestDiff) {
                bestDiff = diff;
                bestRatio = entry.getKey();
            }
        }

        return bestDiff <= 0.05 ? bestRatio : null;
    }

    private static int[] parseDimensions(String size) {
        if (size == null || !size.contains("x")) {
            return null;
        }

        try {
            String[] parts = size.toLowerCase().split("x");
            if (parts.length != 2) {
                return null;
            }
            return new int[] { Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) };
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static ObjectNode parseConfig(String configJson) throws Exception {
        if (configJson == null || configJson.isBlank()) {
            return OBJECT_MAPPER.createObjectNode();
        }

        JsonNode parsed = OBJECT_MAPPER.readTree(configJson);
        if (parsed != null && parsed.isObject()) {
            return (ObjectNode) parsed;
        }

        return OBJECT_MAPPER.createObjectNode();
    }

    private static List<String> readSizes(JsonNode sizesNode) {
        List<String> sizes = new ArrayList<>();
        if (sizesNode == null || !sizesNode.isArray()) {
            return sizes;
        }

        for (JsonNode sizeNode : sizesNode) {
            if (sizeNode.isTextual()) {
                sizes.add(sizeNode.asText());
            }
        }
        return sizes;
    }
}
