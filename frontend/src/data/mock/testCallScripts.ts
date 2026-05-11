/**
 * Scripted test calls — Paytm-themed.
 * Played back by the Live Test Console (components/agents/evaluate/TestConsole.tsx).
 * Spec: docs/DEMO_FLOW.md Step 2 + docs/EVAL_SPEC.md §3
 *
 * Three scripts:
 * - kyc-aadhaar:           KYC outreach using Aadhaar OTP. Hits KB + tool successfully.
 * - loan-recovery:         DPD-30 soft reminder. KB retrieval + transfer fallback.
 * - generic:               Catch-all conversational script for any agent without a use-case match.
 *
 * Resolved against:
 * - data/mock/knowledgeBases.ts (chunk IDs)
 * - data/toolConstants.ts (tool IDs)
 *
 * Note: timing values are tuned for demo readability — real production latencies
 * are typically lower than what we show. We bias toward "you can see the phases
 * happening" rather than "blink-and-you-miss-it."
 */

import type { TestCallScript } from '@/types/testCall';

export const testCallScripts: TestCallScript[] = [
  // ────────────────────────────────────────────────────────────────────────
  // KYC Aadhaar OTP — the marquee script
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'kyc-aadhaar',
    label: 'KYC outreach — Aadhaar OTP',
    useCases: ['kyc', 'support', 'sales'],
    openingLine:
      "Namaste, this is your Paytm assistant calling. I'm reaching out about completing your KYC verification — is now a good time?",
    turns: [
      {
        kind: 'agent',
        text:
          "Namaste, this is your Paytm assistant calling. I'm reaching out about completing your KYC verification — is now a good time?",
        latency: { asrMs: 0, llmMs: 280, ttsMs: 220 },
        speakingMs: 1900,
        intent: 'greeting',
      },
      {
        kind: 'user',
        text: "Haan, bolo. Kya karna hai?",
        durationMs: 1400,
        sentiment: 'neutral',
      },
      {
        kind: 'agent',
        text:
          "Bilkul. Min KYC aap Aadhaar OTP se complete kar sakte ho — bas 6-digit OTP register mobile par aayega aur 10 minute mein verify ho jaayega. Kya main aapko link bhej doon?",
        latency: { asrMs: 180, llmMs: 380, kbMs: 90, ttsMs: 240 },
        speakingMs: 4200,
        intent: 'explain_kyc',
        retrievals: [
          {
            id: 'r-001',
            knowledgeBaseId: 'kb-003',
            query: 'how do I complete KYC with Aadhaar OTP?',
            topKChunkIds: ['kbchunk-00001', 'kbchunk-00002', 'kbchunk-00004'],
            citedChunkIds: ['kbchunk-00001'],
            latencyMs: 90,
          },
        ],
      },
      {
        kind: 'user',
        text: "Theek hai, bhejo SMS pe.",
        durationMs: 1200,
        sentiment: 'positive',
      },
      {
        kind: 'agent',
        text:
          "Send kar diya. Aapke registered number par aana chahiye — Aadhaar number daalo, OTP enter karo, bas. Agar 60 second mein OTP nahin aaye to ek baar retry kar lena.",
        latency: { asrMs: 160, llmMs: 320, toolMs: 140, ttsMs: 260 },
        speakingMs: 4500,
        intent: 'confirm_otp_sent',
        toolCalls: [
          {
            id: 'tc-001',
            toolId: 'send_text',
            toolName: 'Send Text',
            input: {
              to: '+91 9XXX 12345',
              templateId: 'paytm_kyc_otp_link_v2',
              variables: { name: 'Customer', expiryMinutes: 10 },
            },
            output: {
              messageId: 'msg-paytm-3a7f9c',
              status: 'queued',
              channel: 'sms',
            },
            status: 'success',
            latencyMs: 140,
          },
        ],
      },
      {
        kind: 'user',
        text: "Aur kuch?",
        durationMs: 1000,
        sentiment: 'neutral',
      },
      {
        kind: 'agent',
        text:
          "Bas yahi tha. KYC complete hone ke baad aap full wallet, fund transfer, aur merchant payments use kar sakte ho. Koi help chahiye to Paytm app pe Help section dekh lena. Dhanyawad!",
        latency: { asrMs: 140, llmMs: 300, kbMs: 80, ttsMs: 240 },
        speakingMs: 4400,
        intent: 'close',
        retrievals: [
          {
            id: 'r-002',
            knowledgeBaseId: 'kb-003',
            query: 'what unlocks after KYC completion',
            topKChunkIds: ['kbchunk-00004'],
            citedChunkIds: ['kbchunk-00004'],
            latencyMs: 80,
          },
        ],
      },
      {
        kind: 'user',
        text: "Theek hai, dhanyawad.",
        durationMs: 900,
        sentiment: 'positive',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // Loan Recovery — DPD-30 soft reminder
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'loan-recovery',
    label: 'Loan recovery — DPD-30 soft reminder',
    useCases: ['loan_recovery', 'collections'],
    openingLine:
      "Hello, this is calling from Paytm Lending — I'm reaching out about your personal loan EMI. Could I confirm I'm speaking to the account holder?",
    turns: [
      {
        kind: 'agent',
        text:
          "Hello, this is calling from Paytm Lending. I'm reaching out about your personal loan EMI that was due on the 15th. Could I confirm I'm speaking to the account holder?",
        latency: { asrMs: 0, llmMs: 280, ttsMs: 240 },
        speakingMs: 3800,
        intent: 'greeting_identify',
      },
      {
        kind: 'user',
        text: "Haan, main hi hoon. Bolo.",
        durationMs: 1300,
        sentiment: 'neutral',
      },
      {
        kind: 'agent',
        text:
          "Theek hai. Aapki EMI of AED 4,250 due hai 15 din se. Aap aaj UPI link se ek tap mein pay kar sakte ho — main bhej doon?",
        latency: { asrMs: 160, llmMs: 320, kbMs: 100, ttsMs: 220 },
        speakingMs: 3600,
        intent: 'state_outstanding',
        retrievals: [
          {
            id: 'r-101',
            knowledgeBaseId: 'kb-004',
            query: 'DPD 0-30 soft reminder script',
            topKChunkIds: ['kbchunk-00301'],
            citedChunkIds: ['kbchunk-00301'],
            latencyMs: 100,
          },
        ],
      },
      {
        kind: 'user',
        text: "Yaar abhi paisa nahi hai. Kya kar sakte ho?",
        durationMs: 1700,
        sentiment: 'frustrated',
      },
      {
        kind: 'agent',
        text:
          "Samajh sakta hoon. Hum aapko ek settlement option de sakte hain — 70% lump-sum 7 din ke andar, ya phir 3-month structured plan. Dono se account good standing mein close ho jaayega. Aapke liye kaunsa convenient hoga?",
        latency: { asrMs: 180, llmMs: 420, kbMs: 110, ttsMs: 260 },
        speakingMs: 5400,
        intent: 'offer_settlement',
        retrievals: [
          {
            id: 'r-102',
            knowledgeBaseId: 'kb-004',
            query: 'settlement options DPD 31-60',
            topKChunkIds: ['kbchunk-00302', 'kbchunk-00301'],
            citedChunkIds: ['kbchunk-00302'],
            latencyMs: 110,
          },
        ],
      },
      {
        kind: 'user',
        text: "3-month plan dekho.",
        durationMs: 1100,
        sentiment: 'neutral',
      },
      {
        kind: 'agent',
        text:
          "Theek hai. Main aapko ek collections officer se connect karta hoon jo aapko exact monthly amount aur paperwork samjha denge. Thoda hold karein.",
        latency: { asrMs: 140, llmMs: 300, toolMs: 220, ttsMs: 240 },
        speakingMs: 3700,
        intent: 'transfer_to_human',
        toolCalls: [
          {
            id: 'tc-101',
            toolId: 'transfer_call',
            toolName: 'Transfer Call',
            input: {
              transferTo: '+91 80XX-COLLECTIONS',
              transferMode: 'warm',
              context: {
                customerId: 'cust-9f3a',
                outstandingAmount: 4250,
                dpdBucket: '0-30',
                customerPreference: '3_month_plan',
              },
            },
            output: { transferId: 'tx-paytm-8b1c', queuePosition: 2, etaSeconds: 38 },
            status: 'success',
            latencyMs: 220,
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  // Generic fallback — works for any agent without a more specific script
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'generic',
    label: 'Sample conversation',
    useCases: ['*'],                          // wildcard
    turns: [
      {
        kind: 'agent',
        text:
          "Hi, this is your Paytm assistant. How can I help you today?",
        latency: { asrMs: 0, llmMs: 240, ttsMs: 200 },
        speakingMs: 2200,
        intent: 'greeting',
      },
      {
        kind: 'user',
        text: "I have a question about my wallet limit.",
        durationMs: 1600,
        sentiment: 'neutral',
      },
      {
        kind: 'agent',
        text:
          "Sure. Min KYC users have a monthly wallet limit of AED 10,000; Full KYC unlocks AED 1 lakh per month. Which one do you have?",
        latency: { asrMs: 180, llmMs: 360, kbMs: 95, ttsMs: 240 },
        speakingMs: 3800,
        intent: 'explain_limits',
        retrievals: [
          {
            id: 'r-201',
            knowledgeBaseId: 'kb-002',
            query: 'wallet monthly limit',
            topKChunkIds: ['kbchunk-00101'],
            citedChunkIds: ['kbchunk-00101'],
            latencyMs: 95,
          },
        ],
      },
      {
        kind: 'user',
        text: "Min KYC.",
        durationMs: 800,
        sentiment: 'neutral',
      },
      {
        kind: 'agent',
        text:
          "Got it. If you complete Full KYC at a Paytm Centre or via biometric, you'll get the higher limit and fund-transfer support. Want me to send the steps?",
        latency: { asrMs: 140, llmMs: 320, ttsMs: 240 },
        speakingMs: 3900,
        intent: 'offer_upgrade',
      },
      {
        kind: 'user',
        text: "No, that's fine for now.",
        durationMs: 1200,
        sentiment: 'positive',
      },
      {
        kind: 'agent',
        text: "No problem. Have a good day!",
        latency: { asrMs: 120, llmMs: 220, ttsMs: 180 },
        speakingMs: 1600,
        intent: 'close',
      },
    ],
  },
];

/** Pick a script that fits a given agent use case; falls back to 'generic'. */
export function pickScriptForUseCase(useCase: string | undefined): TestCallScript {
  if (useCase) {
    const match = testCallScripts.find(
      (s) => s.useCases.includes(useCase) && s.id !== 'generic',
    );
    if (match) return match;
  }
  return testCallScripts.find((s) => s.id === 'generic')!;
}
