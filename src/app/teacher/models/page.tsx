'use client';

import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ModelsPage() {
  const { data: response, isLoading, mutate } = useSWR('/api/models', fetcher);
  const models = response?.data || [];

  const handleToggle = async (modelId: string, currentEnabled: boolean) => {
    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleConfig', modelId, enabled: !currentEnabled })
    });
    mutate();
  };

  if (isLoading) return <div>加载中...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1>模型管理</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>控制班级学生可以使用哪些 AI 模型。</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
         {models.map((model: any) => (
            <div key={model.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                     <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{model.name}</h3>
                     <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'rgba(0,0,0,0.05)', borderRadius: '1rem', color: 'var(--text-muted)' }}>
                        {model.provider}
                     </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: model.type === 'BOTH' ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                     {model.type === 'TEXT_TO_IMAGE' ? '仅文生图' : model.type === 'IMAGE_TO_IMAGE' ? '仅图生图' : '文/图生图'}
                  </div>
               </div>
               
               <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', flex: 1 }}>
                  {model.description || '无描述'}
               </p>
               
               <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                     状态: {model.teacherEnabled ? <span style={{color:'var(--success)'}}>已为本班启用</span> : <span style={{color:'var(--danger)'}}>已为本班禁用</span>}
                  </span>
                  <button 
                     className="btn btn-secondary" 
                     style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                     onClick={() => handleToggle(model.id, model.teacherEnabled)}
                  >
                     切换权限
                  </button>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}
