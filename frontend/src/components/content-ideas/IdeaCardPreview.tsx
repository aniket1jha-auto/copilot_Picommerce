import type { IdeaCategory } from '@/data/contentIdeas';

function WaveformPreview({ color }: { color: string }) {
  const heights = [40, 65, 35, 80, 50, 90, 45, 70, 55, 85, 40, 60];
  return (
    <div className="flex h-14 items-end justify-center gap-0.5 px-2 pb-2 pt-3">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full opacity-90"
          style={{
            height: `${h}%`,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
}

function ChatBubblePreview({ align }: { align: 'left' | 'right' }) {
  return (
    <div
      className={`flex px-3 pb-2 pt-3 ${align === 'right' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[88%] rounded-2xl px-2.5 py-1.5 text-[10px] leading-snug text-white ${
          align === 'right' ? 'rounded-br-sm bg-[#25D366]' : 'rounded-bl-sm bg-white/15'
        }`}
      >
        Hi — quick follow-up on your request…
      </div>
    </div>
  );
}

function SmsPreview() {
  return (
    <div className="px-3 pb-2 pt-3">
      <div className="rounded-md bg-white/10 px-2 py-1.5 text-[10px] leading-snug text-white/90 ring-1 ring-white/10">
        BRAND: Your payment of AED 12,400 is due tomorrow. Pay: pay.tm/xx
      </div>
    </div>
  );
}

function SequencePreview({ color }: { color: string }) {
  const steps = ['Call', 'WA', 'SMS'];
  return (
    <div className="flex items-center justify-center gap-1 px-3 pb-2 pt-3">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div
            className="rounded-md px-2 py-1 text-[9px] font-semibold text-white/95 ring-1 ring-white/15"
            style={{ backgroundColor: `${color}99` }}
          >
            {label}
          </div>
          {i < steps.length - 1 && (
            <span className="mx-0.5 text-[10px] text-white/40">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

function InsightsPreview() {
  const bars = [32, 48, 40, 65, 52, 70, 45];
  return (
    <div className="flex h-14 items-end justify-center gap-1 px-4 pb-2 pt-3">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-2 rounded-sm bg-cyan/80"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

const PREVIEW_COLORS: Record<IdeaCategory, string> = {
  voice: '#F59E0B',
  whatsapp: '#25D366',
  sms: '#818CF8',
  sequence: '#A78BFA',
  insights: '#00BAF2',
};

export function IdeaCardPreview({ category }: { category: IdeaCategory }) {
  const c = PREVIEW_COLORS[category];
  return (
    <div className="mt-3 overflow-hidden rounded-md bg-navy ring-1 ring-white/10">
      {category === 'voice' && <WaveformPreview color={c} />}
      {category === 'whatsapp' && <ChatBubblePreview align="right" />}
      {category === 'sms' && <SmsPreview />}
      {category === 'sequence' && <SequencePreview color={c} />}
      {category === 'insights' && <InsightsPreview />}
    </div>
  );
}
