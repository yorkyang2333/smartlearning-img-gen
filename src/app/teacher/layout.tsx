'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import styles from '../student/student.module.css'; // Reuse student sidebar styles
import { IconBrand, IconDashboard, IconClipboard, IconUsers, IconSliders, IconFolder, IconZap, IconPen, IconSettings, IconMonitor, IconLogout } from '@/components/Icons';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
            href="/teacher/dashboard" 
            className={`${styles.navItem} ${pathname === '/teacher/dashboard' ? styles.active : ''}`}
            title={isCollapsed ? "工作台" : ""}
          >
            <span className={styles.navIcon}><IconDashboard /></span>
            <span className={styles.navText}>工作台</span>
          </Link>
          <Link 
            href="/teacher/assignments" 
            className={`${styles.navItem} ${pathname.startsWith('/teacher/assignments') ? styles.active : ''}`}
            title={isCollapsed ? "教学任务" : ""}
          >
            <span className={styles.navIcon}><IconClipboard /></span>
            <span className={styles.navText}>教学任务</span>
          </Link>
          <Link 
            href="/teacher/students" 
            className={`${styles.navItem} ${pathname === '/teacher/students' ? styles.active : ''}`}
            title={isCollapsed ? "学生管理" : ""}
          >
            <span className={styles.navIcon}><IconUsers /></span>
            <span className={styles.navText}>学生管理</span>
          </Link>
          <Link 
            href="/teacher/models" 
            className={`${styles.navItem} ${pathname === '/teacher/models' ? styles.active : ''}`}
            title={isCollapsed ? "模型管理" : ""}
          >
            <span className={styles.navIcon}><IconSliders /></span>
            <span className={styles.navText}>模型管理</span>
          </Link>
          <Link 
            href="/teacher/history" 
            className={`${styles.navItem} ${pathname === '/teacher/history' ? styles.active : ''}`}
            title={isCollapsed ? "生成记录" : ""}
          >
            <span className={styles.navIcon}><IconFolder /></span>
            <span className={styles.navText}>生成记录</span>
          </Link>
          <Link 
            href="/teacher/challenges" 
            className={`${styles.navItem} ${pathname.startsWith('/teacher/challenges') ? styles.active : ''}`}
            title={isCollapsed ? "创意挑战" : ""}
          >
            <span className={styles.navIcon}><IconZap /></span>
            <span className={styles.navText}>创意挑战</span>
          </Link>
          <Link 
            href="/teacher/templates" 
            className={`${styles.navItem} ${pathname === '/teacher/templates' ? styles.active : ''}`}
            title={isCollapsed ? "提示词模板" : ""}
          >
            <span className={styles.navIcon}><IconPen /></span>
            <span className={styles.navText}>提示词模板</span>
          </Link>
          <Link 
            href="/teacher/settings" 
            className={`${styles.navItem} ${pathname === '/teacher/settings' ? styles.active : ''}`}
            title={isCollapsed ? "系统设置" : ""}
          >
            <span className={styles.navIcon}><IconSettings /></span>
            <span className={styles.navText}>系统设置</span>
          </Link>
          <Link 
            href="/teacher/live" 
            className={`${styles.navItem} ${pathname === '/teacher/live' ? styles.active : ''}`}
            title={isCollapsed ? "课堂直播" : ""}
          >
            <span className={styles.navIcon}><IconMonitor /></span>
            <span className={styles.navText}>课堂直播</span>
          </Link>
        </nav>

        <div className={styles.userProfile}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{session?.user?.name || session?.user?.username}</span>
            <span className={styles.userRole}>教师</span>
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
