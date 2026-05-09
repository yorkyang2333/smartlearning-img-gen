'use client';

import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TeacherHistoryChatPage() {
  // Use a fast refresh interval to simulate real-time
  const { data: response, isLoading } = useSWR('/api/history', fetcher, { refreshInterval: 3000 });
  const history = response?.data || [];
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const getValidImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `data:image/png;base64,${url}`;
  };

  // Group history by student
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

  // If we have students but none selected, select the first one
  if (studentsList.length > 0 && !selectedStudentId) {
    setSelectedStudentId(studentsList[0].id);
  }

  // Sort selected student items chronologically (oldest first for chat view)
  const chatItems = selectedStudent ? [...selectedStudent.items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [];

  if (isLoading && history.length === 0) return <div style={{ padding: '24px' }}>数据同步中...</div>;

  return (
    <div className="dual-pane-layout">
      {/* Left Sidebar: Student List */}
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

      {/* Right Canvas: Chat Viewer */}
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
                  
                  {/* User Prompt Message */}
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

                  {/* Agent Response Message */}
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

      <style jsx>{`
        .dual-pane-layout {
          display: flex;
          height: calc(100vh - 96px); /* accounting for main-content padding */
          gap: 24px;
        }

        .students-list-pane {
          width: 280px;
          background: var(--surface-card);
          border-radius: var(--radius-lg);
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .pane-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          color: var(--ink);
          margin-bottom: 24px;
          padding: 0 8px;
        }

        .empty-text {
          color: var(--muted);
          padding: 0 8px;
          font-size: 14px;
        }

        .students-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
        }

        .student-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: var(--radius-md);
          background: transparent;
          transition: background 0.2s;
          text-align: left;
        }

        .student-item:hover {
          background: rgba(20,20,19,0.04);
        }

        .student-item.active {
          background: var(--canvas);
          box-shadow: 0 2px 8px rgba(20,20,19,0.04);
        }

        .student-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          font-size: 14px;
        }

        .student-info {
          flex: 1;
        }

        .student-name {
          font-weight: 500;
          color: var(--ink);
          font-size: 14px;
        }

        .student-meta {
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
        }

        .chat-viewer-pane {
          flex: 1;
          background: var(--canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .chat-header {
          padding: 16px 24px;
          border-bottom: 1px solid var(--hairline);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(250, 249, 245, 0.9);
          backdrop-filter: blur(8px);
          z-index: 10;
        }

        .chat-header h3 {
          font-size: 16px;
          font-weight: 500;
          margin: 0;
          font-family: var(--font-inter);
          color: var(--ink);
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--accent-teal);
          font-family: 'JetBrains Mono', monospace;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-teal);
          animation: pulse 1.5s infinite;
        }

        .messages-list {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .message-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message-row {
          display: flex;
          gap: 16px;
        }

        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: var(--surface-card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink);
          flex-shrink: 0;
        }

        .user-avatar-placeholder {
          font-weight: 500;
        }

        .message-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .message-sender {
          font-weight: 600;
          font-size: 14px;
          color: var(--ink);
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .time-meta {
          font-weight: 400;
          font-size: 12px;
          color: var(--muted);
        }

        .bubble {
          font-size: 15px;
          line-height: 1.6;
          color: var(--ink);
        }

        .bubble-user {
          background: var(--surface-card);
          padding: 12px 16px;
          border-radius: var(--radius-lg);
          border-top-left-radius: 4px;
          display: inline-block;
          max-width: fit-content;
        }

        .bubble-meta {
          font-size: 11px;
          color: var(--muted);
          margin-top: 8px;
          border-top: 1px solid var(--hairline);
          padding-top: 6px;
        }

        .image-result-card {
          margin-top: 4px;
          background: var(--surface-dark);
          padding: 16px;
          border-radius: var(--radius-lg);
          display: inline-block;
          max-width: fit-content;
        }

        .generated-image {
          max-width: 100%;
          border-radius: var(--radius-md);
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--muted);
        }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
