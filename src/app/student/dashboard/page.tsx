'use client';

import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StudentDashboardPage() {
  const { data: analyticsRes, isLoading } = useSWR('/api/analytics/student', fetcher);

  const stats = analyticsRes?.data;

  if (isLoading) return <div style={{ padding: '48px', color: 'var(--muted)' }}>加载中...</div>;
  if (!stats) return <div style={{ padding: '48px', color: 'var(--error)' }}>无法加载数据</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ marginBottom: 32 }}>
        <h1>数据中心</h1>
        <p style={{ color: 'var(--muted)' }}>你的个人创作轨迹与成绩概览</p>
      </div>
      
      {/* 核心指标卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>总生成次数</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '-1px' }}>
            {stats.totalGenerations}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>本周创作</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--success)', letterSpacing: '-1px' }}>
            {stats.thisWeekCount}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>最爱用模型</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--ink)', marginTop: '12px' }}>
            {stats.topModel}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>近期任务成绩</h2>
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
         {stats.recentSubmissions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>暂无任务提交记录</div>
         ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead>
                  <tr style={{ borderBottom: '1px solid var(--hairline)', background: 'var(--surface-soft)' }}>
                     <th style={{ padding: '16px 24px', color: 'var(--muted)', fontWeight: 500, width: '30%' }}>任务名称</th>
                     <th style={{ padding: '16px 24px', color: 'var(--muted)', fontWeight: 500, width: '15%' }}>状态</th>
                     <th style={{ padding: '16px 24px', color: 'var(--muted)', fontWeight: 500, width: '15%' }}>评分</th>
                     <th style={{ padding: '16px 24px', color: 'var(--muted)', fontWeight: 500, width: '40%' }}>评语</th>
                  </tr>
               </thead>
               <tbody>
                  {stats.recentSubmissions.map((sub: any) => (
                     <tr key={sub.id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                        <td style={{ padding: '16px 24px', fontWeight: 500 }}>{sub.assignmentTitle}</td>
                        <td style={{ padding: '16px 24px' }}>
                           {sub.status === 'REVIEWED' ? (
                              <span style={{ color: 'var(--success)', fontWeight: 500 }}>已评阅</span>
                           ) : (
                              <span style={{ color: 'var(--muted)' }}>待评阅</span>
                           )}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                           {sub.score ? <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{sub.score} 分</strong> : '-'}
                        </td>
                        <td style={{ padding: '16px 24px', color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5 }}>
                           {sub.feedback || '-'}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         )}
         {stats.recentSubmissions.length > 0 && (
            <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid var(--hairline)', background: 'var(--surface-soft)' }}>
               <Link href="/student/assignments" style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
                  查看所有任务 →
               </Link>
            </div>
         )}
      </div>
    </div>
  );
}
