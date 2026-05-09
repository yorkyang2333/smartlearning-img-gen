'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import styles from './student.module.css';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
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
            href="/student/generate" 
            className={`${styles.navItem} ${pathname === '/student/generate' ? styles.active : ''}`}
          >
            图片生成
          </Link>
          <Link 
            href="/student/gallery" 
            className={`${styles.navItem} ${pathname === '/student/gallery' ? styles.active : ''}`}
          >
            个人画廊
          </Link>
        </nav>

        <div className={styles.userProfile}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{session?.user?.name || session?.user?.username}</span>
            <span className={styles.userRole}>学生</span>
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
