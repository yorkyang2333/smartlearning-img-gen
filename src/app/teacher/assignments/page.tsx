'use client';
import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function TeacherAssignmentsPage() {
  const { data, error, mutate } = useSWR('/api/assignments', fetcher);
  
  if (!data && !error) return <div style={{ padding: '48px', color: 'var(--muted)' }}>加载中...</div>;

  const assignments = data?.data || [];

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await fetch(`/api/assignments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentStatus })
    });
    mutate();
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 64 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1>教学任务</h1>
        <Link href="/teacher/assignments/new" className="btn btn-primary">
          + 发布新任务
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {assignments.map((assignment: any) => (
          <div key={assignment.id} className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, paddingRight: 24 }}>
                <h3 style={{ margin: 0, fontSize: 20 }}>
                  <Link href={`/teacher/assignments/${assignment.id}`} style={{ color: 'var(--ink)' }}>
                    {assignment.title}
                  </Link>
                </h3>
                <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: 14, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {assignment.description}
                </p>
                <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 13, color: 'var(--stone)' }}>
                   <span style={{ fontWeight: 500, color: 'var(--primary)' }}>已提交: {assignment._count.submissions} 份</span>
                   <span>状态: {assignment.isActive ? '🟢 进行中' : '⚪ 已结束'}</span>
                   <span>发布于: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 120 }}>
                 <Link href={`/teacher/assignments/${assignment.id}`} className="btn btn-primary" style={{ width: '100%' }}>
                    查看评阅
                 </Link>
                 <button 
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                    onClick={() => handleToggleActive(assignment.id, assignment.isActive)}
                 >
                    {assignment.isActive ? '结束任务' : '重新开启'}
                 </button>
              </div>
            </div>
          </div>
        ))}

        {assignments.length === 0 && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: 64, color: 'var(--muted)' }}>
             暂无任务，请点击右上角按钮发布新任务。
          </div>
        )}
      </div>
    </div>
  );
}
