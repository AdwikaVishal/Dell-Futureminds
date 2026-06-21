/**
 * CitationList — renders a row of CitationCards below a chat response.
 * Accepts citations directly from the API payload.
 * API schema: { answer: string; citations: string[] }
 * The parent resolves raw citation IDs → Citation objects before passing here.
 */
import React from 'react';
import type { Citation } from '../../types';
import { CitationCard } from './CitationCard';

interface CitationListProps {
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
  className?: string;
}

export const CitationList: React.FC<CitationListProps> = ({
  citations,
  onCitationClick,
  className,
}) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className={className}>
      <span className="text-[9px] text-slate-600 uppercase tracking-widest font-medium block mb-1.5">
        Evidence
      </span>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c, i) => (
          <CitationCard
            key={c.id}
            citation={c}
            index={i}
            onClick={onCitationClick}
          />
        ))}
      </div>
    </div>
  );
};
