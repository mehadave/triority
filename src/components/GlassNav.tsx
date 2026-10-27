import { m } from 'motion/react';
import { Link, NavLink, useLocation } from 'react-router';
import { AffirmIcon, CalIcon, SettingsIcon, TasksIcon } from './art';
import { StreakBadge } from './StreakBadge';
import { spring } from '../lib/motion';
import { prefetchRoute } from '../app/routes';

const TABS = [
  { to: '/', label: 'Tasks', Icon: TasksIcon },
  { to: '/affirm', label: 'Affirm', Icon: AffirmIcon },
  { to: '/cal', label: 'Cal', Icon: CalIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
] as const;

export function GlassNav({
  streak,
  settingsBadge = false,
}: {
  streak: number;
  settingsBadge?: boolean;
}) {
  const { pathname } = useLocation();
  return (
    <>
      <nav
        aria-label="Main"
        className="glass fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 rounded-[24px] px-1.5 py-1.5 md:inset-x-4 md:top-3 md:bottom-auto md:flex md:items-center md:justify-between md:px-4"
      >
        <div className="hidden w-40 md:block">
          <Link
            to="/about"
            onPointerEnter={() => prefetchRoute('/about')}
            onFocus={() => prefetchRoute('/about')}
            className="font-display text-[28px] leading-none"
            aria-label="About Triority"
          >
            Triority
          </Link>
        </div>
        <ul className="grid grid-cols-4 gap-1 md:flex md:gap-2">
          {TABS.map(({ to, label, Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onPointerEnter={() => prefetchRoute(to)}
                  onFocus={() => prefetchRoute(to)}
                  className="relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[18px] px-3 text-[13px] font-medium md:min-h-11 md:flex-row md:gap-2 md:px-4 md:text-[15px]"
                >
                  {active && (
                    <m.span
                      layoutId="nav-pill"
                      className="bg-sun absolute inset-0 rounded-[18px]"
                      transition={spring}
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative">
                    <Icon />
                    {to === '/settings' && settingsBadge && (
                      <span
                        className="bg-ink ring-paper absolute -top-0.5 -right-1 h-2.5 w-2.5 rounded-full ring-2"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="relative">
                    {label}
                    {to === '/settings' && settingsBadge && (
                      <span className="sr-only"> (backup due)</span>
                    )}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
        <div className="hidden w-40 justify-end md:flex">
          <StreakBadge value={streak} />
        </div>
      </nav>
    </>
  );
}
