const API_BASE_URL = 'https://api.chatanywhere.tech';

export interface TextToImageParams {
  prompt: string;
  model: string;
  size?: string;
  n?: number;
  quality?: string;
  customApiUrl?: string;
  customApiKey?: string;
}

export interface ImageToImageParams {
  image: File | Blob;
  prompt: string;
  model: string;
  size?: string;
  customApiUrl?: string;
  customApiKey?: string;
}

export interface ChatAnywhereResponse {
  created?: number;
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message: string; type: string };
  choices?: Array<{ message: { content: string } }>; // For gemini models using chat completion
}

const getApiKey = (customKey?: string) => {
  if (customKey) return customKey;
  const key = process.env.CHATANYWHERE_API_KEY;
  if (!key) {
    throw new Error('CHATANYWHERE_API_KEY is not configured and no custom key provided');
  }
  return key;
};

const getBaseUrl = (customUrl?: string) => {
  if (customUrl) {
    // Ensure it doesn't end with a trailing slash for consistency
    return customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
  }
  return API_BASE_URL;
};

export async function textToImage(params: TextToImageParams): Promise<ChatAnywhereResponse> {
  const { prompt, model, size = '1024x1024', n = 1, quality, customApiUrl, customApiKey } = params;

  const baseUrl = getBaseUrl(customApiUrl);
  const apiKey = getApiKey(customApiKey);

  // Handle Gemini and other models that use chat completions endpoint
  if (model.includes('gemini') || model.includes('gpt-4o-mini') || model.includes('deepseek')) {
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

  // Standard image generation endpoint
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

export async function imageToImage(params: ImageToImageParams): Promise<ChatAnywhereResponse> {
  const { image, prompt, model, size = '1024x1024', customApiUrl, customApiKey } = params;

  const baseUrl = getBaseUrl(customApiUrl);
  const apiKey = getApiKey(customApiKey);

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
