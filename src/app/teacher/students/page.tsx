'use client';

import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StudentsPage() {
  const { data: response, isLoading, mutate } = useSWR('/api/students', fetcher);
  const students = response?.data || [];

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', displayName: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setIsAdding(false);
      setFormData({ username: '', password: '', displayName: '' });
      mutate();
    } else {
      const data = await res.json();
      alert(data.error || '添加失败');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
         <h1>学生管理</h1>
         <button className="btn btn-primary" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? '取消' : '添加学生'}
         </button>
      </div>

      {isAdding && (
         <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>添加新学生</h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
               <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>学号/账号</label>
                  <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} style={{ width: '100%' }} />
               </div>
               <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>姓名</label>
                  <input required value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} style={{ width: '100%' }} />
               </div>
               <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>密码</label>
                  <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={{ width: '100%' }} />
               </div>
               <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>保存</button>
            </form>
         </div>
      )}

      <div className="glass-panel">
         {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>加载中...</div>
         ) : students.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>暂无学生，请先添加</div>
         ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                     <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>账号</th>
                     <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>姓名</th>
                     <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>加入时间</th>
                     <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>生成次数</th>
                  </tr>
               </thead>
               <tbody>
                  {students.map((student: any) => (
                     <tr key={student.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <td style={{ padding: '1rem' }}>{student.username}</td>
                        <td style={{ padding: '1rem' }}>{student.displayName}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{new Date(student.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem' }}>{student._count.generations}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         )}
      </div>
    </div>
  );
}
