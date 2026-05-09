'use client';

import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ModelsPage() {
  const [activeTab, setActiveTab] = useState<'MODELS' | 'ENDPOINTS'>('MODELS');

  const { data: modelsResponse, isLoading: modelsLoading, mutate: mutateModels } = useSWR('/api/models', fetcher);
  const models = modelsResponse?.data || [];

  const { data: endpointsResponse, isLoading: endpointsLoading, mutate: mutateEndpoints } = useSWR('/api/endpoints', fetcher);
  const endpoints = endpointsResponse?.data || [];

  // Modal States
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [modelFormData, setModelFormData] = useState({
    name: '',
    modelId: '',
    type: 'TEXT_TO_IMAGE',
    provider: 'openai',
    description: '',
    apiEndpointId: '',
    config: '{"sizes":["1024x1024"]}',
  });

  const [isEndpointModalOpen, setIsEndpointModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<any>(null);
  const [endpointFormData, setEndpointFormData] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
  });

  // --- MODEL HANDLERS ---
  const handleModelToggle = async (modelId: string, currentEnabled: boolean) => {
    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleConfig', modelId, enabled: !currentEnabled })
    });
    mutateModels();
  };

  const handleModelDelete = async (id: string) => {
    if (!confirm('确定要删除这个模型吗？')) return;
    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    });
    mutateModels();
  };

  const openModelModal = (model?: any) => {
    if (model) {
      setEditingModel(model);
      setModelFormData({
        name: model.name || '',
        modelId: model.modelId || '',
        type: model.type || 'TEXT_TO_IMAGE',
        provider: model.provider || 'openai',
        description: model.description || '',
        apiEndpointId: model.apiEndpointId || '',
        config: model.config || '{}',
      });
    } else {
      setEditingModel(null);
      setModelFormData({
        name: '',
        modelId: '',
        type: 'TEXT_TO_IMAGE',
        provider: 'openai',
        description: '',
        apiEndpointId: endpoints.length > 0 ? endpoints[0].id : '',
        config: '{"sizes":["1024x1024"]}',
      });
    }
    setIsModelModalOpen(true);
  };

  const handleModelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingModel ? 'update' : 'create';
    const payload = {
      action,
      ...(editingModel ? { id: editingModel.id } : {}),
      data: {
        ...modelFormData,
        apiEndpointId: modelFormData.apiEndpointId || null,
      }
    };

    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    setIsModelModalOpen(false);
    mutateModels();
  };

  // --- ENDPOINT HANDLERS ---
  const handleEndpointDelete = async (id: string) => {
    if (!confirm('确定要删除这个渠道吗？')) return;
    const res = await fetch('/api/endpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    });
    const data = await res.json();
    if (data.error) {
       alert(data.error);
    } else {
       mutateEndpoints();
       mutateModels();
    }
  };

  const openEndpointModal = (endpoint?: any) => {
    if (endpoint) {
      setEditingEndpoint(endpoint);
      setEndpointFormData({
        name: endpoint.name || '',
        baseUrl: endpoint.baseUrl || '',
        apiKey: endpoint.apiKey || '',
      });
    } else {
      setEditingEndpoint(null);
      setEndpointFormData({
        name: '',
        baseUrl: '',
        apiKey: '',
      });
    }
    setIsEndpointModalOpen(true);
  };

  const handleEndpointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingEndpoint ? 'update' : 'create';
    const payload = {
      action,
      ...(editingEndpoint ? { id: editingEndpoint.id } : {}),
      data: endpointFormData
    };

    await fetch('/api/endpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    setIsEndpointModalOpen(false);
    mutateEndpoints();
  };

  if (modelsLoading || endpointsLoading) return (
     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontFamily: 'var(--font-inter)' }}>
        加载配置中...
     </div>
  );

  return (
    <div className="editorial-container">
      {/* Header Section */}
      <div className="page-header">
        <div>
          <h1 className="editorial-title">系统配置</h1>
          <p className="editorial-subtitle">管理底层的 API 渠道代理，并为学生配置可用的模型。</p>
        </div>
        
        <div className="segmented-control">
           <button 
             className={`segment-btn ${activeTab === 'MODELS' ? 'active' : ''}`}
             onClick={() => setActiveTab('MODELS')}
           >模型列表</button>
           <button 
             className={`segment-btn ${activeTab === 'ENDPOINTS' ? 'active' : ''}`}
             onClick={() => setActiveTab('ENDPOINTS')}
           >API 渠道</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="content-canvas">
        {activeTab === 'MODELS' && (
           <>
              <div className="toolbar">
                 <h2 className="section-title">可用模型</h2>
                 <button className="primary-button" onClick={() => openModelModal()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    添加模型
                 </button>
              </div>
              
              {endpoints.length === 0 && (
                 <div className="info-banner warning">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    您尚未配置任何 API 渠道，模型将无法正常生成图像。请先前往「API 渠道」进行配置。
                 </div>
              )}

              <div className="grid-layout">
                 {models.map((model: any) => (
                    <div key={model.id} className="editorial-card">
                       <div className="card-header">
                          <div>
                             <h3 className="card-title">{model.name}</h3>
                             <span className="badge badge-provider">{model.provider}</span>
                          </div>
                          <div className={`badge badge-type ${model.type === 'BOTH' ? 'both' : ''}`}>
                             {model.type === 'TEXT_TO_IMAGE' ? '仅文生图' : model.type === 'IMAGE_TO_IMAGE' ? '仅图生图' : '文/图生图'}
                          </div>
                       </div>
                       
                       <p className="card-desc">
                          {model.description || '暂无详细描述。'}
                       </p>

                       <div className="card-meta">
                         <div className="meta-row"><span>ID</span> {model.modelId}</div>
                         <div className="meta-row"><span>渠道</span> {model.apiEndpoint ? model.apiEndpoint.name : <span className="error-text">未绑定</span>}</div>
                       </div>
                       
                       <div className="card-footer">
                          <div className="status-indicator">
                             {model.teacherEnabled ? (
                               <><span className="dot dot-active"></span> 已对班级开放</>
                             ) : (
                               <><span className="dot dot-inactive"></span> 已停用</>
                             )}
                          </div>
                          <div className="action-group">
                            <button className="icon-btn" onClick={() => handleModelToggle(model.id, model.teacherEnabled)} title="切换状态">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            </button>
                            <button className="icon-btn" onClick={() => openModelModal(model)} title="编辑配置">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button className="icon-btn danger" onClick={() => handleModelDelete(model.id)} title="删除模型">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </>
        )}

        {activeTab === 'ENDPOINTS' && (
           <>
              <div className="toolbar">
                 <h2 className="section-title">API 渠道</h2>
                 <button className="primary-button" onClick={() => openEndpointModal()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    添加渠道
                 </button>
              </div>

              <div className="info-banner info">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                 通过配置渠道，您可以将底层模型路由到 OpenAI 官方、硅基流动、ChatAnywhere 等不同的中转服务商。
              </div>
              
              <div className="grid-layout">
                 {endpoints.map((ep: any) => (
                    <div key={ep.id} className="editorial-card dark-card">
                       <div className="card-header">
                          <div>
                             <h3 className="card-title">{ep.name}</h3>
                          </div>
                          <span className="badge badge-dark">API Channel</span>
                       </div>
                       
                       <div className="card-meta dark-meta">
                         <div className="meta-row"><span>Base URL</span> <div className="mono-text truncate">{ep.baseUrl}</div></div>
                         <div className="meta-row"><span>关联模型</span> {ep._count?.models || 0} 个</div>
                       </div>
                       
                       <div className="card-footer dark-footer">
                          <div className="status-indicator">
                             <span className="dot dot-active"></span> 运行中
                          </div>
                          <div className="action-group">
                            <button className="icon-btn dark" onClick={() => openEndpointModal(ep)} title="编辑">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button className="icon-btn danger" onClick={() => handleEndpointDelete(ep.id)} title="删除">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </>
        )}
      </div>

      {/* Model Modal overlay */}
      {isModelModalOpen && (
        <div className="overlay-backdrop">
          <div className="overlay-panel">
            <h2 className="overlay-title">{editingModel ? '编辑模型' : '新建模型'}</h2>
            <form onSubmit={handleModelSubmit} className="overlay-form">
              
              <div className="input-group">
                <label>归属渠道</label>
                <select required className="editorial-input" value={modelFormData.apiEndpointId} onChange={e => setModelFormData({...modelFormData, apiEndpointId: e.target.value})}>
                  <option value="" disabled>-- 请选择底层调用的 API 渠道 --</option>
                  {endpoints.map((ep: any) => (
                     <option key={ep.id} value={ep.id}>{ep.name} ({ep.baseUrl})</option>
                  ))}
                </select>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>展示名称</label>
                  <input type="text" className="editorial-input" required value={modelFormData.name} onChange={e => setModelFormData({...modelFormData, name: e.target.value})} placeholder="如: Midjourney V6" />
                </div>
                <div className="input-group">
                  <label>API Model ID</label>
                  <input type="text" className="editorial-input" required value={modelFormData.modelId} onChange={e => setModelFormData({...modelFormData, modelId: e.target.value})} placeholder="如: midjourney" />
                </div>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>支持类型</label>
                  <select className="editorial-input" value={modelFormData.type} onChange={e => setModelFormData({...modelFormData, type: e.target.value})}>
                    <option value="TEXT_TO_IMAGE">文生图 (Text to Image)</option>
                    <option value="IMAGE_TO_IMAGE">图生图 (Image to Image)</option>
                    <option value="BOTH">双模支持 (Both)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>提供方标识</label>
                  <input type="text" className="editorial-input" required value={modelFormData.provider} onChange={e => setModelFormData({...modelFormData, provider: e.target.value})} placeholder="如: openai" />
                </div>
              </div>

              <div className="input-group">
                <label>功能描述</label>
                <input type="text" className="editorial-input" value={modelFormData.description} onChange={e => setModelFormData({...modelFormData, description: e.target.value})} placeholder="一句话介绍这个模型的特点..." />
              </div>

              <div className="overlay-actions">
                <button type="button" className="ghost-button" onClick={() => setIsModelModalOpen(false)}>取消</button>
                <button type="submit" className="primary-button" disabled={!modelFormData.apiEndpointId}>{editingModel ? '保存更改' : '确认添加'}</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Endpoint Modal overlay */}
      {isEndpointModalOpen && (
        <div className="overlay-backdrop">
          <div className="overlay-panel">
            <h2 className="overlay-title">{editingEndpoint ? '编辑渠道配置' : '新增 API 渠道'}</h2>
            <form onSubmit={handleEndpointSubmit} className="overlay-form">
              
              <div className="input-group">
                <label>渠道名称</label>
                <input type="text" className="editorial-input" required value={endpointFormData.name} onChange={e => setEndpointFormData({...endpointFormData, name: e.target.value})} placeholder="如: 硅基流动, OpenAI 官方" />
              </div>

              <div className="input-group">
                <label>Base URL</label>
                <input type="url" className="editorial-input" required value={endpointFormData.baseUrl} onChange={e => setEndpointFormData({...endpointFormData, baseUrl: e.target.value})} placeholder="https://api.siliconflow.cn" />
                <span className="help-text">请填写完整的接口根路径，不包含 /v1/...</span>
              </div>

              <div className="input-group">
                <label>API Key</label>
                <input type="password" className="editorial-input" required value={endpointFormData.apiKey} onChange={e => setEndpointFormData({...endpointFormData, apiKey: e.target.value})} placeholder="sk-..." />
              </div>

              <div className="overlay-actions">
                <button type="button" className="ghost-button" onClick={() => setIsEndpointModalOpen(false)}>取消</button>
                <button type="submit" className="primary-button">{editingEndpoint ? '保存配置' : '确认添加'}</button>
              </div>

            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Typography & Layout */
        .editorial-container {
          max-width: 1100px;
          margin: 0 auto;
          padding-bottom: 64px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 40px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--hairline);
        }

        .editorial-title {
          font-family: var(--font-serif);
          font-size: 36px;
          font-weight: 400;
          color: var(--ink);
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .editorial-subtitle {
          font-size: 15px;
          color: var(--muted);
          font-weight: 400;
        }

        /* Segmented Control */
        .segmented-control {
          display: flex;
          background: var(--surface-card);
          padding: 4px;
          border-radius: var(--radius-md);
          border: 1px solid var(--hairline);
        }

        .segment-btn {
          background: transparent;
          border: none;
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--muted);
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .segment-btn:hover {
          color: var(--ink);
        }

        .segment-btn.active {
          background: var(--canvas);
          color: var(--ink);
          box-shadow: 0 1px 2px rgba(20,20,19,0.06);
        }

        /* Toolbars & Banners */
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .section-title {
          font-family: var(--font-inter);
          font-size: 18px;
          font-weight: 600;
          color: var(--ink);
        }

        .primary-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--primary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .primary-button:hover:not(:disabled) { background: var(--primary-active); }
        .primary-button:disabled { background: var(--primary-disabled); cursor: not-allowed; opacity: 0.7; }

        .ghost-button {
          background: transparent;
          color: var(--ink);
          border: 1px solid var(--hairline);
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .ghost-button:hover { background: var(--surface-card); }

        .info-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: var(--radius-md);
          font-size: 14px;
          margin-bottom: 32px;
          border: 1px solid;
        }

        .info-banner.warning {
          background: #fffdf5;
          border-color: #fce8a6;
          color: #8c6b00;
        }

        .info-banner.info {
          background: var(--surface-card);
          border-color: var(--hairline);
          color: var(--muted);
        }

        /* Grid & Cards */
        .grid-layout {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
        }

        .editorial-card {
          background: var(--surface-card);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-lg);
          padding: 24px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 12px rgba(20,20,19,0.02);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .editorial-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(20,20,19,0.06);
        }

        .editorial-card.dark-card {
          background: var(--surface-dark);
          border-color: transparent;
          color: var(--on-dark);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .card-title {
          font-family: var(--font-inter);
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          color: inherit;
        }

        .badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: var(--radius-pill);
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .badge-provider {
          background: var(--canvas);
          border: 1px solid var(--hairline);
          color: var(--muted);
          text-transform: uppercase;
        }

        .badge-type {
          background: rgba(20,20,19,0.04);
          color: var(--muted);
        }
        
        .badge-type.both {
          background: rgba(204, 120, 92, 0.1);
          color: var(--primary);
        }

        .badge-dark {
          background: rgba(255,255,255,0.1);
          color: var(--on-dark-soft);
        }

        .card-desc {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.5;
          flex: 1;
          margin-bottom: 24px;
        }

        .dark-card .card-desc { color: var(--on-dark-soft); }

        .card-meta {
          background: var(--canvas);
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 12px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .card-meta.dark-meta {
          background: rgba(0,0,0,0.3);
          color: var(--on-dark-soft);
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .meta-row span {
          color: var(--muted-soft);
          font-family: var(--font-inter);
        }

        .dark-meta .meta-row span { color: rgba(255,255,255,0.4); }

        .error-text { color: var(--danger); font-weight: 500; }
        
        .mono-text { font-family: 'JetBrains Mono', monospace; }
        .truncate { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid var(--hairline);
        }

        .dark-footer { border-color: rgba(255,255,255,0.1); }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--muted);
          font-weight: 500;
        }

        .dark-card .status-indicator { color: var(--on-dark); }

        .dot { width: 6px; height: 6px; border-radius: 50%; }
        .dot-active { background: var(--accent-teal); box-shadow: 0 0 6px rgba(93,184,166,0.4); }
        .dot-inactive { background: var(--muted-soft); }

        .action-group {
          display: flex;
          gap: 4px;
        }

        .icon-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .icon-btn:hover { background: var(--canvas); color: var(--ink); }
        .icon-btn.danger:hover { background: var(--danger); color: white; }

        .icon-btn.dark { color: var(--on-dark-soft); }
        .icon-btn.dark:hover { background: rgba(255,255,255,0.1); color: white; }

        /* Modal / Overlay styling */
        .overlay-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(24, 23, 21, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .overlay-panel {
          background: var(--canvas);
          padding: 40px;
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 640px;
          box-shadow: 0 24px 64px rgba(24, 23, 21, 0.15);
          border: 1px solid var(--hairline);
        }

        .overlay-title {
          font-family: var(--font-serif);
          font-size: 28px;
          color: var(--ink);
          margin-bottom: 32px;
        }

        .overlay-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-row {
          display: flex;
          gap: 20px;
        }
        
        .input-row > .input-group { flex: 1; }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--ink);
        }

        .editorial-input {
          padding: 12px 16px;
          background: var(--surface-card);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          color: var(--ink);
          font-size: 15px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .editorial-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(204, 120, 92, 0.1);
        }

        .help-text {
          font-size: 12px;
          color: var(--muted);
        }

        .overlay-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 16px;
          padding-top: 24px;
          border-top: 1px solid var(--hairline);
        }
      `}</style>
    </div>
  );
}
