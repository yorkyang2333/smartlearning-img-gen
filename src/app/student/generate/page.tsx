'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Message = {
  id: string;
  role: 'user' | 'agent';
  content?: string;
  image?: string;
  progress?: number;
  loadingText?: string;
  timeMs?: number;
};

export default function GenerateChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: '您好，我是您的视觉创作助手。请描述您想要生成的画面。您也可以在底部调整生成参数。'
    }
  ]);
  
  const [prompt, setPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'t2i' | 'i2i'>('t2i');
  const [modelId, setModelId] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [n, setN] = useState(1);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const { data: modelsResponse, isLoading: modelsLoading } = useSWR('/api/student-models', fetcher);
  const models = modelsResponse?.data || [];

  const availableModels = models.filter((m: any) => {
     if (activeTab === 't2i') return m.type === 'TEXT_TO_IMAGE' || m.type === 'BOTH';
     if (activeTab === 'i2i') return m.type === 'IMAGE_TO_IMAGE' || m.type === 'BOTH';
     return false;
  });

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

  const handleSend = async () => {
    if (!prompt.trim() && !image) return;
    if (activeTab === 'i2i' && !image) {
      alert('图生图模式下请先上传参考图片。');
      return;
    }

    const currentPrompt = prompt;
    setPrompt('');
    
    // Add User Message
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: 'user',
      content: currentPrompt,
      image: imagePreview || undefined
    }]);

    setIsGenerating(true);
    
    // Add Agent Loading Message
    const agentMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: agentMsgId,
      role: 'agent',
      progress: 0,
      loadingText: '正在构思视觉元素...'
    }]);

    // Simulate progress
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += (90 - currentProgress) * 0.1;
      if (currentProgress > 90) currentProgress = 90;
      setMessages(prev => prev.map(msg => 
        msg.id === agentMsgId ? { ...msg, progress: currentProgress } : msg
      ));
    }, 500);

    try {
      const endpoint = activeTab === 't2i' ? '/api/generate/text-to-image' : '/api/generate/image-to-image';
      let body: string | FormData;
      let headers: HeadersInit = {};

      if (activeTab === 't2i') {
        body = JSON.stringify({ prompt: currentPrompt, modelId, size, n });
        headers['Content-Type'] = 'application/json';
      } else {
        const formData = new FormData();
        formData.append('prompt', currentPrompt);
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
      clearInterval(progressInterval);

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
          timeMs: data.data?.durationMs
        } : msg
      ));

    } catch (err: any) {
      clearInterval(progressInterval);
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating) {
        handleSend();
      }
    }
  };

  return (
    <div className="chat-layout">
      {/* Messages Area */}
      <div className="messages-container">
        <div className="messages-list">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'agent' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                ) : (
                  <div className="user-avatar-placeholder">U</div>
                )}
              </div>
              
              <div className="message-content">
                <div className="message-sender">{msg.role === 'agent' ? 'AI 助手' : '您'}</div>
                
                {/* Agent Loading State */}
                {msg.progress !== undefined && msg.progress < 100 && (
                  <div className="loading-container">
                     <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${msg.progress}%` }}></div>
                     </div>
                     <div className="loading-text">
                        <span className="status-indicator active"></span>
                        {msg.loadingText} {Math.floor(msg.progress)}%
                     </div>
                  </div>
                )}

                {/* Text Content */}
                {msg.content && (
                  <div className={`bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-agent'}`}>
                    {msg.content}
                  </div>
                )}

                {/* Image Content */}
                {msg.image && msg.role === 'agent' && (
                  <div className="image-result-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={msg.image} alt="Generated result" className="generated-image" />
                    {msg.timeMs && (
                      <div className="image-meta">
                        用时: {(msg.timeMs / 1000).toFixed(2)}s
                        <a href={msg.image} download="ai-generation.png" target="_blank" className="download-btn" rel="noreferrer">
                          下载大图
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* User Reference Image */}
                {msg.image && msg.role === 'user' && (
                  <div className="user-ref-image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={msg.image} alt="Reference" className="ref-image" />
                    <span className="ref-label">参考图片</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Input Area */}
      <div className="input-area-container">
        <div className="input-card">
          
          {/* Settings Bar */}
          <div className="settings-bar">
            <div className="category-tabs">
              <button className={`category-tab ${activeTab === 't2i' ? 'active' : ''}`} onClick={() => setActiveTab('t2i')}>文生图</button>
              <button className={`category-tab ${activeTab === 'i2i' ? 'active' : ''}`} onClick={() => setActiveTab('i2i')}>图生图</button>
            </div>
            
            <button className="settings-toggle" onClick={() => setShowSettings(!showSettings)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              参数设置
            </button>
          </div>

          {showSettings && (
            <div className="settings-panel">
              <div className="settings-row">
                <div className="form-group flex-1">
                  <label className="form-label">模型</label>
                  <select className="text-input text-input-sm" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                    {availableModels.map((m: any) => <option key={m.id} value={m.modelId}>{m.name}</option>)}
                  </select>
                </div>
                {config.sizes && (
                  <div className="form-group flex-1">
                    <label className="form-label">尺寸</label>
                    <select className="text-input text-input-sm" value={size} onChange={(e) => setSize(e.target.value)}>
                      {config.sizes.map((s: string) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'i2i' && (
             <div className="image-upload-row">
                <input type="file" accept="image/*" onChange={handleImageChange} id="image-upload-chat" className="hidden-input" />
                <label htmlFor="image-upload-chat" className="upload-pill">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  {image ? '已选参考图 (点击更换)' : '添加参考图'}
                </label>
                {imagePreview && (
                   // eslint-disable-next-line @next/next/no-img-element
                   <img src={imagePreview} alt="thumb" className="upload-thumb" />
                )}
             </div>
          )}

          <div className="input-row">
            <textarea
              className="chat-textarea"
              placeholder="发送给 AI 助手..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button 
              className="send-btn" 
              onClick={handleSend}
              disabled={isGenerating || (!prompt.trim() && !image)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
        <div className="disclaimer">AI 可能生成不准确的图像。请在分享前核实。</div>
      </div>

      <style jsx>{`
        .chat-layout {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 48px);
          max-width: 900px;
          margin: 0 auto;
          position: relative;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px 24px 140px 24px;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .message-row {
          display: flex;
          gap: 16px;
        }

        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: var(--surface-card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink);
          flex-shrink: 0;
        }

        .user-avatar-placeholder {
          font-family: var(--font-inter);
          font-weight: 500;
        }

        .message-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .message-sender {
          font-weight: 600;
          font-size: 14px;
          color: var(--ink);
        }

        .bubble {
          font-size: 16px;
          line-height: 1.6;
          color: var(--ink);
        }

        .bubble-user {
          background: var(--surface-card);
          padding: 12px 16px;
          border-radius: var(--radius-lg);
          border-top-left-radius: 4px;
          display: inline-block;
          max-width: fit-content;
        }

        .bubble-agent {
          padding-top: 4px;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 300px;
          margin-top: 8px;
        }

        .progress-bar-bg {
          height: 4px;
          background: var(--surface-card);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--accent-teal);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .loading-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 6px;
          animation: pulse 1.5s infinite;
        }

        .status-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--muted);
        }

        .status-indicator.active {
          background: var(--accent-teal);
          box-shadow: 0 0 6px var(--accent-teal);
        }

        .image-result-card {
          margin-top: 8px;
          background: var(--surface-dark);
          padding: 16px;
          border-radius: var(--radius-lg);
          display: inline-block;
        }

        .generated-image {
          max-width: 100%;
          border-radius: var(--radius-md);
        }

        .image-meta {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: var(--on-dark-soft);
        }

        .download-btn {
          color: var(--on-dark);
          background: var(--surface-dark-elevated);
          padding: 4px 12px;
          border-radius: var(--radius-sm);
          text-decoration: none;
          transition: background 0.2s;
        }
        
        .download-btn:hover { background: #33302c; }

        .user-ref-image {
          margin-top: 8px;
          position: relative;
          display: inline-block;
        }

        .ref-image {
          height: 120px;
          border-radius: var(--radius-md);
          border: 1px solid var(--hairline);
        }

        .ref-label {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(20,20,19,0.7);
          color: white;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* Input Area */
        .input-area-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 24px;
          background: linear-gradient(to top, var(--canvas) 80%, transparent);
        }

        .input-card {
          background: var(--surface-card);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-lg);
          padding: 12px;
          box-shadow: 0 4px 20px rgba(20,20,19,0.04);
        }

        .settings-bar {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .category-tabs {
          display: flex;
          gap: 4px;
        }

        .category-tab {
          font-size: 13px;
          padding: 4px 12px;
          border-radius: var(--radius-sm);
          color: var(--muted);
        }

        .category-tab:hover { color: var(--ink); }
        .category-tab.active {
          background: var(--canvas);
          color: var(--ink);
          font-weight: 500;
        }

        .settings-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--muted);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }
        
        .settings-toggle:hover { background: var(--canvas); color: var(--ink); }

        .settings-panel {
          padding: 12px;
          background: var(--canvas);
          border-radius: var(--radius-md);
          margin-bottom: 12px;
        }

        .settings-row {
          display: flex;
          gap: 16px;
        }

        .flex-1 { flex: 1; }

        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--muted);
          margin-bottom: 4px;
        }

        .text-input-sm {
          height: 32px;
          padding: 4px 8px;
          font-size: 13px;
        }

        .input-row {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          background: var(--canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          padding: 8px 12px;
        }

        .chat-textarea {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 15px;
          color: var(--ink);
          resize: none;
          padding: 4px 0;
          max-height: 200px;
          outline: none;
        }

        .chat-textarea::placeholder { color: var(--muted-soft); }

        .send-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background: var(--primary);
          color: var(--on-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .send-btn:hover:not(:disabled) { background: var(--primary-active); }
        .send-btn:disabled { background: var(--primary-disabled); color: var(--muted); cursor: not-allowed; }

        .image-upload-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .hidden-input { display: none; }

        .upload-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--ink);
          background: var(--canvas);
          border: 1px solid var(--hairline);
          padding: 6px 12px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .upload-pill:hover { border-color: var(--primary); }

        .upload-thumb {
          height: 28px;
          border-radius: 4px;
          border: 1px solid var(--hairline);
        }

        .disclaimer {
          text-align: center;
          font-size: 12px;
          color: var(--muted-soft);
          margin-top: 12px;
        }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
