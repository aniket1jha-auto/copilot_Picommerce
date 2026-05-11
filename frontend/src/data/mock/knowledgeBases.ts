/**
 * Knowledge Bases — Paytm-themed mock seed (Phase 2).
 * Spec: docs/KB_SPEC.md §8, docs/MOCKS_PLAN.md §7
 */

import type { KnowledgeBase, KBDocument, KBChunk } from '@/types/knowledgeBase';

export const mockKnowledgeBases: KnowledgeBase[] = [
  {
    id: 'kb-001',
    name: 'Paytm Product Catalog v3',
    description:
      'Wallet, UPI, Bank, Postpaid, Insurance, Investments — top-level descriptions, eligibility, pricing, and FAQs.',
    source: 'files',
    status: 'ready',
    documentCount: 82,
    chunkCount: 1420,
    tokenCount: 1_240_000,
    embeddingModel: 'text-embedding-3-large',
    chunkSize: 512,
    chunkOverlap: 64,
    splitter: 'recursive',
    usedByAgentIds: ['agent_1', 'agent_2'],
    createdAt: '2026-02-12T08:00:00Z',
    updatedAt: '2026-04-26T14:22:00Z',
  },
  {
    id: 'kb-002',
    name: 'Paytm Wallet & UPI Policy',
    description:
      'Terms & conditions, transaction limits, Min/Full KYC tier rules, refund and chargeback flow.',
    source: 'files',
    status: 'ready',
    documentCount: 5,
    chunkCount: 86,
    tokenCount: 72_400,
    embeddingModel: 'text-embedding-3-large',
    chunkSize: 512,
    chunkOverlap: 64,
    splitter: 'recursive',
    usedByAgentIds: ['agent_3'],
    createdAt: '2026-02-12T08:00:00Z',
    updatedAt: '2026-04-22T11:00:00Z',
  },
  {
    id: 'kb-003',
    name: 'Paytm KYC FAQ',
    description:
      'Aadhaar OTP flow, Min/Full KYC differences, common rejection reasons, retry guidance.',
    source: 'files',
    status: 'ready',
    documentCount: 12,
    chunkCount: 124,
    tokenCount: 104_200,
    embeddingModel: 'text-embedding-3-large',
    chunkSize: 512,
    chunkOverlap: 64,
    splitter: 'recursive',
    usedByAgentIds: ['agent_1', 'agent_3'],
    createdAt: '2026-03-04T09:30:00Z',
    updatedAt: '2026-04-28T07:15:00Z',
  },
  {
    id: 'kb-004',
    name: 'Paytm Loan Recovery Playbook',
    description:
      'DPD bucket scripts, settlement guidelines, escalation paths, RBI compliance language.',
    source: 'files',
    status: 'ready',
    documentCount: 18,
    chunkCount: 230,
    tokenCount: 198_400,
    embeddingModel: 'text-embedding-3-large',
    chunkSize: 512,
    chunkOverlap: 64,
    splitter: 'recursive',
    usedByAgentIds: ['agent_2'],
    createdAt: '2026-02-28T06:00:00Z',
    updatedAt: '2026-04-12T10:00:00Z',
  },
  {
    id: 'kb-005',
    name: 'Paytm Help Center',
    description: 'Public help-center URL crawl. Indexing infrastructure not yet wired.',
    source: 'url',
    status: 'empty',
    documentCount: 0,
    chunkCount: 0,
    tokenCount: 0,
    embeddingModel: 'text-embedding-3-large',
    chunkSize: 512,
    chunkOverlap: 64,
    splitter: 'recursive',
    usedByAgentIds: [],
    createdAt: '2026-04-15T09:00:00Z',
    updatedAt: '2026-04-15T09:00:00Z',
  },
];

/* ─── Documents ──────────────────────────────────────────────────────── */

export const mockKnowledgeBaseDocuments: KBDocument[] = [
  // kb-001 (subset shown for the table; counts above are aggregate)
  doc('kb-001', 'kbdoc-00001', 'Paytm Product Catalog v3.pdf', 'pdf', 4_812_345, 280),
  doc('kb-001', 'kbdoc-00002', 'Wallet — features and limits.docx', 'docx', 412_000, 86),
  doc('kb-001', 'kbdoc-00003', 'UPI — services and pricing.docx', 'docx', 388_400, 74),
  doc('kb-001', 'kbdoc-00004', 'Postpaid — eligibility & repayment.pdf', 'pdf', 1_104_220, 132),
  doc('kb-001', 'kbdoc-00005', 'Insurance — products and partners.pdf', 'pdf', 962_100, 102),
  // kb-002
  doc('kb-002', 'kbdoc-00101', 'Paytm Wallet & UPI Policy.pdf', 'pdf', 1_840_500, 56),
  doc('kb-002', 'kbdoc-00102', 'Refund & chargeback flow.docx', 'docx', 168_800, 18),
  doc('kb-002', 'kbdoc-00103', 'Tier-wise transaction limits.csv', 'csv', 32_400, 4),
  doc('kb-002', 'kbdoc-00104', 'Compliance addendum 2026-Q1.pdf', 'pdf', 220_120, 6),
  doc('kb-002', 'kbdoc-00105', 'Customer disclosure language (en + hi).docx', 'docx', 110_440, 2),
  // kb-003
  doc('kb-003', 'kbdoc-00201', 'Paytm KYC FAQ.pdf', 'pdf', 1_204_300, 32),
  doc('kb-003', 'kbdoc-00202', 'Aadhaar OTP flow — happy path.md', 'md', 18_400, 8),
  doc('kb-003', 'kbdoc-00203', 'Aadhaar OTP — failures & retries.md', 'md', 22_100, 12),
  doc('kb-003', 'kbdoc-00204', 'Min vs Full KYC — feature matrix.csv', 'csv', 8_800, 2),
  doc('kb-003', 'kbdoc-00205', 'Common KYC rejection reasons.md', 'md', 14_200, 8),
  // kb-004
  doc('kb-004', 'kbdoc-00301', 'Paytm Loan Recovery Playbook.pdf', 'pdf', 2_402_800, 64),
  doc('kb-004', 'kbdoc-00302', 'DPD 0–30 — soft reminder script.md', 'md', 18_600, 22),
  doc('kb-004', 'kbdoc-00303', 'DPD 31–60 — settlement options.md', 'md', 24_400, 28),
  doc('kb-004', 'kbdoc-00304', 'DPD 61+ — RBI escalation playbook.md', 'md', 30_200, 32),
  doc('kb-004', 'kbdoc-00305', 'Settlement letter template.docx', 'docx', 88_000, 8),
];

function doc(
  kbId: string,
  id: string,
  name: string,
  type: KBDocument['type'],
  sizeBytes: number,
  chunkCount: number,
): KBDocument {
  return {
    id,
    knowledgeBaseId: kbId,
    name,
    type,
    sizeBytes,
    chunkCount,
    status: 'indexed',
    uploadedAt: '2026-04-01T08:00:00Z',
  };
}

/* ─── Chunks ─────────────────────────────────────────────────────────────
 * A small but realistic set used by the retrieval test panel and the
 * (future) transcript drill-down. Hand-curated for retrieval realism.
 */

export const mockKnowledgeBaseChunks: KBChunk[] = [
  // KYC FAQ — the core demo set
  chunk(
    'kbchunk-00001', 'kb-003', 'kbdoc-00201', 'Paytm KYC FAQ.pdf', 'p. 3', 110,
    'Min KYC can be completed using Aadhaar OTP. Provide your Aadhaar number on the app, ' +
      'receive a 6-digit OTP on your registered mobile, and verify within 10 minutes. ' +
      'Min KYC unlocks the wallet for monthly transaction limits up to AED 10,000.',
  ),
  chunk(
    'kbchunk-00002', 'kb-003', 'kbdoc-00201', 'Paytm KYC FAQ.pdf', 'p. 5', 96,
    "If the OTP doesn't arrive within 60 seconds, retry once. Persistent failures usually " +
      'indicate a mismatch between Aadhaar mobile and the registered Paytm number. In that ' +
      'case, Full KYC at a nearby Paytm Centre is required.',
  ),
  chunk(
    'kbchunk-00003', 'kb-003', 'kbdoc-00203', 'Aadhaar OTP — failures & retries.md', '§2', 84,
    'Common OTP failure reasons: (a) Aadhaar-linked mobile not active, (b) UIDAI service ' +
      'temporarily down — retry after 30 minutes, (c) attempts exceeded — wait 24 hours.',
  ),
  chunk(
    'kbchunk-00004', 'kb-003', 'kbdoc-00204', 'Min vs Full KYC — feature matrix.csv', 'row 2', 42,
    'Min KYC: Wallet AED 10K/month limit, no fund transfer. Full KYC: AED 1L/month wallet, fund ' +
      'transfer, merchant payments, savings account eligibility.',
  ),
  chunk(
    'kbchunk-00005', 'kb-003', 'kbdoc-00205', 'Common KYC rejection reasons.md', '§1', 78,
    'Top KYC rejection reasons: (1) Aadhaar number mismatch with PAN, (2) photo unclear or ' +
      'cropped, (3) signature missing on physical form, (4) date of birth not matching Aadhaar.',
  ),
  // Wallet & UPI Policy
  chunk(
    'kbchunk-00101', 'kb-002', 'kbdoc-00101', 'Paytm Wallet & UPI Policy.pdf', 'p. 4', 88,
    'Wallet limits by tier: Min KYC — AED 10,000 monthly. Full KYC — AED 1,00,000 monthly. ' +
      'UPI limits follow NPCI guidelines — AED 1L per transaction subject to receiving bank.',
  ),
  chunk(
    'kbchunk-00102', 'kb-002', 'kbdoc-00101', 'Paytm Wallet & UPI Policy.pdf', 'p. 6', 102,
    'Refunds for failed transactions are auto-processed within 24 hours. If not received in ' +
      '5 business days, raise a ticket via Help → Wallet & Payments → Failed transactions.',
  ),
  chunk(
    'kbchunk-00103', 'kb-002', 'kbdoc-00102', 'Refund & chargeback flow.docx', '§3', 92,
    'Chargeback eligibility: merchant accepted but service not delivered, OR amount debited ' +
      'twice. Customer must raise within 90 days. Resolution SLA — 14 business days.',
  ),
  // Product Catalog
  chunk(
    'kbchunk-00201', 'kb-001', 'kbdoc-00001', 'Paytm Product Catalog v3.pdf', '§1.2', 64,
    'Paytm Wallet · features · KYC tiers · supported merchants · partner banks · pricing.',
  ),
  chunk(
    'kbchunk-00202', 'kb-001', 'kbdoc-00004', 'Postpaid — eligibility & repayment.pdf', 'p. 2', 84,
    'Postpaid eligibility: Full KYC, age 21+, credit score above 650 (CIBIL or Experian). ' +
      'Initial limit AED 20,000. Repayment due on the 15th of every month.',
  ),
  // Loan Recovery Playbook
  chunk(
    'kbchunk-00301', 'kb-004', 'kbdoc-00302', 'DPD 0–30 — soft reminder script.md', '§1', 96,
    'DPD 0–30: opening greeting in Hindi-English mix preferred. Confirm name, mention exact ' +
      "outstanding amount and EMI date. Offer one-tap UPI link as the easiest path. Don't " +
      'pressure; second contact only after 72 hours.',
  ),
  chunk(
    'kbchunk-00302', 'kb-004', 'kbdoc-00303', 'DPD 31–60 — settlement options.md', '§2', 110,
    'DPD 31–60: introduce settlement options if customer expresses inability to pay full. ' +
      'Standard offer: 70% lump-sum within 7 days, OR 100% in 3-month structured EMI plan. ' +
      'Both close the account in good standing.',
  ),
  chunk(
    'kbchunk-00303', 'kb-004', 'kbdoc-00304', 'DPD 61+ — RBI escalation playbook.md', '§4', 88,
    'DPD 61+: mandatory RBI-compliant disclosure language. Mention legal recourse but do not ' +
      'threaten. Always offer transfer to a human collections officer if customer requests.',
  ),
];

function chunk(
  id: string,
  kbId: string,
  docId: string,
  docName: string,
  pageOrSection: string,
  tokenCount: number,
  text: string,
): KBChunk {
  return {
    id,
    knowledgeBaseId: kbId,
    documentId: docId,
    documentName: docName,
    pageOrSection,
    text,
    tokenCount,
  };
}

/**
 * Hand-curated query → chunk-id mapping for the retrieval test panel.
 * Keys are normalized (lowercased, trimmed) substrings — first match wins.
 * If no key matches, the retrieval engine falls back to deterministic random
 * chunks from the same KB.
 */
export const mockRetrievalQueryMap: Array<{
  kbId: string;
  matches: string[];                       // substrings to match against query (lowercase)
  chunkIds: string[];                      // ranked top results
}> = [
  {
    kbId: 'kb-003',
    matches: ['kyc', 'aadhaar', 'otp', 'verify'],
    chunkIds: ['kbchunk-00001', 'kbchunk-00002', 'kbchunk-00003', 'kbchunk-00004'],
  },
  {
    kbId: 'kb-003',
    matches: ['rejection', 'rejected', 'failed kyc', 'reject reason'],
    chunkIds: ['kbchunk-00005', 'kbchunk-00003'],
  },
  {
    kbId: 'kb-002',
    matches: ['wallet limit', 'transaction limit', 'monthly limit'],
    chunkIds: ['kbchunk-00101', 'kbchunk-00102'],
  },
  {
    kbId: 'kb-002',
    matches: ['refund', 'failed transaction', 'chargeback'],
    chunkIds: ['kbchunk-00102', 'kbchunk-00103'],
  },
  {
    kbId: 'kb-001',
    matches: ['postpaid', 'credit', 'cibil', 'eligibility'],
    chunkIds: ['kbchunk-00202', 'kbchunk-00201'],
  },
  {
    kbId: 'kb-004',
    matches: ['settlement', 'dpd 31', 'dpd 60', 'partial payment'],
    chunkIds: ['kbchunk-00302', 'kbchunk-00301'],
  },
  {
    kbId: 'kb-004',
    matches: ['recovery script', 'dpd 0', 'soft reminder', 'first contact'],
    chunkIds: ['kbchunk-00301', 'kbchunk-00302'],
  },
  {
    kbId: 'kb-004',
    matches: ['rbi', 'dpd 60+', 'escalation', 'legal'],
    chunkIds: ['kbchunk-00303', 'kbchunk-00302'],
  },
];
