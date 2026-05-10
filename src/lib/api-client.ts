export interface TextToImageParams {
  prompt: string;
  model: string;
  size?: string;
  n?: number;
  quality?: string;
  apiUrl: string;
  apiKey: string;
}

export interface ImageToImageParams {
  image: File | Blob;
  prompt: string;
  model: string;
  size?: string;
  apiUrl: string;
  apiKey: string;
}

export interface ApiClientResponse {
  created?: number;
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message: string; type: string };
  choices?: Array<{ message: { content: string } }>; // For models using chat completion
}

const getBaseUrl = (url: string) => {
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

export async function textToImage(params: TextToImageParams): Promise<ApiClientResponse> {
  const { prompt, model, size = '1024x1024', n = 1, quality, apiUrl, apiKey } = params;

  if (!apiUrl || !apiKey) {
    throw new Error('API URL and API Key must be provided.');
  }

  const baseUrl = getBaseUrl(apiUrl);

  // Handle models that use chat completions endpoint (e.g. Gemini, Deepseek, generic LLMs)
  if (model.includes('gemini') || model.includes('gpt-') || model.includes('deepseek')) {
    const payload = {
      model,
      messages: [{ role: 'user', content: prompt }],
    };

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API Error ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    return data;
  }

  // Standard image generation endpoint (e.g. DALL-E, Midjourney via standard proxy)
  const payload: Record<string, any> = {
    prompt,
    model,
    size,
    n,
  };

  if (quality) {
    payload.quality = quality;
  }

  const res = await fetch(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }

  return await res.json();
}

export async function imageToImage(params: ImageToImageParams): Promise<ApiClientResponse> {
  const { image, prompt, model, size = '1024x1024', apiUrl, apiKey } = params;

  if (!apiUrl || !apiKey) {
    throw new Error('API URL and API Key must be provided.');
  }

  const baseUrl = getBaseUrl(apiUrl);

  const formData = new FormData();
  formData.append('image', image);
  formData.append('prompt', prompt);
  formData.append('model', model);
  formData.append('size', size);

  const res = await fetch(`${baseUrl}/v1/images/edits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      // Do not set Content-Type, fetch handles multipart boundary automatically
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }

  return await res.json();
}

export async function analyzePromptWithGemini(prompt: string, apiUrl: string, apiKey: string) {
  const baseUrl = getBaseUrl(apiUrl);
  
  const systemPrompt = `你是一个专业的 AI 图像生成提示词教学助手。
学生刚用以下提示词生成了一张图片，请进行分析和优化。
要求返回纯 JSON 格式数据，不要有任何 markdown 代码块标记，直接返回 JSON 对象：
{
  "optimized": "优化后的提示词（补充画面细节、光影、风格、构图等）",
  "tips": [
    { "dimension": "主体细节", "explanation": "..." },
    { "dimension": "场景环境", "explanation": "..." },
    { "dimension": "光影氛围", "explanation": "..." }
  ]
}
注意：tips 数组长度保持在 3-4 个左右，针对学生原提示词缺失的维度进行指导。`;

  const payload = {
    model: 'gemini-3.1-flash-lite-preview', // 对应文档中的 Gemini 3.1 flash 文本模型
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `原提示词: "${prompt}"` }
    ],
    response_format: { type: "json_object" }
  };

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Analysis API failed');
  }

  const data = await res.json();
  const content = data.choices[0].message.content;
  try {
    return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e) {
    return null;
  }
}
