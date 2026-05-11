import type { ChannelDefinition, ChannelType } from '@/types';

// Explains what drives reachability for each channel — shared across components
export const REACHABILITY_REASON: Record<ChannelType, string> = {
  sms: 'Has valid phone number',
  whatsapp: 'Phone confirmed on WhatsApp',
  rcs: 'Android device + RCS-capable carrier',
  ai_voice: 'Has valid phone number',
  field_executive: 'Has verified physical address',
  push_notification: 'App installed + notifications enabled',
  in_app_banner: 'App installed + active in last 30 days',
  facebook_ads: 'Matched via phone/email on Meta',
  instagram_ads: 'Matched via phone/email on Meta',
};

// Fallback reachability rates (platform benchmarks) — used when segment doesn't have channel-specific data
export const PLATFORM_REACHABILITY_RATES: Record<ChannelType, number> = {
  sms: 0.96,
  whatsapp: 0.69,
  rcs: 0.40,
  ai_voice: 0.96,
  field_executive: 0.27,
  push_notification: 0.55,
  in_app_banner: 0.40,
  facebook_ads: 0.45,
  instagram_ads: 0.35,
};

export const channels: ChannelDefinition[] = [
  {
    id: 'sms',
    name: 'SMS',
    type: 'digital',
    unitCost: 0.15,
    icon: 'MessageSquare',
    color: '#00BAF2',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    type: 'digital',
    unitCost: 1.05,
    icon: 'MessageCircle',
    color: '#25D366',
  },
  {
    id: 'rcs',
    name: 'RCS',
    type: 'digital',
    unitCost: 0.20,
    icon: 'Smartphone',
    color: '#4285F4',
  },
  {
    id: 'ai_voice',
    name: 'AI Voice Call',
    type: 'digital',
    unitCost: 3.50,
    icon: 'Phone',
    color: '#7C3AED',
  },
  {
    id: 'field_executive',
    name: 'Field Executive',
    type: 'physical',
    unitCost: 45.00,
    icon: 'UserCheck',
    color: '#F59E0B',
  },
  {
    id: 'push_notification',
    name: 'Push Notification',
    type: 'digital',
    unitCost: 0.10,
    icon: 'Bell',
    color: '#EF4444',
  },
  {
    id: 'in_app_banner',
    name: 'In-App Banner',
    type: 'digital',
    unitCost: 0.10,
    icon: 'Layout',
    color: '#0EA5E9',
  },
  {
    id: 'facebook_ads',
    name: 'Facebook Ads',
    type: 'digital',
    unitCost: 0.15, // AED 150 per 1K impressions = AED 0.15 per impression
    icon: 'Facebook',
    color: '#1877F2',
  },
  {
    id: 'instagram_ads',
    name: 'Instagram Ads',
    type: 'digital',
    unitCost: 0.15, // AED 150 per 1K impressions = AED 0.15 per impression
    icon: 'Instagram',
    color: '#E4405F',
  },
];
