'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import useSWR, { mutate } from 'swr';
import styles from './student.module.css';
import { IconBrand, IconImageGen, IconAnalytics, IconGallery, IconClassGallery, IconClipboard, IconZap, IconLogout } from '@/components/Icons';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { data: convData, mutate: mutateConversations } = useSWR('/api/student/conversations', fetcher);
  const conversations = convData?.data || [];

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!confirm('确定要删除这个对话吗？')) return;
    
    await fetch(`/api/student/conversations/${id}`, { method: 'DELETE' });
    mutateConversations();
    if (pathname.includes(id)) {
      window.location.href = '/student/generate';
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        <button className={styles.collapseToggle} onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? "展开" : "折叠"}>
           {isCollapsed ? '▶' : '◀'}
        </button>

        <div className={styles.brand}>
          <div className={styles.brandTitle}>
            <span className={styles.brandIcon}><IconBrand /></span>
            <h2 className={styles.brandText}>SmartLearning</h2>
          </div>
        </div>
        
        <nav className={styles.nav}>
          <Link 
            href="/student/generate" 
            className={`${styles.navItem} ${pathname === '/student/generate' ? styles.active : ''}`}
            title={isCollapsed ? "图片生成" : ""}
          >
            <span className={styles.navIcon}><IconImageGen /></span>
            <span className={styles.navText}>图片生成</span>
          </Link>
          <Link 
            href="/student/dashboard" 
            className={`${styles.navItem} ${pathname === '/student/dashboard' ? styles.active : ''}`}
            title={isCollapsed ? "数据中心" : ""}
          >
            <span className={styles.navIcon}><IconAnalytics /></span>
            <span className={styles.navText}>数据中心</span>
          </Link>
          <Link 
            href="/student/gallery" 
            className={`${styles.navItem} ${pathname === '/student/gallery' ? styles.active : ''}`}
            title={isCollapsed ? "个人画廊" : ""}
          >
            <span className={styles.navIcon}><IconGallery /></span>
            <span className={styles.navText}>个人画廊</span>
          </Link>
          <Link 
            href="/student/class-gallery" 
            className={`${styles.navItem} ${pathname === '/student/class-gallery' ? styles.active : ''}`}
            title={isCollapsed ? "班级画廊" : ""}
          >
            <span className={styles.navIcon}><IconClassGallery /></span>
            <span className={styles.navText}>班级画廊</span>
          </Link>
          <Link 
            href="/student/assignments" 
            className={`${styles.navItem} ${pathname.startsWith('/student/assignments') ? styles.active : ''}`}
            title={isCollapsed ? "教学任务" : ""}
          >
            <span className={styles.navIcon}><IconClipboard /></span>
            <span className={styles.navText}>教学任务</span>
          </Link>
          <Link 
            href="/student/challenges" 
            className={`${styles.navItem} ${pathname.startsWith('/student/challenges') ? styles.active : ''}`}
            title={isCollapsed ? "创意挑战" : ""}
          >
            <span className={styles.navIcon}><IconZap /></span>
            <span className={styles.navText}>创意挑战</span>
          </Link>
        </nav>

        <div className={styles.sidebarSection}>
          <div className={styles.conversationsHeader}>
            <span>历史对话</span>
            <Link href="/student/generate" className={styles.newChatBtn} title="新对话">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </Link>
          </div>

          <div className={styles.conversationsList}>
            {conversations.map((chat: any) => (
              <Link 
                key={chat.id} 
                href={`/student/generate/${chat.id}`}
                className={`${styles.chatItem} ${pathname === `/student/generate/${chat.id}` ? styles.active : ''}`}
              >
                <span className={styles.chatItemText}>{chat.title}</span>
                <button className={styles.deleteBtn} onClick={(e) => handleDelete(e, chat.id)} title="删除">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.userProfile}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{session?.user?.name || session?.user?.username}</span>
            <span className={styles.userRole}>学生</span>
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })} 
            className={styles.logoutBtn}
            title="退出登录"
          >
            <span className={styles.logoutIcon}><IconLogout /></span>
            <span className={styles.logoutText}>退出登录</span>
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
