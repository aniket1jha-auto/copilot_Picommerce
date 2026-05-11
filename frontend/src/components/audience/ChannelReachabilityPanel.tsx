'use client';

import type { Segment } from '@/types';
import { channels, REACHABILITY_REASON, PLATFORM_REACHABILITY_RATES } from '@/data/channels';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import { PhaseGate } from '@/components/ai/PhaseGate';

interface ChannelReachabilityPanelProps {
  segment: Segment;
  segmentSize: number;
}

export function ChannelReachabilityPanel({ segment, segmentSize }: ChannelReachabilityPanelProps) {
  return (
    <PhaseGate minPhase="day1">
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Channel Reachability — How we determine who is reachable
          </h4>
        </div>
        <div className="flex flex-col gap-3">
          {channels.map((ch) => {
            const segReachVal = segment.reachability?.[ch.id as keyof typeof segment.reachability];
            const hasSegmentData = segReachVal !== undefined;
            const count = hasSegmentData
              ? (segReachVal as number)
              : Math.round(segmentSize * PLATFORM_REACHABILITY_RATES[ch.id]);
            const pct = segmentSize > 0 ? Math.round((count / segmentSize) * 100) : 0;

            return (
              <div key={ch.id} className="flex items-center gap-3">
                <div className="w-5 flex-shrink-0">
                  <ChannelIcon channel={ch.id} size={16} />
                </div>
                <div className="w-28 flex-shrink-0 text-sm font-medium text-text-primary">
                  {ch.name}
                </div>
                <div className="flex flex-1 items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F3F4F6]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: ch.color }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs font-semibold text-text-primary">
                    {count.toLocaleString('en-AE')}
                  </span>
                  <span className="w-10 text-right text-xs text-text-secondary">{pct}%</span>
                </div>
                <div className="w-48 flex-shrink-0 text-[11px] text-text-secondary">
                  {REACHABILITY_REASON[ch.id]}
                </div>
                <div className="w-28 flex-shrink-0">
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      hasSegmentData
                        ? 'bg-[rgba(0,186,242,0.08)] text-cyan'
                        : 'bg-[#F3F4F6] text-text-secondary',
                    ].join(' ')}
                  >
                    {hasSegmentData ? 'From segment data' : 'Platform estimate'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {!segment.reachability && (
          <p className="mt-3 text-[10px] italic text-text-secondary">
            * Estimates based on platform-wide benchmarks. Actual reachability will be determined from your segment&apos;s user data.
          </p>
        )}
      </div>
    </PhaseGate>
  );
}
