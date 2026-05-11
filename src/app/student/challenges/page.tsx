'use client';

import useSWR from 'swr';
import Link from 'next/link';
import './challenges.css';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function StudentChallengesPage() {
  const { data } = useSWR('/api/challenges', fetcher, { refreshInterval: 5000 });
  const challenges = data?.data || [];

  return (
    <div className="sc-container">
      <div className="sc-header">
        <h1>
          <span style={{ color: 'var(--primary)' }}>⚡</span> 创意挑战
        </h1>
        <p className="sc-subtitle">参与老师发起的限时创作竞赛，展示你的想象力</p>
      </div>

      <div className="sc-grid">
        {challenges.length === 0 ? (
          <div className="sc-empty">
            暂无进行中的挑战
          </div>
        ) : (
          challenges.map((c: any) => {
            const isActive = c.status === 'ACTIVE';
            return (
              <div key={c.id} className={`glass-panel sc-card ${isActive ? 'sc-card-active' : ''}`}>
                <div className="sc-card-header">
                  <h3 className="sc-card-title">{c.title}</h3>
                  {isActive && (
                    <span className="sc-badge sc-badge-active">
                      🔴 正在进行中
                    </span>
                  )}
                  {c.status === 'ENDED' && (
                    <span className="sc-badge sc-badge-ended">
                      已结束
                    </span>
                  )}
                  {c.status === 'PENDING' && (
                    <span className="sc-badge sc-badge-pending">
                      即将开始
                    </span>
                  )}
                </div>
                
                <div className="sc-card-body">
                  <div className="sc-theme-box">
                    <span className="sc-theme-label">挑战主题：</span>
                    {c.theme}
                  </div>
                  
                  <div className="sc-meta">
                    <div className="sc-meta-item">
                      <span>⏱️</span> 限时 {c.durationMin} 分钟
                    </div>
                  </div>

                  {c.keywords && (
                    <div className="sc-keywords">
                      <span className="sc-keyword-label">必须包含：</span>
                      {JSON.parse(c.keywords).map((k: string) => (
                        <span key={k} className="sc-keyword">{k}</span>
                      ))}
                    </div>
                  )}
                </div>

                {isActive ? (
                  <Link href={`/student/challenges/${c.id}/play`} className="sc-btn-enter">
                    进入挑战房间
                  </Link>
                ) : (
                  <button disabled className="sc-btn-disabled">
                    {c.status === 'PENDING' ? '等待老师开始...' : '挑战已结束'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
