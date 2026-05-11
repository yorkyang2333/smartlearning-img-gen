'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import PromptBuilder from '@/components/PromptBuilder';
import PromptHelper from '@/components/PromptHelper';

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
  const [sidebarMode, setSidebarMode] = useState<'half' | 'full'>('half');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isHelperOpen, setIsHelperOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
        setSizeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // 分组模型与元数据映射
  const groupedModels = availableModels.reduce((acc: any, model: any) => {
    let brand = '其他生态';
    const name = model.name.toLowerCase();
    if (name.includes('gpt') || name.includes('dall')) brand = 'OpenAI 系列';
    else if (name.includes('gemini') || name.includes('google')) brand = 'Google 系列';
    
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(model);
    return acc;
  }, {});

  const getModelMeta = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('dall-e 3')) return { icon: '✨', desc: '顶级语义理解，细节丰富' };
    if (n.includes('dall-e 2')) return { icon: '🎨', desc: '经典画质，适合抽象风格' };
    if (n.includes('gpt image 2')) return { icon: '⚡', desc: '快速生成，构图优秀' };
    if (n.includes('gemini 3 pro')) return { icon: '🧠', desc: '多模态强，光影自然' };
    if (n.includes('gemini 3.1')) return { icon: '🚀', desc: '极速出图，强劲性能' };
    if (n.includes('gemini')) return { icon: '💎', desc: '高性价比，清晰锐利' };
    return { icon: '📦', desc: '标准创作引擎' };
  };

  const getSizeMeta = (sizeStr: string) => {
    const ratioMap: Record<string, { label: string, shape: React.CSSProperties }> = {
      '1024x1024': { label: '1:1 正方形', shape: { width: 14, height: 14 } },
      '512x512': { label: '1:1 小正方', shape: { width: 12, height: 12 } },
      '1024x1792': { label: '9:16 手机竖屏', shape: { width: 9, height: 16 } },
      '1792x1024': { label: '16:9 宽画幅', shape: { width: 16, height: 9 } },
      '768x1024': { label: '3:4 经典竖版', shape: { width: 11, height: 15 } },
      '1024x768': { label: '4:3 经典横版', shape: { width: 15, height: 11 } }
    };
    return ratioMap[sizeStr] || { label: sizeStr, shape: { width: 14, height: 14 } };
  };

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

  const agentMessages = messages.filter(m => m.role === 'agent' && (m.image || m.progress !== undefined || m.content));
  const activeMsg = agentMessages.find(m => m.id === activeMsgId) || agentMessages[agentMessages.length - 1];

  return (
    <div className="workspace-layout">
      {/* 区域 A/B: 左侧画板与历史记录 */}
      <div className={`canvas-area ${sidebarMode === 'full' ? 'hidden' : ''}`}>
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
          onClick={() => setSidebarMode(sidebarMode === 'half' ? 'full' : 'half')}
          title={sidebarMode === 'half' ? "展开为全屏阅读" : "缩小为侧边栏"}
        >
          {sidebarMode === 'half' ? '◀' : '▶'}
        </button>
      </div>

      {/* 区域 C: 右侧工作区 (工具台 + 智慧导师) */}
      <div className={`workspace-sidebar ${sidebarMode}`}>
        <div className="sidebar-inner">
          <div className="panel prompt-panel">
          <div className="prompt-header">
            <h3 className="panel-title">创作参数</h3>
            <div className="flex gap-2">
              <button className="open-helper-btn" onClick={() => setIsHelperOpen(true)}>
                📝 使用模板
              </button>
              {!isBuilderOpen && (
                <button className="open-builder-btn" onClick={() => setIsBuilderOpen(true)}>
                  🧩 知识图谱构建
                </button>
              )}
            </div>
          </div>
          
          {isHelperOpen && (
            <PromptHelper 
              onSelectTemplate={(t) => setPrompt(t)} 
              onClose={() => setIsHelperOpen(false)} 
            />
          )}
          
          {imagePreview && (
            <div className="image-preview-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="preview" />
              <button className="remove-btn" onClick={removeImage}>✕</button>
            </div>
          )}

          {isBuilderOpen ? (
            <PromptBuilder 
              currentPrompt={prompt} 
              onUpdatePrompt={setPrompt} 
              onClose={() => setIsBuilderOpen(false)} 
            />
          ) : (
            <textarea
              className="prompt-textarea"
              placeholder="描述您想要的画面细节..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
            />
          )}

          <div className="controls-grid" ref={dropdownRef}>
            <div className="control-group">
              <label>生成模型</label>
              <div className="custom-dropdown-container">
                <div 
                  className={`custom-dropdown-trigger ${modelMenuOpen ? 'active' : ''}`}
                  onClick={() => { setModelMenuOpen(!modelMenuOpen); setSizeMenuOpen(false); }}
                >
                  <div className="trigger-content">
                    <span className="trigger-icon">{getModelMeta(selectedModel?.name || '').icon}</span>
                    <span className="trigger-text">{selectedModel?.name || '选择模型'}</span>
                  </div>
                  <span className="caret">▾</span>
                </div>
                
                {modelMenuOpen && (
                  <div className="custom-dropdown-menu models-menu">
                    {Object.keys(groupedModels).map(brand => (
                      <div key={brand} className="menu-group">
                        <div className="menu-group-title">{brand}</div>
                        {groupedModels[brand].map((m: any) => {
                          const meta = getModelMeta(m.name);
                          const isSelected = m.modelId === modelId;
                          return (
                            <div 
                              key={m.modelId} 
                              className={`menu-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => { setModelId(m.modelId); setModelMenuOpen(false); }}
                            >
                              <div className="menu-item-icon">{meta.icon}</div>
                              <div className="menu-item-info">
                                <div className="menu-item-name">{m.name} {isSelected && <span className="check-icon">✓</span>}</div>
                                <div className="menu-item-desc">{meta.desc}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {config.sizes && config.sizes.length > 0 && (
              <div className="control-group">
                <label>画面比例</label>
                <div className="custom-dropdown-container">
                  <div 
                    className={`custom-dropdown-trigger ${sizeMenuOpen ? 'active' : ''}`}
                    onClick={() => { setSizeMenuOpen(!sizeMenuOpen); setModelMenuOpen(false); }}
                  >
                    <div className="trigger-content">
                       <div className="size-shape-icon" style={getSizeMeta(size).shape}></div>
                       <span className="trigger-text">{getSizeMeta(size).label}</span>
                    </div>
                    <span className="caret">▾</span>
                  </div>

                  {sizeMenuOpen && (
                    <div className="custom-dropdown-menu sizes-menu">
                      {config.sizes.map((s: string) => {
                        const meta = getSizeMeta(s);
                        const isSelected = size === s;
                        return (
                          <div 
                            key={s} 
                            className={`menu-item size-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => { setSize(s); setSizeMenuOpen(false); }}
                          >
                            <div className="menu-item-icon">
                              <div className="size-shape-icon" style={meta.shape}></div>
                            </div>
                            <div className="menu-item-info">
                              <div className="menu-item-name">{meta.label} {isSelected && <span className="check-icon">✓</span>}</div>
                              <div className="menu-item-desc">{s}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
          max-width: 100%;
          transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .canvas-area.hidden {
          flex: 0 0 0%;
          max-width: 0;
          padding-left: 0;
          padding-right: 0;
          opacity: 0;
          pointer-events: none;
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
          width: 480px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          padding: 32px 32px 32px 0;
          transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
          overflow-y: auto;
        }
        
        .workspace-sidebar.full {
          flex: 1;
          width: 100%;
          padding: 32px;
        }
        
        .sidebar-inner {
          background: var(--canvas);
          border-radius: 16px;
          border: 1px solid var(--hairline);
          box-shadow: 0 4px 24px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          width: 448px; 
          min-height: min-content;
          transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .workspace-sidebar.full .sidebar-inner {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
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
          background: var(--surface-cream-strong);
          border-bottom-left-radius: 16px;
          border-bottom-right-radius: 16px;
        }

        .prompt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .open-builder-btn, .open-helper-btn {
          background: rgba(204, 120, 92, 0.1);
          color: var(--primary);
          border: none;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .open-helper-btn {
          background: rgba(79, 70, 229, 0.1);
          color: rgb(79, 70, 229);
        }

        .open-builder-btn:hover, .open-helper-btn:hover {
          transform: translateY(-1px);
          opacity: 0.8;
        }

        .panel-title {
          margin: 0;
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
          margin-bottom: 6px;
          font-weight: 500;
        }

        .custom-dropdown-container {
          position: relative;
        }

        .custom-dropdown-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--hairline);
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 4px rgba(0,0,0,0.02);
        }

        .custom-dropdown-trigger:hover {
          border-color: rgba(204,120,92,0.4);
        }

        .custom-dropdown-trigger.active {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(204, 120, 92, 0.1);
        }

        .trigger-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .trigger-icon { font-size: 16px; }

        .trigger-text {
          font-size: 13px;
          font-weight: 500;
          color: var(--ink);
        }

        .caret {
          color: var(--muted);
          font-size: 12px;
          transition: transform 0.2s;
        }

        .custom-dropdown-trigger.active .caret { transform: rotate(180deg); }

        .custom-dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          width: 280px;
          background: white;
          border: 1px solid var(--hairline);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          z-index: 100;
          overflow: hidden;
          animation: menuSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          max-height: 250px;
          overflow-y: auto;
        }
        
        .sizes-menu { 
          width: 200px; 
        }

        @keyframes menuSlideDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .menu-group {
          padding: 8px 0;
          border-bottom: 1px solid var(--surface-card);
        }
        
        .menu-group:last-child { border-bottom: none; }

        .menu-group-title {
          padding: 4px 16px 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .menu-item:hover { background: var(--surface-cream-strong); }
        .menu-item.selected { background: rgba(204,120,92,0.06); }

        .menu-item-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .size-shape-icon {
          border: 1.5px solid currentColor;
          border-radius: 2px;
          color: var(--muted);
          opacity: 0.8;
          transition: all 0.2s;
        }
        
        .menu-item:hover .size-shape-icon, .custom-dropdown-trigger .size-shape-icon {
          color: var(--primary);
          opacity: 1;
        }

        .menu-item-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0; /* allows text truncation if needed */
        }

        .menu-item-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: space-between;
          white-space: nowrap;
        }

        .menu-item-desc {
          font-size: 11px;
          color: var(--muted);
          white-space: nowrap;
        }

        .check-icon {
          color: var(--primary);
          font-weight: bold;
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
