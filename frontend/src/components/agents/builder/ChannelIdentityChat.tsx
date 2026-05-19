import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown } from 'lucide-react';
import type { AgentConfiguration, ChatChannelId } from '@/types/agent';
import {
  CHAT_CHANNEL_IDENTITY_CARDS,
  CHAT_LANGUAGES,
  MOCK_WHATSAPP_PHONE_NUMBERS,
  MOCK_WHATSAPP_WABA_ACCOUNTS,
} from '@/data/chatAgentConstants';

interface Props {
  config: AgentConfiguration;
  onSave: (config: Partial<AgentConfiguration>) => void;
  onNext: () => void;
  onPrev: () => void;
  /**
   * When rendered inline inside the unified Prompts & Instructions step,
   * the wrapping page owns the wizard footer — suppress the local one.
   */
  hideFooter?: boolean;
}

export function ChannelIdentityChat({ config, onSave, onNext, onPrev, hideFooter = false }: Props) {
  const [channel, setChannel] = useState<ChatChannelId>(config.chatChannel ?? 'whatsapp');
  const [displayName, setDisplayName] = useState(config.chatDisplayName ?? '');
  const [languages, setLanguages] = useState<string[]>(() => {
    const cur = config.chatLanguages?.length ? config.chatLanguages : ['English'];
    return cur;
  });
  const [fallbackLanguage, setFallbackLanguage] = useState(
    config.chatFallbackLanguage ?? 'English',
  );
  const [accountId, setAccountId] = useState(config.chatWhatsAppAccountId ?? '');
  const [phoneId, setPhoneId] = useState(config.chatWhatsAppPhoneId ?? '');

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!langRef.current?.contains(e.target as Node)) setLangMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const hasWaAccounts = MOCK_WHATSAPP_WABA_ACCOUNTS.length > 0;

  const toggleLanguage = (label: string) => {
    setLanguages((prev) => {
      if (label === 'Auto-detect') {
        if (prev.includes('Auto-detect')) return prev.filter((l) => l !== 'Auto-detect');
        return [...prev, 'Auto-detect'];
      }
      const next = prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label];
      if (!next.length) return ['English'];
      return next;
    });
  };

  const handleNext = () => {
    onSave({
      chatChannel: channel,
      chatDisplayName: displayName,
      chatLanguages: languages,
      chatFallbackLanguage: fallbackLanguage,
      chatWhatsAppAccountId: channel === 'whatsapp' ? accountId : undefined,
      chatWhatsAppPhoneId: channel === 'whatsapp' ? phoneId : undefined,
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Channel & Identity</h2>
        <p className="text-sm text-text-secondary">
          Configure which channel this agent operates on and how it presents itself to customers
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Which channel will this agent handle?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {CHAT_CHANNEL_IDENTITY_CARDS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannel(c.id)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  channel === c.id
                    ? 'border-cyan bg-cyan/5'
                    : 'border-[#E5E7EB] hover:border-cyan/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xl mb-1">{c.icon}</div>
                    <div className="text-sm font-semibold text-text-primary">{c.label}</div>
                    <p className="text-xs text-text-secondary mt-1 leading-snug">{c.description}</p>
                  </div>
                  {channel === c.id && (
                    <Check size={18} className="text-cyan shrink-0" strokeWidth={2.5} />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {channel === 'whatsapp' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">WhatsApp connection</h3>
            {!hasWaAccounts ? (
              <p className="text-sm text-text-secondary">
                No account connected — go to{' '}
                <Link to="/settings/integrations" className="font-medium text-cyan hover:underline">
                  Settings → Integrations
                </Link>
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    WhatsApp Account
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                  >
                    <option value="">Select account</option>
                    {MOCK_WHATSAPP_WABA_ACCOUNTS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Phone Number
                  </label>
                  <select
                    value={phoneId}
                    onChange={(e) => setPhoneId(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                  >
                    <option value="">Select number</option>
                    {MOCK_WHATSAPP_PHONE_NUMBERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Agent Identity</h3>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Priya from Paytm Support"
              className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
            />
          </div>

          <div className="relative" ref={langRef}>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Response Language
            </label>
            <button
              type="button"
              onClick={() => setLangMenuOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-left text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
            >
              <span className="text-text-primary truncate">
                {languages.length ? languages.join(' · ') : 'Select languages'}
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-text-secondary transition-transform ${langMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {langMenuOpen && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg">
                {CHAT_LANGUAGES.map((l) => (
                  <label
                    key={l.id}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={languages.includes(l.label)}
                      onChange={() => toggleLanguage(l.label)}
                      className="h-4 w-4 rounded border-gray-300 text-cyan focus:ring-cyan"
                    />
                    <span>{l.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Fallback Language
            </label>
            <select
              value={fallbackLanguage}
              onChange={(e) => setFallbackLanguage(e.target.value)}
              className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
            >
              {CHAT_LANGUAGES.filter((l) => l.id !== 'auto').map((l) => (
                <option key={l.id} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!hideFooter && (
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex items-center gap-2 rounded-md border border-[#E5E7EB] px-6 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 rounded-md bg-cyan px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan/90"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
