'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HistoryPage() {
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
      <h1>全班生成记录</h1>
      
      {history.length === 0 ? (
         <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            暂无生成记录
         </div>
      ) : (
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {history.map((item: any) => (
               <div key={item.id} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ aspectRatio: '1', backgroundColor: '#f3f4f6', position: 'relative' }}>
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img 
                        src={getValidImageUrl(item.outputImageUrl)} 
                        alt={item.prompt}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                     />
                  </div>
                  <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 500, color: 'var(--primary-color)' }}>{item.user?.displayName}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                           {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                     </div>
                     <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-main)', flex: 1 }}>
                        {item.prompt}
                     </p>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                        <span>{item.model?.name}</span>
                        <span>{item.type === 'TEXT_TO_IMAGE' ? '文生图' : '图生图'}</span>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      )}
    </div>
  );
}
