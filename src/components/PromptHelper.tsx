'use client';

import useSWR from 'swr';
import './PromptHelper.css';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface PromptHelperProps {
  onSelectTemplate: (template: string) => void;
  onClose: () => void;
}

export default function PromptHelper({ onSelectTemplate, onClose }: PromptHelperProps) {
  const { data } = useSWR('/api/templates', fetcher);
  const templates = data?.data || [];

  return (
    <div className="ph-overlay">
      <div className="ph-modal">
        <div className="ph-header">
          <h2 className="ph-title">
            <span>📝</span> 提示词模板库
          </h2>
          <button onClick={onClose} className="ph-close">✕</button>
        </div>
        
        <div className="ph-content">
          {templates.length === 0 ? (
            <div className="ph-empty">
              老师尚未发布任何模板
            </div>
          ) : (
            <div className="ph-grid">
              {templates.map((t: any) => (
                <div key={t.id} className="ph-card">
                  <div className="ph-card-header">
                    <h3 className="ph-card-title">{t.title}</h3>
                    {t.category && <span className="ph-badge">{t.category}</span>}
                  </div>
                  <p className="ph-desc">{t.description}</p>
                  
                  <div className="ph-template">
                    {t.template.split(/(\{.*?\})/).map((part: string, i: number) => 
                      part.startsWith('{') && part.endsWith('}') ? 
                        <span key={i} className="ph-var">{part}</span> : 
                        part
                    )}
                  </div>
                  
                  <button 
                    onClick={() => {
                      onSelectTemplate(t.template);
                      onClose();
                    }}
                    className="ph-btn-use"
                  >
                    使用此模板
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
