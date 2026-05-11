'use client';

import { useState } from 'react';
import type { ElementType } from 'react';
import { PhoneCall, User, Volume2, Clock, RotateCcw, Timer, CheckSquare, XSquare, ChevronDown } from 'lucide-react';

export interface VoiceConfig {
  script: string;
  language: string;
  voiceGender: 'male' | 'female';
  voiceTone: 'professional' | 'friendly' | 'urgent';
  callWindowStart: string;
  callWindowEnd: string;
  maxRetries: number;
  durationCap: number;
  successCriteria: string[];
  failureCriteria: string[];
}

interface VoiceCallConfigProps {
  config: VoiceConfig;
  onUpdate: (config: Partial<VoiceConfig>) => void;
}

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'arabic_english', label: 'Arabic + English (code-switch)' },
  { value: 'urdu', label: 'Urdu' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'tagalog', label: 'Tagalog' },
];

const DURATION_OPTIONS = [
  { value: 2, label: '2 minutes' },
  { value: 3, label: '3 minutes' },
  { value: 5, label: '5 minutes' },
  { value: 7, label: '7 minutes' },
  { value: 10, label: '10 minutes' },
];

const SUCCESS_CRITERIA = [
  { id: 'agreed', label: 'User agreed / expressed interest' },
  { id: 'callback', label: 'Asked for callback at a specific time' },
  { id: 'completed', label: 'Completed action on call (e.g., KYC OTP)' },
  { id: 'more_info', label: 'Requested more information' },
];

const FAILURE_CRITERIA = [
  { id: 'declined', label: 'User explicitly declined the offer' },
  { id: 'dnd', label: 'Asked not to be called again (DND)' },
  { id: 'hostile', label: 'Hostile / abusive response' },
];

const VOICE_PERSONAS: Array<{
  gender: 'male' | 'female';
  tone: 'professional' | 'friendly' | 'urgent';
  label: string;
  description: string;
}> = [
  { gender: 'male', tone: 'professional', label: 'Male — Professional', description: 'Formal, corporate tone' },
  { gender: 'male', tone: 'friendly', label: 'Male — Friendly', description: 'Warm, conversational' },
  { gender: 'male', tone: 'urgent', label: 'Male — Urgent', description: 'Direct, time-sensitive' },
  { gender: 'female', tone: 'professional', label: 'Female — Professional', description: 'Formal, corporate tone' },
  { gender: 'female', tone: 'friendly', label: 'Female — Friendly', description: 'Warm, conversational' },
  { gender: 'female', tone: 'urgent', label: 'Female — Urgent', description: 'Direct, time-sensitive' },
];

interface ConversationTurn {
  role: 'agent' | 'user';
  text: string;
}

function generatePreviewConversation(config: VoiceConfig): ConversationTurn[] {
  const agentName = config.voiceGender === 'female' ? 'Priya' : 'Rahul';
  const langNote =
    config.language === 'hindi' ? '(in Hindi)' :
    config.language === 'arabic'
      ? '(in Arabic)'
      : config.language === 'arabic_english'
        ? '(in Arabic + English code-switch)'
        : '';

  const toneGreeting =
    config.voiceTone === 'urgent'
      ? `Namaste, this is ${agentName} calling from Paytm ${langNote}. This is an important call regarding your account — please do not disconnect.`
      : config.voiceTone === 'friendly'
        ? `Hi there! This is ${agentName} calling from Paytm ${langNote}. Hope you're having a great day!`
        : `Good morning. This is ${agentName} calling on behalf of Paytm ${langNote}. Is this a good time to speak?`;

  return [
    {
      role: 'agent',
      text: toneGreeting,
    },
    {
      role: 'user',
      text: 'Haan, bolo. (Yes, go ahead.)',
    },
    {
      role: 'agent',
      text: "I'm calling regarding your Paytm UAE account. You have a pending Emirates ID verification that needs to be completed to continue using all features. I can help you complete it right now — it only takes 2 minutes. Would you like to proceed?",
    },
    {
      role: 'user',
      text: "What do I need to do?",
    },
    {
      role: 'agent',
      text: "It's very simple. I'll guide you step by step. You'll need your Emirates ID handy. I'll send a one-time code to your registered mobile, you read it back, and we're done. Shall I send it now?",
    },
    {
      role: 'user',
      text: "I don't have time right now.",
    },
    {
      role: 'agent',
      text: "No problem at all. Can I note down a preferred time when I can call you back? This will make sure you don't face any interruption to your account.",
    },
    {
      role: 'user',
      text: "Kal subah 11 baje call karo. (Call me tomorrow morning at 11 AM.)",
    },
    {
      role: 'agent',
      text: "Perfect! I've noted your callback preference for tomorrow at 11 AM. You'll receive a confirmation SMS shortly. Thank you for your time, and have a wonderful day!",
    },
  ];
}

function SectionLabel({ icon: Icon, label }: { icon: ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon size={15} className="text-cyan shrink-0" />
      <span className="text-sm font-semibold text-text-primary">{label}</span>
    </div>
  );
}

export function VoiceCallConfig({ config, onUpdate }: VoiceCallConfigProps) {
  const [showPreview, setShowPreview] = useState(false);

  const preview = generatePreviewConversation(config);

  function toggleSuccess(id: string) {
    const current = config.successCriteria;
    const updated = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    onUpdate({ successCriteria: updated });
  }

  function toggleFailure(id: string) {
    const current = config.failureCriteria;
    const updated = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    onUpdate({ failureCriteria: updated });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Call Script */}
      <div>
        <SectionLabel icon={PhoneCall} label="Call Script / Prompt" />
        <textarea
          value={config.script}
          onChange={(e) => onUpdate({ script: e.target.value })}
          rows={5}
          placeholder={
            'e.g., "Call the user and introduce yourself as calling from Paytm. ' +
            'Inform them about their pending KYC verification. ' +
            'If interested, offer to help complete it now on the call. ' +
            'If they\'re busy, ask for a preferred callback time and confirm it."'
          }
          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-text-primary placeholder-text-secondary outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/20 resize-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-text-secondary">
            Describe the call objective in plain language. The AI agent will handle objections and follow-ups naturally.
          </p>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-cyan px-3 py-1.5 text-xs font-medium text-cyan transition-colors hover:bg-cyan/5"
          >
            <Volume2 size={12} />
            {showPreview ? 'Hide Preview' : 'Preview Conversation'}
            <ChevronDown
              size={12}
              className={`transition-transform ${showPreview ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Conversation Preview Panel */}
        {showPreview && (
          <div className="mt-3 rounded-lg border border-[rgba(0,186,242,0.25)] bg-[rgba(0,186,242,0.04)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Simulated Conversation Preview
              </span>
            </div>
            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
              {preview.map((turn, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${turn.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={[
                      'h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold',
                      turn.role === 'agent'
                        ? 'bg-cyan/15 text-cyan'
                        : 'bg-[#F3F4F6] text-text-secondary',
                    ].join(' ')}
                  >
                    {turn.role === 'agent' ? 'AI' : 'U'}
                  </div>
                  <div
                    className={[
                      'max-w-[75%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                      turn.role === 'agent'
                        ? 'bg-white border border-[#E5E7EB] text-text-primary rounded-tl-sm'
                        : 'bg-[#F3F4F6] text-text-secondary rounded-tr-sm',
                    ].join(' ')}
                  >
                    {turn.text}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-text-secondary border-t border-[#E5E7EB] pt-2">
              ✦ This is a simulated preview based on your script. Actual conversations will vary based on user responses.
            </p>
          </div>
        )}
      </div>

      {/* Language + Voice Persona in a 2-col grid */}
      <div className="grid grid-cols-2 gap-5">
        {/* Language */}
        <div>
          <SectionLabel icon={Volume2} label="Language" />
          <select
            value={config.language}
            onChange={(e) => onUpdate({ language: e.target.value })}
            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Call Window */}
        <div>
          <SectionLabel icon={Clock} label="Call Window" />
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={config.callWindowStart}
              onChange={(e) => onUpdate({ callWindowStart: e.target.value })}
              className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
            />
            <span className="text-xs text-text-secondary shrink-0">to</span>
            <input
              type="time"
              value={config.callWindowEnd}
              onChange={(e) => onUpdate({ callWindowEnd: e.target.value })}
              className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
            />
          </div>
        </div>
      </div>

      {/* Voice Persona — 2x3 grid */}
      <div>
        <SectionLabel icon={User} label="Voice Persona" />
        <div className="grid grid-cols-3 gap-2.5">
          {VOICE_PERSONAS.map((persona) => {
            const isSelected =
              config.voiceGender === persona.gender && config.voiceTone === persona.tone;
            return (
              <button
                key={`${persona.gender}-${persona.tone}`}
                type="button"
                onClick={() =>
                  onUpdate({ voiceGender: persona.gender, voiceTone: persona.tone })
                }
                className={[
                  'flex flex-col items-start gap-0.5 rounded-lg border-2 p-3 text-left transition-all',
                  isSelected
                    ? 'border-cyan bg-[rgba(0,186,242,0.06)]'
                    : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 w-full">
                  <div
                    className={[
                      'h-3.5 w-3.5 rounded-full border-2 transition-colors shrink-0',
                      isSelected ? 'border-cyan bg-cyan' : 'border-[#D1D5DB]',
                    ].join(' ')}
                  />
                  <span
                    className={[
                      'text-xs font-semibold leading-tight',
                      isSelected ? 'text-cyan' : 'text-text-primary',
                    ].join(' ')}
                  >
                    {persona.label}
                  </span>
                </div>
                <span className="text-[10px] text-text-secondary pl-5">
                  {persona.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Max Retries + Duration Cap */}
      <div className="grid grid-cols-2 gap-5">
        {/* Max Retries */}
        <div>
          <SectionLabel icon={RotateCcw} label="Max Retries" />
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={5}
              value={config.maxRetries}
              onChange={(e) =>
                onUpdate({ maxRetries: Math.min(5, Math.max(1, Number(e.target.value))) })
              }
              className="w-20 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary text-center outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
            />
            <span className="text-xs text-text-secondary">retries (1–5)</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Gap between retries: 4 hours (configurable)
          </p>
        </div>

        {/* Duration Cap */}
        <div>
          <SectionLabel icon={Timer} label="Call Duration Cap" />
          <select
            value={config.durationCap}
            onChange={(e) => onUpdate({ durationCap: Number(e.target.value) })}
            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-secondary">
            AI will gracefully wrap up the call before this limit.
          </p>
        </div>
      </div>

      {/* Success Criteria */}
      <div>
        <SectionLabel icon={CheckSquare} label="Success Criteria" />
        <p className="mb-2 text-xs text-text-secondary">
          Mark these outcomes as a positive response — triggers next waterfall step or campaign exit.
        </p>
        <div className="flex flex-col gap-2">
          {SUCCESS_CRITERIA.map((item) => {
            const checked = config.successCriteria.includes(item.id);
            return (
              <label
                key={item.id}
                className="flex items-center gap-2.5 cursor-pointer select-none"
              >
                <span
                  onClick={() => toggleSuccess(item.id)}
                  className={[
                    'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                    checked ? 'border-success bg-success' : 'border-[#D1D5DB] bg-white',
                  ].join(' ')}
                >
                  {checked && (
                    <svg viewBox="0 0 10 8" fill="none" className="h-2.5 w-2.5">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className="text-sm text-text-primary"
                  onClick={() => toggleSuccess(item.id)}
                >
                  {item.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Failure Criteria */}
      <div>
        <SectionLabel icon={XSquare} label="Failure Criteria" />
        <p className="mb-2 text-xs text-text-secondary">
          Mark these outcomes as a negative response — stops further outreach to this user.
        </p>
        <div className="flex flex-col gap-2">
          {FAILURE_CRITERIA.map((item) => {
            const checked = config.failureCriteria.includes(item.id);
            return (
              <label
                key={item.id}
                className="flex items-center gap-2.5 cursor-pointer select-none"
              >
                <span
                  onClick={() => toggleFailure(item.id)}
                  className={[
                    'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                    checked ? 'border-error bg-error' : 'border-[#D1D5DB] bg-white',
                  ].join(' ')}
                >
                  {checked && (
                    <svg viewBox="0 0 10 8" fill="none" className="h-2.5 w-2.5">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className="text-sm text-text-primary"
                  onClick={() => toggleFailure(item.id)}
                >
                  {item.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
