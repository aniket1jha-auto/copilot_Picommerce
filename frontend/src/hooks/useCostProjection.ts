import { useMemo } from 'react';
import type { ChannelType } from '@/types';
import { channels } from '@/data/channels';

interface CostProjection {
  totalCost: number;
  unitCost: number;
  formula: string;
}

/**
 * Given a channel type and audience size, computes the projected cost.
 * Returns the total cost, per-unit cost, and a human-readable formula string.
 */
export function useCostProjection(channelType: ChannelType, audienceSize: number): CostProjection {
  return useMemo(() => {
    const channel = channels.find((c) => c.id === channelType);
    const unitCost = channel?.unitCost ?? 0;
    const totalCost = unitCost * audienceSize;
    const formula = `AED ${unitCost} × ${audienceSize.toLocaleString('en-AE')} = AED ${totalCost.toLocaleString('en-AE')}`;

    return { totalCost, unitCost, formula };
  }, [channelType, audienceSize]);
}
