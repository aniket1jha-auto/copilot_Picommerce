import { useState } from 'react';
import { Phone, MessageSquare } from 'lucide-react';
import type { AgentConfiguration } from '@/types/agent';

interface Props {
  config: AgentConfiguration;
  onSave: (config: Partial<AgentConfiguration>) => void;
  onNext: () => void;
  isFirstStep: boolean;
}

/**
 * Basic info step — only Name + Description now.
 *
 * Agent type is committed before this screen (via the "+ Create
 * Agent" dropdown on the Agents page → /agents/new?type=…) so we
 * show it as a static chip instead of asking again. The Use Case
 * field has been removed entirely; downstream steps don't depend
 * on it anymore.
 */
export function BasicInfoStep({ config, onSave, onNext }: Props) {
  const [name, setName] = useState(config.name);
  const [description, setDescription] = useState(config.description);
  const type = config.type;

  const isValid = name.trim() && description.trim();

  const handleNext = () => {
    onSave({ name, description });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Basic Information</h2>
        <p className="text-sm text-text-secondary">
          Name your agent and describe what it does. Type is already set from your previous
          choice.
        </p>
      </div>

      <div className="space-y-5">
        {/* Type chip — locked, set on entry. Users who want to change type can
            go back to the Agents page and pick again from the dropdown. */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Agent Type</label>
          <div className="inline-flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan/10 text-cyan">
              {type === 'voice' ? <Phone size={14} /> : <MessageSquare size={14} />}
            </span>
            <span className="text-[13px] font-semibold text-text-primary">
              {type === 'voice' ? 'Voice Agent' : 'Chat Agent'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Agent Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'voice' ? 'e.g., Sales Outreach Agent' : 'e.g., Support Chat Bot'}
            className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
            data-testid="agent-name-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this agent does and its primary goals..."
            rows={3}
            className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
            data-testid="agent-description-input"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleNext}
          disabled={!isValid}
          className="inline-flex items-center gap-2 rounded-md bg-cyan px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="basic-info-next-btn"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
