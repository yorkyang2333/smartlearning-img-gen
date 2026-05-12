'use client';

import useSWR from 'swr';
import { useState } from 'react';
import './PromptHelper.css';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface PromptHelperProps {
  onSelectTemplate: (template: string) => void;
  onClose: () => void;
}

export default function PromptHelper({ onSelectTemplate, onClose }: PromptHelperProps) {
  const { data } = useSWR('/api/templates', fetcher);
  const templates = data?.data || [];

  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  const handleSelectTemplate = (t: any) => {
    // 提取所有被 {} 包裹的变量
    const matches = t.template.match(/\{([^}]+)\}/g);
    if (matches && matches.length > 0) {
      const initialVars: Record<string, string> = {};
      matches.forEach((m: string) => {
        initialVars[m] = '';
      });
      setVariables(initialVars);
      setActiveTemplate(t);
    } else {
      // 没有变量直接使用
      onSelectTemplate(t.template);
      onClose();
    }
  };

  const handleConfirm = () => {
    let finalPrompt = activeTemplate.template;
    for (const key in variables) {
       // 如果未填写，保留原本的 {} 占位符或替换为空
       const val = variables[key].trim() || key; 
       finalPrompt = finalPrompt.replaceAll(key, val);
    }
    onSelectTemplate(finalPrompt);
    onClose();
  };

  return (
    <div className="ph-overlay">
      <div className="ph-modal">
        <div className="ph-header">
          <h2 className="ph-title">
            {activeTemplate ? (
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <button onClick={() => setActiveTemplate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: 0 }}>←</button>
                 <span>填写模板</span>
               </div>
            ) : (
               <span><span>📝</span> 提示词模板库</span>
            )}
          </h2>
          <button onClick={onClose} className="ph-close">✕</button>
        </div>
        
        <div className="ph-content">
          {activeTemplate ? (
            <div className="ph-filler">
               <div className="ph-card" style={{ marginBottom: '16px' }}>
                 <h3 className="ph-card-title">{activeTemplate.title}</h3>
                 <p className="ph-desc">{activeTemplate.description}</p>
                 <div className="ph-template">
                    {activeTemplate.template.split(/(\{.*?\})/).map((part: string, i: number) => {
                      if (part.startsWith('{') && part.endsWith('}')) {
                         return <span key={i} className="ph-var highlight">{variables[part] || part}</span>;
                      }
                      return part;
                    })}
                 </div>
               </div>

               <div className="ph-vars-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                 {Object.keys(variables).map(vKey => {
                    const labelName = vKey.replace(/[{}]/g, '');
                    return (
                       <div key={vKey} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '14px', fontWeight: 500 }}>{labelName}</label>
                          <input 
                            type="text"
                            value={variables[vKey]}
                            onChange={e => setVariables({...variables, [vKey]: e.target.value})}
                            placeholder={`请输入 ${labelName}`}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--hairline)' }}
                          />
                       </div>
                    );
                 })}
               </div>

               <button className="ph-btn-use" onClick={handleConfirm} style={{ width: '100%', padding: '12px' }}>
                  完成并应用到输入框
               </button>
            </div>
          ) : templates.length === 0 ? (
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
                    onClick={() => handleSelectTemplate(t)}
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
