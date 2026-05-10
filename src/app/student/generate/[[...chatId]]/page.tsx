'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Message = {
  id: string;
  role: 'user' | 'agent';
  content?: string;
  image?: string;
  progress?: number;
  loadingText?: string;
  timeMs?: number;
  analysis?: {
    optimized: string;
    tips: Array<{ dimension: string; explanation: string }>;
  };
};

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.chatId?.[0] || null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [modelId, setModelId] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatId) {
      fetch(`/api/student/conversations/${chatId}`)
        .then(res => res.json())
        .then(data => {
          if (data.data && data.data.messages) {
            setMessages(data.data.messages);
          }
        });
    } else {
      setMessages([]);
    }
  }, [chatId]);

  // 恢复未发送的草稿
  useEffect(() => {
    const draftKey = `draft_prompt_${chatId || 'new'}`;
    const savedDraft = sessionStorage.getItem(draftKey);
    if (savedDraft) {
      setPrompt(savedDraft);
    }
  }, [chatId]);

  useEffect(() => {
    const draftKey = `draft_prompt_${chatId || 'new'}`;
    if (prompt) {
      sessionStorage.setItem(draftKey, prompt);
    } else {
      sessionStorage.removeItem(draftKey);
    }
  }, [prompt, chatId]);

  const { data: modelsResponse } = useSWR('/api/student-models', fetcher);
  const models = modelsResponse?.data || [];

  const currentMode = image ? 'i2i' : 't2i';

  const availableModels = models.filter((m: any) => {
     if (currentMode === 't2i') return m.type === 'TEXT_TO_IMAGE' || m.type === 'BOTH';
     if (currentMode === 'i2i') return m.type === 'IMAGE_TO_IMAGE' || m.type === 'BOTH';
     return false;
  });

  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.find((m:any) => m.modelId === modelId)) {
      setModelId(availableModels[0].modelId);
    }
  }, [availableModels, modelId, currentMode]);

  const selectedModel = availableModels.find((m: any) => m.modelId === modelId);
  const config = selectedModel ? JSON.parse(selectedModel.config) : {};

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  const removeImage = () => {
     setImage(null);
     setImagePreview(null);
  };

  const handleSend = async () => {
    if (!prompt.trim() && !image) return;

    const currentPrompt = prompt;
    
    // Add User Message
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: 'user',
      content: currentPrompt,
      image: imagePreview || undefined
    }]);
    
    setImage(null);
    setImagePreview(null);
    setIsGenerating(true);
    
    // Add Agent Loading Message
    const agentMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: agentMsgId,
      role: 'agent',
      progress: 0,
      loadingText: '正在构思视觉元素...'
    }]);
    
    setActiveMsgId(agentMsgId);

    try {
      const endpoint = currentMode === 't2i' ? '/api/generate/text-to-image' : '/api/generate/image-to-image';
      let body: string | FormData;
      let headers: HeadersInit = {};

      if (currentMode === 't2i') {
        const bodyObj: any = { prompt: currentPrompt, modelId, size, n: 1 };
        if (chatId) bodyObj.conversationId = chatId;
        body = JSON.stringify(bodyObj);
        headers['Content-Type'] = 'application/json';
      } else {
        const formData = new FormData();
        formData.append('prompt', currentPrompt);
        formData.append('modelId', modelId);
        formData.append('size', size);
        formData.append('image', image as File);
        if (chatId) formData.append('conversationId', chatId);
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

      // Update agent message with success
      setMessages(prev => prev.map(msg => 
        msg.id === agentMsgId ? { 
          ...msg, 
          progress: 100, 
          loadingText: undefined,
          image: data.rawUrl,
          timeMs: data.data?.durationMs,
          analysis: data.apiResponse ? data.apiResponse : undefined
        } : msg
      ));

      if (!chatId && data.conversationId) {
        router.push(`/student/generate/${data.conversationId}`);
      }

    } catch (err: any) {
      setMessages(prev => prev.map(msg => 
        msg.id === agentMsgId ? { 
          ...msg, 
          progress: undefined,
          loadingText: undefined,
          content: `生成出错: ${err.message}`
        } : msg
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!isGenerating) handleSend();
    }
  };

  const formatSize = (sizeStr: string) => {
    const ratioMap: Record<string, string> = {
      '1024x1024': '1:1', '512x512': '1:1', '1024x1792': '9:16',
      '1792x1024': '16:9', '768x1024': '3:4', '1024x768': '4:3'
    };
    if (ratioMap[sizeStr]) return `${ratioMap[sizeStr]} (${sizeStr})`;
    return sizeStr;
  };

  const agentMessages = messages.filter(m => m.role === 'agent' && (m.image || m.progress !== undefined || m.content));
  const activeMsg = agentMessages.find(m => m.id === activeMsgId) || agentMessages[agentMessages.length - 1];

  return (
    <div className="workspace-layout">
      {/* 区域 A/B: 左侧画板与历史记录 */}
      <div className="canvas-area">
        <div className="canvas-main">
          {activeMsg ? (
            <div className="canvas-content">
              {activeMsg.progress !== undefined && activeMsg.progress < 100 ? (
                <div className="generating-overlay">
                  <div className="ai-loader">
                    <div className="ai-loader-ring"></div>
                    <div className="ai-loader-core"></div>
                  </div>
                  <div className="loading-text">正在通过 {selectedModel?.name || 'AI'} 构思视觉元素...</div>
                </div>
              ) : activeMsg.image ? (
                <div className="image-wrapper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeMsg.image} alt="Generated" className="main-image" />
                  <div className="image-actions">
                    <a href={activeMsg.image} download="creation.png" target="_blank" rel="noreferrer" className="btn btn-secondary">
                      ⬇ 下载大图
                    </a>
                  </div>
                </div>
              ) : (
                <div className="error-state">
                  <span className="error-icon">⚠️</span>
                  <p>{activeMsg.content}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">✨</span>
              <h2>开启智慧创作之旅</h2>
              <p>在右侧输入提示词，体验 AI 导师辅助的学习过程</p>
            </div>
          )}
        </div>

        {/* 底部历史记录缩略图 */}
        {agentMessages.length > 0 && (
          <div className="history-rail">
            {agentMessages.map(msg => (
              <div 
                key={msg.id} 
                onClick={() => setActiveMsgId(msg.id)}
                className={`history-item ${activeMsgId === msg.id || (!activeMsgId && msg === agentMessages[agentMessages.length-1]) ? 'active' : ''}`}
              >
                {msg.progress !== undefined && msg.progress < 100 ? (
                  <div className="history-loading">⌛</div>
                ) : msg.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={msg.image} alt="history" />
                ) : (
                  <div className="history-error">!</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider / Toggle */}
      <div className="layout-divider">
        <button 
          className="layout-toggle-btn" 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? "收起右侧面板" : "展开右侧面板"}
        >
          {isSidebarOpen ? '▶' : '◀'}
        </button>
      </div>

      {/* 区域 C: 右侧工作区 (工具台 + 智慧导师) */}
      <div className={`workspace-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-inner">
          <div className="panel prompt-panel">
            <h3 className="panel-title">创作参数</h3>
          
          {imagePreview && (
            <div className="image-preview-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="preview" />
              <button className="remove-btn" onClick={removeImage}>✕</button>
            </div>
          )}

          <textarea
            className="prompt-textarea"
            placeholder="描述您想要的画面细节..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
          />

          <div className="controls-grid">
            <div className="control-group">
              <label>模型</label>
              <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="modern-select">
                {availableModels.map((m: any) => <option key={m.modelId} value={m.modelId}>{m.name}</option>)}
              </select>
            </div>
            
            {config.sizes && config.sizes.length > 0 && (
              <div className="control-group">
                <label>尺寸</label>
                <select value={size} onChange={(e) => setSize(e.target.value)} className="modern-select">
                  {config.sizes.map((s: string) => <option key={s} value={s}>{formatSize(s)}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="action-row">
            <input type="file" accept="image/*" onChange={handleImageChange} ref={fileInputRef} className="hidden-input" />
            <button className="btn btn-secondary icon-btn" onClick={() => fileInputRef.current?.click()} title="上传参考图">
              🖼️
            </button>
            <button className="btn btn-primary generate-btn" onClick={handleSend} disabled={isGenerating || (!prompt.trim() && !image)}>
              {isGenerating ? '正在生成...' : '🚀 开始生成 (⌘+Enter)'}
            </button>
          </div>
        </div>

        <div className="panel tutor-panel">
          <h3 className="panel-title">
            <span className="tutor-icon">🤖</span> AI 智能导师
          </h3>
          
          <div className="tutor-content">
            {activeMsg?.analysis ? (
              <div className="analysis-result">
                <div className="optimized-box">
                  <div className="box-header">✨ 优化建议</div>
                  <p className="optimized-text">{activeMsg.analysis.optimized}</p>
                  <button className="apply-btn" onClick={() => setPrompt(activeMsg.analysis.optimized)}>
                    ⬇ 应用此提示词
                  </button>
                </div>
                
                <div className="tips-box">
                  <div className="box-header">💡 维度解析</div>
                  <div className="tips-list">
                    {activeMsg.analysis.tips.map((tip, idx) => (
                      <div key={idx} className="tip-item">
                        <span className="tip-badge">{tip.dimension}</span>
                        <span className="tip-text">{tip.explanation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeMsg?.progress !== undefined && activeMsg?.progress < 100 ? (
              <div className="tutor-loading-state">
                <div className="pulse-dot"></div>
                <p>导师正在分析您的提示词维度...</p>
              </div>
            ) : (
              <div className="tutor-empty-state">
                <p>生成作品后，导师将为您提供光影、构图等多维度的专业分析与建议。</p>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      <style jsx>{`
        .workspace-layout {
          display: flex;
          height: 100vh;
          margin: -48px; /* 抵消 main-content 的 48px padding */
          background: var(--surface-cream);
          overflow: hidden;
        }

        /* Left Canvas */
        .canvas-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 32px 16px 32px 32px;
          min-width: 0;
          transition: padding 0.3s;
        }

        .layout-divider {
          width: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 10;
        }

        .layout-toggle-btn {
          width: 16px;
          height: 64px;
          background: var(--surface-card);
          border: 1px solid var(--hairline);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted);
          cursor: pointer;
          font-size: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.2s;
        }

        .layout-toggle-btn:hover {
          background: var(--canvas);
          color: var(--primary);
          transform: scale(1.05);
        }

        .canvas-main {
          flex: 1;
          background: var(--canvas);
          border-radius: 16px;
          border: 1px solid var(--hairline);
          box-shadow: 0 4px 24px rgba(0,0,0,0.02);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .canvas-content {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 32px;
        }

        .image-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .main-image {
          max-width: 100%;
          max-height: calc(100% - 60px);
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); filter: blur(4px); }
          to { opacity: 1; transform: scale(1); filter: blur(0); }
        }

        .generating-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .ai-loader {
          position: relative;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-loader-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid transparent;
          border-top-color: var(--primary);
          border-right-color: rgba(204, 120, 92, 0.3);
          border-radius: 50%;
          animation: spin 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        }

        .ai-loader-core {
          width: 20px;
          height: 20px;
          background: var(--primary);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 20px rgba(204, 120, 92, 0.6);
        }

        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }

        @keyframes spin { 100% { transform: rotate(360deg); } }

        .loading-text {
          font-family: var(--font-mono);
          color: var(--muted);
          font-size: 14px;
          letter-spacing: 0.5px;
          animation: blink 2s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .empty-state {
          text-align: center;
          color: var(--muted);
        }
        
        .empty-icon { font-size: 48px; display: block; margin-bottom: 16px; opacity: 0.5; }

        .error-state {
          color: var(--error);
          text-align: center;
          padding: 24px;
          background: rgba(220, 38, 38, 0.1);
          border-radius: 8px;
        }

        /* History Rail */
        .history-rail {
          height: 80px;
          margin-top: 16px;
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .history-item {
          width: 64px;
          height: 64px;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          border: 2px solid transparent;
          opacity: 0.6;
          transition: all 0.2s;
          background: var(--canvas);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .history-item:hover { opacity: 1; }
        .history-item.active {
          border-color: var(--primary);
          opacity: 1;
        }

        .history-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Right Sidebar */
        .workspace-sidebar {
          width: 380px;
          display: flex;
          flex-direction: column;
          padding: 32px 32px 32px 0;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease, opacity 0.2s ease;
          overflow: hidden;
        }
        
        .workspace-sidebar.closed {
          width: 0;
          padding: 32px 0;
          opacity: 0;
          pointer-events: none;
        }
        
        .sidebar-inner {
          flex: 1;
          background: var(--canvas);
          border-radius: 16px;
          border: 1px solid var(--hairline);
          box-shadow: 0 4px 24px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          width: 348px; /* Fixed width to avoid squishing during transition */
        }

        .panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .prompt-panel {
          border-bottom: 1px solid var(--hairline);
        }

        .tutor-panel {
          flex: 1;
          background: var(--surface-cream-strong);
          overflow-y: auto;
        }

        .panel-title {
          margin: 0 0 16px 0;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .prompt-textarea {
          width: 100%;
          background: var(--surface-cream);
          border: 1px solid var(--hairline);
          border-radius: 8px;
          padding: 12px;
          font-family: var(--font-inter);
          font-size: 14px;
          resize: none;
          margin-bottom: 16px;
        }
        
        .prompt-textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(204, 120, 92, 0.1);
        }

        .controls-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .control-group label {
          display: block;
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 4px;
        }

        .modern-select {
          width: 100%;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid var(--hairline);
          background: var(--canvas);
          font-size: 13px;
        }

        .action-row {
          display: flex;
          gap: 12px;
        }

        .icon-btn { padding: 0 16px; }
        .generate-btn { flex: 1; }

        /* Tutor Content */
        .optimized-box {
          background: white;
          border: 1px solid var(--primary);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 2px 12px rgba(204,120,92,0.1);
        }

        .box-header {
          font-weight: 600;
          font-size: 13px;
          color: var(--primary);
          margin-bottom: 8px;
        }

        .optimized-text {
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 12px;
          color: var(--ink);
        }

        .apply-btn {
          background: var(--surface-soft);
          border: none;
          color: var(--ink);
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s;
        }

        .apply-btn:hover { background: var(--hairline); }

        .tips-box {
          background: white;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid var(--hairline);
        }

        .tip-item {
          margin-bottom: 12px;
          font-size: 13px;
          line-height: 1.5;
        }
        
        .tip-item:last-child { margin-bottom: 0; }

        .tip-badge {
          display: inline-block;
          background: var(--surface-cream);
          color: var(--muted);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          margin-right: 6px;
          border: 1px solid var(--hairline);
        }

        .tutor-empty-state, .tutor-loading-state {
          padding: 32px 16px;
          text-align: center;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.6;
        }

        .hidden-input { display: none; }
        
        .image-preview-box {
          position: relative;
          display: inline-block;
          margin-bottom: 12px;
        }
        
        .image-preview-box img {
          height: 80px;
          border-radius: 8px;
          border: 1px solid var(--hairline);
        }
        
        .remove-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--ink);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
