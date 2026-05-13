package com.smartlearning.backend.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LiteLlmResponseUtilTest {

    @Test
    void shouldExtractChatContentFromStringMessage() throws Exception {
        String response = """
            {
              "choices": [
                {
                  "message": {
                    "content": "hello from litellm"
                  }
                }
              ]
            }
            """;

        assertEquals("hello from litellm", LiteLlmResponseUtil.extractChatContent(response));
    }

    @Test
    void shouldExtractChatContentFromArrayMessage() throws Exception {
        String response = """
            {
              "choices": [
                {
                  "message": {
                    "content": [
                      { "type": "text", "text": "line1" },
                      { "type": "text", "text": "line2" }
                    ]
                  }
                }
              ]
            }
            """;

        assertEquals("line1\nline2", LiteLlmResponseUtil.extractChatContent(response));
    }

    @Test
    void shouldExtractBase64ImageUrl() {
        String response = """
            {
              "data": [
                {
                  "b64_json": "abc123"
                }
              ]
            }
            """;

        assertEquals("data:image/png;base64,abc123", LiteLlmResponseUtil.extractImageUrl(response));
    }
}
