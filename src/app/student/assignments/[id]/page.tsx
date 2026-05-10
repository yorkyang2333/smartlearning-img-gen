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
  const { data: convData } = useSWR('/api/student/conversations', fetcher);
  
  const [selectedGeneration, setSelectedGeneration] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!data) return <div style={{ padding: 48, color: 'var(--muted)' }}>加载中...</div>;
  if (data.error) return <div style={{ padding: 48, color: 'var(--error)' }}>错误: {data.error}</div>;

  const assignment = data.data;
  if (!assignment) return <div style={{ padding: 48, color: 'var(--muted)' }}>找不到该任务</div>;
  
  // Find if student has already submitted
  const submissions = assignment.submissions || [];
  const hasSubmitted = submissions.length > 0;
  const latestSub = submissions[0];

  // For submission, we need to pick from student's recent generations
  // Let's get the 20 most recent generations to pick from
  const generations = [];
  if (convData?.data) {
     for (const conv of convData.data) {
         if (conv.generations) {
            generations.push(...conv.generations);
         }
     }
  }
  // Sort by date desc
  generations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const recentGens = generations.slice(0, 20);

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
         <div className="glass-panel" style={{ padding: 32, border: '2px solid var(--success)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--success)' }}>✅ 已提交</h3>
            <p>你已成功提交该任务的作品。</p>
            
            {latestSub.status === 'REVIEWED' ? (
               <div style={{ marginTop: 24, padding: 24, background: 'var(--surface-cream-strong)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                     <strong style={{ fontSize: 18 }}>教师评阅结果</strong>
                     <span style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--primary)' }}>{latestSub.score} 分</span>
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.6 }}>{latestSub.feedback}</p>
               </div>
            ) : (
               <div style={{ marginTop: 24, padding: 16, background: 'var(--canvas)', borderRadius: 8, color: 'var(--muted)' }}>
                  ⏳ 老师正在评阅中，请耐心等待...
               </div>
            )}

            <div style={{ marginTop: 24 }}>
               <strong>你提交的作品：</strong>
               <div style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--hairline)', width: 200 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={latestSub.generation?.outputImageUrl} alt="submitted" style={{ width: '100%', display: 'block' }} />
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
    </div>
  );
}
