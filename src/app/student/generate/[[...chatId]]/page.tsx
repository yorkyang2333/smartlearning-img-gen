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

export default function GenerateChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.chatId?.[0] || null;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: '您好，我是您的视觉创作助手。请在下方描述您想要的画面，或上传参考图片以进行图生图创作。'
    }
  ]);

  // Fetch conversation history if chatId exists
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
      setMessages([
        {
          id: 'welcome',
          role: 'agent',
          content: '您好，我是您的视觉创作助手。请在下方描述您想要的画面，或上传参考图片以进行图生图创作。'
        }
      ]);
    }
  }, [chatId]);
  const [prompt, setPrompt] = useState('');

  // 恢复未发送的草稿
  useEffect(() => {
    const draftKey = `draft_prompt_${chatId || 'new'}`;
    const savedDraft = sessionStorage.getItem(draftKey);
    if (savedDraft) {
      setPrompt(savedDraft);
      // 如果有保存的文本，让 textarea 自动调整高度
      if (textareaRef.current) {
        // 使用一个小的延时确保 DOM 已经更新
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
          }
        }, 0);
      }
    }
  }, [chatId]);

  // 当输入变化时保存草稿
  useEffect(() => {
    const draftKey = `draft_prompt_${chatId || 'new'}`;
    if (prompt) {
      sessionStorage.setItem(draftKey, prompt);
    } else {
      sessionStorage.removeItem(draftKey);
    }
  }, [prompt, chatId]);
  const [modelId, setModelId] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [n, setN] = useState(1);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const { data: modelsResponse, isLoading: modelsLoading } = useSWR('/api/student-models', fetcher);
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
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset textarea height
    }
    
    // Add User Message
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: 'user',
      content: currentPrompt,
      image: imagePreview || undefined
    }]);
    
    // Clear the current image preview from the input box once sent
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
      const endpoint = currentMode === 't2i' ? '/api/generate/text-to-image' : '/api/generate/image-to-image';
      let body: string | FormData;
      let headers: HeadersInit = {};

      if (currentMode === 't2i') {
        const bodyObj: any = { prompt: currentPrompt, modelId, size, n };
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

      // If new chat, redirect to the new chat URL to persist
      if (!chatId && data.conversationId) {
        // use shallow replace or router.push
        router.push(`/student/generate/${data.conversationId}`);
      }

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
  
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const formatSize = (sizeStr: string) => {
    const ratioMap: Record<string, string> = {
      '1024x1024': '1:1',
      '512x512': '1:1',
      '256x256': '1:1',
      '1024x1792': '9:16',
      '576x1024': '9:16',
      '1792x1024': '16:9',
      '1024x576': '16:9',
      '768x1024': '3:4',
      '1024x768': '4:3',
      '1536x1024': '3:2',
      '1024x1536': '2:3',
      '512x1024': '1:2',
      '1024x512': '2:1',
    };
    if (ratioMap[sizeStr]) return `${ratioMap[sizeStr]} (${sizeStr})`;
    
    const parts = sizeStr.split('x');
    if (parts.length === 2) {
      const w = parseInt(parts[0], 10);
      const h = parseInt(parts[1], 10);
      if (!isNaN(w) && !isNaN(h)) {
        const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(w, h);
        return `${w/divisor}:${h/divisor} (${sizeStr})`;
      }
    }
    return sizeStr;
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                ) : (
                  <div className="user-avatar-placeholder">您</div>
                )}
              </div>
              
              <div className="message-content">
                <div className="message-sender">{msg.role === 'agent' ? 'AI 视觉助手' : '我'}</div>
                
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

                {/* Agent AI Analysis (Feature 7) */}
                {msg.analysis && msg.role === 'agent' && (
                  <div className="ai-analysis-card">
                     <div className="analysis-header">
                        <span className="analysis-icon">✨</span>
                        <span className="analysis-title">提示词学习卡片</span>
                     </div>
                     
                     <div className="analysis-section">
                        <div className="section-title">优化建议:</div>
                        <div className="optimized-prompt">{msg.analysis.optimized}</div>
                     </div>

                     <div className="analysis-section">
                        <div className="section-title">💡 学习要点:</div>
                        <ul className="learning-tips">
                           {msg.analysis.tips.map((tip, idx) => (
                              <li key={idx}>
                                 <span className="tip-dimension">[{tip.dimension}]</span> {tip.explanation}
                              </li>
                           ))}
                        </ul>
                     </div>

                     <button 
                        className="retry-optimized-btn"
                        onClick={() => {
                           setPrompt(msg.analysis!.optimized);
                           if (textareaRef.current) textareaRef.current.focus();
                        }}
                     >
                        🔄 用优化提示词重试
                     </button>
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

      {/* Bottom Input Area (ChatGPT Style) */}
      <div className="input-area-container">
        <div className="chat-input-wrapper">
          
          {/* Image Preview inside input if uploaded */}
          {imagePreview && (
            <div className="input-image-preview">
              <div className="preview-container">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={imagePreview} alt="upload preview" />
                 <button className="remove-image-btn" onClick={removeImage}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 </button>
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="描述您想要的画面，或上传参考图片..."
            value={prompt}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          
          <div className="chat-controls-row">
            <div className="controls-left">
              {/* Add Image Button */}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                ref={fileInputRef} 
                className="hidden-input" 
              />
              <button 
                className="control-icon-btn" 
                onClick={() => fileInputRef.current?.click()}
                title="上传参考图片以开启图生图"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>

              {/* Model Selector */}
              <div className="inline-select-wrapper">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-icon"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                <span className="current-value-text">{availableModels.find((m:any) => m.modelId === modelId)?.name || '选择模型'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-arrow"><polyline points="6 9 12 15 18 9"></polyline></svg>
                <select className="hidden-select" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                  {availableModels.map((m: any) => <option key={m.id} value={m.modelId}>{m.name}</option>)}
                </select>
              </div>

              {/* Size Selector (if config available) */}
              {config.sizes && config.sizes.length > 0 && (
                <div className="inline-select-wrapper">
                  <span className="inline-label">尺寸</span>
                  <span className="current-value-text">{formatSize(size)}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-arrow"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  <select className="hidden-select" value={size} onChange={(e) => setSize(e.target.value)}>
                    {config.sizes.map((s: string) => <option key={s} value={s}>{formatSize(s)}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="controls-right">
              {/* Send Button */}
              <button 
                className="send-circular-btn" 
                onClick={handleSend}
                disabled={isGenerating || (!prompt.trim() && !image)}
              >
                {isGenerating ? (
                   <span className="status-indicator active" style={{ background: 'white', boxShadow: 'none' }}></span>
                ) : (
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="disclaimer">AI 可能生成不准确的图像。请在分享前核实。</div>
      </div>

      <style jsx>{`
        .chat-layout {
          display: flex;
          flex-direction: column;
          height: 100%;
          max-width: 800px;
          margin: 0 auto;
          position: relative;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px 24px 160px 24px;
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
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--hairline);
          background: var(--canvas);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink);
          flex-shrink: 0;
        }

        .user-avatar-placeholder {
          font-family: var(--font-inter);
          font-weight: 500;
          font-size: 13px;
        }

        .message-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 4px;
        }

        .message-sender {
          font-family: var(--font-inter);
          font-weight: 600;
          font-size: 14px;
          color: var(--ink);
        }

        .bubble {
          font-family: var(--font-inter);
          font-size: 15px;
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

        /* Loading state */
        .loading-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 300px;
          margin-top: 8px;
        }

        .progress-bar-bg {
          height: 4px;
          background: var(--hairline);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .loading-text {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--muted);
        }

        .status-indicator.active {
          background: var(--primary);
          box-shadow: 0 0 6px rgba(204, 120, 92, 0.4);
          animation: pulse 1.5s infinite;
        }

        /* Images */
        .image-result-card {
          margin-top: 8px;
          background: var(--surface-card);
          padding: 12px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--hairline);
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
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--muted);
        }

        .download-btn {
          color: var(--ink);
          background: var(--canvas);
          border: 1px solid var(--hairline);
          padding: 4px 12px;
          border-radius: var(--radius-sm);
          text-decoration: none;
          transition: background 0.2s;
        }
        
        .download-btn:hover { background: var(--surface-soft); }

        .user-ref-image {
          margin-top: 8px;
          position: relative;
          display: inline-block;
        }

        .ref-image {
          height: 160px;
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
          padding: 4px 8px;
          border-radius: 6px;
          backdrop-filter: blur(4px);
        }

        /* ChatGPT Style Input Area */
        .input-area-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 24px;
          background: linear-gradient(to top, var(--canvas) 70%, transparent);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .chat-input-wrapper {
          background: var(--canvas);
          border: 1px solid var(--hairline);
          border-radius: 24px;
          width: 100%;
          padding: 16px 16px 12px 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .chat-input-wrapper:focus-within {
          border-color: var(--hairline-soft);
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }

        .input-image-preview {
          padding: 0 8px 8px 8px;
        }
        
        .preview-container {
          position: relative;
          display: inline-block;
        }
        
        .preview-container img {
          height: 64px;
          width: 64px;
          object-fit: cover;
          border-radius: var(--radius-md);
          border: 1px solid var(--hairline);
        }
        
        .remove-image-btn {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--ink);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--canvas);
          cursor: pointer;
        }

        .chat-textarea {
          width: 100%;
          border: none;
          background: transparent;
          font-family: var(--font-inter);
          font-size: 15px;
          line-height: 1.5;
          color: var(--ink);
          resize: none;
          padding: 8px 8px 16px 8px;
          min-height: 60px;
          max-height: 200px;
          outline: none;
          margin-bottom: 8px;
        }

        .chat-textarea::placeholder { color: var(--muted-soft); }

        .chat-controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 4px;
        }

        .controls-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .controls-right {
          display: flex;
          align-items: center;
        }

        .hidden-input { display: none; }

        .control-icon-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: var(--muted);
          transition: all 0.2s;
        }
        
        .control-icon-btn:hover {
          background: var(--surface-card);
          color: var(--ink);
        }

        .control-text-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 10px;
          border-radius: 16px;
          font-family: var(--font-inter);
          font-size: 13px;
          font-weight: 500;
          color: var(--muted);
          transition: all 0.2s;
        }

        .control-text-btn:hover { background: var(--surface-card); color: var(--ink); }
        
        .active-primary {
          color: var(--primary);
        }
        
        .active-primary:hover {
          background: rgba(204, 120, 92, 0.08);
          color: var(--primary);
        }

        .inline-select-wrapper {
          display: flex;
          align-items: center;
          height: 32px;
          padding: 0 10px 0 12px;
          border-radius: 16px;
          transition: background 0.2s;
          color: var(--muted);
          position: relative;
        }

        .inline-select-wrapper:hover {
          background: var(--surface-card);
          color: var(--ink);
        }

        .inline-icon { margin-right: 6px; flex-shrink: 0; }
        .inline-label { font-size: 13px; font-weight: 500; margin-right: 6px; flex-shrink: 0; }
        
        .current-value-text {
          font-family: var(--font-inter);
          font-size: 13px;
          font-weight: 500;
          margin-right: 4px;
          white-space: nowrap;
          color: inherit;
        }

        .dropdown-arrow {
          flex-shrink: 0;
        }

        .hidden-select {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .send-circular-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--ink);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s, transform 0.1s;
        }

        .send-circular-btn:hover:not(:disabled) {
          opacity: 0.9;
        }
        
        .send-circular-btn:active:not(:disabled) {
          transform: scale(0.95);
        }

        .send-circular-btn:disabled {
          background: var(--hairline);
          color: white;
          cursor: not-allowed;
        }

        .disclaimer {
          text-align: center;
          font-family: var(--font-inter);
          font-size: 12px;
          color: var(--muted-soft);
          margin-top: 12px;
        }

        /* AI Analysis Card */
        .ai-analysis-card {
          margin-top: 12px;
          background: linear-gradient(135deg, rgba(204,120,92,0.05) 0%, rgba(204,120,92,0.1) 100%);
          border: 1px solid rgba(204,120,92,0.2);
          border-radius: var(--radius-lg);
          padding: 16px;
          font-family: var(--font-inter);
          max-width: 450px;
        }

        .analysis-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .analysis-icon { font-size: 18px; }
        .analysis-title { font-weight: 600; color: var(--coral); font-size: 15px; }

        .analysis-section { margin-bottom: 12px; }
        .section-title { font-size: 13px; color: var(--stone); margin-bottom: 6px; font-weight: 500; }
        
        .optimized-prompt {
          background: white;
          padding: 10px;
          border-radius: var(--radius-md);
          font-size: 14px;
          color: var(--ink);
          border: 1px solid var(--sand);
          line-height: 1.5;
        }

        .learning-tips {
          margin: 0;
          padding: 0;
          list-style: none;
          font-size: 13px;
          color: var(--ink);
          line-height: 1.5;
        }

        .learning-tips li { margin-bottom: 6px; display: flex; align-items: flex-start; gap: 4px; }
        .tip-dimension { color: var(--coral); font-weight: 500; flex-shrink: 0; }

        .retry-optimized-btn {
          width: 100%;
          padding: 10px;
          background: white;
          border: 1px solid var(--coral);
          color: var(--coral);
          border-radius: var(--radius-md);
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
        }

        .retry-optimized-btn:hover {
          background: var(--coral);
          color: white;
        }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
