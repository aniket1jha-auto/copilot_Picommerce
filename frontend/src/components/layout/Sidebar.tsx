import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Bot,
  Wrench,
  Users,
  Library,
  Database,
  Activity,
  Radio,
  LayoutGrid,
  KeyRound,
  Plug2,
  Settings2,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { usePhaseStore } from '@/store/phaseStore';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

/* IA: BUILD / OBSERVE / CONFIGURE — Campaigns first.
 * Source of truth: docs/IA.md §2 + docs/decisions/0002-ia-restructure.md */
const navSections: NavSection[] = [
  {
    items: [{ to: '/', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    heading: 'BUILD',
    items: [
      { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
      { to: '/agents', icon: Bot, label: 'Agents' },
      { to: '/knowledge-base', icon: Database, label: 'Knowledge Base' },
      { to: '/tools', icon: Wrench, label: 'Tools' },
      { to: '/audiences', icon: Users, label: 'Audiences' },
      { to: '/content-library', icon: Library, label: 'Content Library' },
    ],
  },
  {
    heading: 'OBSERVE',
    items: [
      { to: '/observe/performance', icon: Activity, label: 'Performance' },
      { to: '/observe/channels', icon: Radio, label: 'Channels' },
      { to: '/observe/reporting', icon: LayoutGrid, label: 'Reporting' },
    ],
  },
  {
    heading: 'CONFIGURE',
    items: [
      { to: '/configure/channels', icon: KeyRound, label: 'Account Manager' },
      { to: '/configure/integrations', icon: Plug2, label: 'Integrations' },
      { to: '/configure/workspace', icon: Settings2, label: 'Workspace' },
    ],
  },
];

function SidebarLink({ to, icon: Icon, label, collapsed }: NavItem & { collapsed: boolean }) {
  return (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-md pl-3 pr-2 py-1.5 text-[13px] font-medium transition-colors',
          'border-l-[2px]',
          isActive
            ? 'border-brand-500 bg-brand-50 text-brand-700'
            : 'border-transparent text-text-secondary hover:bg-surface-raised hover:text-text-primary',
        ].join(' ')
      }
      title={collapsed ? label : undefined}
    >
      <Icon size={16} strokeWidth={1.75} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const collapsed = usePhaseStore((s) => s.sidebarCollapsed);
  const toggleSidebar = usePhaseStore((s) => s.toggleSidebar);

  return (
    <motion.aside
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-surface border-r border-border-subtle"
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Brand — logo gradient (navy → Paytm blue). Phase 2 will rebuild
          this as a refined SVG mark with hover + intro animation. */}
      <div className="flex h-14 items-center gap-2.5 px-4 shrink-0">
        <div
          className={[
            'flex shrink-0 items-center justify-center rounded-md font-display leading-none text-white shadow-[var(--shadow-xs)]',
            collapsed ? 'h-8 w-8 text-[18px]' : 'h-8 w-8 text-[20px]',
          ].join(' ')}
          style={{ background: 'var(--logo-gradient)' }}
          aria-hidden
        >
          π
        </div>
        {!collapsed && (
          <span className="text-[14px] font-semibold tracking-[0.02em] text-text-primary">
            Commerce
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-1 flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? 'mt-3' : ''}>
            {section.heading && !collapsed && (
              <div className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.10em] text-text-tertiary">
                {section.heading}
              </div>
            )}
            {section.heading && collapsed && (
              <div className="mx-auto my-1.5 h-px w-6 bg-border-subtle" />
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <SidebarLink key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: collapse toggle */}
      <div className="border-t border-border-subtle">
        <button
          onClick={toggleSidebar}
          className="flex h-10 w-full items-center justify-center text-text-tertiary hover:bg-surface-raised hover:text-text-primary transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  );
}
