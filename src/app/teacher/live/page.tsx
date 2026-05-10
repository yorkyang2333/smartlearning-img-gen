'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import styles from './live.module.css';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function LiveScreen() {
  const { data, error } = useSWR('/api/live/feed', fetcher, { refreshInterval: 3000 });
  const [generations, setGenerations] = useState<any[]>([]);

  useEffect(() => {
    if (data?.success && data.data) {
       setGenerations(prev => {
          if (prev.length === 0) return data.data; // initial load

          const currentIds = new Set(prev.map(g => g.id));
          const newGens = data.data.filter((g: any) => !currentIds.has(g.id));
          if (newGens.length > 0) {
              return [...newGens, ...prev].slice(0, 50);
          }
          return prev;
       });
    }
  }, [data]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          📺 课堂大屏直播 <span className={styles.liveBadge}>LIVE</span>
        </h1>
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>全班已生成</span>
            <span className={styles.statValue}>{data?.totalCount || 0} 张</span>
          </div>
          <div className={styles.statItem}>
             <span className={styles.statLabel}>展示中</span>
             <span className={styles.statValue}>{generations.length} 张</span>
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        {generations.map(gen => (
          <div key={gen.id} className={styles.card}>
            <div className={styles.imageWrapper}>
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={gen.outputImageUrl} alt={gen.prompt} className={styles.image} />
            </div>
            <div className={styles.cardInfo}>
               <p className={styles.prompt}>{gen.prompt}</p>
               <div className={styles.meta}>
                  <span className={styles.author}>👤 {gen.user.displayName}</span>
                  <span className={styles.time}>{new Date(gen.createdAt).toLocaleTimeString()}</span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
