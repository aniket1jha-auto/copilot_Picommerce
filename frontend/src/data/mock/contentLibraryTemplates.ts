import type { ContentTemplateRow } from '@/types/contentLibrary';

/**
 * Content library mock templates — UAE / Arabic-branch variant.
 *
 * Mixes English and Arabic copy, sized for typical UAE marketing and
 * service-message campaigns. Currency is AED throughout. Variable
 * placeholders ({{1}}, {{2}}, …) follow the WhatsApp Business API
 * template convention.
 */

export const MOCK_CONTENT_TEMPLATES: ContentTemplateRow[] = [
  {
    id: 'tpl-1',
    name: 'wa_emi_reminder_ar',
    bodyPreview:
      'مرحباً {{1}}, قسطك الشهري بقيمة AED {{2}} مستحق بتاريخ {{3}}. الرجاء الدفع لتجنب رسوم التأخير. اضغط للدفع.',
    channel: 'whatsapp',
    category: 'utility',
    languages: ['Arabic', 'English'],
    status: 'approved',
    quality: 'high',
    lastUpdated: new Date(Date.now() - 2 * 86400000).toISOString(),
    usedIn: ['March Recovery — DPD 30-60', 'Card Outstanding Reminder'],
  },
  {
    id: 'tpl-2',
    name: 'wa_emirates_id_otp',
    bodyPreview:
      'Your one-time code for Emirates ID verification is {{1}}. Do not share this code with anyone.',
    channel: 'whatsapp',
    category: 'authentication',
    languages: ['English'],
    status: 'approved',
    quality: 'high',
    lastUpdated: new Date(Date.now() - 5 * 86400000).toISOString(),
    usedIn: ['New User Onboarding'],
  },
  {
    id: 'tpl-3',
    name: 'wa_ramadan_offer_ar',
    bodyPreview:
      'رمضان كريم {{1}}! 🌙 استمتع بخصم AED {{2}} على طلباتك خلال الشهر الفضيل. تسوّق الآن.',
    channel: 'whatsapp',
    category: 'marketing',
    languages: ['Arabic'],
    status: 'approved',
    quality: 'high',
    lastUpdated: new Date(Date.now() - 1 * 86400000).toISOString(),
    usedIn: ['Ramadan Flash Sale', 'Iftar Specials'],
  },
  {
    id: 'tpl-4',
    name: 'wa_eid_cashback_en',
    bodyPreview:
      'Eid Mubarak {{1}}! Get AED {{2}} cashback on your next purchase this Eid. Shop today.',
    channel: 'whatsapp',
    category: 'marketing',
    languages: ['English'],
    status: 'approved',
    quality: 'high',
    lastUpdated: new Date(Date.now() - 3 * 86400000).toISOString(),
    usedIn: ['Eid Al-Fitr Promo 2026'],
  },
  {
    id: 'tpl-5',
    name: 'sms_bill_due_en',
    bodyPreview:
      'Your monthly bill of AED {{1}} is due on {{2}}. Pay now to avoid disconnection: {{3}}',
    channel: 'sms',
    category: 'utility',
    languages: ['English'],
    status: 'approved',
    quality: 'high',
    lastUpdated: new Date(Date.now() - 12 * 86400000).toISOString(),
    usedIn: ['Postpaid Reminder', 'Utility Recovery'],
  },
  {
    id: 'tpl-6',
    name: 'sms_emi_reminder_ar',
    bodyPreview:
      'عزيزي العميل، قسطك بقيمة AED {{1}} مستحق بتاريخ {{2}}. للدفع: {{3}}',
    channel: 'sms',
    category: 'utility',
    languages: ['Arabic'],
    status: 'approved',
    quality: 'high',
    lastUpdated: new Date(Date.now() - 4 * 86400000).toISOString(),
    usedIn: ['DPD 30 Outreach'],
  },
  {
    id: 'tpl-7',
    name: 'sms_cashback_promo_en',
    bodyPreview:
      'Pre-approved AED {{1}} cashback! Apply: {{2}}. T&C apply. Reply STOP to opt out.',
    channel: 'sms',
    category: 'marketing',
    languages: ['English'],
    status: 'pending_approval',
    quality: null,
    lastUpdated: new Date(Date.now() - 1 * 86400000).toISOString(),
    usedIn: ['Q2 Cashback Push'],
  },
  {
    id: 'tpl-8',
    name: 'rcs_order_shipped',
    bodyPreview: 'Your order #{{1}} has shipped. Track: {{2}}',
    channel: 'rcs',
    category: 'utility',
    languages: ['English', 'Arabic'],
    status: 'draft',
    quality: null,
    lastUpdated: new Date(Date.now() - 3 * 3600000).toISOString(),
    usedIn: [],
  },
  {
    id: 'tpl-9',
    name: 'wa_loan_restructure_invite',
    bodyPreview:
      'We noticed your request. A specialist can help restructure your loan. Reply YES to schedule a call.',
    channel: 'whatsapp',
    category: 'utility',
    languages: ['English'],
    status: 'rejected',
    quality: null,
    lastUpdated: new Date(Date.now() - 8 * 86400000).toISOString(),
    usedIn: [],
    rejectionReason:
      'Content may imply debt relief without required disclaimers. Revise body per CBUAE policy 4.2.',
  },
  {
    id: 'tpl-10',
    name: 'wa_welcome_uae_ar',
    bodyPreview:
      'أهلاً بك {{1}} في باي تي إم الإمارات 🎉 ابدأ تجربتك في دقيقتين: {{2}}',
    channel: 'whatsapp',
    category: 'marketing',
    languages: ['Arabic'],
    status: 'approved',
    quality: 'high',
    lastUpdated: new Date(Date.now() - 20 * 86400000).toISOString(),
    usedIn: ['New User Welcome — UAE'],
  },
  {
    id: 'tpl-11',
    name: 'sms_welcome_short_en',
    bodyPreview: 'Welcome to Paytm UAE. Your registered mobile is verified.',
    channel: 'sms',
    category: 'utility',
    languages: ['English'],
    status: 'approved',
    quality: 'medium',
    lastUpdated: new Date(Date.now() - 6 * 3600000).toISOString(),
    usedIn: ['New User Welcome — UAE'],
  },
  {
    id: 'tpl-12',
    name: 'rcs_ramadan_offers_carousel',
    bodyPreview:
      'Rich carousel of Ramadan offers across grocery, fashion, and travel — taps deep-link into the app.',
    channel: 'rcs',
    category: 'marketing',
    languages: ['English', 'Arabic'],
    status: 'paused',
    quality: 'medium',
    lastUpdated: new Date(Date.now() - 30 * 86400000).toISOString(),
    usedIn: ['Ramadan 2025 Pilot'],
  },
];
