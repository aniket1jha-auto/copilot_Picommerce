'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  X,
  ChevronDown,
  Filter as FilterIcon,
  Mail,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePhaseData } from '@/hooks/usePhaseData';
import type { Campaign, CampaignStatus, ChannelType } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { CampaignGridCard } from '@/components/campaign/CampaignGridCard';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import { EmptyState } from '@/components/common/EmptyState';
import { channels as ALL_CHANNELS } from '@/data/channels';
import { Button, Select, cn } from '@/components/ui';

/** Filter accepts a curated channel set — including Email as a virtual key
 *  that doesn't map to ChannelType but is shown in the filter UI. */
type CampaignFilterChannel = ChannelType | 'email';

const FILTER_CHANNELS: CampaignFilterChannel[] = [
  'whatsapp',
  'rcs',
  'sms',
  'ai_voice',
  'email',
];

function FilterChannelGlyph({
  channel,
  size = 12,
}: {
  channel: CampaignFilterChannel;
  size?: number;
}) {
  if (channel === 'email') {
    return (
      <div
        className="inline-flex items-center justify-center rounded-md"
        style={{ width: size + 12, height: size + 12, backgroundColor: '#0F766E1A' }}
      >
        <Mail size={size} style={{ color: '#0F766E' }} />
      </div>
    );
  }
  return <ChannelIcon channel={channel} size={size} />;
}

/**
 * /campaigns — Campaigns home — Phase 4 D.1.7 revamp.
 *
 * - Card grid (2-col desktop, 1-col mobile/tablet).
 * - Sort: Active → Scheduled (soonest) → Completed/Paused (recent) → Drafts.
 * - Filters: Channel (multi), Audience (single segment), Time window. AND-composed.
 * - No status filter pills — recency-based default sort handles it.
 * - Active filter chips below the bar with × to remove individually + Clear all.
 * - Empty states distinguish "no campaigns" from "no matches".
 */

/* ─── Sort ────────────────────────────────────────────────────────────── */

const STATUS_GROUP: Record<CampaignStatus, number> = {
  active: 0,
  scheduled: 1,
  completed: 2,
  paused: 2,
  draft: 3,
};

function recencyAnchor(c: Campaign): number {
  const t = c.completedAt ?? c.startedAt ?? c.scheduledAt ?? c.createdAt;
  return new Date(t).getTime();
}

function sortByRecency(a: Campaign, b: Campaign): number {
  const ga = STATUS_GROUP[a.status];
  const gb = STATUS_GROUP[b.status];
  if (ga !== gb) return ga - gb;

  if (a.status === 'scheduled' && b.status === 'scheduled') {
    // Soonest first → ascending scheduledAt.
    const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.POSITIVE_INFINITY;
    return ta - tb;
  }
  return recencyAnchor(b) - recencyAnchor(a);
}

/* ─── Filters ─────────────────────────────────────────────────────────── */

type TimeWindow = '7d' | '30d' | '90d' | 'all' | 'custom';

interface FilterState {
  channels: CampaignFilterChannel[];
  segmentId: string | 'all';
  timeWindow: TimeWindow;
}

const INITIAL_FILTERS: FilterState = {
  channels: [],
  segmentId: 'all',
  timeWindow: 'all',
};

const TIME_WINDOW_LABEL: Record<TimeWindow, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  custom: 'Custom range',
  all: 'All time',
};

function timeWindowMs(w: TimeWindow): number | null {
  switch (w) {
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    case '30d': return 30 * 24 * 60 * 60 * 1000;
    case '90d': return 90 * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

function applyFilters(list: Campaign[], f: FilterState): Campaign[] {
  return list.filter((c) => {
    if (f.channels.length > 0) {
      const has = c.channels.some((ch) => f.channels.includes(ch));
      if (!has) return false;
    }
    if (f.segmentId !== 'all' && c.audience.segmentId !== f.segmentId) {
      return false;
    }
    const win = timeWindowMs(f.timeWindow);
    if (win !== null) {
      const now = Date.now();
      const anchor = recencyAnchor(c);
      if (now - anchor > win) return false;
    }
    return true;
  });
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export function Campaigns() {
  const { campaigns, segments, isDay0, isDay1 } = usePhaseData();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const sortedAll = useMemo(() => [...campaigns].sort(sortByRecency), [campaigns]);
  const filtered = useMemo(() => applyFilters(sortedAll, filters), [sortedAll, filters]);

  const filtersActive =
    filters.channels.length > 0 ||
    filters.segmentId !== 'all' ||
    filters.timeWindow !== 'all';

  const showEmptyAtAll = isDay0 || isDay1 || campaigns.length === 0;

  const subtitle = filtersActive
    ? `${filtered.length} of ${campaigns.length} matching filters`
    : `${campaigns.length} ${campaigns.length === 1 ? 'campaign' : 'campaigns'}`;

  function clearAll() {
    setFilters(INITIAL_FILTERS);
  }

  function toggleChannel(ch: CampaignFilterChannel) {
    setFilters((f) => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter((c) => c !== ch)
        : [...f.channels, ch],
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Campaigns"
        subtitle={!showEmptyAtAll ? subtitle : undefined}
        actions={
          <Link
            to="/campaigns/new"
            className="group relative inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-cyan to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_-4px_rgba(34,179,229,0.5)] transition-shadow hover:shadow-[0_6px_16px_-4px_rgba(34,179,229,0.65)]"
          >
            <Sparkles size={15} strokeWidth={2.2} />
            New campaign
          </Link>
        }
      />

      {showEmptyAtAll ? (
        <div className="rounded-lg bg-surface ring-1 ring-border-subtle">
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Create your first campaign to start reaching your audience across all channels."
            ctaLabel="New campaign"
            ctaHref="/campaigns/new"
          />
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <ChannelFilterButton
                selected={filters.channels}
                onToggle={toggleChannel}
                onClear={() => setFilters((f) => ({ ...f, channels: [] }))}
              />
              <Select
                value={filters.segmentId}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, segmentId: e.target.value }))
                }
                aria-label="Audience"
                className="w-[200px]"
              >
                <option value="all">All audiences</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Select
                value={filters.timeWindow}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    timeWindow: e.target.value as TimeWindow,
                  }))
                }
                aria-label="Time window"
                className="w-[180px]"
              >
                <option value="all">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="custom">Custom range</option>
              </Select>
            </div>

            {filtersActive && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary mr-1">
                  Filters
                </span>
                {filters.channels.map((ch) => (
                  <FilterChip
                    key={ch}
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <FilterChannelGlyph channel={ch} size={11} />
                        {channelLabel(ch)}
                      </span>
                    }
                    onRemove={() => toggleChannel(ch)}
                  />
                ))}
                {filters.segmentId !== 'all' && (
                  <FilterChip
                    label={`Audience · ${segments.find((s) => s.id === filters.segmentId)?.name ?? filters.segmentId}`}
                    onRemove={() =>
                      setFilters((f) => ({ ...f, segmentId: 'all' }))
                    }
                  />
                )}
                {filters.timeWindow !== 'all' && (
                  <FilterChip
                    label={TIME_WINDOW_LABEL[filters.timeWindow]}
                    onRemove={() =>
                      setFilters((f) => ({ ...f, timeWindow: 'all' }))
                    }
                  />
                )}
                <button
                  type="button"
                  onClick={clearAll}
                  className="ml-1 text-[11px] font-medium text-text-secondary hover:text-text-primary underline-offset-2 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                key="empty-filters"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-lg bg-surface ring-1 ring-border-subtle"
              >
                <EmptyState
                  icon={FilterIcon}
                  title="No campaigns match these filters"
                  description="Try widening the time window or removing a filter."
                />
                <div className="flex justify-center pb-6">
                  <Button variant="secondary" size="sm" onClick={clearAll}>
                    Clear filters
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="grid grid-cols-1 gap-4 lg:grid-cols-2"
              >
                {filtered.map((c) => (
                  <CampaignGridCard key={c.id} campaign={c} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

/* ─── Channel multi-select chip dropdown ──────────────────────────────── */

function channelLabel(ch: CampaignFilterChannel): string {
  if (ch === 'email') return 'Email';
  return (
    ALL_CHANNELS.find((c) => c.id === ch)?.name ??
    ch.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
  );
}

function ChannelFilterButton({
  selected,
  onToggle,
  onClear,
}: {
  selected: CampaignFilterChannel[];
  onToggle: (ch: CampaignFilterChannel) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = selected.length;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border bg-surface-sunken px-3 h-8 text-[13px] transition-colors',
          count > 0
            ? 'border-accent text-text-primary'
            : 'border-border-default text-text-primary hover:border-border-strong',
        )}
      >
        <span className="font-medium">Channel</span>
        {count > 0 && (
          <span className="rounded-full bg-accent px-1.5 h-4 inline-flex items-center text-[10px] font-semibold text-text-on-accent tabular-nums">
            {count}
          </span>
        )}
        <ChevronDown
          size={12}
          className={cn('text-text-tertiary transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-30 min-w-[220px] rounded-md border border-border-subtle bg-surface-raised shadow-[var(--shadow-popover)] p-1"
        >
          {FILTER_CHANNELS.map((ch) => {
            const isSelected = selected.includes(ch);
            return (
              <button
                key={ch}
                type="button"
                role="menuitemcheckbox"
                aria-checked={isSelected}
                onClick={() => onToggle(ch)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12px] text-text-primary hover:bg-surface-sunken transition-colors"
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-sm border',
                    isSelected
                      ? 'bg-accent border-accent text-text-on-accent'
                      : 'bg-surface border-border-default',
                  )}
                  aria-hidden
                >
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" className="text-text-on-accent">
                      <path
                        d="M2 5l2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </span>
                <FilterChannelGlyph channel={ch} size={12} />
                <span className="flex-1">{channelLabel(ch)}</span>
              </button>
            );
          })}
          {count > 0 && (
            <>
              <div className="my-1 h-px bg-border-subtle" />
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="w-full rounded-sm px-2 py-1.5 text-left text-[11px] text-text-secondary hover:bg-surface-sunken hover:text-text-primary"
              >
                Clear channel filter
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Active-filter chip ──────────────────────────────────────────────── */

function FilterChip({
  label,
  onRemove,
}: {
  label: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-2 h-6 text-[11px] text-text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="text-text-tertiary hover:text-error transition-colors"
      >
        <X size={11} />
      </button>
    </span>
  );
}
