import type { Segment } from '@/types';

export const baseSegments: Segment[] = [
  {
    id: 'seg-001',
    name: 'High LTV Dormant',
    description: 'Users with LTV > AED 10K who have not transacted in 60+ days',
    size: 45000,
    reachability: {
      sms: 43200,       // 96% — have valid phone number
      whatsapp: 31000,  // 69% — phone confirmed on WhatsApp Business API
      rcs: 18000,       // 40% — Android + RCS-capable carrier
      ai_voice: 43200,  // 96% — same as SMS (valid phone)
      field_executive: 12000,  // 27% — have verified address with pincode
      push_notification: 24750, // 55% — app installed + notification permission on
      in_app_banner: 9000,     // 20% — low: dormant users rarely open app
    },
    attributes: {
      avgLtv: 14200,
      geographyBreakdown: { metro: 40, tier2: 35, tier3: 25 },
      ageRange: [25, 45],
      genderSplit: { male: 72, female: 28 },
    },
    lastUpdated: '2026-03-28T08:00:00Z',
    usedInCampaigns: ['Recovery Nov', 'KYC Push'],
  },
  {
    id: 'seg-002',
    name: 'Incomplete KYC',
    description: 'Users who started but did not complete KYC verification',
    size: 120000,
    reachability: {
      sms: 115200,       // 96% — have valid phone
      whatsapp: 86400,   // 72% — phone on WhatsApp
      rcs: 42000,        // 35% — Android + RCS
      ai_voice: 115200,  // 96% — valid phone
      field_executive: 35000,  // 29% — have address
      push_notification: 78000, // 65% — app installed (they started KYC, so app exists)
      in_app_banner: 60000,    // 50% — moderately active (started KYC recently)
    },
    attributes: {
      avgLtv: 3400,
      geographyBreakdown: { metro: 30, tier2: 40, tier3: 30 },
      ageRange: [20, 40],
      genderSplit: { male: 65, female: 35 },
    },
    lastUpdated: '2026-03-27T12:00:00Z',
    usedInCampaigns: ['KYC Push'],
  },
  {
    id: 'seg-003',
    name: 'Active Transactors',
    description: 'Users with 3+ transactions in last 30 days',
    size: 250000,
    reachability: {
      sms: 243000,       // 97% — active users have valid phone
      whatsapp: 178000,  // 71% — phone on WhatsApp
      rcs: 65000,        // 26% — Android + RCS
      ai_voice: 240000,  // 96% — valid phone
      field_executive: 50000,  // 20% — have address
      push_notification: 212500, // 85% — active users have app + notifications on
      in_app_banner: 200000,    // 80% — active users open app frequently
    },
    attributes: {
      avgLtv: 8700,
      geographyBreakdown: { metro: 55, tier2: 30, tier3: 15 },
      ageRange: [22, 50],
      genderSplit: { male: 68, female: 32 },
    },
    lastUpdated: '2026-03-29T06:00:00Z',
    usedInCampaigns: ['Recovery Nov', 'Festive SMS', 'Loyalty Wave'],
  },
  {
    id: 'seg-004',
    name: 'Loan Eligible',
    description: 'Pre-approved for personal loan based on credit score and transaction history',
    size: 35000,
    reachability: {
      sms: 33600,       // 96% — valid phone
      whatsapp: 28000,  // 80% — high WhatsApp penetration in this demographic
      rcs: 12000,       // 34% — Android + RCS
      ai_voice: 33600,  // 96% — valid phone
      field_executive: 8000,  // 23% — verified address
      push_notification: 26250, // 75% — app installed + notifications on
      in_app_banner: 21000,    // 60% — moderately active
    },
    attributes: {
      avgLtv: 22000,
      geographyBreakdown: { metro: 60, tier2: 28, tier3: 12 },
      ageRange: [28, 48],
      genderSplit: { male: 70, female: 30 },
    },
    lastUpdated: '2026-03-26T10:00:00Z',
  },
  {
    id: 'seg-005',
    name: 'New Merchants',
    description: 'Merchants registered in last 14 days with incomplete activation',
    size: 8500,
    reachability: {
      sms: 8200,        // 96% — valid phone
      whatsapp: 6800,   // 80% — high WhatsApp usage among merchants
      rcs: 3200,        // 38% — Android + RCS
      ai_voice: 8200,   // 96% — valid phone
      field_executive: 8500,  // 100% — all new merchants have registered address
      push_notification: 4250,  // 50% — half have installed merchant app
      in_app_banner: 3400,     // 40% — new, not all active yet
    },
    attributes: {
      avgLtv: 5600,
      geographyBreakdown: { metro: 35, tier2: 40, tier3: 25 },
      ageRange: [25, 55],
      genderSplit: { male: 78, female: 22 },
    },
    lastUpdated: '2026-03-29T14:00:00Z',
  },
];
