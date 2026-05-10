'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewAssignmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    keywords: '',
    theme: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const requirements = {
        theme: formData.theme,
        keywords: formData.keywords.split(/[,，]/).map(k => k.trim()).filter(Boolean)
      };

      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          requirements
        })
      });

      if (res.ok) {
        router.push('/teacher/assignments');
      } else {
        alert('发布失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <Link href="/teacher/assignments" style={{ color: 'var(--muted)', fontSize: 24, textDecoration: 'none' }}>
          ←
        </Link>
        <h1 style={{ margin: 0 }}>发布新任务</h1>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontWeight: 500 }}>任务标题 <span style={{ color: 'var(--error)' }}>*</span></label>
          <input 
            type="text" 
            required 
            placeholder="例如：第一课 - 基础风景生成"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontWeight: 500 }}>任务说明 <span style={{ color: 'var(--error)' }}>*</span></label>
          <textarea 
            required 
            rows={5}
            placeholder="详细描述任务要求、背景及目标..."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
           <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
             <label style={{ fontWeight: 500 }}>规定主题 (可选)</label>
             <input 
               type="text" 
               placeholder="例如：赛博朋克城市"
               value={formData.theme}
               onChange={e => setFormData({...formData, theme: e.target.value})}
             />
           </div>
           
           <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
             <label style={{ fontWeight: 500 }}>必含关键词 (可选，逗号分隔)</label>
             <input 
               type="text" 
               placeholder="例如：霓虹灯, 雨天, 飞车"
               value={formData.keywords}
               onChange={e => setFormData({...formData, keywords: e.target.value})}
             />
           </div>
        </div>

        <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
          <Link href="/teacher/assignments" className="btn btn-secondary">
            取消
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '发布中...' : '发布任务'}
          </button>
        </div>
      </form>
    </div>
  );
}
