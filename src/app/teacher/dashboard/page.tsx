'use client';

import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const { data: analyticsRes, isLoading: analyticsLoading } = useSWR('/api/analytics/teacher', fetcher);
  const { data: historyRes, isLoading: historyLoading } = useSWR('/api/history', fetcher);

  const stats = analyticsRes?.data;
  const history = historyRes?.data || [];

  if (analyticsLoading || historyLoading) return <div style={{ padding: '48px', color: 'var(--muted)' }}>加载中...</div>;
  if (!stats) return <div style={{ padding: '48px', color: 'var(--error)' }}>无法加载数据</div>;

  // Find max value in dailyTrend for scaling the bar chart
  const maxTrend = Math.max(...stats.dailyTrend.map((t: any) => t.count), 1); // min 1 to avoid div by 0

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ marginBottom: 32 }}>
        <h1>工作台</h1>
        <p style={{ color: 'var(--muted)' }}>全班数据与最新创作概览</p>
      </div>
      
      {/* 核心指标卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>班级学生总数</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '-1px' }}>
            {stats.totalStudents}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>总生成次数</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--ink)', letterSpacing: '-1px' }}>
            {stats.totalGenerations}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>活跃模型数</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--success)', letterSpacing: '-1px' }}>
            {stats.activeModels}
          </div>
        </div>
      </div>

      {/* 趋势图表区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
        
        {/* 近7天生成趋势 (纯 CSS 柱状图) */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '2rem', fontSize: '1.1rem' }}>近 7 天创作活跃度</h3>
          <div style={{ display: 'flex', height: '200px', alignItems: 'flex-end', gap: '16px', position: 'relative' }}>
            {/* 背景横线 */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderTop: '1px dashed var(--hairline)', zIndex: 0 }}></div>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed var(--hairline)', zIndex: 0 }}></div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid var(--hairline)', zIndex: 0 }}></div>
            
            {stats.dailyTrend.map((t: any, idx: number) => {
              const heightPercent = (t.count / maxTrend) * 100;
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', height: '100%', alignItems: 'flex-end', position: 'relative', group: 'true' }} className="chart-bar-container">
                     {/* 悬浮提示框 */}
                     <div className="tooltip">{t.count} 次</div>
                     {/* 柱状体 */}
                     <div 
                        style={{ 
                          width: '60%', 
                          height: `${heightPercent}%`, 
                          background: heightPercent > 0 ? 'var(--primary)' : 'transparent',
                          minHeight: heightPercent > 0 ? '4px' : '0',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.5s ease'
                        }}
                        className="chart-bar"
                     />
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--muted)' }}>{t.date}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 模型偏好占比 */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '2rem', fontSize: '1.1rem' }}>全班模型偏好</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stats.modelUsage.length === 0 ? (
               <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>暂无数据</div>
            ) : (
               stats.modelUsage.map((m: any, idx: number) => {
                  const percent = (m.count / stats.totalGenerations) * 100;
                  return (
                     <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                           <span>{m.name}</span>
                           <span style={{ fontWeight: 500 }}>{m.count} 次</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--surface-cream-strong)', borderRadius: '4px', overflow: 'hidden' }}>
                           <div style={{ 
                              width: `${percent}%`, 
                              height: '100%', 
                              background: idx === 0 ? 'var(--primary)' : idx === 1 ? 'var(--accent-amber)' : 'var(--accent-teal)',
                              borderRadius: '4px'
                           }} />
                        </div>
                     </div>
                  );
               })
            )}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>最新创作动态</h2>
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
         {history.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>暂无生成记录</div>
         ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead>
                  <tr style={{ borderBottom: '1px solid var(--hairline)', background: 'var(--surface-soft)' }}>
                     <th style={{ padding: '16px 24px', color: 'var(--muted)', fontWeight: 500, width: '15%' }}>学生</th>
                     <th style={{ padding: '16px 24px', color: 'var(--muted)', fontWeight: 500, width: '20%' }}>模型</th>
                     <th style={{ padding: '16px 24px', color: 'var(--muted)', fontWeight: 500, width: '45%' }}>提示词</th>
                     <th style={{ padding: '16px 24px', color: 'var(--muted)', fontWeight: 500, width: '20%' }}>时间</th>
                  </tr>
               </thead>
               <tbody>
                  {history.slice(0, 5).map((item: any) => (
                     <tr key={item.id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                        <td style={{ padding: '16px 24px', fontWeight: 500 }}>{item.user?.displayName}</td>
                        <td style={{ padding: '16px 24px' }}>
                           <span style={{ padding: '4px 8px', background: 'var(--surface-cream-strong)', borderRadius: '6px', fontSize: '13px' }}>
                              {item.model?.name}
                           </span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                           <div style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px' }} title={item.prompt}>
                              {item.prompt}
                           </div>
                        </td>
                        <td style={{ padding: '16px 24px', color: 'var(--muted)', fontSize: '14px' }}>{new Date(item.createdAt).toLocaleString()}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         )}
         {history.length > 5 && (
            <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid var(--hairline)', background: 'var(--surface-soft)' }}>
               <Link href="/teacher/history" style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
                  查看完整记录 →
               </Link>
            </div>
         )}
      </div>

      <style jsx>{`
        .chart-bar-container {
           cursor: pointer;
        }
        .chart-bar-container:hover .chart-bar {
           opacity: 0.8;
        }
        .tooltip {
           position: absolute;
           top: -30px;
           background: var(--surface-dark);
           color: var(--on-dark);
           padding: 4px 8px;
           border-radius: 6px;
           font-size: 12px;
           opacity: 0;
           transition: opacity 0.2s;
           pointer-events: none;
           white-space: nowrap;
        }
        .chart-bar-container:hover .tooltip {
           opacity: 1;
        }
      `}</style>
    </div>
  );
}
