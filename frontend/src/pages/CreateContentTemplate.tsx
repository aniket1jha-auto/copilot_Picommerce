import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Smartphone, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import type { ContentTemplateRow, TemplateChannel, TemplateCategory } from '@/types/contentLibrary';
import type { MediaPickerRole } from '@/types/mediaLibrary';
import {
  TemplateMediaField,
  type TemplateMediaSelection,
} from '@/components/content-library/TemplateMediaField';
import { useMediaLibrary } from '@/context/MediaLibraryContext';
import { sendAnthropicChatMessage } from '@/utils/anthropicChat';

const LANG_OPTIONS = [
  { id: 'English', label: 'English' },
  { id: 'Hindi', label: 'Hindi' },
  { id: 'Hinglish', label: 'Hinglish' },
  { id: 'Tamil', label: 'Tamil' },
  { id: 'Telugu', label: 'Telugu' },
  { id: 'Kannada', label: 'Kannada' },
  { id: 'Malayalam', label: 'Malayalam' },
  { id: 'Marathi', label: 'Marathi' },
] as const;

const BODY_MAX = 1024;
const HEADER_TEXT_MAX = 60;
const FOOTER_TEXT_MAX = 60;
const QUICK_REPLY_MAX = 25;
const CTA_LABEL_MAX = 25;
const QUICK_REPLY_LIMIT = 3;
const CTA_LIMIT = 2;

/** Header type — matches Meta WhatsApp Cloud API HEADER component formats. */
type HeaderType = 'none' | 'text' | 'image' | 'video' | 'document';

/** Buttons type — matches Meta WhatsApp Cloud API BUTTONS component. */
type ButtonsKind = 'none' | 'quick_reply' | 'cta';

interface QuickReplyButton {
  id: string;
  label: string;
}

interface CtaButton {
  id: string;
  kind: 'url' | 'phone';
  label: string;
  value: string; // url or phone depending on kind
}

function newButtonId(): string {
  return `btn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyMedia(): TemplateMediaSelection {
  return { assetId: null, fileName: null, previewUrl: null };
}

type AssistTone = 'Formal' | 'Friendly' | 'Urgent';

function channelLabel(ch: TemplateChannel): string {
  return ch === 'whatsapp' ? 'WhatsApp' : ch === 'sms' ? 'SMS' : 'RCS';
}

function channelCharLimit(ch: TemplateChannel): number {
  if (ch === 'sms') return 160;
  if (ch === 'whatsapp') return 1024;
  return 1024;
}

function buildGeneratingForLine(params: {
  channel: TemplateChannel;
  language: string;
  category: TemplateCategory;
}): string | null {
  const parts: string[] = [];
  if (params.channel) parts.push(channelLabel(params.channel));
  if (params.language) parts.push(params.language);
  if (params.channel === 'whatsapp' && params.category) {
    const cat =
      params.category === 'utility'
        ? 'Utility'
        : params.category === 'marketing'
          ? 'Marketing'
          : 'Authentication';
    parts.push(cat);
  }
  if (!parts.length) return null;
  return `Generating for: ${parts.join(' · ')}`;
}

function systemPrompt(params: {
  channel: TemplateChannel;
  language: string;
  category: TemplateCategory;
  tone: AssistTone;
}): string {
  const limit = channelCharLimit(params.channel);
  const category = params.channel === 'whatsapp' ? params.category : 'n/a';
  return [
    `You are a messaging copy expert.`,
    `Generate a ${channelLabel(params.channel)} message template in ${params.language} for the ${String(category)} category.`,
    `Return ONLY the message body text. No explanation, no preamble, no markdown formatting.`,
    `Use {{variable_name}} format for dynamic variables like {{name}}, {{amount}}, {{date}}.`,
    `Keep within ${limit} characters.`,
    `Match this tone: ${params.tone}.`,
  ].join('\\n');
}

function bestEffortSummaryFromBody(body: string): string {
  const clean = body.replace(/\\s+/g, ' ').trim();
  if (!clean) return '';
  const clipped = clean.length > 180 ? `${clean.slice(0, 180)}…` : clean;
  return `Generate a message similar to: \"${clipped}\"`;
}

function sanitizeModelText(text: string): string {
  return text.trim();
}

function mediaRoleForHeader(
  headerType: 'image' | 'video' | 'document',
): MediaPickerRole {
  if (headerType === 'image') return 'whatsapp_header_image';
  if (headerType === 'video') return 'whatsapp_header_video';
  return 'whatsapp_header_document';
}

function nextVarIndex(...texts: string[]): number {
  let max = 0;
  for (const t of texts) {
    const re = /\{\{(\d+)\}\}/g;
    let m;
    while ((m = re.exec(t)) !== null) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  return max + 1;
}

export function CreateContentTemplate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { files, attachAssetToTemplate } = useMediaLibrary();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const headerTextRef = useRef<HTMLInputElement>(null);

  const [channel, setChannel] = useState<TemplateChannel>('whatsapp');
  const [templateName, setTemplateName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [language, setLanguage] = useState<string>('English');
  const [category, setCategory] = useState<TemplateCategory>('utility');

  /**
   * Meta-style header — one dropdown with five values (none / text / image /
   * video / document). Replaces the old "Add header" checkbox + sub-radio
   * combo so the choice is visible upfront and matches WhatsApp Cloud API.
   */
  const [headerType, setHeaderType] = useState<HeaderType>('none');
  const [headerText, setHeaderText] = useState('');
  const [headerMedia, setHeaderMedia] = useState<TemplateMediaSelection>(emptyMedia);
  const [rcsRichImage, setRcsRichImage] = useState<TemplateMediaSelection>(emptyMedia);

  // Body
  const [body, setBody] = useState('');

  // Footer — plain text, no variables (Meta restriction).
  const [footerEnabled, setFooterEnabled] = useState(false);
  const [footerText, setFooterText] = useState('');

  // Buttons — Meta allows up to 10 buttons total; we keep it pragmatic:
  // up to 3 quick replies OR up to 2 call-to-action buttons.
  const [buttonsKind, setButtonsKind] = useState<ButtonsKind>('none');
  const [quickReplies, setQuickReplies] = useState<QuickReplyButton[]>([]);
  const [ctaButtons, setCtaButtons] = useState<CtaButton[]>([]);

  const headerEnabled = headerType !== 'none';
  const [sidebarTab, setSidebarTab] = useState<'preview' | 'ai'>('preview');

  // ─── AI Assist local UI state ───────────────────────────────────────────────
  const [assistTone, setAssistTone] = useState<AssistTone>('Formal');
  const [assistPrompt, setAssistPrompt] = useState('');
  const [assistChange, setAssistChange] = useState('');
  const [assistOtherLang, setAssistOtherLang] = useState('');
  const [assistShowOtherLang, setAssistShowOtherLang] = useState(false);
  const [assistForceMode1, setAssistForceMode1] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [assistSuccess, setAssistSuccess] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const st = location.state as { prefillAssetId?: string } | undefined;
    const id = st?.prefillAssetId;
    if (!id) return;
    const f = files.find((x) => x.id === id);
    if (f) {
      setChannel('whatsapp');
      if (f.kind === 'image') setHeaderType('image');
      else if (f.kind === 'video') setHeaderType('video');
      else if (f.kind === 'document') setHeaderType('document');
      else setHeaderType('image');
      setHeaderMedia({
        assetId: f.id,
        fileName: f.name,
        previewUrl: f.previewUrl,
      });
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate, files]);

  const nameValid = /^[a-z0-9_]+$/.test(templateName);
  const nameError =
    nameTouched && templateName.length > 0 && !nameValid
      ? 'Use lowercase letters, numbers, and underscores only (no spaces).'
      : '';

  const canSubmitApproval = useMemo(() => {
    if (!templateName.trim() || !nameValid) return false;
    if (!body.trim()) return false;
    if (channel === 'whatsapp') {
      if (!category) return false;
      if (headerEnabled) {
        if (headerType === 'text') {
          if (!headerText.trim() || headerText.length > HEADER_TEXT_MAX) return false;
        } else if (!headerMedia.assetId && !headerMedia.fileName) return false;
      }
    }
    return true;
  }, [
    templateName,
    nameValid,
    body,
    channel,
    category,
    headerEnabled,
    headerType,
    headerText,
    headerMedia,
  ]);

  const addVarToBody = () => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const n = nextVarIndex(body, headerType === 'text' && headerEnabled ? headerText : '');
    const snippet = `{{${n}}}`;
    const next = (body.slice(0, start) + snippet + body.slice(end)).slice(0, BODY_MAX);
    setBody(next);
    requestAnimationFrame(() => {
      const pos = Math.min(start + snippet.length, next.length);
      ta.setSelectionRange(pos, pos);
    });
  };

  const addVarToHeader = () => {
    const el = headerTextRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const n = nextVarIndex(body, headerText);
    const snippet = `{{${n}}}`;
    const next = (headerText.slice(0, start) + snippet + headerText.slice(end)).slice(0, HEADER_TEXT_MAX);
    setHeaderText(next);
    requestAnimationFrame(() => {
      const pos = Math.min(start + snippet.length, next.length);
      el.setSelectionRange(pos, pos);
    });
  };

  const variablesInUse = useMemo(() => {
    const combined = `${headerEnabled && headerType === 'text' ? headerText : ''}\n${body}`;
    const found = new Set<string>();
    const re = /\{\{(\d+)\}\}/g;
    let m;
    while ((m = re.exec(combined)) !== null) found.add(`{{${m[1]}}}`);
    return [...found].sort((a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10));
  }, [body, headerText, headerEnabled, headerType]);

  const generatingForLine = useMemo(() => buildGeneratingForLine({ channel, language, category }), [
    channel,
    language,
    category,
  ]);

  const runAnthropic = useCallback(
    async (opts: { tone?: AssistTone; user: string; currentBody?: string }) => {
      const sys = systemPrompt({
        channel,
        language,
        category,
        tone: opts.tone ?? assistTone,
      });

      const messages: { role: 'user' | 'assistant'; content: string }[] = [];
      if (opts.currentBody && opts.currentBody.trim()) {
        messages.push({
          role: 'user',
          content: `Current message:\n${opts.currentBody.trim()}\n\n---\n`,
        });
      }
      messages.push({ role: 'user', content: opts.user });

      const { text } = await sendAnthropicChatMessage({ system: sys, messages });
      return sanitizeModelText(text);
    },
    [assistTone, category, channel, language],
  );

  const doGenerateFromEmpty = useCallback(async () => {
    if (generating) return;
    setAssistError(null);
    setAssistSuccess(false);
    setGenerating(true);
    try {
      const prompt = assistPrompt.trim();
      const user = [
        `User request: ${prompt}`,
        ``,
        `Generate a single ready-to-use message body.`,
        `Use appropriate variables like {{name}}, {{amount}}, {{date}} where relevant.`,
        `Do NOT include any preamble, explanation, or markdown.`,
        `Return ONLY the message body text.`,
      ].join('\n');
      const next = await runAnthropic({ tone: assistTone, user });
      setBody(next.slice(0, BODY_MAX));
      setSidebarTab('preview');
      setAssistSuccess(true);
      window.setTimeout(() => setAssistSuccess(false), 3000);
    } catch {
      setAssistError('Generation failed. Try again.');
    } finally {
      setGenerating(false);
    }
  }, [assistPrompt, assistTone, generating, runAnthropic]);

  const doQuickAction = useCallback(
    async (actionId: string, instruction: string) => {
      if (actionLoading) return;
      setAssistError(null);
      setActionLoading(actionId);
      try {
        const user = [
          instruction,
          ``,
          `Return ONLY the updated message text. No explanation, no markdown.`,
        ].join('\n');
        const next = await runAnthropic({ user, currentBody: body });
        setBody(next.slice(0, BODY_MAX));
      } catch {
        setAssistError('Generation failed. Try again.');
      } finally {
        setActionLoading(null);
      }
    },
    [actionLoading, body, runAnthropic],
  );

  const doTranslate = useCallback(
    async (targetLanguage: string) => {
      const safe = targetLanguage.trim();
      if (!safe) return;
      await doQuickAction(
        `translate:${safe}`,
        `Translate this message into ${safe}. Preserve all {{variables}} exactly. Keep it natural for the target language.`,
      );
    },
    [doQuickAction],
  );

  const doApplyChange = useCallback(async () => {
    const desc = assistChange.trim();
    if (!desc) {
      setAssistError("Describe what you'd like to change first");
      return;
    }
    await doQuickAction(
      'apply',
      `Apply this change request: ${desc}\nPreserve key info and existing {{variables}} unless the change requires adding new ones.`,
    );
    setAssistChange('');
  }, [assistChange, doQuickAction]);

  const buildRow = useCallback(
    (status: 'draft' | 'pending_approval'): ContentTemplateRow => {
      const preview = body.replace(/\s+/g, ' ').trim();
      return {
        id: `tpl_${Date.now()}`,
        name: templateName.trim(),
        bodyPreview: preview.slice(0, 120),
        channel,
        category: channel === 'whatsapp' ? category : null,
        languages: [language],
        status,
        quality: null,
        lastUpdated: new Date().toISOString(),
        usedIn: [],
      };
    },
    [body, channel, category, language, templateName],
  );

  const saveDraft = () => {
    const name = templateName.trim();
    if (headerMedia.assetId) attachAssetToTemplate(headerMedia.assetId, name || 'draft_template');
    if (rcsRichImage.assetId) attachAssetToTemplate(rcsRichImage.assetId, name || 'draft_template');
    navigate('/content-library', { state: { newTemplate: buildRow('draft') } });
  };

  const submitApproval = () => {
    if (!canSubmitApproval) return;
    const name = templateName.trim();
    if (headerMedia.assetId) attachAssetToTemplate(headerMedia.assetId, name);
    if (rcsRichImage.assetId) attachAssetToTemplate(rcsRichImage.assetId, name);
    navigate('/content-library', { state: { newTemplate: buildRow('pending_approval') } });
  };

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Link
          to="/content-library"
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-cyan hover:underline"
        >
          ← Content Library
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-text-secondary hover:bg-[#F9FAFB] hover:text-text-primary"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={submitApproval}
            disabled={!canSubmitApproval}
            className="inline-flex items-center rounded-md bg-cyan px-4 py-2 text-sm font-medium text-white hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit for Approval
          </button>
        </div>
      </div>

      <h1 className="text-xl font-semibold text-text-primary">Create template</h1>

      <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-10 lg:max-w-[60%] lg:flex-none lg:basis-[60%]">
          {/* Section 1 */}
          <section className="space-y-6 rounded-xl bg-white p-6 ring-1 ring-[#E5E7EB]">
            <h2 className="text-sm font-semibold text-text-primary">Template details</h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">Channel *</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  [
                    { id: 'whatsapp' as const, icon: '💬', title: 'WhatsApp Business' },
                    { id: 'sms' as const, icon: '📱', title: 'SMS' },
                    { id: 'rcs' as const, icon: '🔵', title: 'RCS' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChannel(c.id)}
                    className={[
                      'rounded-lg border-2 p-4 text-left transition-all',
                      channel === c.id
                        ? 'border-cyan bg-cyan/5 shadow-sm'
                        : 'border-[#E5E7EB] hover:border-cyan/40',
                    ].join(' ')}
                  >
                    <div className="text-2xl">{c.icon}</div>
                    <div className="mt-2 text-sm font-semibold text-text-primary">{c.title}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">Template name *</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value.toLowerCase())}
                onBlur={() => setNameTouched(true)}
                placeholder="e.g. payment_reminder_hindi"
                className={[
                  'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/20',
                  nameError ? 'border-red-400 focus:border-red-400' : 'border-[#E5E7EB] focus:border-cyan',
                ].join(' ')}
              />
              <p className="mt-1 text-xs text-text-secondary">
                Lowercase letters, numbers, and underscores only. This is your internal identifier.
              </p>
              {nameError && <p className="mt-1 text-xs font-medium text-red-600">{nameError}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">Language *</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full max-w-md rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
              >
                {LANG_OPTIONS.map((o) => (
                  <option key={o.id} value={o.label}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-secondary">
                Add multiple languages by creating separate templates with the same name
              </p>
            </div>

            {channel === 'whatsapp' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">Category *</label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {(
                    [
                      {
                        id: 'marketing' as const,
                        icon: '🎯',
                        title: 'Marketing',
                        desc: 'Promotions, offers, and campaign messages',
                      },
                      {
                        id: 'utility' as const,
                        icon: '📋',
                        title: 'Utility',
                        desc: 'Transactional — payment confirmations, reminders, order updates',
                      },
                      {
                        id: 'authentication' as const,
                        icon: '🔐',
                        title: 'Authentication',
                        desc: 'OTPs, verification codes, login alerts',
                      },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={[
                        'rounded-lg border-2 p-4 text-left transition-all',
                        category === c.id
                          ? 'border-cyan bg-cyan/5 shadow-sm'
                          : 'border-[#E5E7EB] hover:border-cyan/40',
                      ].join(' ')}
                    >
                      <div className="text-xl">{c.icon}</div>
                      <div className="mt-2 text-sm font-semibold text-text-primary">{c.title}</div>
                      <p className="mt-1 text-xs text-text-secondary">{c.desc}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-amber-800/90">
                  ⚠ Choose carefully — Meta may reclassify your template if the category doesn&apos;t match the
                  content. Reclassification can affect delivery and billing.
                </p>
              </div>
            )}
          </section>

          {/* Section 2 */}
          <section className="space-y-6 rounded-xl bg-white p-6 ring-1 ring-[#E5E7EB]">
            <h2 className="text-sm font-semibold text-text-primary">Template content</h2>

            {channel === 'whatsapp' && (
              <div className="space-y-4 border-b border-[#F3F4F6] pb-6">
                {/* Header — Meta-style dropdown. Five values mirror the
                    WhatsApp Cloud API HEADER component formats. */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wa-header-type"
                    className="text-sm font-medium text-text-primary"
                  >
                    Header
                  </label>
                  <select
                    id="wa-header-type"
                    value={headerType}
                    onChange={(e) => {
                      setHeaderType(e.target.value as HeaderType);
                      setHeaderMedia(emptyMedia());
                    }}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20 sm:max-w-xs"
                  >
                    <option value="none">None — body only</option>
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="document">Document</option>
                  </select>
                  <p className="text-[11px] text-text-secondary">
                    Optional. Adds a prominent block at the top of the message — text, an image,
                    a short video, or a document.
                  </p>
                </div>

                {headerType === 'text' && (
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-text-secondary">Header text</span>
                      <span className="text-xs text-text-secondary">
                        {headerText.length}/{HEADER_TEXT_MAX}
                      </span>
                    </div>
                    <input
                      ref={headerTextRef}
                      type="text"
                      maxLength={HEADER_TEXT_MAX}
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                    />
                    <button
                      type="button"
                      onClick={addVarToHeader}
                      className="mt-2 text-xs font-medium text-cyan hover:underline"
                    >
                      + Add variable
                    </button>
                  </div>
                )}
                {(headerType === 'image' ||
                  headerType === 'video' ||
                  headerType === 'document') && (
                  <TemplateMediaField
                    title={
                      headerType === 'image'
                        ? 'Header image'
                        : headerType === 'video'
                          ? 'Header video'
                          : 'Header document'
                    }
                    role={mediaRoleForHeader(headerType)}
                    helpChannel="whatsapp"
                    value={headerMedia}
                    onChange={setHeaderMedia}
                  />
                )}
              </div>
            )}

            {channel === 'rcs' && (
              <div className="space-y-4 border-b border-[#F3F4F6] pb-6">
                <TemplateMediaField
                  title="Rich card image (optional)"
                  role="rcs_rich_card_image"
                  helpChannel="rcs"
                  value={rcsRichImage}
                  onChange={setRcsRichImage}
                />
              </div>
            )}

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">Body *</label>
                <span className="text-xs text-text-secondary">
                  {body.length}/{BODY_MAX}
                </span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={addVarToBody}
                  className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-gray-100"
                >
                  <Sparkles size={12} className="text-cyan" />
                  + Add variable
                </button>
              </div>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                rows={10}
                maxLength={BODY_MAX}
                placeholder="Write your message body here..."
                className="w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
              />
              {variablesInUse.length > 0 && (
                <div className="mt-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">Variables in use</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {variablesInUse.map((v) => (
                      <span
                        key={v}
                        className="rounded-full bg-cyan/10 px-2 py-0.5 font-mono text-[11px] font-medium text-cyan"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer + Buttons — WhatsApp only (parity with Meta's Cloud API
                template components: HEADER, BODY, FOOTER, BUTTONS). */}
            {channel === 'whatsapp' && (
              <>
                {/* Footer */}
                <div className="border-t border-[#F3F4F6] pt-6">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={footerEnabled}
                      onChange={(e) => {
                        setFooterEnabled(e.target.checked);
                        if (!e.target.checked) setFooterText('');
                      }}
                      className="rounded border-[#E5E7EB] text-cyan focus:ring-cyan"
                    />
                    <span className="text-sm font-medium text-text-primary">Add footer</span>
                    <span className="text-[11px] text-text-tertiary">
                      Short plain-text disclaimer, no variables
                    </span>
                  </label>
                  {footerEnabled && (
                    <div className="mt-3 pl-6">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-text-secondary">Footer text</span>
                        <span className="text-xs text-text-secondary">
                          {footerText.length}/{FOOTER_TEXT_MAX}
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={FOOTER_TEXT_MAX}
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                        placeholder="e.g., Reply STOP to opt out"
                        className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                      />
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="border-t border-[#F3F4F6] pt-6">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="wa-buttons-kind"
                      className="text-sm font-medium text-text-primary"
                    >
                      Buttons
                    </label>
                    <select
                      id="wa-buttons-kind"
                      value={buttonsKind}
                      onChange={(e) => {
                        const next = e.target.value as ButtonsKind;
                        setButtonsKind(next);
                        if (next === 'none') {
                          setQuickReplies([]);
                          setCtaButtons([]);
                        } else if (next === 'quick_reply') {
                          setCtaButtons([]);
                          setQuickReplies((prev) =>
                            prev.length > 0
                              ? prev
                              : [{ id: newButtonId(), label: '' }],
                          );
                        } else {
                          setQuickReplies([]);
                          setCtaButtons((prev) =>
                            prev.length > 0
                              ? prev
                              : [{ id: newButtonId(), kind: 'url', label: '', value: '' }],
                          );
                        }
                      }}
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20 sm:max-w-xs"
                    >
                      <option value="none">None</option>
                      <option value="quick_reply">Quick reply (up to {QUICK_REPLY_LIMIT})</option>
                      <option value="cta">Call-to-action (up to {CTA_LIMIT})</option>
                    </select>
                    <p className="text-[11px] text-text-secondary">
                      {buttonsKind === 'none' && 'Optional. Add tap-targets at the bottom of the message.'}
                      {buttonsKind === 'quick_reply' &&
                        'Recipients can tap a label to send a canned reply back to your bot.'}
                      {buttonsKind === 'cta' &&
                        'A "Call-to-action" launches the recipient out — open a URL or dial a number.'}
                    </p>
                  </div>

                  {buttonsKind === 'quick_reply' && (
                    <div className="mt-4 space-y-2 pl-6">
                      {quickReplies.map((b, idx) => (
                        <div key={b.id} className="flex items-center gap-2">
                          <span className="w-12 shrink-0 text-[11px] font-medium text-text-tertiary">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            maxLength={QUICK_REPLY_MAX}
                            value={b.label}
                            onChange={(e) => {
                              const v = e.target.value;
                              setQuickReplies((prev) =>
                                prev.map((q) => (q.id === b.id ? { ...q, label: v } : q)),
                              );
                            }}
                            placeholder="e.g., Yes, I'm interested"
                            className="flex-1 rounded-md border border-[#E5E7EB] px-3 py-1.5 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                          />
                          <span className="w-12 shrink-0 text-right text-[11px] text-text-tertiary tabular-nums">
                            {b.label.length}/{QUICK_REPLY_MAX}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setQuickReplies((prev) => prev.filter((q) => q.id !== b.id))
                            }
                            aria-label="Remove button"
                            className="rounded-md p-1 text-text-tertiary hover:bg-red-50 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {quickReplies.length < QUICK_REPLY_LIMIT && (
                        <button
                          type="button"
                          onClick={() =>
                            setQuickReplies((prev) => [
                              ...prev,
                              { id: newButtonId(), label: '' },
                            ])
                          }
                          className="text-xs font-medium text-cyan hover:underline"
                        >
                          + Add quick reply ({quickReplies.length}/{QUICK_REPLY_LIMIT})
                        </button>
                      )}
                    </div>
                  )}

                  {buttonsKind === 'cta' && (
                    <div className="mt-4 space-y-3 pl-6">
                      {ctaButtons.map((b, idx) => (
                        <div
                          key={b.id}
                          className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium text-text-tertiary">
                              Button #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCtaButtons((prev) => prev.filter((c) => c.id !== b.id))
                              }
                              aria-label="Remove button"
                              className="rounded-md p-1 text-text-tertiary hover:bg-red-50 hover:text-red-600"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_1fr]">
                            <select
                              value={b.kind}
                              onChange={(e) => {
                                const k = e.target.value as 'url' | 'phone';
                                setCtaButtons((prev) =>
                                  prev.map((c) =>
                                    c.id === b.id ? { ...c, kind: k, value: '' } : c,
                                  ),
                                );
                              }}
                              className="rounded-md border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm"
                            >
                              <option value="url">Open URL</option>
                              <option value="phone">Call number</option>
                            </select>
                            <input
                              type="text"
                              maxLength={CTA_LABEL_MAX}
                              value={b.label}
                              onChange={(e) => {
                                const v = e.target.value;
                                setCtaButtons((prev) =>
                                  prev.map((c) => (c.id === b.id ? { ...c, label: v } : c)),
                                );
                              }}
                              placeholder="Button label"
                              className="rounded-md border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm"
                            />
                          </div>
                          <input
                            type="text"
                            value={b.value}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCtaButtons((prev) =>
                                prev.map((c) => (c.id === b.id ? { ...c, value: v } : c)),
                              );
                            }}
                            placeholder={
                              b.kind === 'url' ? 'https://example.com/landing' : '+91 98765 43210'
                            }
                            className="mt-2 w-full rounded-md border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm"
                          />
                          <p className="mt-1 text-[10.5px] text-text-tertiary">
                            {b.label.length}/{CTA_LABEL_MAX} characters in label
                          </p>
                        </div>
                      ))}
                      {ctaButtons.length < CTA_LIMIT && (
                        <button
                          type="button"
                          onClick={() =>
                            setCtaButtons((prev) => [
                              ...prev,
                              { id: newButtonId(), kind: 'url', label: '', value: '' },
                            ])
                          }
                          className="text-xs font-medium text-cyan hover:underline"
                        >
                          + Add call-to-action ({ctaButtons.length}/{CTA_LIMIT})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        {/* Right sidebar */}
        <div className="lg:sticky lg:top-4 lg:w-[40%] lg:max-w-[40%] lg:flex-none">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarTab('preview')}
                className={[
                  'text-sm font-semibold transition-colors',
                  sidebarTab === 'preview'
                    ? 'text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                ].join(' ')}
              >
                <span className={sidebarTab === 'preview' ? 'border-b-2 border-cyan pb-1' : 'pb-1'}>
                  Live Preview
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('ai')}
                aria-current={sidebarTab === 'ai' ? 'true' : undefined}
                className="group transition-opacity hover:opacity-95"
              >
                <span
                  className={[
                    'inline-flex items-center gap-1.5 pb-1',
                    sidebarTab === 'ai' ? 'border-b-2 border-cyan' : 'border-b-2 border-transparent',
                  ].join(' ')}
                >
                  <Sparkles
                    size={16}
                    className={[
                      'shrink-0 transition-all',
                      sidebarTab === 'ai'
                        ? 'text-cyan drop-shadow-[0_0_8px_rgba(0,186,242,0.55)]'
                        : 'text-cyan/40 group-hover:text-cyan/70',
                    ].join(' ')}
                    strokeWidth={2.25}
                  />
                  <span
                    className={[
                      'text-sm font-bold tracking-tight',
                      sidebarTab === 'ai'
                        ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-violet-600 bg-clip-text text-transparent'
                        : 'text-text-secondary',
                    ].join(' ')}
                  >
                    AI Assist
                  </span>
                </span>
              </button>
            </div>

            {sidebarTab === 'preview' ? (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#0F172A] p-4 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Live preview</p>
                <div className="mt-4 space-y-2 rounded-2xl bg-[#1E293B] p-4">
                  {channel === 'whatsapp' && headerEnabled && headerType === 'text' && headerText && (
                    <div className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/90">
                      {headerText}
                    </div>
                  )}
                  {channel === 'whatsapp' &&
                    headerEnabled &&
                    headerType !== 'text' &&
                    (headerMedia.fileName || headerMedia.assetId) && (
                      <div className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70">
                        {headerType === 'image' && headerMedia.previewUrl && (
                          <img
                            src={headerMedia.previewUrl}
                            alt=""
                            className="mb-2 max-h-24 w-full rounded object-cover"
                          />
                        )}
                        [{headerType}] {headerMedia.fileName ?? 'Media'}
                      </div>
                    )}
                  {channel === 'rcs' && rcsRichImage.previewUrl && (
                    <div className="rounded-lg bg-white/10 p-2">
                      <img
                        src={rcsRichImage.previewUrl}
                        alt=""
                        className="max-h-28 w-full rounded object-cover"
                      />
                    </div>
                  )}
                  <div className="rounded-2xl rounded-tl-md bg-[#25D366] px-3 py-2 text-sm text-white shadow-md">
                    {body.trim() ? body : 'Message body preview…'}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/40">
                    {channel === 'whatsapp' ? <MessageCircle size={12} /> : <Smartphone size={12} />}
                    <span>{channelLabel(channel)}</span>
                    {templateName && <span>· {templateName}</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan/15 via-sky-500/10 to-violet-600/15 shadow-sm ring-1 ring-cyan/20">
                    <Sparkles size={18} className="text-cyan" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold tracking-tight bg-gradient-to-r from-cyan-600 via-sky-600 to-violet-600 bg-clip-text text-transparent">
                      AI Assist
                    </p>
                    <p className="text-[11px] leading-snug text-text-secondary">
                      Grounded in your channel, language & category
                    </p>
                  </div>
                </div>

                {assistSuccess && (
                  <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    <CheckCircle2 size={14} />
                    Generated — switch back to edit
                  </div>
                )}

                {(!body.trim() || assistForceMode1) ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">What do you want to say?</p>
                      <textarea
                        rows={3}
                        value={assistPrompt}
                        onChange={(e) => setAssistPrompt(e.target.value)}
                        placeholder={'e.g. Generate\na WhatsApp template for\ncart abandonment'}
                        className="mt-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-text-primary">Tone:</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(['Formal', 'Friendly', 'Urgent'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setAssistTone(t)}
                            className={[
                              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                              assistTone === t
                                ? 'border-cyan bg-cyan/10 text-cyan'
                                : 'border-[#E5E7EB] bg-white text-text-secondary hover:text-text-primary',
                            ].join(' ')}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-text-primary">Quick starts</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {['Payment Reminder', 'KYC Alert', 'Offer / Promo', 'Order Update'].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setAssistPrompt(q)}
                            className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-left text-xs font-medium text-text-primary hover:bg-[#F9FAFB]"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        await doGenerateFromEmpty();
                        setAssistForceMode1(false);
                      }}
                      disabled={generating || !assistPrompt.trim()}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {generating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <span>✦</span> Generate Message
                        </>
                      )}
                    </button>

                    {assistError && <p className="text-xs font-medium text-red-600">{assistError}</p>}

                    {generatingForLine && (
                      <p className="text-xs text-text-secondary">{generatingForLine}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Optimize your message</p>
                      <p className="mt-1 text-xs text-text-secondary">Quick actions</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[
                          {
                            id: 'rephrase',
                            label: 'Rephrase',
                            instr:
                              'Make a clearer rephrase while preserving the key information and all {{variables}} exactly.',
                          },
                          {
                            id: 'shorter',
                            label: 'Make Shorter',
                            instr:
                              'Make this message shorter while preserving the key information and all {{variables}} exactly.',
                          },
                          {
                            id: 'urgent',
                            label: 'More Urgent',
                            instr:
                              'Make this message more urgent while preserving the key information and all {{variables}} exactly.',
                          },
                          {
                            id: 'cta',
                            label: 'Add CTA',
                            instr:
                              'Add a clear CTA while preserving the key information and all {{variables}} exactly.',
                          },
                        ].map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => doQuickAction(a.id, a.instr)}
                            disabled={!!actionLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-text-primary hover:bg-[#F9FAFB] disabled:opacity-50"
                          >
                            {actionLoading === a.id && <Loader2 size={14} className="animate-spin" />}
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Translate to:</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(['Hindi', 'Hinglish', 'English'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => doTranslate(t)}
                            disabled={!!actionLoading}
                            className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-semibold text-text-primary hover:bg-[#F9FAFB] disabled:opacity-50"
                          >
                            {actionLoading === `translate:${t}` && (
                              <Loader2 size={12} className="mr-1 inline animate-spin" />
                            )}
                            {t}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setAssistShowOtherLang(true)}
                          className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-semibold text-text-primary hover:bg-[#F9FAFB]"
                        >
                          Other →
                        </button>
                      </div>
                      {assistShowOtherLang && (
                        <div className="mt-2 flex gap-2">
                          <input
                            value={assistOtherLang}
                            onChange={(e) => setAssistOtherLang(e.target.value)}
                            placeholder="e.g. Bengali"
                            className="flex-1 rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => doTranslate(assistOtherLang)}
                            disabled={!!actionLoading || !assistOtherLang.trim()}
                            className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-text-primary hover:bg-[#F9FAFB] disabled:opacity-40"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Describe a change:</p>
                      <textarea
                        rows={2}
                        value={assistChange}
                        onChange={(e) => setAssistChange(e.target.value)}
                        placeholder={'e.g. Make it sound\nmore empathetic for older users'}
                        className="mt-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
                      />
                      <button
                        type="button"
                        onClick={doApplyChange}
                        disabled={!!actionLoading}
                        className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-cyan hover:underline disabled:opacity-50"
                      >
                        {actionLoading === 'apply' && <Loader2 size={14} className="animate-spin" />}
                        Apply →
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAssistPrompt(bestEffortSummaryFromBody(body));
                        setAssistChange('');
                        setAssistError(null);
                        setAssistForceMode1(true);
                      }}
                      className="inline-flex w-full items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-[#F9FAFB]"
                    >
                      ✦ Generate a fresh variant
                    </button>

                    {assistError && <p className="text-xs font-medium text-red-600">{assistError}</p>}

                    {generatingForLine && (
                      <p className="text-xs text-text-secondary">{generatingForLine}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
