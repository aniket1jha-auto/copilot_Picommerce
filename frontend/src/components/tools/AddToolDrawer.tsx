import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Search,
  PhoneOff,
  PhoneForwarded,
  Keyboard,
  MessageSquare,
  Wrench,
  Calendar,
  Sheet,
  Building2,
  Database,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Drawer, Button, Input, Select, cn, useToast } from '@/components/ui';
import { TOOL_CATEGORIES, findToolDef } from '@/data/toolConstants';
import type { ToolDefinition, ToolInstance } from '@/types/tool';
import { useToolsStore } from '@/store/toolsStore';

/**
 * Add / edit a tool. Two-step flow inside a 480px right-side drawer:
 *   1. Pick a tool from the catalog (search + grouped list)
 *   2. Configure — fields tailored to the tool type
 *
 * Edit mode skips step 1 and lands on step 2 with the tool's
 * existing config pre-filled.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, the drawer opens in edit mode for this tool. */
  editTool?: ToolInstance | null;
}

const ICON_MAP: Record<string, LucideIcon> = {
  PhoneOff,
  PhoneForwarded,
  Keyboard,
  MessageSquare,
  Search,
  Building2,
  Database,
  Calendar,
  Sheet,
  Wrench,
};

function iconFor(def: ToolDefinition): LucideIcon {
  return ICON_MAP[def.icon] ?? Wrench;
}

export function AddToolDrawer({ open, onClose, editTool = null }: Props) {
  const { toast } = useToast();
  const createTool = useToolsStore((s) => s.createTool);
  const updateTool = useToolsStore((s) => s.updateTool);

  const [step, setStep] = useState<'pick' | 'configure'>(editTool ? 'configure' : 'pick');
  const [selectedDef, setSelectedDef] = useState<ToolDefinition | null>(
    editTool ? findToolDef(editTool.toolType) : null,
  );
  const [name, setName] = useState(editTool?.name ?? '');
  const [config, setConfig] = useState<Record<string, unknown>>(editTool?.config ?? {});

  // Reset state when drawer opens or its mode changes.
  useEffect(() => {
    if (!open) return;
    if (editTool) {
      setStep('configure');
      setSelectedDef(findToolDef(editTool.toolType));
      setName(editTool.name);
      setConfig(editTool.config ?? {});
    } else {
      setStep('pick');
      setSelectedDef(null);
      setName('');
      setConfig({});
    }
  }, [open, editTool]);

  function pickDef(def: ToolDefinition) {
    setSelectedDef(def);
    setName(def.name);
    setConfig({});
    setStep('configure');
  }

  function setField<T>(key: string, value: T) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!selectedDef || !isValidConfigure(selectedDef.id, name, config)) return;
    if (editTool) {
      updateTool(editTool.id, { name: name.trim(), config });
      toast({ kind: 'success', title: 'Tool updated', body: name.trim() });
    } else {
      createTool({
        toolType: selectedDef.id,
        name: name.trim(),
        description: selectedDef.description,
        config,
      });
      toast({ kind: 'success', title: 'Tool added', body: name.trim() });
    }
    onClose();
  }

  const isEdit = !!editTool;
  const onConfigureStep = step === 'configure' && !!selectedDef;
  const canSave = onConfigureStep && isValidConfigure(selectedDef!.id, name, config);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={480}
      title={
        onConfigureStep ? (
          <ConfigureHeader
            def={selectedDef!}
            onBack={isEdit ? undefined : () => setStep('pick')}
          />
        ) : (
          'Add Tool'
        )
      }
      footer={
        onConfigureStep ? (
          <>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!canSave}>
              {isEdit ? 'Save changes' : 'Save Tool'}
            </Button>
          </>
        ) : undefined
      }
    >
      {onConfigureStep ? (
        <ConfigureToolStep
          def={selectedDef!}
          name={name}
          onNameChange={setName}
          config={config}
          setField={setField}
        />
      ) : (
        <PickToolStep onPick={pickDef} />
      )}
    </Drawer>
  );
}

/* ─── Step 1: Pick a tool ─────────────────────────────────────────────── */

function PickToolStep({ onPick }: { onPick: (def: ToolDefinition) => void }) {
  const [query, setQuery] = useState('');

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOL_CATEGORIES;
    return TOOL_CATEGORIES.map((c) => ({
      ...c,
      items: c.items.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      ),
    })).filter((c) => c.items.length > 0);
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools"
          className="pl-8"
          autoFocus
        />
      </div>

      {filteredCategories.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">
          No tools match "{query}".
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredCategories.map((cat) => (
            <div key={cat.id}>
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-text-tertiary">
                {cat.label}
              </p>
              <ul className="flex flex-col">
                {cat.items.map((t) => {
                  const Icon = iconFor(t);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => onPick(t)}
                        className="group flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-cyan/5"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: `${t.color}1a`, color: t.color }}
                        >
                          <Icon size={16} strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-semibold text-text-primary">
                            {t.name}
                          </div>
                          <div className="truncate text-[11.5px] text-text-secondary">
                            {t.description}
                          </div>
                        </div>
                        <ChevronRight
                          size={14}
                          className="shrink-0 text-text-tertiary transition-colors group-hover:text-cyan"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Configure step header (used inside the Drawer's title slot) ─────── */

function ConfigureHeader({
  def,
  onBack,
}: {
  def: ToolDefinition;
  onBack?: () => void;
}) {
  const Icon = iconFor(def);
  return (
    <div className="flex items-center gap-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to tool picker"
          className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <ArrowLeft size={14} />
        </button>
      )}
      <span
        className="flex h-7 w-7 items-center justify-center rounded-md"
        style={{ backgroundColor: `${def.color}1a`, color: def.color }}
      >
        <Icon size={13} strokeWidth={1.75} />
      </span>
      <span className="text-sm font-semibold text-text-primary">{def.name}</span>
    </div>
  );
}

/* ─── Step 2: Configure (dispatches to per-tool fields) ──────────────── */

interface ConfigureProps {
  def: ToolDefinition;
  name: string;
  onNameChange: (v: string) => void;
  config: Record<string, unknown>;
  setField: <T>(k: string, v: T) => void;
}

function ConfigureToolStep({ def, name, onNameChange, config, setField }: ConfigureProps) {
  return (
    <div className="space-y-5">
      <Input
        label="Name *"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={`e.g., ${def.name} for KYC flow`}
      />

      {def.id === 'end_call' && (
        <Input
          label="Spoken message before ending (optional)"
          value={(config.spokenMessage as string) ?? ''}
          onChange={(e) => setField('spokenMessage', e.target.value)}
          placeholder="e.g., Thanks for your time today, goodbye!"
        />
      )}

      {def.id === 'transfer_call' && <TransferCallFields config={config} setField={setField} />}
      {def.id === 'capture_input' && <CaptureInputFields config={config} setField={setField} />}
      {def.id === 'send_message' && <SendMessageFields config={config} setField={setField} />}
      {def.id === 'query' && (
        <KnowledgeBaseSelect
          value={(config.knowledgeBaseId as string) ?? ''}
          onChange={(v) => setField('knowledgeBaseId', v)}
        />
      )}
      {(def.id === 'crm_lookup' || def.id === 'crm_update') && (
        <CrmFields config={config} setField={setField} />
      )}
      {def.id === 'schedule_appointment' && (
        <ScheduleAppointmentFields config={config} setField={setField} />
      )}
      {def.id === 'google_sheets' && (
        <GoogleSheetsFields config={config} setField={setField} />
      )}
      {def.id === 'custom_function' && (
        <CustomFunctionFields config={config} setField={setField} />
      )}
    </div>
  );
}

/* ─── Per-tool field components ───────────────────────────────────────── */

interface FieldProps {
  config: Record<string, unknown>;
  setField: <T>(k: string, v: T) => void;
}

function TransferCallFields({ config, setField }: FieldProps) {
  const transferType = (config.transferType as string) ?? 'human';
  return (
    <>
      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-text-primary">
          Transfer type
        </label>
        <div className="flex flex-col gap-1.5">
          {[
            { id: 'human', label: 'Human', hint: 'Pass to a live operator queue' },
            { id: 'agent', label: 'Another Agent', hint: 'Hand off to a different AI agent' },
            { id: 'external', label: 'External Number', hint: 'Dial out to a fixed phone number' },
          ].map((opt) => {
            const active = transferType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setField('transferType', opt.id)}
                className={cn(
                  'flex items-start gap-2.5 rounded-md border-2 px-3 py-2 text-left transition-colors',
                  active
                    ? 'border-cyan bg-cyan/5'
                    : 'border-[#E5E7EB] bg-white hover:border-cyan/40',
                )}
              >
                <input
                  type="radio"
                  checked={active}
                  onChange={() => setField('transferType', opt.id)}
                  className="mt-1 text-cyan focus:ring-cyan"
                />
                <div>
                  <div className="text-[13px] font-medium text-text-primary">{opt.label}</div>
                  <div className="text-[11px] text-text-secondary">{opt.hint}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <Input
        label={
          transferType === 'human'
            ? 'Destination queue ID'
            : transferType === 'agent'
              ? 'Agent ID'
              : 'External phone number'
        }
        value={(config.destination as string) ?? ''}
        onChange={(e) => setField('destination', e.target.value)}
        placeholder={transferType === 'external' ? '+91 80000 00000' : 'queue-supervisor-1'}
      />
    </>
  );
}

function CaptureInputFields({ config, setField }: FieldProps) {
  return (
    <>
      <Select
        label="Input type"
        value={(config.inputType as string) ?? 'either'}
        onChange={(e) => setField('inputType', e.target.value)}
      >
        <option value="dtmf">DTMF (keypad presses)</option>
        <option value="spoken">Spoken</option>
        <option value="either">Either</option>
      </Select>
      <Input
        label="Variable name"
        value={(config.variableName as string) ?? ''}
        onChange={(e) => setField('variableName', e.target.value)}
        placeholder="e.g., otp_code, account_number"
      />
      <Input
        label="Validation pattern (optional)"
        value={(config.validationPattern as string) ?? ''}
        onChange={(e) => setField('validationPattern', e.target.value)}
        placeholder="e.g., ^[0-9]{6}$"
      />
    </>
  );
}

function SendMessageFields({ config, setField }: FieldProps) {
  return (
    <>
      <Select
        label="Channel"
        value={(config.channel as string) ?? 'whatsapp'}
        onChange={(e) => setField('channel', e.target.value)}
      >
        <option value="sms">SMS</option>
        <option value="whatsapp">WhatsApp</option>
      </Select>
      <Input
        label="Template"
        value={(config.templateId as string) ?? ''}
        onChange={(e) => setField('templateId', e.target.value)}
        placeholder="Select a template from Content Library"
        helper="Mock: picker over Content Library will land in a follow-up pass."
      />
    </>
  );
}

function KnowledgeBaseSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      label="Knowledge base"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select a knowledge base…</option>
      <option value="kb-001">Paytm Product Catalog v3</option>
      <option value="kb-002">Paytm Wallet & UPI Policy</option>
      <option value="kb-003">Paytm KYC FAQ</option>
      <option value="kb-004">Paytm Loan Recovery Playbook</option>
    </Select>
  );
}

function CrmFields({ config, setField }: FieldProps) {
  return (
    <>
      <Select
        label="CRM connection"
        value={(config.crmConnectionId as string) ?? ''}
        onChange={(e) => setField('crmConnectionId', e.target.value)}
      >
        <option value="">Select a CRM connection…</option>
        <option value="salesforce-prod">Salesforce — production</option>
        <option value="hubspot-prod">HubSpot — production</option>
        <option value="zoho-prod">Zoho — production</option>
      </Select>
      <Input
        label="Field mapping"
        value={(config.fieldMapping as string) ?? ''}
        onChange={(e) => setField('fieldMapping', e.target.value)}
        placeholder="e.g., contact.phone, contact.name"
        helper="Comma-separated CRM field names the agent should read or write."
      />
    </>
  );
}

function ScheduleAppointmentFields({ config, setField }: FieldProps) {
  return (
    <>
      <Select
        label="Calendar"
        value={(config.calendarId as string) ?? ''}
        onChange={(e) => setField('calendarId', e.target.value)}
      >
        <option value="">Select a calendar…</option>
        <option value="google-sales-team">Google · Sales team</option>
        <option value="google-support-team">Google · Support team</option>
        <option value="outlook-onboarding">Outlook · Onboarding</option>
      </Select>
      <Input
        label="Duration (minutes)"
        type="number"
        min={5}
        max={480}
        value={(config.durationMinutes as number) ?? 30}
        onChange={(e) => setField('durationMinutes', Number(e.target.value) || 30)}
      />
      <Input
        label="Availability rules"
        value={(config.availability as string) ?? ''}
        onChange={(e) => setField('availability', e.target.value)}
        placeholder="e.g., Mon–Fri 10:00–18:00 IST"
        helper="Plain-language window the agent should propose slots within."
      />
    </>
  );
}

function GoogleSheetsFields({ config, setField }: FieldProps) {
  return (
    <>
      <Input
        label="Sheet URL or ID"
        value={(config.sheetId as string) ?? ''}
        onChange={(e) => setField('sheetId', e.target.value)}
        placeholder="https://docs.google.com/spreadsheets/d/…"
      />
      <Select
        label="Operation"
        value={(config.operation as string) ?? 'append'}
        onChange={(e) => setField('operation', e.target.value)}
      >
        <option value="read">Read</option>
        <option value="append">Append</option>
      </Select>
    </>
  );
}

function CustomFunctionFields({ config, setField }: FieldProps) {
  return (
    <>
      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-text-primary">
          Description (for the LLM)
        </label>
        <textarea
          value={(config.llmDescription as string) ?? ''}
          onChange={(e) => setField('llmDescription', e.target.value)}
          rows={3}
          placeholder="What does this tool do? Be specific — the agent uses this to decide when to call it."
          className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-[13px] focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
        />
      </div>
      <Input
        label="Server URL"
        value={(config.serverUrl as string) ?? ''}
        onChange={(e) => setField('serverUrl', e.target.value)}
        placeholder="https://api.example.com/v1/run"
      />
      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-text-primary">
          Parameters schema (JSON)
        </label>
        <textarea
          value={(config.parametersSchema as string) ?? ''}
          onChange={(e) => setField('parametersSchema', e.target.value)}
          rows={6}
          placeholder={'{\n  "type": "object",\n  "properties": {\n    "amount": { "type": "number" }\n  }\n}'}
          className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 font-mono text-[12px] focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-text-primary">
          Spoken messages (optional)
        </label>
        <div className="space-y-2">
          <Input
            value={(config.spokenBefore as string) ?? ''}
            onChange={(e) => setField('spokenBefore', e.target.value)}
            placeholder="Before running — e.g., One moment, looking that up…"
          />
          <Input
            value={(config.spokenAfter as string) ?? ''}
            onChange={(e) => setField('spokenAfter', e.target.value)}
            placeholder="After running — e.g., Got it, here's what I found."
          />
          <Input
            value={(config.spokenError as string) ?? ''}
            onChange={(e) => setField('spokenError', e.target.value)}
            placeholder="On error — e.g., Something went wrong, let me try a different way."
          />
        </div>
      </div>
    </>
  );
}

/* ─── Validation ──────────────────────────────────────────────────────── */

function isValidConfigure(
  toolId: string,
  name: string,
  config: Record<string, unknown>,
): boolean {
  if (!name.trim()) return false;
  switch (toolId) {
    case 'end_call':
      return true;
    case 'transfer_call':
      return Boolean(config.transferType) && String(config.destination ?? '').trim().length > 0;
    case 'capture_input':
      return Boolean(config.inputType) && String(config.variableName ?? '').trim().length > 0;
    case 'send_message':
      return Boolean(config.channel) && String(config.templateId ?? '').trim().length > 0;
    case 'query':
      return String(config.knowledgeBaseId ?? '').trim().length > 0;
    case 'crm_lookup':
    case 'crm_update':
      return String(config.crmConnectionId ?? '').trim().length > 0;
    case 'schedule_appointment':
      return String(config.calendarId ?? '').trim().length > 0;
    case 'google_sheets':
      return String(config.sheetId ?? '').trim().length > 0 && Boolean(config.operation);
    case 'custom_function':
      return (
        String(config.serverUrl ?? '').trim().length > 0 &&
        String(config.llmDescription ?? '').trim().length > 0
      );
    default:
      return true;
  }
}
