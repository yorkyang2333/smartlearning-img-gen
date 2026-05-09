'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Image from 'next/image';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function GeneratePage() {
  const [activeTab, setActiveTab] = useState<'t2i' | 'i2i'>('t2i');
  
  // Form state
  const [prompt, setPrompt] = useState('');
  const [modelId, setModelId] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [n, setN] = useState(1);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultImage, setResultImage] = useState('');
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  // Fetch allowed models
  const { data: modelsResponse, isLoading: modelsLoading } = useSWR('/api/student-models', fetcher);
  const models = modelsResponse?.data || [];

  // Filter models based on active tab
  const availableModels = models.filter((m: any) => {
     if (activeTab === 't2i') return m.type === 'TEXT_TO_IMAGE' || m.type === 'BOTH';
     if (activeTab === 'i2i') return m.type === 'IMAGE_TO_IMAGE' || m.type === 'BOTH';
     return false;
  });

  // Set default model when available models change
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.find((m:any) => m.modelId === modelId)) {
      setModelId(availableModels[0].modelId);
    }
  }, [availableModels, modelId]);

  const selectedModel = availableModels.find((m: any) => m.modelId === modelId);
  const config = selectedModel ? JSON.parse(selectedModel.config) : {};

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGenerate = async () => {
    if (!prompt) {
      setError('请输入提示词');
      return;
    }

    if (activeTab === 'i2i' && !image) {
      setError('请上传参考图片');
      return;
    }

    setLoading(true);
    setError('');
    setResultImage('');
    setGenerationTime(null);

    try {
      const endpoint = activeTab === 't2i' ? '/api/generate/text-to-image' : '/api/generate/image-to-image';
      
      let body: string | FormData;
      let headers: HeadersInit = {};

      if (activeTab === 't2i') {
        body = JSON.stringify({ prompt, modelId, size, n });
        headers['Content-Type'] = 'application/json';
      } else {
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('modelId', modelId);
        formData.append('size', size);
        formData.append('image', image as File);
        body = formData;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || '生成失败');
      }

      setResultImage(data.rawUrl);
      setGenerationTime(data.data.durationMs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '2rem' }}>
      {/* 左侧控制区 */}
      <div className="glass-panel" style={{ flex: '0 0 400px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'fit-content' }}>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-dark)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
          <button 
            style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: activeTab === 't2i' ? 'var(--bg-card-hover)' : 'transparent', color: activeTab === 't2i' ? 'var(--text-main)' : 'var(--text-muted)' }}
            onClick={() => setActiveTab('t2i')}
          >文生图</button>
          <button 
            style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: activeTab === 'i2i' ? 'var(--bg-card-hover)' : 'transparent', color: activeTab === 'i2i' ? 'var(--text-main)' : 'var(--text-muted)' }}
            onClick={() => setActiveTab('i2i')}
          >图生图</button>
        </div>

        {/* 模型选择 */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>模型</label>
          {modelsLoading ? (
             <div>加载模型中...</div>
          ) : (
            <select value={modelId} onChange={(e) => setModelId(e.target.value)} style={{ width: '100%' }}>
              {availableModels.map((m: any) => (
                <option key={m.id} value={m.modelId}>{m.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* 尺寸选择 */}
        {config.sizes && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>图片尺寸</label>
            <select value={size} onChange={(e) => setSize(e.target.value)} style={{ width: '100%' }}>
              {config.sizes.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* 生成数量 */}
        {config.supportsN && (
          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>生成数量</label>
             <input type="number" min="1" max={config.maxN || 4} value={n} onChange={(e) => setN(parseInt(e.target.value))} style={{ width: '100%' }} />
          </div>
        )}

        {/* 图片上传 (仅图生图) */}
        {activeTab === 'i2i' && (
          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>参考图片</label>
             <div style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center', cursor: 'pointer' }}>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} id="image-upload" />
                <label htmlFor="image-upload" style={{ cursor: 'pointer', display: 'block' }}>
                   {imagePreview ? (
                      <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: 'var(--radius-sm)' }} />
                   ) : (
                      <div style={{ color: 'var(--text-muted)' }}>点击上传图片</div>
                   )}
                </label>
             </div>
          </div>
        )}

        {/* 提示词 */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
             {activeTab === 't2i' ? '提示词 (Prompt)' : '编辑指令'}
          </label>
          <textarea 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)} 
            rows={5} 
            placeholder="描述您想生成的画面..."
            style={{ width: '100%', resize: 'none' }}
          />
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>}

        <button 
          className="btn btn-primary" 
          onClick={handleGenerate}
          disabled={loading || modelsLoading || availableModels.length === 0}
          style={{ marginTop: 'auto' }}
        >
          {loading ? 'AI 正在生成中...' : '生成图片'}
        </button>
      </div>

      {/* 右侧结果区 */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', minHeight: '600px' }}>
         <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>生成结果</h2>
         
         <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative' }}>
            {loading ? (
               <div style={{ textAlign: 'center', color: 'var(--primary-color)' }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                  <div>请稍候...</div>
               </div>
            ) : resultImage ? (
               // eslint-disable-next-line @next/next/no-img-element
               <img src={resultImage} alt="Generated" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
               <div style={{ color: 'var(--text-muted)' }}>等待生成...</div>
            )}
         </div>

         {generationTime && (
            <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'right' }}>
               耗时: {(generationTime / 1000).toFixed(2)}s
            </div>
         )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
