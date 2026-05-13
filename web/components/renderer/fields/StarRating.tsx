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
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= (hover || value || 0);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHover(starValue)}
            className={`text-2xl transition-colors ${filled ? 'text-amber-400' : 'text-muted-foreground/30 hover:text-amber-300'}`}
          >
            {'\u2605'}
          </button>
        );
      })}
      {value ? <span className="text-sm text-muted-foreground ml-2 self-center">{value}/{max}</span> : null}
    </div>
  );
}
