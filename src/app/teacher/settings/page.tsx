'use client';

import { useState, useEffect } from 'react';

export default function TeacherSettingsPage() {
  const [formData, setFormData] = useState({
    dailyLimit: 50,
    blockedWords: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/quota')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setFormData({
            dailyLimit: data.data.dailyLimit || 50,
            blockedWords: data.data.blockedWords ? JSON.parse(data.data.blockedWords).join(', ') : ''
          });
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      const wordsArray = formData.blockedWords
        .split(/[，,]/)
        .map(w => w.trim())
        .filter(w => w.length > 0);

      const res = await fetch('/api/quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyLimit: formData.dailyLimit,
          blockedWords: wordsArray.length > 0 ? wordsArray : null
        })
      });

      if (res.ok) {
        setMessage('设置保存成功');
      } else {
        setMessage('设置保存失败');
      }
    } catch (err) {
      setMessage('发生错误');
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>系统设置</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>管理学生的生成配额与安全过滤规则</p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit}>
          
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>配额管理</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-body)' }}>学生每日生成次数上限</label>
              <input 
                type="number" 
                style={{ width: '100%', maxWidth: '300px' }}
                value={formData.dailyLimit} 
                onChange={e => setFormData({...formData, dailyLimit: parseInt(e.target.value) || 0})} 
                min="1"
              />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>防止 API 资源滥用，建议设置为 50-100 次/人</p>
            </div>
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>安全护栏</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-body)' }}>敏感词黑名单 (用逗号分隔)</label>
              <textarea 
                style={{ width: '100%' }}
                rows={4} 
                value={formData.blockedWords} 
                onChange={e => setFormData({...formData, blockedWords: e.target.value})} 
                placeholder="例如：暴力, 恐怖, 血腥..." 
              />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>学生在提示词中输入这些词汇时，生成请求将被直接拦截。</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              type="submit" 
              disabled={isSaving} 
              className="btn btn-primary"
            >
              {isSaving ? '保存中...' : '保存设置'}
            </button>
            {message && (
              <span style={{ fontSize: '0.875rem', color: message.includes('成功') ? 'var(--success)' : 'var(--error)' }}>
                {message}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
