'use client';

import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { ChannelIcon } from '@/components/common/ChannelIcon';
import type { ChannelType } from '@/types';
import { channels } from '@/data/channels';

export interface ChannelNodeData {
  [key: string]: unknown;
  channelType: ChannelType;
  label: string;
  content?: string;
  performance?: {
    sent: number;
    converted: number;
    conversionRate: number;
    cost: number;
  };
}

function getConversionBadgeClasses(rate: number): string {
  if (rate > 5) return 'bg-green-100 text-green-700 border-green-200';
  if (rate >= 2) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function getChannelName(channelType: ChannelType): string {
  const channel = channels.find((c) => c.id === channelType);
  return channel?.name ?? channelType;
}

export function ChannelNode({ data, selected }: NodeProps) {
  const nodeData = data as ChannelNodeData;
  const { channelType, label, content, performance } = nodeData;

  const borderClass = selected
    ? 'border-cyan-400 ring-2 ring-cyan-200'
    : 'border-gray-200';

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />

      <div
        className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-150 ${borderClass}`}
        style={{ minWidth: 200 }}
      >
        {/* Header: icon + channel name */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <ChannelIcon channel={channelType} size={14} />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {getChannelName(channelType)}
          </span>
        </div>

        {/* Label */}
        <div className="px-3 pb-1">
          <p className="text-sm font-medium text-gray-900 leading-snug">{label}</p>
        </div>

        {/* Content preview */}
        {content && (
          <div className="px-3 pb-2">
            <p className="text-xs text-gray-400 truncate max-w-[176px]">{content}</p>
          </div>
        )}

        {/* Performance footer */}
        {performance && (
          <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getConversionBadgeClasses(performance.conversionRate)}`}
            >
              {performance.conversionRate.toFixed(1)}% CVR
            </span>
            <span className="text-xs text-gray-400">
              AED {performance.cost.toLocaleString('en-AE')}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
    </>
  );
}
