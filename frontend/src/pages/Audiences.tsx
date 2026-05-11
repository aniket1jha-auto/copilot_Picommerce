import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  BarChart2,
  Plus,
  Pencil,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Toast } from '@/components/common/Toast';
import { usePhaseData } from '@/hooks/usePhaseData';
import { formatCount, formatPercent } from '@/utils/format';
import { formatUpdatedAgo } from '@/utils/formatRelative';
import type { Segment } from '@/types';
import type { ChannelType } from '@/types';

const CHANNEL_LABELS: Record<ChannelType, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  rcs: 'RCS',
  ai_voice: 'AI Voice',
  field_executive: 'Field Exec',
  push_notification: 'Push Notification',
  in_app_banner: 'In-App Banner',
  facebook_ads: 'Facebook Ads',
  instagram_ads: 'Instagram Ads',
};

const REACHABILITY_CHANNELS: ChannelType[] = [
  'sms',
  'whatsapp',
  'rcs',
  'ai_voice',
  'field_executive',
  'push_notification',
  'in_app_banner',
  'facebook_ads',
  'instagram_ads',
];

const CHANNEL_COLORS: Record<ChannelType, string> = {
  sms: '#6366F1',
  whatsapp: '#25D366',
  rcs: '#00BAF2',
  ai_voice: '#F59E0B',
  field_executive: '#8B5CF6',
  push_notification: '#EF4444',
  in_app_banner: '#0EA5E9',
  facebook_ads: '#1877F2',
  instagram_ads: '#E4405F',
};

function getReachabilityEntries(
  reachability: Segment['reachability'],
): { channel: ChannelType; count: number }[] {
  if (!reachability) return [];
  return REACHABILITY_CHANNELS.filter((ch) => reachability[ch] !== undefined).map((ch) => ({
    channel: ch,
    count: reachability[ch] as number,
  }));
}

function rid(): string {
  return `seg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

type RecChannel = { key: ChannelType; label: string; count: number };

const RECOMMENDATION_SEEDS: {
  id: string;
  name: string;
  description: string;
  size: number;
  topChannels: RecChannel[];
  refreshedLabel: string;
}[] = [
  {
    id: 'rec-1',
    name: 'High Propensity Payers — 30-60 DPD',
    description: 'Contacts with increasing payment history who missed last EMI',
    size: 18400,
    topChannels: [
      { key: 'sms', label: 'SMS', count: 17000 },
      { key: 'whatsapp', label: 'WhatsApp', count: 14000 },
      { key: 'ai_voice', label: 'AI Voice', count: 17000 },
    ],
    refreshedLabel: 'Refreshed 2 days ago',
  },
  {
    id: 'rec-2',
    name: 'Dormant Wallet Users — High Balance',
    description: 'Users inactive 45+ days with wallet balance above AED 500',
    size: 92000,
    topChannels: [
      { key: 'sms', label: 'SMS', count: 88000 },
      { key: 'whatsapp', label: 'WhatsApp', count: 71000 },
      { key: 'push_notification', label: 'Push', count: 65000 },
    ],
    refreshedLabel: 'Refreshed 2 days ago',
  },
  {
    id: 'rec-3',
    name: 'KYC Drop-off — Step 3',
    description: 'Users who completed 2 of 3 KYC steps and did not return',
    size: 34000,
    topChannels: [
      { key: 'sms', label: 'SMS', count: 33000 },
      { key: 'whatsapp', label: 'WhatsApp', count: 29000 },
      { key: 'ai_voice', label: 'AI Voice', count: 33000 },
    ],
    refreshedLabel: 'Refreshed 2 days ago',
  },
];

function formatCsvImportDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function SegmentCard({
  segment,
  isDay30,
  isNew,
  highlight,
  onEdit,
  onClone,
}: {
  segment: Segment;
  isDay30: boolean;
  isNew: boolean;
  highlight?: boolean;
  onEdit: () => void;
  onClone: () => void;
}) {
  const reachEntries = getReachabilityEntries(segment.reachability);
  const campaigns = segment.usedInCampaigns ?? [];
  const showChips = campaigns.slice(0, 2);
  const more = campaigns.length - showChips.length;

  const isCsv = segment.creationSource === 'csv' && segment.csvImport;

  return (
    <div
      id={`segment-card-${segment.id}`}
      className={[
        'rounded-lg border bg-white p-5 shadow-[0_1px_3px_rgba(0,41,112,0.08)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,41,112,0.12)]',
        highlight ? 'border-cyan ring-2 ring-cyan/40' : 'border-[#E5E7EB]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-text-primary">{segment.name}</h3>
            {isNew && (
              <span className="shrink-0 rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-cyan">
                New
              </span>
            )}
            {isCsv && (
              <span className="shrink-0 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">
                CSV Import
              </span>
            )}
            {segment.segmentSource === 'rule-based' && !isCsv && (
              <span className="shrink-0 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                Rule-based
              </span>
            )}
            {segment.segmentSource === 'ai' && (
              <span className="shrink-0 rounded-full bg-[#F5F3FF] px-2 py-0.5 text-[10px] font-semibold text-[#7C3AED]">
                AI
              </span>
            )}
          </div>
          {isCsv && segment.csvImport ? (
            <p className="mt-0.5 text-xs text-text-secondary">
              Imported from: {segment.csvImport.fileName} · {formatCsvImportDate(segment.csvImport.importedAt)}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{segment.description}</p>
          )}
          {segment.segmentGoal && (
            <p className="mt-1 text-[11px] font-medium text-text-secondary">Goal: {segment.segmentGoal}</p>
          )}
          <p className="mt-1 text-[11px] text-text-secondary">{formatUpdatedAgo(segment.lastUpdated)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-[#F3F4F6] hover:text-text-primary"
              aria-label="Edit segment"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={onClone}
              className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-[#F3F4F6] hover:text-text-primary"
              aria-label="Clone segment"
            >
              <Copy size={16} />
            </button>
          </div>
          <div className="rounded-md bg-[#F3F4F6] px-2.5 py-1 text-xs font-semibold text-text-primary">
            {formatCount(segment.size)} users
          </div>
        </div>
      </div>

      {reachEntries.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-text-secondary">Reachability</p>
          <div className="flex flex-wrap gap-2">
            {reachEntries.map(({ channel, count }) => (
              <div
                key={channel}
                className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: CHANNEL_COLORS[channel] }}
                />
                <span className="text-xs font-medium text-text-secondary">{CHANNEL_LABELS[channel]}</span>
                <span className="text-xs font-semibold text-text-primary">{formatCount(count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isDay30 && segment.performance && (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-md bg-[#F0FDF4] px-3 py-2.5">
          <div className="text-center">
            <p className="text-[11px] text-text-secondary">Avg Conv.</p>
            <p className="mt-0.5 text-sm font-semibold text-[#27AE60]">
              {formatPercent(segment.performance.avgConversion)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-text-secondary">Campaigns</p>
            <p className="mt-0.5 text-sm font-semibold text-text-primary">
              {segment.performance.campaignCount}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-[#F3F4F6] pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Used in</p>
        {campaigns.length === 0 ? (
          <p className="mt-1 text-xs text-text-secondary">Not used in any campaign</p>
        ) : (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {showChips.map((c, i) => (
              <span
                key={`${c}-${i}`}
                className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-medium text-text-secondary"
              >
                {c}
              </span>
            ))}
            {more > 0 && (
              <span className="text-[10px] font-medium text-text-secondary">+{more} more</span>
            )}
          </div>
        )}
      </div>

      {segment.filters && !isCsv && (
        <div className="mt-3">
          <code className="inline-block max-w-full truncate rounded bg-[#F3F4F6] px-2 py-0.5 text-[11px] text-text-secondary">
            {segment.filters.length > 100 ? `${segment.filters.slice(0, 100)}…` : segment.filters}
          </code>
        </div>
      )}
    </div>
  );
}

export function Audiences() {
  const navigate = useNavigate();
  const location = useLocation();
  const { segments, dataSources, isDay0, isDay30 } = usePhaseData();
  const [toast, setToast] = useState<string | null>(null);
  const [customSegments, setCustomSegments] = useState<Segment[]>([]);
  const [newSegmentIds, setNewSegmentIds] = useState<Set<string>>(new Set());
  const [recDismissed, setRecDismissed] = useState<Set<string>>(new Set());
  const [recApproved, setRecApproved] = useState<Set<string>>(new Set());
  const [flashSegmentId, setFlashSegmentId] = useState<string | null>(null);
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);

  const allSegments = useMemo(() => [...customSegments, ...segments], [customSegments, segments]);

  useEffect(() => {
    const st = location.state as { savedSegment?: Segment; highlightSegmentId?: string } | null;
    if (st?.savedSegment) {
      const seg = st.savedSegment;
      setCustomSegments((prev) => (prev.some((s) => s.id === seg.id) ? prev : [seg, ...prev]));
      setNewSegmentIds((prev) => new Set(prev).add(seg.id));
      setToast('Segment saved');
      setScrollTargetId(st.highlightSegmentId ?? seg.id);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    if (st?.highlightSegmentId) {
      setScrollTargetId(st.highlightSegmentId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!scrollTargetId) return;
    if (!allSegments.some((s) => s.id === scrollTargetId)) return;

    const id = scrollTargetId;
    setScrollTargetId(null);
    setFlashSegmentId(id);

    requestAnimationFrame(() => {
      document.getElementById(`segment-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    const t = window.setTimeout(() => setFlashSegmentId(null), 2800);
    return () => clearTimeout(t);
  }, [scrollTargetId, allSegments]);

  const totalUsers = dataSources.reduce((sum, ds) => sum + (ds.recordCount ?? 0), 0);

  const reachableTotals = allSegments.reduce(
    (acc, seg) => {
      if (!seg.reachability) return acc;
      for (const ch of REACHABILITY_CHANNELS) {
        const count = seg.reachability[ch] ?? 0;
        acc[ch] = (acc[ch] ?? 0) + count;
      }
      return acc;
    },
    {} as Record<ChannelType, number>,
  );

  const totalReachable = Math.max(...Object.values(reachableTotals), 0);

  const headerSubtitle = isDay0
    ? 'No data sources connected'
    : `${formatCount(totalUsers)} users synced across ${dataSources.length} source${dataSources.length !== 1 ? 's' : ''}`;

  const visibleRecommendations = RECOMMENDATION_SEEDS.filter((r) => !recDismissed.has(r.id));

  function cloneSegment(segment: Segment) {
    const copy: Segment = {
      ...segment,
      id: rid(),
      name: `${segment.name} (copy)`,
      lastUpdated: new Date().toISOString(),
      usedInCampaigns: [],
      creationSource: 'filter',
      csvImport: undefined,
    };
    setCustomSegments((prev) => [copy, ...prev]);
    setToast('Segment cloned');
  }

  function approveRecommendation(seed: (typeof RECOMMENDATION_SEEDS)[0]) {
    const reach: Segment['reachability'] = { sms: 0, whatsapp: 0 };
    seed.topChannels.forEach((c) => {
      (reach as Record<string, number>)[c.key] = c.count;
    });
    const seg: Segment = {
      id: rid(),
      name: seed.name,
      description: seed.description,
      size: seed.size,
      segmentSource: 'rule-based',
      creationSource: 'filter',
      reachability: reach,
      lastUpdated: new Date().toISOString(),
      usedInCampaigns: [],
    };
    setCustomSegments((prev) => [seg, ...prev]);
    setRecApproved((prev) => new Set(prev).add(seed.id));
    setToast('Segment approved and saved');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audiences"
        subtitle={headerSubtitle}
        actions={
          !isDay0 ? (
            <Link
              to="/audiences/segments/new"
              className="inline-flex items-center gap-2 rounded-md bg-cyan px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan/90"
            >
              <Plus size={16} />
              Create Segment
            </Link>
          ) : undefined
        }
      />

      {isDay0 ? (
        <div className="mt-8 flex flex-col gap-6">
          <EmptyState
            icon={Users}
            title="Connect data sources to view your audience"
            description="Integrate your data warehouse, CRM, or feature store to start building segments and reach the right users."
            ctaLabel="Go to Settings"
            ctaHref="/settings"
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,41,112,0.08)]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#EFF6FF]">
                  <Users size={16} className="text-[#3B82F6]" />
                </div>
                <p className="text-xs font-medium text-text-secondary">Total Users Synced</p>
              </div>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{formatCount(totalUsers)}</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                across {dataSources.length} data source{dataSources.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,41,112,0.08)]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F0FDF4]">
                  <TrendingUp size={16} className="text-[#27AE60]" />
                </div>
                <p className="text-xs font-medium text-text-secondary">Max Reachable</p>
              </div>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{formatCount(totalReachable)}</p>
              <p className="mt-0.5 text-xs text-text-secondary">across all channels</p>
            </div>

            <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,41,112,0.08)]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#FFF7ED]">
                  <BarChart2 size={16} className="text-[#F59E0B]" />
                </div>
                <p className="text-xs font-medium text-text-secondary">Saved Segments</p>
              </div>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{allSegments.length}</p>
              <p className="mt-0.5 text-xs text-text-secondary">ready for campaigns</p>
            </div>

            <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,41,112,0.08)]">
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-text-secondary">Reachable by Channel</p>
                <div className="flex flex-col gap-1">
                  {REACHABILITY_CHANNELS.filter((ch) => reachableTotals[ch] > 0)
                    .slice(0, 3)
                    .map((ch) => (
                      <div key={ch} className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: CHANNEL_COLORS[ch] }}
                        />
                        <span className="text-xs text-text-secondary">{CHANNEL_LABELS[ch]}</span>
                        <span className="ml-auto text-xs font-semibold text-text-primary">
                          {formatCount(reachableTotals[ch])}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-text-primary">Recommended for You</h2>
            <p className="mt-1 text-sm text-text-secondary">
              AI-suggested segments based on your data and campaign history
            </p>
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
              {visibleRecommendations.map((rec) => {
                const approved = recApproved.has(rec.id);
                return (
                  <div
                    key={rec.id}
                    className="flex w-[280px] shrink-0 flex-col rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,41,112,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-snug text-text-primary">{rec.name}</h3>
                      <span className="shrink-0 rounded-md bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold text-text-primary">
                        {formatCount(rec.size)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-text-secondary">{rec.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {rec.topChannels.map(({ key, label, count }) => (
                        <div
                          key={key}
                          className="flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: CHANNEL_COLORS[key] }}
                          />
                          <span className="text-[10px] font-medium text-text-secondary">{label}</span>
                          <span className="text-[10px] font-semibold text-text-primary">{formatCount(count)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[10px] text-text-secondary">
                        <RefreshCw size={11} />
                        {rec.refreshedLabel}
                      </span>
                      <span
                        className={[
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          approved
                            ? 'bg-[#ECFDF5] text-[#059669]'
                            : 'bg-[#FFFBEB] text-[#D97706]',
                        ].join(' ')}
                      >
                        {approved ? 'Approved' : 'Awaiting review'}
                      </span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        disabled={approved}
                        onClick={() => approveRecommendation(rec)}
                        className="flex-1 rounded-md bg-cyan px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Approve & Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecDismissed((prev) => new Set(prev).add(rec.id))}
                        className="rounded-md border border-transparent px-2 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-[#F3F4F6]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">Saved Segments</h2>
              <span className="text-sm text-text-secondary">
                {allSegments.length} segment{allSegments.length !== 1 ? 's' : ''}
              </span>
            </div>

            {allSegments.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={Users}
                  title="No segments yet"
                  description="Create your first segment to start targeting the right users in your campaigns."
                />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {allSegments.map((segment) => (
                  <SegmentCard
                    key={segment.id}
                    segment={segment}
                    isDay30={isDay30}
                    isNew={newSegmentIds.has(segment.id)}
                    highlight={flashSegmentId === segment.id}
                    onEdit={() => setToast('Segment editor lands in Phase 3')}
                    onClone={() => cloneSegment(segment)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Toast
        message={toast ?? ''}
        type="info"
        visible={toast !== null}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
