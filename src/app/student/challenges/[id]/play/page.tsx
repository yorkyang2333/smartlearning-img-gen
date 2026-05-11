'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Image from 'next/image';
import './play.css';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ChallengePlayPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data: challengeData } = useSWR(`/api/challenges/${id}`, fetcher, { refreshInterval: 3000 });
  const { data: modelsData } = useSWR('/api/student-models', fetcher);
  
  const challenge = challengeData?.data;
  const models = modelsData?.data || [];
  const activeModel = models.find((m: any) => m.type === 'TEXT_TO_IMAGE' || m.type === 'BOTH');

  const [prompt, setPrompt] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedEntry, setSubmittedEntry] = useState<any>(null);

  // Parse keywords
  const keywords = challenge?.keywords ? JSON.parse(challenge.keywords) : [];

  useEffect(() => {
    if (challenge && challenge.status === 'ACTIVE' && challenge.startedAt) {
      const endTime = new Date(challenge.startedAt).getTime() + challenge.durationMin * 60 * 1000;
      
      const timer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          clearInterval(timer);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [challenge]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setErrorMsg('');

    // Keyword validation
    for (const kw of keywords) {
      if (!prompt.toLowerCase().includes(kw.toLowerCase())) {
        setErrorMsg(`必须包含关键词: "${kw}"`);
        return;
      }
    }

    setIsGenerating(true);
    try {
      // 1. Generate image
      const genRes = await fetch('/api/generate/text-to-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          modelId: activeModel?.modelId,
          size: '1024x1024',
          n: 1
        })
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || '生成失败');

      // 2. Submit entry
      const subRes = await fetch(`/api/challenges/${id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId: genData.data.id })
      });
      const subData = await subRes.json();
      if (!subRes.ok) throw new Error(subData.error || '提交失败');

      setSubmittedEntry(genData.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!challenge) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-dark)' }}>加载中...</div>;

  const isEnded = challenge.status === 'ENDED' || timeLeft === 0;

  return (
    <div className="play-container">
      <div className="play-header">
        <div>
          <h1 className="play-title">
            <span style={{ color: 'var(--primary)' }}>⚡</span> {challenge.title}
          </h1>
          <p className="play-subtitle">主题：{challenge.theme}</p>
        </div>
        <div className="play-status-panel">
          {keywords.length > 0 && (
            <div className="play-req-box">
              <span className="play-req-label">必须包含:</span>
              {keywords.map((k: string) => (
                <span key={k} className="play-req-tag">{k}</span>
              ))}
            </div>
          )}
          <div className={`play-timer ${timeLeft !== null && timeLeft < 60 ? 'play-timer-danger' : ''}`}>
            ⏱️ {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
        </div>
      </div>

      <div className="play-main">
        {submittedEntry ? (
          <div className="play-success-card">
            <h2 className="play-success-title">🎉 作品提交成功！</h2>
            <div className="play-img-preview">
              <Image src={submittedEntry.outputImageUrl} alt="My submission" fill style={{ objectFit: 'cover' }} />
            </div>
            <p className="play-success-text">请观看教室大屏幕，欣赏全班的作品展播。</p>
            <button onClick={() => router.push('/student/challenges')} className="btn play-link">
              返回挑战列表
            </button>
          </div>
        ) : (
          <div className="play-card">
            {isEnded ? (
              <div className="play-card-ended">
                <h2 className="play-ended-title">挑战已结束</h2>
                <p style={{ color: 'var(--on-dark-soft)', marginBottom: '1.5rem' }}>时间已到或老师已停止挑战。</p>
                <button onClick={() => router.push('/student/challenges')} className="btn btn-secondary">
                  返回列表
                </button>
              </div>
            ) : (
              <>
                <span className="play-label">开始你的创作：</span>
                <textarea
                  className="play-textarea"
                  rows={5}
                  placeholder="发挥你的想象力..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  disabled={isGenerating}
                />
                
                {errorMsg && (
                  <div className="play-error">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="play-btn-submit"
                >
                  {isGenerating ? '正在生成并提交...' : '🚀 生成并提交最终作品'}
                </button>
                <p className="play-tip">
                  注意：挑战模式下只有一次生成机会，生成即提交。
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
