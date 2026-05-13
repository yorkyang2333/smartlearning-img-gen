package com.smartlearning.backend.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class GatewayResponseUtil {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private GatewayResponseUtil() {}

    public static String extractImageUrl(String apiResponse) {
        try {
            JsonNode root = OBJECT_MAPPER.readTree(apiResponse);

            // Path 1: OpenAI images/generations format — { "data": [{ "url": "..." }] }
            if (root.has("data") && root.get("data").isArray() && root.get("data").size() > 0) {
                JsonNode firstData = root.get("data").get(0);
                if (firstData.has("url")) {
                    return firstData.get("url").asText();
                }
                if (firstData.has("b64_json")) {
                    return "data:image/png;base64," + firstData.get("b64_json").asText();
                }
            }

            // Path 2: chat/completions format — { "choices": [{ "message": { "content": ... } }] }
            if (root.has("choices") && root.get("choices").isArray() && root.get("choices").size() > 0) {
                JsonNode message = root.get("choices").get(0).get("message");
                if (message != null && message.has("content")) {
                    JsonNode contentNode = message.get("content");

                    // 2a: If content is a multimodal array, try to extract inline image first
                    String inlineImage = extractImageFromContentArray(contentNode);
                    if (inlineImage != null) {
                        return inlineImage;
                    }

                    // 2b: Fall back to text extraction + markdown regex
                    String content = extractContentNodeText(contentNode);
                    java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("!\\[.*?\\]\\((.*?)\\)").matcher(content);
                    if (matcher.find()) {
                        return matcher.group(1);
                    }

                    // 2c: If the text content itself looks like a data URI or http URL, return it directly
                    if (content.startsWith("data:image/") || content.startsWith("http")) {
                        return content.trim();
                    }

                    // 2d: Return raw content as last resort (may not be a valid image URL)
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

    /**
     * Extract image URL/data from a multimodal content array.
     * Handles formats returned by Gemini and other models via OpenAI-compatible gateways:
     *   - { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } }
     *   - { "type": "image",     "image_url": { "url": "..." } }
     *   - { "type": "image",     "url": "..." }
     *   - { "type": "image",     "data": "base64...", "mime_type": "image/png" }
     *   - { "inline_data": { "data": "base64...", "mime_type": "image/png" } }
     */
    private static String extractImageFromContentArray(JsonNode contentNode) {
        if (contentNode == null || !contentNode.isArray()) {
            return null;
        }

        for (JsonNode item : contentNode) {
            String type = item.has("type") ? item.get("type").asText("") : "";

            // Format: { "type": "image_url", "image_url": { "url": "..." } }
            if (("image_url".equals(type) || "image".equals(type)) && item.has("image_url")) {
                JsonNode imageUrlNode = item.get("image_url");
                if (imageUrlNode.has("url")) {
                    return imageUrlNode.get("url").asText();
                }
            }

            // Format: { "type": "image", "url": "..." }
            if ("image".equals(type) && item.has("url")) {
                return item.get("url").asText();
            }

            // Format: { "type": "image", "data": "base64...", "mime_type": "image/png" }
            if ("image".equals(type) && item.has("data")) {
                String mimeType = item.has("mime_type") ? item.get("mime_type").asText("image/png") : "image/png";
                return "data:" + mimeType + ";base64," + item.get("data").asText();
            }

            // Format: { "inline_data": { "data": "...", "mime_type": "image/png" } }
            if (item.has("inline_data")) {
                JsonNode inlineData = item.get("inline_data");
                if (inlineData.has("data")) {
                    String mimeType = inlineData.has("mime_type") ? inlineData.get("mime_type").asText("image/png") : "image/png";
                    return "data:" + mimeType + ";base64," + inlineData.get("data").asText();
                }
            }
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
