'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import styles from '../student/student.module.css'; // Reuse student sidebar styles for now

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="dashboard-layout">
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <h2>SmartLearning AI</h2>
        </div>
        
        <nav className={styles.nav}>
          <Link 
            href="/teacher/dashboard" 
            className={`${styles.navItem} ${pathname === '/teacher/dashboard' ? styles.active : ''}`}
          >
            工作台
          </Link>
          <Link 
            href="/teacher/assignments" 
            className={`${styles.navItem} ${pathname.startsWith('/teacher/assignments') ? styles.active : ''}`}
          >
            📋 教学任务
          </Link>
          <Link 
            href="/teacher/students" 
            className={`${styles.navItem} ${pathname === '/teacher/students' ? styles.active : ''}`}
          >
            学生管理
          </Link>
          <Link 
            href="/teacher/models" 
            className={`${styles.navItem} ${pathname === '/teacher/models' ? styles.active : ''}`}
          >
            模型管理
          </Link>
          <Link 
            href="/teacher/history" 
            className={`${styles.navItem} ${pathname === '/teacher/history' ? styles.active : ''}`}
          >
            生成记录
          </Link>
          <Link 
            href="/teacher/live" 
            className={`${styles.navItem} ${pathname === '/teacher/live' ? styles.active : ''}`}
          >
            📺 课堂直播
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
          >
            退出登录
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
