import type { ReactNode } from 'react';
import { StreakBadge } from './StreakBadge';
import { useDay } from '../data/DayProvider';

/**
 * One compact row at the top of every screen: the title on the left and, on phones,
 * the streak on the right (on wider screens the streak lives in the top bar). It uses the
 * same column as each screen's content, so the title lines up with the text below.
 */
export function PageHeader({ title, eyebrow }: { title?: ReactNode; eyebrow?: ReactNode }) {
  const { streak } = useDay();
  return (
    // With no title it only carries the phone streak, so it folds away on wider screens.
    <header
      className={`mx-auto flex min-h-11 w-full max-w-md items-center justify-between gap-3 ${
        title || eyebrow ? '' : 'md:hidden'
      }`}
    >
      <div className="min-w-0">
        {eyebrow && <p className="text-muted-ink text-[14px] font-medium">{eyebrow}</p>}
        {title && <h1 className="page-title">{title}</h1>}
      </div>
      <StreakBadge value={streak.current} className="-mr-2.5 shrink-0 md:hidden" />
    </header>
  );
}
