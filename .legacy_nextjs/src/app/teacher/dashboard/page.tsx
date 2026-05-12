'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MONITOR'>('OVERVIEW');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const { data: analyticsRes, isLoading: analyticsLoading } = useSWR('/api/analytics/teacher', fetcher);
  const { data: historyRes, isLoading: historyLoading } = useSWR('/api/history', fetcher, { refreshInterval: 3000 });

  const stats = analyticsRes?.data;
  const history = historyRes?.data || [];

  const getValidImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `data:image/png;base64,${url}`;
  };

  // Group history by student (for MONITOR view)
  const studentsMap = new Map<string, { id: string, name: string, items: any[] }>();
  history.forEach((item: any) => {
    const sId = item.user?.id || 'unknown';
    const sName = item.user?.displayName || '未知学生';
    if (!studentsMap.has(sId)) {
      studentsMap.set(sId, { id: sId, name: sName, items: [] });
    }
    studentsMap.get(sId)!.items.push(item);
  });
  const studentsList = Array.from(studentsMap.values());
  const selectedStudent = selectedStudentId ? studentsMap.get(selectedStudentId) : null;
  if (studentsList.length > 0 && !selectedStudentId) {
    setSelectedStudentId(studentsList[0].id);
  }
  const chatItems = selectedStudent ? [...selectedStudent.items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [];

  if (analyticsLoading || historyLoading) return <div style={{ padding: '48px', color: 'var(--muted)' }}>加载中...</div>;
  if (!stats) return <div style={{ padding: '48px', color: 'var(--error)' }}>无法加载数据</div>;

  const maxTrend = Math.max(...stats.dailyTrend.map((t: any) => t.count), 1);

  return (
    <div style={{ maxWidth: activeTab === 'OVERVIEW' ? '1200px' : '100%', margin: '0 auto', paddingBottom: 64, height: activeTab === 'MONITOR' ? 'calc(100vh - 64px)' : 'auto' }}>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>工作台</h1>
          <p style={{ color: 'var(--muted)' }}>全班数据与最新创作概览</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
           <Link href="/teacher/live" target="_blank" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              📺 课堂大屏
           </Link>
           <div style={{ display: 'flex', background: 'var(--surface-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)' }}>
              <button 
                onClick={() => setActiveTab('OVERVIEW')}
                style={{ padding: '6px 16px', border: 'none', background: activeTab === 'OVERVIEW' ? 'var(--canvas)' : 'transparent', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, color: activeTab === 'OVERVIEW' ? 'var(--ink)' : 'var(--muted)', boxShadow: activeTab === 'OVERVIEW' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}
              >数据概览</button>
              <button 
                onClick={() => setActiveTab('MONITOR')}
                style={{ padding: '6px 16px', border: 'none', background: activeTab === 'MONITOR' ? 'var(--canvas)' : 'transparent', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, color: activeTab === 'MONITOR' ? 'var(--ink)' : 'var(--muted)', boxShadow: activeTab === 'MONITOR' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}
              >生成监控</button>
           </div>
        </div>
      </div>
      
      {activeTab === 'OVERVIEW' ? (
         <>
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
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderTop: '1px dashed var(--hairline)', zIndex: 0 }}></div>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed var(--hairline)', zIndex: 0 }}></div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid var(--hairline)', zIndex: 0 }}></div>
                
                {stats.dailyTrend.map((t: any, idx: number) => {
                  const heightPercent = (t.count / maxTrend) * 100;
                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', height: '100%', alignItems: 'flex-end', position: 'relative', group: 'true' }} className="chart-bar-container">
                        <div className="tooltip">{t.count} 次</div>
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
                  <button onClick={() => setActiveTab('MONITOR')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 500, fontSize: '14px' }}>
                      查看完整记录 →
                  </button>
                </div>
            )}
          </div>
         </>
      ) : (
         <div className="dual-pane-layout">
            <div className="students-list-pane">
               <h2 className="pane-title">活跃学生对话</h2>
               {studentsList.length === 0 ? (
               <div className="empty-text">暂无生成记录</div>
               ) : (
               <div className="students-list">
                  {studentsList.map((student) => (
                     <button 
                     key={student.id}
                     className={`student-item ${selectedStudentId === student.id ? 'active' : ''}`}
                     onClick={() => setSelectedStudentId(student.id)}
                     >
                     <div className="student-avatar">{student.name.charAt(0).toUpperCase()}</div>
                     <div className="student-info">
                        <div className="student-name">{student.name}</div>
                        <div className="student-meta">{student.items.length} 条对话</div>
                     </div>
                     </button>
                  ))}
               </div>
               )}
            </div>

            <div className="chat-viewer-pane">
               {selectedStudent ? (
               <div className="chat-container">
                  <div className="chat-header">
                     <h3>与 {selectedStudent.name} 的对话记录</h3>
                     <div className="live-indicator"><span className="pulse-dot"></span> 实时同步中</div>
                  </div>
                  
                  <div className="messages-list">
                     {chatItems.map((item: any) => (
                     <div key={item.id} className="message-group">
                        <div className="message-row user">
                           <div className="message-avatar">
                           <div className="user-avatar-placeholder">{selectedStudent.name.charAt(0).toUpperCase()}</div>
                           </div>
                           <div className="message-content">
                           <div className="message-sender">{selectedStudent.name} <span className="time-meta">{new Date(item.createdAt).toLocaleTimeString()}</span></div>
                           <div className="bubble bubble-user">
                              {item.prompt}
                              <div className="bubble-meta">模型: {item.model?.name}</div>
                           </div>
                           </div>
                        </div>

                        <div className="message-row agent">
                           <div className="message-avatar">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                           </div>
                           <div className="message-content">
                           <div className="message-sender">AI 助手</div>
                           <div className="image-result-card">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={getValidImageUrl(item.outputImageUrl)} alt="Generated" className="generated-image" />
                           </div>
                           </div>
                        </div>
                     </div>
                     ))}
                  </div>
               </div>
               ) : (
               <div className="empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)', marginBottom: '16px' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <p>选择左侧学生以查看实时对话记录</p>
               </div>
               )}
            </div>
         </div>
      )}

      <style jsx>{`
        .chart-bar-container { cursor: pointer; }
        .chart-bar-container:hover .chart-bar { opacity: 0.8; }
        .tooltip {
           position: absolute; top: -30px; background: var(--surface-dark); color: var(--on-dark);
           padding: 4px 8px; border-radius: 6px; font-size: 12px; opacity: 0; transition: opacity 0.2s; pointer-events: none; white-space: nowrap;
        }
        .chart-bar-container:hover .tooltip { opacity: 1; }

        .dual-pane-layout { display: flex; height: calc(100vh - 180px); gap: 24px; }
        .students-list-pane { width: 280px; background: var(--surface-card); border-radius: var(--radius-lg); padding: 24px 16px; display: flex; flex-direction: column; flex-shrink: 0; }
        .pane-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; color: var(--ink); margin-bottom: 24px; padding: 0 8px; }
        .empty-text { color: var(--muted); padding: 0 8px; font-size: 14px; }
        .students-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
        .student-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: var(--radius-md); background: transparent; transition: background 0.2s; text-align: left; border: none; cursor: pointer; }
        .student-item:hover { background: rgba(20,20,19,0.04); }
        .student-item.active { background: var(--canvas); box-shadow: 0 2px 8px rgba(20,20,19,0.04); }
        .student-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 500; font-size: 14px; }
        .student-info { flex: 1; }
        .student-name { font-weight: 500; color: var(--ink); font-size: 14px; }
        .student-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .chat-viewer-pane { flex: 1; background: var(--canvas); border: 1px solid var(--hairline); border-radius: var(--radius-lg); display: flex; flex-direction: column; overflow: hidden; }
        .chat-container { display: flex; flex-direction: column; height: 100%; }
        .chat-header { padding: 16px 24px; border-bottom: 1px solid var(--hairline); display: flex; justify-content: space-between; align-items: center; background: rgba(250, 249, 245, 0.9); backdrop-filter: blur(8px); z-index: 10; }
        .chat-header h3 { font-size: 16px; font-weight: 500; margin: 0; font-family: var(--font-inter); color: var(--ink); }
        .live-indicator { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--accent-teal); font-family: 'JetBrains Mono', monospace; }
        .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-teal); animation: pulse 1.5s infinite; }
        .messages-list { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 32px; }
        .message-group { display: flex; flex-direction: column; gap: 16px; }
        .message-row { display: flex; gap: 16px; }
        .message-avatar { width: 36px; height: 36px; border-radius: var(--radius-sm); background: var(--surface-card); display: flex; align-items: center; justify-content: center; color: var(--ink); flex-shrink: 0; }
        .user-avatar-placeholder { font-weight: 500; }
        .message-content { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .message-sender { font-weight: 600; font-size: 14px; color: var(--ink); display: flex; align-items: baseline; gap: 8px; }
        .time-meta { font-weight: 400; font-size: 12px; color: var(--muted); }
        .bubble { font-size: 15px; line-height: 1.6; color: var(--ink); }
        .bubble-user { background: var(--surface-card); padding: 12px 16px; border-radius: var(--radius-lg); border-top-left-radius: 4px; display: inline-block; max-width: fit-content; }
        .bubble-meta { font-size: 11px; color: var(--muted); margin-top: 8px; border-top: 1px solid var(--hairline); padding-top: 6px; }
        .image-result-card { margin-top: 4px; background: var(--surface-dark); padding: 16px; border-radius: var(--radius-lg); display: inline-block; max-width: fit-content; }
        .generated-image { max-width: 100%; border-radius: var(--radius-md); }
        .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--muted); }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
