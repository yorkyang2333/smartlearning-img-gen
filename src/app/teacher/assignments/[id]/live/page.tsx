'use client';

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Image from 'next/image';
import './live.css';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ChallengeLivePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data } = useSWR(`/api/assignments/${id}`, fetcher, { refreshInterval: 3000 });
  const assignment = data?.data;

  if (!assignment) {
    return <div className="live-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>加载中...</div>;
  }

  const entries = assignment.submissions || [];
  
  const handleEnd = async () => {
    await fetch(`/api/assignments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ENDED', isActive: false })
    });
    router.push('/teacher/assignments');
  };

  return (
    <div className="live-container">
      <div className="live-wrapper">
        <div className="live-header">
          <div>
            <div className="live-title-row">
              <span style={{ fontSize: '1.5rem' }}>⚡</span>
              <h1 className="live-title">{assignment.title}</h1>
              <span className={`live-status-badge ${assignment.status === 'ACTIVE' ? 'live-status-active' : 'live-status-ended'}`}>
                {assignment.status === 'ACTIVE' ? 'LIVE 直播中' : '已结束'}
              </span>
            </div>
            <p className="live-theme">主题：{assignment.description}</p>
          </div>
          
          <div className="live-controls">
            <div className="live-stats">
              <div className="live-stats-label">已提交作品</div>
              <div className="live-stats-value">{entries.length}</div>
            </div>
            {assignment.status === 'ACTIVE' && (
              <button onClick={handleEnd} className="live-btn-end">
                结束挑战
              </button>
            )}
            {assignment.status === 'ENDED' && (
              <button onClick={() => router.push('/teacher/assignments')} className="live-btn-back">
                返回列表
              </button>
            )}
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="live-empty">
            <span className="live-empty-icon">🖼️</span>
            <p style={{ fontSize: '1.25rem' }}>等待学生提交作品...</p>
          </div>
        ) : (
          <div className="live-grid">
            {entries.map((entry: any, idx: number) => {
              const gen = entry.generation;
              return (
                <div key={entry.id} className="live-card">
                  <div className="live-img-wrapper">
                    {gen?.outputImageUrl ? (
                      <Image src={gen.outputImageUrl} alt="submission" fill style={{ objectFit: 'cover' }} />
                    ) : (
                      <div className="live-img-fail">生成失败</div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="live-overlay">
                      <p className="live-prompt-text">
                        {gen?.prompt}
                      </p>
                    </div>
                  </div>
                  
                  <div className="live-card-footer">
                    <div className="live-student-name">{entry.student.displayName}</div>
                    <div className="live-index">#{idx + 1}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
