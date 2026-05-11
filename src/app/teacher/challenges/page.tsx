'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './challenges.css';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function TeacherChallengesPage() {
  const { data, mutate } = useSWR('/api/challenges', fetcher);
  const challenges = data?.data || [];
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    theme: '',
    keywords: '',
    durationMin: 5
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const keywordsArray = formData.keywords
        .split(/[，,]/)
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          keywords: keywordsArray.length > 0 ? keywordsArray : null
        })
      });

      if (res.ok) {
        mutate();
        setIsModalOpen(false);
        setFormData({ title: '', theme: '', keywords: '', durationMin: 5 });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/challenges/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    mutate();
    if (status === 'ACTIVE') {
      router.push(`/teacher/challenges/${id}/live`);
    }
  };

  return (
    <div className="tc-container">
      <div className="tc-header">
        <div>
          <h1>⚡ 创意挑战管理</h1>
          <p className="tc-subtitle">发起限时课堂创作比赛，激发学生创意</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          + 发起新挑战
        </button>
      </div>

      <div className="tc-grid">
        {challenges.map((c: any) => (
          <div key={c.id} className="glass-panel tc-card">
            <div className="tc-card-header">
              <h3 className="tc-card-title">{c.title}</h3>
              <span className={`tc-badge tc-badge-${c.status.toLowerCase()}`}>
                {c.status === 'PENDING' ? '未开始' : c.status === 'ACTIVE' ? '进行中' : '已结束'}
              </span>
            </div>
            
            <div className="tc-card-body">
              <p><span className="tc-label">主题：</span>{c.theme}</p>
              <p><span className="tc-label">时长：</span>{c.durationMin} 分钟</p>
              {c.keywords && (
                <div className="tc-keywords">
                  <span className="tc-label">要求词汇：</span>
                  {JSON.parse(c.keywords).map((k: string) => (
                    <span key={k} className="tc-keyword">{k}</span>
                  ))}
                </div>
              )}
              <p><span className="tc-label">参与人数：</span>{c._count.entries}</p>
            </div>

            <div className="tc-card-actions">
              {c.status === 'PENDING' && (
                <button onClick={() => updateStatus(c.id, 'ACTIVE')} className="tc-btn tc-btn-start">
                  🚀 开始挑战
                </button>
              )}
              {c.status === 'ACTIVE' && (
                <>
                  <Link href={`/teacher/challenges/${c.id}/live`} className="tc-btn tc-btn-live">
                    📺 实时大屏
                  </Link>
                  <button onClick={() => updateStatus(c.id, 'ENDED')} className="tc-btn tc-btn-end">
                    🛑 强制结束
                  </button>
                </>
              )}
              {c.status === 'ENDED' && (
                <Link href={`/teacher/challenges/${c.id}/live`} className="tc-btn tc-btn-review">
                  回顾作品展
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="tc-modal-overlay">
          <div className="glass-panel tc-modal">
            <h2>发起新挑战</h2>
            <form onSubmit={handleSubmit} className="tc-form">
              <div className="tc-form-group">
                <label>挑战标题</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="例如：春季运动会海报挑战" />
              </div>
              <div className="tc-form-group">
                <label>创作主题描述</label>
                <textarea required rows={3} value={formData.theme} onChange={e => setFormData({...formData, theme: e.target.value})} placeholder="描述一下这次挑战的背景和期望的效果..." />
              </div>
              <div className="tc-form-group">
                <label>必须包含的提示词 (可选，逗号分隔)</label>
                <input type="text" value={formData.keywords} onChange={e => setFormData({...formData, keywords: e.target.value})} placeholder="例如：操场, 阳光, 奔跑" />
              </div>
              <div className="tc-form-group">
                <label>挑战时长 (分钟)</label>
                <input required type="number" min="1" max="60" value={formData.durationMin} onChange={e => setFormData({...formData, durationMin: parseInt(e.target.value) || 5})} />
              </div>
              <div className="tc-modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary tc-flex-1">取消</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary tc-flex-1">
                  {isSubmitting ? '保存中...' : '创建挑战'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
