'use client';

import { useMemo } from 'react';
import type { ChannelType } from '@/types';
import { channels, PLATFORM_REACHABILITY_RATES } from '@/data/channels';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import { InlineInsight } from '@/components/ai/InlineInsight';
import { useInsights } from '@/hooks/useInsights';
import { usePhaseData } from '@/hooks/usePhaseData';
import { formatINR, formatChannelCost } from '@/utils/format';

interface ChannelSelectorProps {
  selectedChannels: ChannelType[];
  onUpdate: (channels: ChannelType[]) => void;
  segmentSize: number;
  segmentReachability?: Record<string, number>;
}

// Historical conversion rates shown at Day 30+
const HISTORICAL_CONVERSION: Record<ChannelType, { rate: string; label: string }> = {
  sms: { rate: '2.1%', label: 'avg conversion' },
  whatsapp: { rate: '6.8%', label: 'avg conversion' },
  rcs: { rate: '4.2%', label: 'avg conversion' },
  ai_voice: { rate: '8.5%', label: 'avg conversion' },
  field_executive: { rate: '22.3%', label: 'completion rate' },
  push_notification: { rate: '3.5%', label: 'avg conversion' },
  in_app_banner: { rate: '5.2%', label: 'avg conversion' },
  facebook_ads: { rate: '1.8%', label: 'avg CTR' },
  instagram_ads: { rate: '2.4%', label: 'avg CTR' },
};

export function ChannelSelector({ selectedChannels, onUpdate, segmentSize, segmentReachability }: ChannelSelectorProps) {
  const insights = useInsights('channel_step');
  const { isAtLeast } = usePhaseData();

  const totalEstimatedCost = useMemo(() => {
    return selectedChannels.reduce((acc, channelId) => {
      const ch = channels.find((c) => c.id === channelId);
      return acc + (ch ? ch.unitCost * segmentSize : 0);
    }, 0);
  }, [selectedChannels, segmentSize]);

  function toggleChannel(channelId: ChannelType) {
    const isSelected = selectedChannels.includes(channelId);
    if (isSelected) {
      onUpdate(selectedChannels.filter((c) => c !== channelId));
    } else {
      onUpdate([...selectedChannels, channelId]);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Channel toggle cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {channels.map((ch) => {
          const isSelected = selectedChannels.includes(ch.id);
          const unitCost = ch.unitCost;
          // Use segment-specific reachability if available, otherwise fall back to platform benchmarks
          const segReach = segmentReachability?.[ch.id];
          const reachCount =
            isAtLeast('day1')
              ? segReach !== undefined
                ? segReach  // actual count from segment data
                : Math.round(segmentSize * PLATFORM_REACHABILITY_RATES[ch.id])  // platform benchmark
              : null;

          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => toggleChannel(ch.id)}
              className={[
                'flex flex-col items-center gap-2.5 rounded-lg border-2 p-4 text-center transition-all',
                isSelected
                  ? 'border-cyan bg-[rgba(0,186,242,0.06)]'
                  : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:bg-[#F9FAFB]',
              ].join(' ')}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={[
                    'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
                    isSelected ? 'border-cyan bg-cyan' : 'border-[#D1D5DB] bg-white',
                  ].join(' ')}
                >
                  {isSelected && (
                    <svg
                      viewBox="0 0 10 8"
                      fill="none"
                      className="h-2.5 w-2.5"
                    >
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
              </div>

              <ChannelIcon channel={ch.id} size={20} />

              <div className="flex flex-col gap-0.5">
                <span
                  className={[
                    'text-sm font-semibold leading-tight',
                    isSelected ? 'text-cyan' : 'text-text-primary',
                  ].join(' ')}
                >
                  {ch.name}
                </span>
                <span className="text-xs text-text-secondary">
                  {formatChannelCost(ch.id, unitCost)}
                </span>
              </div>

              {/* Reachability count — Day 1+ */}
              {reachCount !== null && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-medium text-text-primary">
                    {reachCount.toLocaleString('en-AE')}
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    {segReach !== undefined ? 'reachable' : '~reachable'}
                  </span>
                </div>
              )}

              {/* Conversion rate badge — Day 30+ */}
              {isAtLeast('day30') && (() => {
                const conv = HISTORICAL_CONVERSION[ch.id];
                return (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    {conv.rate} {conv.label}
                  </span>
                );
              })()}
            </button>
          );
        })}
      </div>

      {/* Cost estimate per selected channel */}
      {selectedChannels.length > 0 && (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Real-Time Cost Estimate
          </h4>
          <div className="flex flex-col gap-2">
            {selectedChannels.map((channelId) => {
              const ch = channels.find((c) => c.id === channelId);
              if (!ch) return null;
              const total = ch.unitCost * segmentSize;
              return (
                <div key={channelId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={ch.id} size={14} />
                    <span className="text-sm text-text-primary">{ch.name}</span>
                    <span className="text-xs text-text-secondary">
                      {formatChannelCost(ch.id, ch.unitCost)} × {segmentSize.toLocaleString('en-AE')}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-text-primary">
                    {formatINR(total)}
                  </span>
                </div>
              );
            })}
            <div className="mt-2 flex items-center justify-between border-t border-[#E5E7EB] pt-2">
              <span className="text-sm font-semibold text-text-primary">Total Estimated Cost</span>
              <span className="text-base font-bold text-cyan">
                {formatINR(totalEstimatedCost)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Phase-aware inline insights */}
      {insights.length > 0 && (
        <div className="flex flex-col gap-3">
          {insights.map((insight) => (
            <InlineInsight key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {selectedChannels.length === 0 && (
        <p className="text-xs text-text-secondary">
          Select one or more channels to reach your audience.
        </p>
      )}
    </div>
  );
}
