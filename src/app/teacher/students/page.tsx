'use client';

import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StudentsPage() {
  const { data: response, isLoading, mutate } = useSWR('/api/students', fetcher);
  const students = response?.data || [];

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', displayName: '' });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ displayName: '', password: '', isActive: true });
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleEdit = (student: any) => {
    setEditingId(student.id);
    setEditData({ displayName: student.displayName, password: '', isActive: student.isActive ?? true });
  };

  const handleSaveEdit = async (id: string) => {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData)
    });
    if (res.ok) {
      setEditingId(null);
      mutate();
    } else {
      const data = await res.json();
      alert(data.error || '修改失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('警告：您即将删除该学生。这将同时硬删除其所有生图记录和历史对话！此操作不可恢复。确定要删除吗？')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        mutate();
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } finally {
      setIsDeleting(false);
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
                     <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>状态</th>
                     <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>加入时间</th>
                     <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>生成次数</th>
                     <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>操作</th>
                  </tr>
               </thead>
               <tbody>
                  {students.map((student: any) => (
                     <tr key={student.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: editingId === student.id ? 'var(--surface-cream-strong)' : 'transparent' }}>
                        <td style={{ padding: '1rem' }}>{student.username}</td>
                        <td style={{ padding: '1rem' }}>
                           {editingId === student.id ? (
                              <input 
                                 value={editData.displayName} 
                                 onChange={e => setEditData({...editData, displayName: e.target.value})} 
                                 style={{ padding: '0.4rem', width: '120px' }}
                              />
                           ) : (
                              student.displayName
                           )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                           {editingId === student.id ? (
                              <select 
                                 value={editData.isActive ? 'true' : 'false'}
                                 onChange={e => setEditData({...editData, isActive: e.target.value === 'true'})}
                                 style={{ padding: '0.4rem' }}
                              >
                                 <option value="true">正常</option>
                                 <option value="false">已停用</option>
                              </select>
                           ) : (
                              <span style={{ 
                                 padding: '4px 8px', 
                                 borderRadius: '12px', 
                                 fontSize: '12px',
                                 background: student.isActive !== false ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                 color: student.isActive !== false ? '#15803d' : '#b91c1c'
                              }}>
                                 {student.isActive !== false ? '正常' : '已停用'}
                              </span>
                           )}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{new Date(student.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem' }}>{student._count.generations}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                           {editingId === student.id ? (
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                 <input 
                                    type="password" 
                                    placeholder="留空不改密码" 
                                    value={editData.password} 
                                    onChange={e => setEditData({...editData, password: e.target.value})}
                                    style={{ padding: '0.4rem', width: '120px', fontSize: '0.8rem' }}
                                 />
                                 <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => handleSaveEdit(student.id)}>保存</button>
                                 <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => setEditingId(null)}>取消</button>
                              </div>
                           ) : (
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                 <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => handleEdit(student)}>编辑</button>
                                 <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', color: 'var(--error)' }} onClick={() => handleDelete(student.id)} disabled={isDeleting}>删除</button>
                              </div>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         )}
      </div>
    </div>
  );
}
