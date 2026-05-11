// Base audience summary — 2.4L users, Indian enterprise fintech context

export const audienceSummary = {
  totalUsers: 240000,

  demographics: {
    gender: {
      male: 156000,
      female: 79200,
      other: 4800,
    },
    ageGroups: {
      '18-24': 38400,
      '25-34': 91200,
      '35-44': 62400,
      '45-54': 33600,
      '55+': 14400,
    },
    tierDistribution: {
      metro: 84000,
      tier1: 52800,
      tier2: 62400,
      tier3: 40800,
    },
  },

  reachability: {
    sms: 228000,
    whatsapp: 165000,
    email: 112000,
    rcs: 72000,
    ai_voice: 228000,
    field_executive: 84000,
  },

  ltvDistribution: {
    high: 48000,       // LTV > AED 25K
    medium: 108000,    // LTV AED 8K–AED 25K
    low: 84000,        // LTV < AED 8K
  },

  kycStatus: {
    full_kyc: 168000,
    min_kyc: 40000,
    kyc_pending: 32000,
  },
} as const;
