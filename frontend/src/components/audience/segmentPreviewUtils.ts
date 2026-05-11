import type { Segment } from '@/types';
import type { FilterState } from '@/components/audience/ConditionBuilder';
import { SEGMENT_CHANNEL_META } from '@/data/segmentBuilderConstants';

function hashSize(obj: unknown): number {
  const str = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h) % 88000 + 12000;
}

/** Deterministic fake reachability from estimate total */
export function buildReachabilityFromEstimate(total: number): NonNullable<Segment['reachability']> {
  const weights = [0.22, 0.2, 0.12, 0.16, 0.1, 0.12, 0.08];
  const keys = SEGMENT_CHANNEL_META.map((m) => m.key);
  const out = {} as NonNullable<Segment['reachability']>;
  let sum = 0;
  keys.forEach((k, i) => {
    const v = Math.round(total * weights[i]);
    (out as Record<string, number>)[k] = v;
    sum += v;
  });
  if (sum < total && keys[0]) {
    (out as Record<string, number>)[keys[0]] += total - sum;
  }
  return out;
}

export function estimateFromFilterState(filter: FilterState): number {
  return hashSize(filter);
}

export const SAMPLE_PREVIEW_CONTACTS = [
  { name: 'Rahul S.', phone: '+91 •••••3210', attrs: 'DPD 45 · Metro' },
  { name: 'Priya M.', phone: '+91 •••••8821', attrs: 'DPD 52 · Tier-2' },
  { name: 'Amit K.', phone: '+91 •••••1044', attrs: 'DPD 38 · WA opt-in' },
  { name: 'Neha V.', phone: '+91 •••••5567', attrs: 'DPD 61 · High LTV' },
  { name: 'Suresh P.', phone: '+91 •••••9932', attrs: 'DPD 41 · SMS opt-in' },
];

export const AI_WHY_BULLETS = [
  'DPD trend: contacts whose DPD increased in the last 30 days',
  'Prior engagement: responded to at least 1 WhatsApp message in 60 days',
  'Amount threshold: outstanding principal above AED 5,000',
];

export function defaultAiFilterState(): FilterState {
  return {
    betweenTopLevel: ['AND'],
    items: [
      {
        id: 'ai-g1',
        kind: 'group',
        betweenConditions: ['AND'],
        conditions: [
          {
            id: 'ai-c1',
            attributeId: 'dpd_bucket',
            operator: 'in list',
            value: '30-60,60-90',
          },
          {
            id: 'ai-c2',
            attributeId: 'outstanding_amount',
            operator: 'greater than',
            value: '5000',
          },
        ],
      },
      {
        id: 'ai-c3',
        kind: 'condition',
        condition: {
          id: 'ai-c3l',
          attributeId: 'channel_optin',
          operator: 'in list',
          value: 'WhatsApp',
        },
      },
    ],
  };
}
