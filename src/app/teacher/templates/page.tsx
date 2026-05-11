'use client';

import { useState } from 'react';
import useSWR from 'swr';
import './templates.css';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function TeacherTemplatesPage() {
  const { data, mutate } = useSWR('/api/templates', fetcher);
  const templates = data?.data || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', template: '', category: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        mutate();
        setIsModalOpen(false);
        setFormData({ title: '', description: '', template: '', category: '' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此模板吗？')) return;
    await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
    mutate();
  };

  return (
    <div className="tmpl-container">
      <div className="tmpl-header">
        <div>
          <h1>📝 提示词模板库</h1>
          <p className="tmpl-subtitle">创建可重用的提示词框架，引导学生填空创作</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          + 新增模板
        </button>
      </div>

      <div className="tmpl-grid">
        {templates.map((t: any) => (
          <div key={t.id} className="glass-panel tmpl-card">
            <div className="tmpl-card-header">
              <h3 className="tmpl-card-title">{t.title}</h3>
              <span className="tmpl-badge">{t.category || '通用'}</span>
            </div>
            <p className="tmpl-desc">{t.description}</p>
            <div className="tmpl-content">
              {t.template.split(/(\{.*?\})/).map((part: string, i: number) => 
                part.startsWith('{') && part.endsWith('}') ? 
                  <span key={i} className="tmpl-var">{part}</span> : 
                  part
              )}
            </div>
            <div className="tmpl-card-actions">
              <button onClick={() => handleDelete(t.id)} className="tmpl-btn-delete">删除模板</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="tmpl-modal-overlay">
          <div className="glass-panel tmpl-modal">
            <h2>创建新模板</h2>
            <form onSubmit={handleSubmit} className="tmpl-form">
              <div className="tmpl-form-group">
                <label>模板名称</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="例如：电影级人像" />
              </div>
              <div className="tmpl-form-group">
                <label>分类</label>
                <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="例如：人物" />
              </div>
              <div className="tmpl-form-group">
                <label>功能描述</label>
                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="tmpl-form-group">
                <label>模板内容 (使用 {"{变量名}"} 作为填空项)</label>
                <textarea required rows={4} style={{ fontFamily: 'var(--font-mono)' }} value={formData.template} onChange={e => setFormData({...formData, template: e.target.value})} placeholder="例如: 一个{职业}在{场景}里，{光影}，8k分辨率" />
              </div>
              <div className="tmpl-modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary tmpl-flex-1">取消</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary tmpl-flex-1">
                  保存模板
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
