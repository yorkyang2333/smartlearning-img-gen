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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24, marginTop: 24 }}>
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
                  
                  {reviewingId === sub.id ? (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, background: 'var(--canvas)', padding: 12, borderRadius: 8 }}>
                        <input type="number" min="0" max="100" value={score} onChange={e => setScore(Number(e.target.value))} placeholder="分数 (0-100)" />
                        <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="教师评语..." rows={3} />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                           <button className="btn btn-secondary" style={{ padding: '4px 12px', height: 'auto' }} onClick={() => setReviewingId(null)}>取消</button>
                           <button className="btn btn-primary" style={{ padding: '4px 12px', height: 'auto' }} onClick={() => handleReview(sub.id)} disabled={submitting}>提交</button>
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
    </div>
  );
}
