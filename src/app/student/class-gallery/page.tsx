'use client';

import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ClassGalleryPage() {
  const { data: response, isLoading, mutate } = useSWR('/api/class-gallery', fetcher);
  const gallery = response?.data || [];
  
  const [togglingLike, setTogglingLike] = useState<string | null>(null);

  const getValidImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `data:image/png;base64,${url}`;
  };

  const handleToggleLike = async (genId: string) => {
    setTogglingLike(genId);
    try {
       const res = await fetch(`/api/class-gallery/${genId}/like`, { method: 'POST' });
       if (res.ok) {
          // 乐观更新或重拉数据
          mutate();
       }
    } finally {
       setTogglingLike(null);
    }
  };

  if (isLoading) return <div style={{ padding: '48px', color: 'var(--muted)' }}>加载中...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '64px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1>班级画廊</h1>
        <p style={{ color: 'var(--muted)' }}>在这里欣赏全班同学的精彩作品，互相学习提示词技巧。</p>
      </div>
      
      {gallery.length === 0 ? (
         <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            暂无班级作品，快去创作吧！
         </div>
      ) : (
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {gallery.map((item: any) => (
               <div key={item.id} className="glass-panel gallery-card">
                  <div className="image-container">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img 
                        src={getValidImageUrl(item.outputImageUrl)} 
                        alt={item.prompt}
                        className="gallery-image"
                     />
                  </div>
                  <div style={{ padding: '1.2rem' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1, paddingRight: '12px' }}>
                           <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'var(--ink)' }}>{item.user?.displayName}</h4>
                           <span style={{ fontSize: '0.8rem', color: 'var(--muted)', background: 'var(--surface-cream-strong)', padding: '2px 6px', borderRadius: '4px' }}>
                              {item.model?.name}
                           </span>
                        </div>
                        <button 
                           className={`like-button ${item.hasLiked ? 'liked' : ''}`}
                           onClick={() => handleToggleLike(item.id)}
                           disabled={togglingLike === item.id}
                        >
                           <span className="heart-icon">{item.hasLiked ? '❤️' : '🤍'}</span>
                           <span className="like-count">{item.likeCount}</span>
                        </button>
                     </div>
                     <p className="prompt-text" title={item.prompt}>
                        {item.prompt}
                     </p>
                  </div>
               </div>
            ))}
         </div>
      )}

      <style jsx>{`
         .gallery-card {
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: transform 0.2s, box-shadow 0.2s;
         }
         .gallery-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0,0,0,0.08);
         }
         .image-container {
            aspect-ratio: 1;
            background-color: var(--surface-soft);
            position: relative;
            overflow: hidden;
         }
         .gallery-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
         }
         .gallery-card:hover .gallery-image {
            transform: scale(1.05);
         }
         .prompt-text {
            font-size: 0.85rem;
            color: var(--body);
            line-height: 1.5;
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
         }
         .like-button {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--surface-card);
            border: 1px solid var(--hairline);
            border-radius: 99px;
            padding: 4px 10px;
            cursor: pointer;
            transition: all 0.2s;
         }
         .like-button:hover {
            background: var(--surface-cream-strong);
            transform: scale(1.05);
         }
         .like-button.liked {
            background: rgba(204, 120, 92, 0.1);
            border-color: rgba(204, 120, 92, 0.3);
            color: var(--primary);
         }
         .heart-icon {
            font-size: 1.1rem;
            line-height: 1;
         }
         .like-count {
            font-weight: 500;
            font-size: 0.9rem;
         }
      `}</style>
    </div>
  );
}
