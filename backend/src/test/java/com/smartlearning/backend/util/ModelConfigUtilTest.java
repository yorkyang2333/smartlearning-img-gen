package com.smartlearning.backend.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ModelConfigUtilTest {

    @Test
    void shouldInferOpenAiImageSizes() {
        assertEquals(
            List.of("1024x1024", "1536x1024", "1024x1536"),
            ModelConfigUtil.inferSupportedSizes("gpt-image-1", "openai")
        );
    }

    @Test
    void shouldNormalizeLegacySquareConfigToKnownModelSizes() {
        String normalized = ModelConfigUtil.normalizeConfig(
            "dall-e-3",
            "TEXT_TO_IMAGE",
            "openai",
            "{\"sizes\":[\"1024x1024\"]}"
        );

        assertTrue(normalized.contains("1792x1024"));
        assertTrue(normalized.contains("1024x1792"));
    }

    @Test
    void shouldBuildAspectRatioHint() {
        assertEquals(" 输出为16:9宽画幅构图。", ModelConfigUtil.buildAspectRatioPromptHint("1792x1024"));
    }
}
