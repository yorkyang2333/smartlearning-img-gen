'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';

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
    <div className="page-container">
      {/* Editorial Hero Header */}
      <div className="hero-band">
        <h1 className="hero-title">创作中心</h1>
        <p className="hero-subtitle">在此描述您的想法，AI 将为您呈现惊艳的视觉画面。</p>
      </div>

      <div className="content-grid">
        {/* 左侧控制区: Feature Card Style */}
        <div className="control-card">
          
          {/* Tabs: Category Tab Style */}
          <div className="category-tabs">
            <button 
              className={`category-tab ${activeTab === 't2i' ? 'active' : ''}`}
              onClick={() => setActiveTab('t2i')}
            >
              文生图
            </button>
            <button 
              className={`category-tab ${activeTab === 'i2i' ? 'active' : ''}`}
              onClick={() => setActiveTab('i2i')}
            >
              图生图
            </button>
          </div>

          <div className="form-group mt-6">
            <label className="form-label">模型</label>
            {modelsLoading ? (
              <div className="skeleton-input" />
            ) : (
              <div className="select-wrapper">
                <select className="text-input" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                  {availableModels.map((m: any) => (
                    <option key={m.id} value={m.modelId}>{m.name}</option>
                  ))}
                </select>
                <svg className="select-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            )}
          </div>

          <div className="flex-row">
            {config.sizes && (
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">尺寸</label>
                <div className="select-wrapper">
                  <select className="text-input" value={size} onChange={(e) => setSize(e.target.value)}>
                    {config.sizes.map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <svg className="select-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>
            )}

            {config.supportsN && (
              <div className="form-group" style={{ flex: 1 }}>
                 <label className="form-label">数量</label>
                 <input className="text-input" type="number" min="1" max={config.maxN || 4} value={n} onChange={(e) => setN(parseInt(e.target.value))} />
              </div>
            )}
          </div>

          {activeTab === 'i2i' && (
            <div className="form-group">
               <label className="form-label">参考图片</label>
               <div className="upload-dropzone">
                  <input type="file" accept="image/*" onChange={handleImageChange} id="image-upload" className="hidden-input" />
                  <label htmlFor="image-upload" className="upload-label">
                     {imagePreview ? (
                        <div className="preview-container">
                          <img src={imagePreview} alt="Preview" className="image-preview" />
                          <div className="preview-overlay">点击更换</div>
                        </div>
                     ) : (
                        <div className="upload-placeholder">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', color: 'var(--muted)' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          <p className="upload-text">点击上传图片</p>
                        </div>
                     )}
                  </label>
               </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
               {activeTab === 't2i' ? '提示词' : '编辑指令'}
            </label>
            <textarea 
              className="text-input textarea-input"
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              rows={5} 
              placeholder="详细描述画面..."
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="spacer"></div>

          <button 
            className="button-primary" 
            onClick={handleGenerate}
            disabled={loading || modelsLoading || availableModels.length === 0}
          >
            {loading ? '生成中...' : '开始生成'}
          </button>
        </div>

        {/* 右侧结果区: Product Mockup Card Dark Style */}
        <div className="mockup-card-dark">
           <div className="mockup-header">
             <h2 className="mockup-title">终端输出</h2>
             {generationTime && (
               <span className="generation-badge">
                 {(generationTime / 1000).toFixed(2)}s
               </span>
             )}
           </div>
           
           <div className="mockup-content">
              {loading ? (
                 <div className="loading-state">
                    <div className="status-indicator active"></div>
                    <p className="loading-text">正在处理生成请求...</p>
                 </div>
              ) : resultImage ? (
                 <div className="result-image-wrapper fade-in">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={resultImage} alt="Generated" className="result-img" />
                   <div className="result-actions">
                     <a href={resultImage} download="generated-image.png" target="_blank" className="button-secondary-on-dark" rel="noreferrer">
                       保存图片
                     </a>
                   </div>
                 </div>
              ) : (
                 <div className="empty-state">
                    <div className="status-indicator"></div>
                    <p className="empty-text">系统就绪，等待指令输入</p>
                 </div>
              )}
           </div>
        </div>
      </div>

      <style jsx>{`
        .page-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl, 32px);
          padding-bottom: 96px;
        }

        .hero-band {
          padding-top: 48px;
          padding-bottom: 24px;
        }

        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 48px;
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -1px;
          color: var(--ink);
          margin-bottom: 16px;
        }

        .hero-subtitle {
          font-size: 18px;
          color: var(--body-strong);
          font-weight: 400;
        }

        .content-grid {
          display: flex;
          gap: 32px;
          min-height: calc(100vh - 250px);
        }

        .control-card {
          flex: 0 0 380px;
          background: var(--surface-card);
          border-radius: var(--radius-lg, 12px);
          padding: 32px;
          display: flex;
          flex-direction: column;
          height: fit-content;
        }

        .mockup-card-dark {
          flex: 1;
          background: var(--surface-dark);
          border-radius: var(--radius-lg, 12px);
          padding: 32px;
          display: flex;
          flex-direction: column;
          min-height: 600px;
        }

        /* Category Tabs */
        .category-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .category-tab {
          background: transparent;
          color: var(--muted);
          font-size: 14px;
          font-weight: 500;
          padding: 8px 14px;
          border-radius: var(--radius-md, 8px);
          transition: background 0.2s, color 0.2s;
        }

        .category-tab:hover {
          color: var(--ink);
        }

        .category-tab.active {
          background: var(--canvas);
          color: var(--ink);
        }

        .mt-6 { margin-top: 24px; }
        .flex-row { display: flex; gap: 16px; }
        .spacer { flex: 1; min-height: 24px; }

        /* Forms */
        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--ink);
          margin-bottom: 8px;
        }

        .select-wrapper {
          position: relative;
        }

        .select-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          pointer-events: none;
        }

        .text-input {
          width: 100%;
          background: var(--canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md, 8px);
          padding: 10px 14px;
          font-size: 16px;
          color: var(--ink);
          height: 40px;
          transition: border-color 0.2s;
          appearance: none;
        }

        .text-input:focus {
          border-color: var(--primary);
          outline: none;
        }

        .textarea-input {
          height: auto;
          resize: none;
          line-height: 1.55;
        }

        /* Upload Dropzone */
        .upload-dropzone {
          border: 1px dashed var(--muted-soft);
          border-radius: var(--radius-md, 8px);
          background: var(--canvas);
          transition: border-color 0.2s;
          overflow: hidden;
        }

        .upload-dropzone:hover {
          border-color: var(--primary);
        }

        .hidden-input { display: none; }
        .upload-label { display: block; width: 100%; cursor: pointer; }

        .upload-placeholder {
          padding: 24px 16px;
          text-align: center;
        }

        .upload-text {
          font-size: 14px;
          color: var(--ink);
          font-weight: 500;
        }

        .preview-container {
          position: relative;
          width: 100%;
          padding-top: 56.25%;
        }

        .image-preview {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          object-fit: cover;
        }

        .preview-overlay {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(20, 20, 19, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          color: var(--on-dark);
          font-size: 14px;
          font-weight: 500;
        }

        .preview-container:hover .preview-overlay { opacity: 1; }

        /* Error Message */
        .error-message {
          color: var(--error);
          font-size: 14px;
          margin-bottom: 16px;
        }

        /* Buttons */
        .button-primary {
          width: 100%;
          background: var(--primary);
          color: var(--on-primary);
          font-size: 14px;
          font-weight: 500;
          border-radius: var(--radius-md, 8px);
          padding: 12px 20px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .button-primary:hover:not(:disabled) {
          background: var(--primary-active);
        }

        .button-primary:disabled {
          background: var(--primary-disabled);
          color: var(--muted);
          cursor: not-allowed;
        }

        .button-secondary-on-dark {
          background: var(--surface-dark-elevated);
          color: var(--on-dark);
          font-size: 14px;
          font-weight: 500;
          border-radius: var(--radius-md, 8px);
          padding: 12px 20px;
          transition: background 0.2s;
        }
        
        .button-secondary-on-dark:hover {
          background: #33302c; /* slightly lighter than elevated */
        }

        /* Result Area */
        .mockup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .mockup-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 400;
          color: var(--on-dark);
          letter-spacing: -0.3px;
          margin: 0;
        }

        .generation-badge {
          background: var(--surface-dark-soft);
          color: var(--on-dark-soft);
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          padding: 4px 12px;
          border-radius: var(--radius-pill, 9999px);
        }

        .mockup-content {
          flex: 1;
          background: var(--surface-dark-soft);
          border-radius: var(--radius-lg, 12px);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 24px;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--muted);
          margin-right: 8px;
          display: inline-block;
        }
        
        .status-indicator.active {
          background: var(--accent-teal);
          box-shadow: 0 0 8px var(--accent-teal);
          animation: blink 1.5s infinite;
        }

        .empty-state, .loading-state {
          display: flex;
          align-items: center;
          color: var(--on-dark-soft);
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
        }

        .result-image-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .result-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: var(--radius-md, 8px);
        }

        .result-actions {
          position: absolute;
          bottom: 16px;
          right: 16px;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .result-image-wrapper:hover .result-actions {
          opacity: 1;
        }

        .skeleton-input {
          height: 40px;
          border-radius: var(--radius-md, 8px);
          background: var(--hairline);
          animation: pulse 1.5s infinite;
        }

        /* Animations */
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Responsive */
        @media (max-width: 900px) {
          .content-grid { flex-direction: column; }
          .control-card { flex: none; width: 100%; }
          .mockup-card-dark { min-height: 400px; }
        }
      `}</style>
    </div>
  );
}
