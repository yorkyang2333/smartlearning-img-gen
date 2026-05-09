'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function GalleryPage() {
  const { data: response, isLoading } = useSWR('/api/history', fetcher);
  const history = response?.data || [];

  const getValidImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `data:image/png;base64,${url}`;
  };

  if (isLoading) return <div>加载中...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1>个人画廊</h1>
      
      {history.length === 0 ? (
         <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            暂无生成记录，快去创作吧！
         </div>
      ) : (
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {history.map((item: any) => (
               <div key={item.id} className="glass-panel" style={{ overflow: 'hidden' }}>
                  <div style={{ aspectRatio: '1', backgroundColor: '#f3f4f6', position: 'relative' }}>
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img 
                        src={getValidImageUrl(item.outputImageUrl)} 
                        alt={item.prompt}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                     />
                  </div>
                  <div style={{ padding: '1rem' }}>
                     <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.prompt}>
                        {item.prompt}
                     </p>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>{item.model?.name}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      )}
    </div>
  );
}
