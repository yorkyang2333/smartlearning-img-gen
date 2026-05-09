'use client';

import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ModelsPage() {
  const { data: response, isLoading, mutate } = useSWR('/api/models', fetcher);
  const models = response?.data || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    modelId: '',
    type: 'TEXT_TO_IMAGE',
    provider: 'openai',
    description: '',
    apiUrl: '',
    apiKey: '',
    config: '{"sizes":["1024x1024"]}',
  });

  const handleToggle = async (modelId: string, currentEnabled: boolean) => {
    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleConfig', modelId, enabled: !currentEnabled })
    });
    mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个模型吗？')) return;
    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    });
    mutate();
  };

  const openModal = (model?: any) => {
    if (model) {
      setEditingModel(model);
      setFormData({
        name: model.name || '',
        modelId: model.modelId || '',
        type: model.type || 'TEXT_TO_IMAGE',
        provider: model.provider || 'openai',
        description: model.description || '',
        apiUrl: model.apiUrl || '',
        apiKey: model.apiKey || '',
        config: model.config || '{}',
      });
    } else {
      setEditingModel(null);
      setFormData({
        name: '',
        modelId: '',
        type: 'TEXT_TO_IMAGE',
        provider: 'openai',
        description: '',
        apiUrl: '',
        apiKey: '',
        config: '{"sizes":["1024x1024"]}',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingModel ? 'update' : 'create';
    const payload = {
      action,
      ...(editingModel ? { id: editingModel.id } : {}),
      data: {
        ...formData,
        apiUrl: formData.apiUrl.trim() || null,
        apiKey: formData.apiKey.trim() || null,
      }
    };

    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    setIsModalOpen(false);
    mutate();
  };

  if (isLoading) return <div>加载中...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}>模型管理</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>配置生成模型及独立的 API 代理地址。</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          添加新模型
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
         {models.map((model: any) => (
            <div key={model.id} className="model-card">
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                     <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--ink)' }}>{model.name}</h3>
                     <span className="model-badge">
                        {model.provider}
                     </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: model.type === 'BOTH' ? 'var(--primary)' : 'var(--muted)' }}>
                     {model.type === 'TEXT_TO_IMAGE' ? '仅文生图' : model.type === 'IMAGE_TO_IMAGE' ? '仅图生图' : '文/图生图'}
                  </div>
               </div>
               
               <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1rem', flex: 1 }}>
                  {model.description || '无描述'}
               </p>

               <div style={{ fontSize: '12px', color: 'var(--muted-soft)', marginBottom: '16px', fontFamily: 'monospace' }}>
                 ID: {model.modelId} <br/>
                 API: {model.apiUrl || '默认全局代理'}
               </div>
               
               <div className="card-actions">
                  <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                     权限: {model.teacherEnabled ? <span style={{color:'var(--accent-teal)'}}>已对学生开启</span> : <span style={{color:'var(--danger)'}}>对学生关闭</span>}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-icon" onClick={() => handleToggle(model.id, model.teacherEnabled)} title="切换权限">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </button>
                    <button className="btn-icon" onClick={() => openModal(model)} title="编辑">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(model.id)} title="删除">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
               </div>
            </div>
         ))}
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">{editingModel ? '编辑模型' : '添加新模型'}</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              
              <div className="form-row">
                <div className="form-group">
                  <label>展示名称</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="如: Midjourney V6" />
                </div>
                <div className="form-group">
                  <label>模型标识 (Model ID)</label>
                  <input type="text" required value={formData.modelId} onChange={e => setFormData({...formData, modelId: e.target.value})} placeholder="如: midjourney" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>类型</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="TEXT_TO_IMAGE">仅文生图</option>
                    <option value="IMAGE_TO_IMAGE">仅图生图</option>
                    <option value="BOTH">文生图 + 图生图</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>提供商</label>
                  <input type="text" required value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} placeholder="如: openai" />
                </div>
              </div>

              <div className="form-group">
                <label>描述说明</label>
                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="向学生展示的模型说明..." />
              </div>

              <div className="form-group">
                <label>独立 API 地址 (选填，不填则走全局默认)</label>
                <input type="url" value={formData.apiUrl} onChange={e => setFormData({...formData, apiUrl: e.target.value})} placeholder="https://api.example.com" />
              </div>

              <div className="form-group">
                <label>独立 API Key (选填)</label>
                <input type="password" value={formData.apiKey} onChange={e => setFormData({...formData, apiKey: e.target.value})} placeholder="sk-..." />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>取消</button>
                <button type="submit" className="btn btn-primary">{editingModel ? '保存更改' : '确认添加'}</button>
              </div>

            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .model-card {
          background: var(--surface-card);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 12px rgba(20,20,19,0.02);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .model-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(20,20,19,0.05);
        }

        .model-badge {
          font-size: 0.8rem;
          padding: 0.2rem 0.6rem;
          background: var(--canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-pill);
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-actions {
          border-top: 1px solid var(--hairline);
          padding-top: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-sm);
          color: var(--muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: var(--surface-hover);
          color: var(--ink);
        }

        .btn-icon.danger:hover {
          background: var(--danger);
          color: white;
          border-color: var(--danger);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(20, 20, 19, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--surface-card);
          padding: 32px;
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 600px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.1);
        }

        .modal-title {
          font-family: var(--font-serif);
          font-size: 24px;
          margin-bottom: 24px;
          color: var(--ink);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-row {
          display: flex;
          gap: 16px;
        }

        .form-row > * {
          flex: 1;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--muted);
        }

        .form-group input, .form-group select {
          padding: 8px 12px;
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          background: var(--canvas);
          color: var(--ink);
          font-size: 14px;
        }
        
        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: var(--primary);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--hairline);
        }
      `}</style>
    </div>
  );
}
