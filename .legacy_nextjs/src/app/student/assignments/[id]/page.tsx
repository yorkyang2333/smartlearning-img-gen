'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function StudentAssignmentDetail() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  
  const { data, mutate } = useSWR(id ? `/api/assignments/${id}` : null, fetcher);
  const { data: gensData } = useSWR('/api/student/generations?limit=20', fetcher);
  
  const [selectedGeneration, setSelectedGeneration] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  if (!data) return <div style={{ padding: 48, color: 'var(--muted)' }}>加载中...</div>;
  if (data.error) return <div style={{ padding: 48, color: 'var(--error)' }}>错误: {data.error}</div>;

  const assignment = data.data;
  if (!assignment) return <div style={{ padding: 48, color: 'var(--muted)' }}>找不到该任务</div>;
  
  // Find if student has already submitted
  const submissions = assignment.submissions || [];
  const hasSubmitted = submissions.length > 0;
  const latestSub = submissions[0];

  // For submission, we need to pick from student's recent generations
  const recentGens = gensData?.data || [];

  const handleSubmit = async () => {
    if (!selectedGeneration) return alert('请先选择一个你要提交的作品');
    setSubmitting(true);
    try {
       const res = await fetch(`/api/assignments/${id}/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generationId: selectedGeneration, note })
       });
       if (res.ok) {
          alert('提交成功！');
          mutate();
       } else {
          const err = await res.json();
          alert('提交失败: ' + err.error);
       }
    } finally {
       setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm('确定要撤回提交吗？撤回后你需要重新选择作品提交。')) return;
    setWithdrawing(true);
    try {
       const res = await fetch(`/api/assignments/${id}/submissions/${latestSub.id}`, {
          method: 'DELETE'
       });
       if (res.ok) {
          alert('撤回成功！');
          setSelectedGeneration(null);
          setNote('');
          mutate();
       } else {
          const err = await res.json();
          alert('撤回失败: ' + err.error);
       }
    } finally {
       setWithdrawing(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <Link href="/student/assignments" style={{ color: 'var(--muted)', fontSize: 24, textDecoration: 'none' }}>
          ←
        </Link>
        <h1 style={{ margin: 0 }}>{assignment.title}</h1>
      </div>

      <div className="glass-panel" style={{ padding: 32, marginBottom: 32 }}>
         <h3 style={{ marginTop: 0 }}>任务说明</h3>
         <p style={{ color: 'var(--ink)', lineHeight: 1.6 }}>{assignment.description}</p>
         
         {assignment.requirements && (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--canvas)', borderRadius: 8 }}>
               <strong>要求: </strong>
               {JSON.parse(assignment.requirements).theme && <span>主题: {JSON.parse(assignment.requirements).theme} | </span>}
               {JSON.parse(assignment.requirements).keywords && <span>关键词: {JSON.parse(assignment.requirements).keywords.join(', ')}</span>}
            </div>
         )}
      </div>

      {hasSubmitted ? (
         <div className="glass-panel submitted-panel">
            <div className="submitted-header">
               <div>
                  <h3 className="status-title">✅ 已提交</h3>
                  <p className="status-desc">你已成功提交该任务的作品。</p>
               </div>
               {latestSub.status !== 'REVIEWED' && (
                  <button 
                     className="btn btn-secondary" 
                     onClick={handleWithdraw} 
                     disabled={withdrawing}
                     style={{ color: 'var(--error)', borderColor: 'rgba(255,0,0,0.2)' }}
                  >
                     {withdrawing ? '撤回中...' : '撤回重交'}
                  </button>
               )}
            </div>
            
            {latestSub.status === 'REVIEWED' ? (
               <div className="feedback-card">
                  <div className="feedback-header">
                     <strong>👩‍🏫 教师评阅结果</strong>
                     <span className="score-badge">{latestSub.score} 分</span>
                  </div>
                  <p className="feedback-text">{latestSub.feedback}</p>
               </div>
            ) : (
               <div className="waiting-card">
                  ⏳ 老师正在评阅中，如果发现问题你可以随时撤回重交...
               </div>
            )}

            <div className="submission-content">
               <strong>你提交的作品：</strong>
               {latestSub.note && <p className="submission-note">📝 备注：{latestSub.note}</p>}
               <div className="submission-image-wrapper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={latestSub.generation?.outputImageUrl} alt="submitted" />
               </div>
            </div>
         </div>
      ) : (
         <div className="glass-panel" style={{ padding: 32 }}>
            <h3 style={{ marginTop: 0 }}>提交作品</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 24 }}>请从你最近生成的作品中选择一张最满意的提交：</p>
            
            {recentGens.length === 0 ? (
               <div style={{ textAlign: 'center', padding: 48, background: 'var(--canvas)', borderRadius: 12 }}>
                  <p style={{ color: 'var(--muted)', marginBottom: 16 }}>你还没有生成过任何作品。</p>
                  <Link href="/student/generate" className="btn btn-primary">
                     去生成作品
                  </Link>
               </div>
            ) : (
               <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 24, maxHeight: 400, overflowY: 'auto', padding: 8 }}>
                     {recentGens.map(gen => gen.outputImageUrl && (
                        <div 
                           key={gen.id} 
                           onClick={() => setSelectedGeneration(gen.id)}
                           style={{ 
                              cursor: 'pointer', 
                              borderRadius: 8, 
                              overflow: 'hidden',
                              border: selectedGeneration === gen.id ? '3px solid var(--primary)' : '1px solid var(--hairline)',
                              opacity: selectedGeneration && selectedGeneration !== gen.id ? 0.6 : 1
                           }}
                        >
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img src={gen.outputImageUrl} alt="gen" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                        </div>
                     ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                     <label style={{ fontWeight: 500 }}>创作心得 / 提交备注 (可选)</label>
                     <textarea 
                        rows={3} 
                        placeholder="分享一下你的创作思路..."
                        value={note}
                        onChange={e => setNote(e.target.value)}
                     />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                     <button className="btn btn-primary" onClick={handleSubmit} disabled={!selectedGeneration || submitting}>
                        {submitting ? '提交中...' : '确认提交'}
                     </button>
                  </div>
               </>
            )}
         </div>
      )}

      <style jsx>{`
        .submitted-panel {
          padding: 32px;
          border: 2px solid var(--success);
          position: relative;
          overflow: hidden;
        }

        .submitted-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .status-title {
          margin: 0 0 8px 0;
          color: var(--success);
          font-size: 20px;
        }

        .status-desc {
          margin: 0;
          color: var(--ink);
        }

        .feedback-card {
          padding: 24px;
          background: var(--surface-cream-strong);
          border-radius: 12px;
          margin-bottom: 24px;
          border: 1px solid var(--hairline);
        }

        .feedback-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .score-badge {
          font-size: 24px;
          font-weight: bold;
          color: var(--primary);
        }

        .feedback-text {
          font-size: 15px;
          line-height: 1.6;
          margin: 0;
          color: var(--ink);
        }

        .waiting-card {
          padding: 16px 20px;
          background: var(--canvas);
          border-radius: 8px;
          color: var(--muted);
          margin-bottom: 24px;
          border: 1px dashed var(--hairline);
        }

        .submission-content {
          margin-top: 8px;
        }

        .submission-note {
          margin: 12px 0;
          padding: 12px;
          background: var(--canvas);
          border-radius: 8px;
          color: var(--muted);
          font-size: 14px;
        }

        .submission-image-wrapper {
          margin-top: 16px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--hairline);
          width: 300px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }

        .submission-image-wrapper img {
          width: 100%;
          display: block;
          object-fit: cover;
          aspect-ratio: 1;
        }
      `}</style>
    </div>
  );
}
