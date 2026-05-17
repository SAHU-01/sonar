/**
 * StarRating: interactive star rating component.
 * Supports configurable max (1-10), hover preview, click to set.
 */
'use client';

import { useState } from 'react';

interface StarRatingProps {
  max: number;
  value?: number;
  onChange: (value: number) => void;
}

export function StarRating({ max, value, onChange }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-1.5" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1;
          const filled = starValue <= (hover || value || 0);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(starValue)}
              onMouseEnter={() => setHover(starValue)}
              className={`text-4xl transition-all hover:scale-110 active:scale-95 ${filled ? 'text-warning drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'opacity-10 grayscale hover:opacity-50'}`}
            >
              {'\u2605'}
            </button>
          );
        })}
      </div>
      {value ? (
        <div className="neo-card bg-cta px-4 py-1.5 text-sm font-black text-cta-foreground shadow-brutal-sm">
          {value} <span className="opacity-30">/ {max}</span>
        </div>
      ) : null}
    </div>
  );
}
