const API_BASE_URL = 'https://api.chatanywhere.tech';

export interface TextToImageParams {
  prompt: string;
  model: string;
  size?: string;
  n?: number;
  quality?: string;
}

export interface ImageToImageParams {
  image: File | Blob;
  prompt: string;
  model: string;
  size?: string;
}

export interface ChatAnywhereResponse {
  created?: number;
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message: string; type: string };
  choices?: Array<{ message: { content: string } }>; // For gemini models using chat completion
}

const getApiKey = () => {
  const key = process.env.CHATANYWHERE_API_KEY;
  if (!key) {
    throw new Error('CHATANYWHERE_API_KEY is not configured');
  }
  return key;
};

export async function textToImage(params: TextToImageParams): Promise<ChatAnywhereResponse> {
  const { prompt, model, size = '1024x1024', n = 1, quality } = params;

  // Handle Gemini and other models that use chat completions endpoint
  if (model.includes('gemini') || model.includes('gpt-4o-mini') || model.includes('deepseek')) {
    const payload = {
      model,
      messages: [{ role: 'user', content: prompt }],
    };

    const res = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
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

  const res = await fetch(`${API_BASE_URL}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
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
  const { image, prompt, model, size = '1024x1024' } = params;

  const formData = new FormData();
  formData.append('image', image);
  formData.append('prompt', prompt);
  formData.append('model', model);
  formData.append('size', size);

  const res = await fetch(`${API_BASE_URL}/v1/images/edits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
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
