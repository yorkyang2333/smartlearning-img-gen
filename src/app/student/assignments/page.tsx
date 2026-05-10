'use client';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function StudentAssignmentsPage() {
  const { data, error } = useSWR('/api/assignments', fetcher);
  
  if (!data && !error) return <div style={{ padding: '48px', color: 'var(--muted)' }}>加载中...</div>;

  const assignments = data?.data || [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ marginBottom: 32 }}>
        <h1>教学任务</h1>
        <p style={{ color: 'var(--muted)' }}>完成老师布置的创作挑战</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {assignments.map((assignment: any) => {
           // Find if student has submitted
           const submissions = assignment.submissions || [];
           const hasSubmitted = submissions.length > 0;
           const latestSub = submissions[0];

           return (
             <div key={assignment.id} className="glass-panel" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
               {hasSubmitted && (
                  <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 16px', background: latestSub.status === 'REVIEWED' ? 'var(--success)' : 'var(--primary)', color: 'white', fontSize: 12, borderBottomLeftRadius: 12 }}>
                     {latestSub.status === 'REVIEWED' ? `已评阅: ${latestSub.score}分` : '已提交待评阅'}
                  </div>
               )}
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div style={{ flex: 1, paddingRight: 24, marginTop: hasSubmitted ? 8 : 0 }}>
                   <h3 style={{ margin: 0, fontSize: 20, color: 'var(--ink)' }}>
                     {assignment.title}
                   </h3>
                   <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: 14, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                     {assignment.description}
                   </p>
                   
                   {latestSub?.feedback && (
                     <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--surface-cream-strong)', borderRadius: 6, fontSize: 13, borderLeft: '3px solid var(--primary)' }}>
                        <strong>老师评语：</strong>{latestSub.feedback}
                     </div>
                   )}
                 </div>
                 
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 120, marginTop: hasSubmitted ? 8 : 0 }}>
                    <Link href={`/student/assignments/${assignment.id}`} className={hasSubmitted ? "btn btn-secondary" : "btn btn-primary"} style={{ width: '100%' }}>
                       {hasSubmitted ? '查看详情' : '去创作'}
                    </Link>
                 </div>
               </div>
             </div>
           );
        })}

        {assignments.length === 0 && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: 64, color: 'var(--muted)' }}>
             当前没有活跃的教学任务。
          </div>
        )}
      </div>
    </div>
  );
}
