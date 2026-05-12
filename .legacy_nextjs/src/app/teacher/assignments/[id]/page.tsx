'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function TeacherAssignmentDetail() {
  const params = useParams();
  const id = params?.id;
  const { data, mutate } = useSWR(id ? `/api/assignments/${id}` : null, fetcher);
  
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [returning, setReturning] = useState(false);

  if (!data) return <div style={{ padding: 48, color: 'var(--muted)' }}>加载中...</div>;
  if (data.error) return <div style={{ padding: 48, color: 'var(--error)' }}>错误: {data.error}</div>;

  const assignment = data.data;
  if (!assignment) return <div style={{ padding: 48, color: 'var(--muted)' }}>找不到该任务</div>;

  const handleReview = async (subId: string) => {
    setSubmitting(true);
    try {
       await fetch(`/api/assignments/${id}/submissions/${subId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback, score })
       });
       setReviewingId(null);
       mutate();
    } finally {
       setSubmitting(false);
    }
  };

  const handleReturn = async (subId: string) => {
    if (!confirm('确定要打回该作品吗？打回后学生需要重新提交。')) return;
    setReturning(true);
    try {
       const res = await fetch(`/api/assignments/${id}/submissions/${subId}`, {
          method: 'DELETE'
       });
       if (res.ok) {
          setReviewingId(null);
          mutate();
       } else {
          const err = await res.json();
          alert('打回失败: ' + err.error);
       }
    } finally {
       setReturning(false);
    }
  };

  const openReview = (sub: any) => {
     setReviewingId(sub.id);
     setFeedback(sub.feedback || '');
     setScore(sub.score || 85);
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <Link href="/teacher/assignments" style={{ color: 'var(--muted)', fontSize: 24, textDecoration: 'none' }}>
          ←
        </Link>
        <h1 style={{ margin: 0 }}>{assignment.title}</h1>
      </div>

      <div className="glass-panel" style={{ padding: 32, marginBottom: 32 }}>
         <h3 style={{ marginTop: 0 }}>任务详情</h3>
         <p style={{ color: 'var(--ink)', lineHeight: 1.6 }}>{assignment.description}</p>
         
         {assignment.requirements && (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--canvas)', borderRadius: 8 }}>
               <strong>要求: </strong>
               {JSON.parse(assignment.requirements).theme && <span>主题: {JSON.parse(assignment.requirements).theme} | </span>}
               {JSON.parse(assignment.requirements).keywords && <span>关键词: {JSON.parse(assignment.requirements).keywords.join(', ')}</span>}
            </div>
         )}
      </div>

      <h2>学生提交 ({assignment.submissions?.length || 0})</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24, marginTop: 24 }}>
         {assignment.submissions?.map((sub: any) => (
            <div key={sub.id} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={sub.generation?.outputImageUrl} alt="submission" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
               <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                     <strong>👤 {sub.student.displayName}</strong>
                     <span style={{ fontSize: 12, color: sub.status === 'REVIEWED' ? 'var(--success)' : 'var(--warning)' }}>
                        {sub.status === 'REVIEWED' ? `已评阅 (${sub.score}分)` : '待评阅'}
                     </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, flex: 1 }}>
                     {sub.generation?.prompt}
                  </p>

                  {sub.note && (
                     <div style={{ background: 'var(--surface-cream-strong)', padding: '10px 12px', borderRadius: 8, fontSize: 13, color: 'var(--ink)', marginBottom: 16 }}>
                        📝 备注：{sub.note}
                     </div>
                  )}
                  
                  {reviewingId === sub.id ? (
                     <div className="grading-panel">
                        <div className="score-section">
                           <label>评分 (0-100)</label>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                              <input 
                                 type="number" 
                                 min="0" 
                                 max="100" 
                                 value={score} 
                                 onChange={e => setScore(Number(e.target.value))} 
                                 className="score-input" 
                              />
                              <span style={{ color: 'var(--muted)', fontWeight: 500 }}>分</span>
                           </div>
                           <div className="quick-scores">
                              <button className={`score-btn ${score >= 90 ? 'active' : ''}`} onClick={() => setScore(90)}>优秀</button>
                              <button className={`score-btn ${score >= 80 && score < 90 ? 'active' : ''}`} onClick={() => setScore(80)}>良好</button>
                              <button className={`score-btn ${score >= 60 && score < 80 ? 'active' : ''}`} onClick={() => setScore(60)}>及格</button>
                              <button className={`score-btn ${score < 60 ? 'active' : ''}`} onClick={() => setScore(50)}>待改进</button>
                           </div>
                        </div>

                        <div className="feedback-section">
                           <label>教师评语</label>
                           <div className="quick-tags">
                              {['✨ 构图优秀', '🎨 光影出众', '🎯 提示词精准', '💡 创意十足', '⚠️ 细节不足', '❌ 偏离主题'].map(tag => (
                                 <span key={tag} className="feedback-tag" onClick={() => setFeedback(prev => prev ? `${prev}，${tag}` : tag)}>
                                    {tag}
                                 </span>
                              ))}
                           </div>
                           <textarea className="feedback-textarea" value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="请输入详细的评阅意见..." rows={3} />
                        </div>

                        <div className="grading-actions">
                           <button className="btn btn-secondary" style={{ color: 'var(--error)', borderColor: 'rgba(255,0,0,0.2)' }} onClick={() => handleReturn(sub.id)} disabled={returning}>
                              {returning ? '处理中...' : '打回重做'}
                           </button>
                           <div className="grading-actions-right">
                              <button className="btn btn-secondary" onClick={() => setReviewingId(null)}>取消</button>
                              <button className="btn btn-primary" onClick={() => handleReview(sub.id)} disabled={submitting}>
                                 {submitting ? '提交中...' : '提交评阅'}
                              </button>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => openReview(sub)}>
                        {sub.status === 'REVIEWED' ? '修改评阅' : '进行评阅'}
                     </button>
                  )}
               </div>
            </div>
         ))}

         {assignment.submissions?.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
               暂无学生提交。
            </div>
         )}
      </div>

      <style jsx>{`
        .grading-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 12px;
          background: white;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid var(--primary);
          box-shadow: 0 4px 24px rgba(204,120,92,0.15);
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .score-section label, .feedback-section label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .score-input {
          width: 80px;
          font-size: 20px;
          font-weight: bold;
          color: var(--primary);
          border: 1px solid var(--hairline);
          border-radius: 8px;
          padding: 8px 4px;
          text-align: center;
          outline: none;
          transition: border-color 0.2s;
        }

        .score-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(204,120,92,0.1);
        }

        .quick-scores {
          display: flex;
          gap: 8px;
        }

        .score-btn {
          flex: 1;
          padding: 6px 0;
          border-radius: 6px;
          border: 1px solid var(--hairline);
          background: var(--canvas);
          color: var(--muted);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .score-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .score-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .quick-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .feedback-tag {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 12px;
          background: var(--surface-cream-strong);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.2s;
        }

        .feedback-tag:hover {
          background: var(--surface-card);
        }

        .feedback-textarea {
          width: 100%;
          border: 1px solid var(--hairline);
          border-radius: 8px;
          padding: 12px;
          font-size: 13px;
          resize: none;
        }

        .feedback-textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(204,120,92,0.1);
        }

        .grading-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: space-between;
          margin-top: 8px;
        }

        .grading-actions-right {
          display: flex;
          gap: 12px;
          margin-left: auto;
        }

        .grading-actions button {
          padding: 8px 16px;
          height: auto;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
