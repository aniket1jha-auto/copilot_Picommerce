import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, ImageIcon } from 'lucide-react';
import { Modal, Button, cn, useToast } from '@/components/ui';
import { useMediaLibrary } from '@/context/MediaLibraryContext';
import type { MediaFile } from '@/types/mediaLibrary';

/**
 * AI image generation for template headers.
 *
 * Mock: we don't call a real image model here — the "generated"
 * results are seeded URLs from picsum.photos so each prompt+style
 * combination yields visually distinct, photographic placeholders.
 * The chosen result is converted to a Blob → File and dropped into
 * the central Media Library via `addUploadedFiles`, then handed
 * back to the caller exactly like an upload would be — so the
 * template builder doesn't need to special-case AI assets.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the new MediaFile once the user picks a generated image. */
  onSelect: (file: MediaFile) => void;
}

type StyleId = 'photographic' | 'illustration' | 'flat' | '3d';
type AspectId = 'square' | 'landscape' | 'portrait';

const STYLES: Array<{ id: StyleId; label: string; hint: string }> = [
  { id: 'photographic', label: 'Photographic', hint: 'Realistic, camera-look' },
  { id: 'illustration', label: 'Illustration', hint: 'Hand-drawn, colorful' },
  { id: 'flat', label: 'Flat design', hint: 'Geometric, clean' },
  { id: '3d', label: '3D rendering', hint: 'Volumetric, glossy' },
];

const ASPECTS: Array<{ id: AspectId; label: string; w: number; h: number }> = [
  { id: 'square', label: 'Square — 1:1', w: 800, h: 800 },
  { id: 'landscape', label: 'Landscape — 16:9', w: 1280, h: 720 },
  { id: 'portrait', label: 'Portrait — 9:16', w: 720, h: 1280 },
];

const PROMPT_EXAMPLES = [
  'Smiling Indian customer holding a phone with a Paytm wallet badge',
  'Festive Diwali shopping illustration with cashback offers',
  'Modern fintech illustration of contactless payment at a small shop',
  'KYC verification — clean, minimal UI mockup on a phone',
];

interface GeneratedVariant {
  id: string;
  url: string;
  alt: string;
}

export function MediaAIGenerateModal({ open, onClose, onSelect }: Props) {
  const { addUploadedFiles } = useMediaLibrary();
  const { toast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<StyleId>('photographic');
  const [aspect, setAspect] = useState<AspectId>('landscape');
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState<GeneratedVariant[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  function reset() {
    setPrompt('');
    setStyle('photographic');
    setAspect('landscape');
    setVariants([]);
    setGenerating(false);
    setPending(null);
  }

  function close() {
    reset();
    onClose();
  }

  function generate() {
    const cleaned = prompt.trim();
    if (!cleaned) return;
    setGenerating(true);
    setVariants([]);

    // Mock generation: pretend an image model is producing 4 variants.
    // Picsum's seed param is deterministic per seed string, so the
    // same prompt + style yields the same set on retry — until the
    // user hits "Regenerate", which appends a nonce.
    window.setTimeout(() => {
      const aspectSpec = ASPECTS.find((a) => a.id === aspect)!;
      const seedBase = `${slug(cleaned)}-${style}-${Date.now().toString(36)}`;
      setVariants(
        [0, 1, 2, 3].map((i) => ({
          id: `${seedBase}-${i}`,
          url: `https://picsum.photos/seed/${seedBase}-${i}/${aspectSpec.w}/${aspectSpec.h}`,
          alt: cleaned,
        })),
      );
      setGenerating(false);
    }, 1800);
  }

  async function selectVariant(variant: GeneratedVariant) {
    setPending(variant.id);
    try {
      // Fetch the image and wrap as a File so it flows through the
      // same Media Library path as any other upload.
      const res = await fetch(variant.url);
      const blob = await res.blob();
      const filename = `ai-${slug(prompt.trim()).slice(0, 40)}-${Date.now().toString(36)}.jpg`;
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      const created = addUploadedFiles([file], {
        tags: ['ai-generated', style],
        campaignId: null,
      });
      const first = created[0];
      if (first) {
        onSelect(first);
        toast({
          kind: 'success',
          title: 'Image added',
          body: `${first.name} is now in your Media Library and attached to this template.`,
        });
      }
      reset();
      onClose();
    } catch {
      toast({
        kind: 'error',
        title: 'Could not save image',
        body: 'Network issue while fetching the generated image — try again.',
      });
      setPending(null);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Generate image with AI" size="lg">
      <div className="flex flex-col gap-4">
        {/* Prompt */}
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-text-primary">
            Describe the image you need *
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="e.g., Festive Diwali shopping illustration with a Paytm cashback badge"
            className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-[13px] focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PROMPT_EXAMPLES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrompt(p)}
                className="rounded-full border border-[#E5E7EB] bg-white px-2.5 py-0.5 text-[11px] text-text-secondary hover:border-cyan/40 hover:text-cyan"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Style + Aspect */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-text-primary">
              Style
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {STYLES.map((s) => {
                const active = style === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={cn(
                      'rounded-md border-2 px-2.5 py-1.5 text-left text-[12px] transition-colors',
                      active
                        ? 'border-cyan bg-cyan/5 text-text-primary'
                        : 'border-[#E5E7EB] bg-white text-text-secondary hover:border-cyan/40',
                    )}
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="text-[10.5px] text-text-tertiary">{s.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-text-primary">
              Aspect ratio
            </label>
            <div className="flex flex-col gap-1.5">
              {ASPECTS.map((a) => {
                const active = aspect === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAspect(a.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-md border-2 px-2.5 py-1.5 text-left text-[12px] transition-colors',
                      active
                        ? 'border-cyan bg-cyan/5 text-text-primary'
                        : 'border-[#E5E7EB] bg-white text-text-secondary hover:border-cyan/40',
                    )}
                  >
                    <AspectIcon id={a.id} active={active} />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Generate / Regenerate button */}
        <div className="flex items-center justify-between gap-2 border-t border-[#F3F4F6] pt-3">
          <p className="text-[11px] text-text-tertiary">
            Generated images are saved to your Media Library automatically.
          </p>
          <Button
            variant="primary"
            size="sm"
            iconLeft={
              generating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : variants.length > 0 ? (
                <RefreshCw size={14} />
              ) : (
                <Sparkles size={14} />
              )
            }
            disabled={!prompt.trim() || generating}
            onClick={generate}
          >
            {generating
              ? 'Generating…'
              : variants.length > 0
                ? 'Regenerate'
                : 'Generate 4 variants'}
          </Button>
        </div>

        {/* Variants grid */}
        {generating ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex aspect-square animate-pulse items-center justify-center rounded-md border border-[#E5E7EB] bg-[#F9FAFB]"
              >
                <ImageIcon size={20} className="text-text-tertiary" />
              </div>
            ))}
          </div>
        ) : variants.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
              Pick one
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {variants.map((v) => {
                const isPending = pending === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={pending !== null}
                    onClick={() => selectVariant(v)}
                    className={cn(
                      'group relative aspect-square overflow-hidden rounded-md ring-1 transition-all',
                      isPending
                        ? 'ring-cyan'
                        : 'ring-[#E5E7EB] hover:ring-2 hover:ring-cyan disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    <img
                      src={v.url}
                      alt={v.alt}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {isPending && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 size={20} className="animate-spin text-white" />
                      </div>
                    )}
                    {!isPending && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="text-[10.5px] font-medium text-white">Use this image</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center">
            <Sparkles size={20} className="mx-auto mb-1.5 text-text-tertiary" />
            <p className="text-[12px] text-text-secondary">
              Enter a prompt above and hit Generate to see 4 image variants.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[#F3F4F6] pt-3">
          <Button variant="secondary" size="sm" onClick={close}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function AspectIcon({ id, active }: { id: AspectId; active: boolean }) {
  const stroke = active ? '#00BAF2' : '#9CA3AF';
  if (id === 'square') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="2" width="10" height="10" rx="1.5" stroke={stroke} strokeWidth="1.5" />
      </svg>
    );
  }
  if (id === 'landscape') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="3.5" width="11" height="7" rx="1.5" stroke={stroke} strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="3.5" y="1.5" width="7" height="11" rx="1.5" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
