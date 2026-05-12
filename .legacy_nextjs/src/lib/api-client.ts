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
  let baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  if (baseUrl.endsWith('/v1')) {
    baseUrl = baseUrl.slice(0, -3);
  }
  return baseUrl;
};

export async function textToImage(params: TextToImageParams): Promise<ApiClientResponse> {
  const { prompt, model, size = '1024x1024', n = 1, quality, apiUrl, apiKey } = params;

  if (!apiUrl || !apiKey) {
    throw new Error('API URL and API Key must be provided.');
  }

  const baseUrl = getBaseUrl(apiUrl);

  // Standard image generation endpoint (e.g. DALL-E, GPT-Image, Gemini-Image)
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

export async function analyzePromptWithLLM(prompt: string, apiUrl: string, apiKey: string, modelName: string, customSystemPrompt?: string | null) {
  const baseUrl = getBaseUrl(apiUrl);
  
  const defaultSystemPrompt = `你是一个专业的 AI 图像生成提示词教学助手。
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

  const systemPrompt = customSystemPrompt || defaultSystemPrompt;

  const payload = {
    model: modelName,
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
    const errorText = await res.text();
    throw new Error(`Analysis API failed: ${errorText}`);
  }

  const data = await res.json();
  const content = data.choices[0].message.content;
  try {
    return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e) {
    return null;
  }
}
