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
    <div className="page-container fade-in">
      {/* 左侧控制区 */}
      <div className="control-panel slide-up">
        
        {/* Tabs - Segmented Control */}
        <div className="segmented-control">
          <div 
            className="segment-indicator" 
            style={{ transform: activeTab === 't2i' ? 'translateX(0)' : 'translateX(100%)' }} 
          />
          <button 
            className={`segment-btn ${activeTab === 't2i' ? 'active' : ''}`}
            onClick={() => setActiveTab('t2i')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/></svg>
            文生图
          </button>
          <button 
            className={`segment-btn ${activeTab === 'i2i' ? 'active' : ''}`}
            onClick={() => setActiveTab('i2i')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            图生图
          </button>
        </div>

        <div className="form-group mt-6">
          <label className="form-label">选择模型</label>
          {modelsLoading ? (
            <div className="skeleton-input" />
          ) : (
            <div className="select-wrapper">
              <select className="form-input" value={modelId} onChange={(e) => setModelId(e.target.value)}>
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
              <label className="form-label">图片尺寸</label>
              <div className="select-wrapper">
                <select className="form-input" value={size} onChange={(e) => setSize(e.target.value)}>
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
               <label className="form-label">生成数量</label>
               <input className="form-input" type="number" min="1" max={config.maxN || 4} value={n} onChange={(e) => setN(parseInt(e.target.value))} />
            </div>
          )}
        </div>

        {activeTab === 'i2i' && (
          <div className="form-group slide-down">
             <label className="form-label">参考图片</label>
             <div className="upload-dropzone">
                <input type="file" accept="image/*" onChange={handleImageChange} id="image-upload" className="hidden-input" />
                <label htmlFor="image-upload" className="upload-label">
                   {imagePreview ? (
                      <div className="preview-container">
                        <img src={imagePreview} alt="Preview" className="image-preview" />
                        <div className="preview-overlay">
                          <span>点击更换图片</span>
                        </div>
                      </div>
                   ) : (
                      <div className="upload-placeholder">
                        <div className="upload-icon-wrapper">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        </div>
                        <p className="upload-text">点击或拖拽上传参考图片</p>
                        <p className="upload-subtext">支持 JPG, PNG, WEBP 格式</p>
                      </div>
                   )}
                </label>
             </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label flex-between">
             <span>{activeTab === 't2i' ? '提示词 (Prompt)' : '编辑指令'}</span>
             <span className="char-count">{prompt.length} 字符</span>
          </label>
          <textarea 
            className="form-textarea"
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)} 
            rows={5} 
            placeholder="请详细描述您想生成的画面内容、风格、光影等细节..."
          />
        </div>

        {error && (
          <div className="error-message shake">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{error}</span>
          </div>
        )}

        <div className="spacer"></div>

        <button 
          className={`generate-btn ${loading ? 'loading' : ''}`} 
          onClick={handleGenerate}
          disabled={loading || modelsLoading || availableModels.length === 0}
        >
          {loading ? (
            <span className="flex-center">
              <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
              AI 正在创作中...
            </span>
          ) : (
            <span className="flex-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              立即生成
            </span>
          )}
          <div className="btn-glow"></div>
        </button>
      </div>

      {/* 右侧结果区 */}
      <div className="result-panel slide-up delay-1">
         <div className="result-header">
           <h2 className="result-title">创作结果</h2>
           {generationTime && (
             <span className="generation-time">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
               用时 {(generationTime / 1000).toFixed(2)}s
             </span>
           )}
         </div>
         
         <div className="result-canvas">
            {loading ? (
               <div className="loading-state">
                  <div className="elegant-spinner"></div>
                  <p className="loading-text">构思画面细节中...</p>
               </div>
            ) : resultImage ? (
               <div className="result-image-wrapper fade-in">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={resultImage} alt="Generated" className="result-img" />
                 <div className="result-actions">
                   <a href={resultImage} download="generated-image.png" target="_blank" className="icon-btn" title="下载大图" rel="noreferrer">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                   </a>
                 </div>
               </div>
            ) : (
               <div className="empty-state">
                  <div className="empty-icon-wrapper">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
                  <p className="empty-title">等待您的灵感</p>
                  <p className="empty-desc">在左侧输入提示词，让 AI 为您呈现精彩画面</p>
               </div>
            )}
         </div>
      </div>

      <style jsx>{`
        .page-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          gap: 2rem;
          min-height: calc(100vh - 8rem);
        }

        .control-panel {
          flex: 0 0 420px;
          background: #ffffff;
          border-radius: 20px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03);
          border: 1px solid rgba(229, 231, 235, 0.5);
          height: fit-content;
        }

        .result-panel {
          flex: 1;
          background: #ffffff;
          border-radius: 20px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03);
          border: 1px solid rgba(229, 231, 235, 0.5);
          min-height: 600px;
        }

        /* Segmented Control */
        .segmented-control {
          display: flex;
          background: #f3f4f6;
          border-radius: 12px;
          padding: 4px;
          position: relative;
        }

        .segment-indicator {
          position: absolute;
          top: 4px;
          left: 4px;
          width: calc(50% - 4px);
          height: calc(100% - 8px);
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1;
        }

        .segment-btn {
          flex: 1;
          padding: 0.75rem;
          font-size: 0.95rem;
          font-weight: 500;
          color: #6b7280;
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.3s;
        }

        .segment-btn.active {
          color: #111827;
        }

        .mt-6 { margin-top: 1.5rem; }
        .flex-row { display: flex; gap: 1rem; }
        .spacer { flex: 1; min-height: 1.5rem; }

        /* Forms */
        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-label {
          display: block;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .flex-between {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .char-count {
          font-size: 0.8rem;
          color: #9ca3af;
          font-weight: 400;
        }

        .select-wrapper {
          position: relative;
        }

        .select-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
        }

        .form-input, .form-textarea {
          width: 100%;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          color: #111827;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.01);
        }
        
        .form-input {
          appearance: none;
          padding-right: 2.5rem;
        }

        .form-textarea {
          resize: none;
          line-height: 1.5;
        }

        .form-input:focus, .form-textarea:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(108, 58, 224, 0.1);
          outline: none;
        }

        .form-input:hover, .form-textarea:hover {
          border-color: #d1d5db;
        }

        /* Upload Dropzone */
        .upload-dropzone {
          border: 2px dashed #e5e7eb;
          border-radius: 12px;
          background: #fafafa;
          transition: all 0.2s;
          overflow: hidden;
        }

        .upload-dropzone:hover {
          border-color: var(--primary-color);
          background: rgba(108, 58, 224, 0.02);
        }

        .hidden-input {
          display: none;
        }

        .upload-label {
          display: block;
          width: 100%;
          cursor: pointer;
        }

        .upload-placeholder {
          padding: 2rem 1rem;
          text-align: center;
        }

        .upload-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          color: #6b7280;
          transition: transform 0.2s, background 0.2s, color 0.2s;
        }

        .upload-dropzone:hover .upload-icon-wrapper {
          background: rgba(108, 58, 224, 0.1);
          color: var(--primary-color);
          transform: scale(1.05);
        }

        .upload-text {
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .upload-subtext {
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .preview-container {
          position: relative;
          width: 100%;
          padding-top: 56.25%; /* 16:9 Aspect Ratio */
        }

        .image-preview {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          color: white;
          font-weight: 500;
        }

        .preview-container:hover .preview-overlay {
          opacity: 1;
        }

        /* Error Message */
        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #ef4444;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        /* Generate Button */
        .generate-btn {
          position: relative;
          width: 100%;
          padding: 1rem;
          border-radius: 12px;
          background: linear-gradient(135deg, #6c3ae0, #4f46e5);
          color: white;
          font-size: 1.05rem;
          font-weight: 600;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(108, 58, 224, 0.3);
        }

        .generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(108, 58, 224, 0.4);
        }

        .generate-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .generate-btn:disabled {
          background: #d1d5db;
          box-shadow: none;
          cursor: not-allowed;
          opacity: 0.8;
        }

        .generate-btn.loading {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
        }

        .btn-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }

        .generate-btn:hover:not(:disabled) .btn-glow {
          opacity: 1;
          animation: rotate 4s linear infinite;
        }

        .flex-center {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
        }

        /* Result Area */
        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .result-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .generation-time {
          display: flex;
          align-items: center;
          font-size: 0.85rem;
          color: #6b7280;
          background: #f3f4f6;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
        }

        .result-canvas {
          flex: 1;
          background: #fafafa;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .empty-state {
          text-align: center;
          color: #9ca3af;
        }

        .empty-icon-wrapper {
          width: 80px;
          height: 80px;
          background: #f3f4f6;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          color: #d1d5db;
        }

        .empty-title {
          font-size: 1.1rem;
          font-weight: 500;
          color: #4b5563;
          margin-bottom: 0.5rem;
        }

        .empty-desc {
          font-size: 0.9rem;
        }

        .loading-state {
          text-align: center;
        }

        .elegant-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(108, 58, 224, 0.1);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
          margin: 0 auto 1.5rem;
        }

        .loading-text {
          font-weight: 500;
          color: var(--primary-color);
          animation: pulse 2s infinite;
        }

        .result-image-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e5e5f7;
          background-image:  repeating-radial-gradient( circle at 0 0, transparent 0, #e5e5f7 10px ), repeating-linear-gradient( #f3f4f655, #f3f4f6 );
        }

        .result-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .result-actions {
          position: absolute;
          bottom: 1.5rem;
          right: 1.5rem;
          display: flex;
          gap: 0.5rem;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s;
        }

        .result-image-wrapper:hover .result-actions {
          opacity: 1;
          transform: translateY(0);
        }

        .icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #374151;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.2s;
        }

        .icon-btn:hover {
          background: #ffffff;
          color: var(--primary-color);
          transform: scale(1.05);
        }

        .skeleton-input {
          height: 46px;
          border-radius: 10px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        /* Animations */
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes rotate { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        
        .fade-in { animation: fadeIn 0.5s ease forwards; }
        .slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .slide-down { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-1 { animation-delay: 0.1s; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }

        /* Responsive */
        @media (max-width: 900px) {
          .page-container {
            flex-direction: column;
          }
          .control-panel {
            flex: none;
            width: 100%;
          }
          .result-panel {
            min-height: 400px;
          }
        }
      `}</style>
    </div>
  );
}
