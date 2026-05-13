package com.smartlearning.backend.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class LiteLlmResponseUtil {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private LiteLlmResponseUtil() {}

    public static String extractImageUrl(String apiResponse) {
        try {
            JsonNode root = OBJECT_MAPPER.readTree(apiResponse);
            if (root.has("data") && root.get("data").isArray() && root.get("data").size() > 0) {
                JsonNode firstData = root.get("data").get(0);
                if (firstData.has("url")) {
                    return firstData.get("url").asText();
                }
                if (firstData.has("b64_json")) {
                    return "data:image/png;base64," + firstData.get("b64_json").asText();
                }
            }

            if (root.has("choices") && root.get("choices").isArray() && root.get("choices").size() > 0) {
                JsonNode message = root.get("choices").get(0).get("message");
                if (message != null && message.has("content")) {
                    String content = extractContentNodeText(message.get("content"));
                    java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("!\\[.*?\\]\\((.*?)\\)").matcher(content);
                    if (matcher.find()) {
                        return matcher.group(1);
                    }
                    return content;
                }
            }
        } catch (Exception e) {
            String sample = apiResponse.length() > 300 ? apiResponse.substring(0, 300) + "..." : apiResponse;
            System.err.println("Failed to extract image URL. Response sample: " + sample);
            e.printStackTrace();
        }
        return null;
    }

    public static String extractChatContent(String response) throws Exception {
        JsonNode root = OBJECT_MAPPER.readTree(response);
        if (root.has("choices") && root.get("choices").isArray() && root.get("choices").size() > 0) {
            JsonNode messageNode = root.get("choices").get(0).get("message");
            if (messageNode != null && messageNode.has("content")) {
                return extractContentNodeText(messageNode.get("content"));
            }
        }
        return "";
    }

    private static String extractContentNodeText(JsonNode contentNode) {
        if (contentNode == null || contentNode.isNull()) {
            return "";
        }
        if (contentNode.isTextual()) {
            return contentNode.asText();
        }
        if (contentNode.isArray()) {
            StringBuilder builder = new StringBuilder();
            for (JsonNode item : contentNode) {
                if (item.has("text")) {
                    if (builder.length() > 0) builder.append('\n');
                    builder.append(item.get("text").asText());
                }
            }
            return builder.toString();
        }
        return contentNode.asText("");
    }
}
