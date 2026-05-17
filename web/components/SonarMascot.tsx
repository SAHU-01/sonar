/**
 * SonarMascot: a tiny cute robot face that tracks cursor and reacts to actions.
 * Small, minimal, not distracting. Neutral when idle (not smiling).
 */
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

export type MascotMood = 'idle' | 'happy' | 'working' | 'success' | 'error' | 'sleeping' | 'thinking';

interface SonarMascotProps {
  mood?: MascotMood;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const MESSAGES: Record<MascotMood, string[]> = {
  idle:     ['...', 'Hmm', 'Waiting'],
  happy:    ['Nice!', 'Cool!', 'Great!'],
  working:  ['Working...', 'Hold on...', 'Uploading...'],
  success:  ['Done!', 'Shipped!', 'Live!'],
  error:    ['Oops', 'Hmm...', 'Try again'],
  sleeping: ['zzZ', 'zzz', '...'],
  thinking: ['Hmm', '...', 'Thinking'],
};

export function SonarMascot({ mood = 'idle', size = 'md', message }: SonarMascotProps) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const msgs = MESSAGES[mood];

  useEffect(() => {
    setMsgIdx(Math.floor(Math.random() * msgs.length));
  }, [mood, msgs.length]);

  useEffect(() => {
    if (mood === 'sleeping') { setPupil({ x: 0, y: 1 }); return; }

    const onMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const m = Math.min(1.8, d / 150);
      setPupil({ x: (dx / d) * m, y: (dy / d) * m });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [mood]);

  const s = { sm: 36, md: 56, lg: 80 }[size];
  const ts = { sm: 'text-[8px]', md: 'text-[10px]', lg: 'text-[12px]' }[size];

  const borderColor = 'var(--border-strong)';
  const antennaColor = 
    mood === 'error' ? 'var(--destructive)' :
    mood === 'success' ? 'var(--success)' :
    mood === 'working' ? 'var(--warning)' :
    'var(--cta)';

  return (
    <div ref={ref} className="flex flex-col items-center gap-2" style={{ width: s }}>
      <svg viewBox="0 0 32 32" width={s} height={s}>
        {/* Body — rounded square with hard shadow */}
        <rect x="5" y="4" width="24" height="20" rx="4" fill="var(--card)" stroke={borderColor} strokeWidth="2" />
        <rect x="7" y="6" width="24" height="20" rx="4" fill={borderColor} opacity="0.1" />

        {/* Antenna */}
        <line x1="16" y1="4" x2="16" y2="1" stroke={borderColor} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="1" r="2" fill={antennaColor} stroke={borderColor} strokeWidth="1" />

        {mood === 'sleeping' ? (
          /* Sleeping — closed eyes */
          <>
            <line x1="10" y1="13" x2="14" y2="13" stroke="var(--foreground)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            <line x1="20" y1="13" x2="24" y2="13" stroke="var(--foreground)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          </>
        ) : (
          <>
            {/* Eyes — small dots with tracking pupils */}
            <circle cx={12 + pupil.x} cy={13 + pupil.y} r="3" fill="var(--foreground)" />
            <circle cx={22 + pupil.x} cy={13 + pupil.y} r="3" fill="var(--foreground)" />
            {/* Pupil highlights */}
            <circle cx={12 + pupil.x + 0.8} cy={13 + pupil.y - 0.8} r="0.8" fill="var(--card)" />
            <circle cx={22 + pupil.x + 0.8} cy={13 + pupil.y - 0.8} r="0.8" fill="var(--card)" />

            {/* Mouth — depends on mood */}
            {mood === 'idle' && (
              <line x1="14" y1="18" x2="18" y2="18" stroke="var(--foreground)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            )}
            {mood === 'happy' && (
              <path d="M12,17 Q16,21 20,17" fill="none" stroke="var(--foreground)" strokeWidth="1.5" strokeLinecap="round" />
            )}
            {mood === 'success' && (
              <path d="M12,17 Q16,21 20,17" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" />
            )}
            {mood === 'error' && (
              <path d="M13,19 Q16,16 19,19" fill="none" stroke="var(--destructive)" strokeWidth="1.5" strokeLinecap="round" />
            )}
            {mood === 'working' && (
              <line x1="14" y1="18" x2="18" y2="18" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" />
            )}
          </>
        )}

        {/* Legs / stand */}
        <rect x="12" y="24" width="3" height="4" fill={borderColor} />
        <rect x="17" y="24" width="3" height="4" fill={borderColor} />
      </svg>

      <p className={`${ts} font-black lowercase opacity-40 text-center leading-tight bg-card px-2 py-0.5 border-2 border-border-strong rounded shadow-brutal-sm`}>
        {message ?? msgs[msgIdx]}
      </p>
    </div>
  );
}

export function useMascotMood() {
  const [mood, setMood] = useState<MascotMood>('idle');
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      if (mood === 'sleeping') { setMood('idle'); setMessage(undefined); }
      timer = setTimeout(() => { setMood('sleeping'); setMessage(undefined); }, 30000);
    };
    const h = () => reset();
    window.addEventListener('mousemove', h);
    window.addEventListener('keydown', h);
    window.addEventListener('click', h);
    reset();
    return () => { clearTimeout(timer); window.removeEventListener('mousemove', h); window.removeEventListener('keydown', h); window.removeEventListener('click', h); };
  }, [mood]);

  const setMoodTemp = useCallback((m: MascotMood, msg?: string, dur = 3000) => {
    setMood(m); setMessage(msg);
    setTimeout(() => { setMood('idle'); setMessage(undefined); }, dur);
  }, []);

  return { mood, message, setMood, setMessage, setMoodTemp };
}
