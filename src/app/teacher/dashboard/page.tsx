'use client';

import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const { data: studentsRes } = useSWR('/api/students', fetcher);
  const { data: historyRes } = useSWR('/api/history', fetcher);

  const students = studentsRes?.data || [];
  const history = historyRes?.data || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1>工作台</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>班级学生总数</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>
            {students.length}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>总生成次数</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--secondary-color)' }}>
            {history.length}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>活跃模型</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--success)' }}>
            {new Set(history.map((h: any) => h.modelId)).size}
          </div>
        </div>
      </div>

      <h2>最近生成记录</h2>
      <div className="glass-panel">
         {history.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>暂无生成记录</div>
         ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                     <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>学生</th>
                     <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>模型</th>
                     <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>提示词</th>
                     <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>时间</th>
                  </tr>
               </thead>
               <tbody>
                  {history.slice(0, 5).map((item: any) => (
                     <tr key={item.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <td style={{ padding: '1rem' }}>{item.user?.displayName}</td>
                        <td style={{ padding: '1rem' }}>{item.model?.name}</td>
                        <td style={{ padding: '1rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.prompt}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{new Date(item.createdAt).toLocaleString()}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         )}
         {history.length > 5 && (
            <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
               <Link href="/teacher/history" style={{ color: 'var(--primary-color)' }}>查看全部记录 →</Link>
            </div>
         )}
      </div>
    </div>
  );
}
