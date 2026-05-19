import { useState } from 'react';
import { Upload, ImageIcon, Sparkles } from 'lucide-react';
import type { MediaFile, MediaPickerRole } from '@/types/mediaLibrary';
import { MediaPickerModal } from '@/components/content-library/MediaPickerModal';
import { MediaUploadDrawer } from '@/components/content-library/MediaUploadDrawer';
import { MediaAIGenerateModal } from '@/components/content-library/MediaAIGenerateModal';
import { ChannelMediaHelp } from '@/components/content-library/ChannelMediaHelp';
import { useMediaLibrary } from '@/context/MediaLibraryContext';

export interface TemplateMediaSelection {
  assetId: string | null;
  fileName: string | null;
  previewUrl: string | null;
}

export function TemplateMediaField({
  role,
  helpChannel,
  title,
  value,
  onChange,
}: {
  role: MediaPickerRole;
  helpChannel: 'whatsapp' | 'rcs';
  title: string;
  value: TemplateMediaSelection;
  onChange: (v: TemplateMediaSelection) => void;
}) {
  const { files } = useMediaLibrary();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // AI image generation only makes sense for image headers.
  const supportsAI = role === 'whatsapp_header_image' || role === 'rcs_rich_card_image';

  const resolved =
    value.assetId && files.find((f) => f.id === value.assetId)
      ? files.find((f) => f.id === value.assetId)!
      : null;

  const displayName = resolved?.name ?? value.fileName;
  const displayPreview = resolved?.previewUrl ?? value.previewUrl;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-primary">{title}</span>
        <ChannelMediaHelp channel={helpChannel} />
      </div>

      {!value.assetId && !value.fileName ? (
        <div
          className={`grid grid-cols-1 gap-3 ${supportsAI ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
        >
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-[#E5E7EB] bg-white p-6 text-center transition-all hover:border-cyan/50 hover:shadow-sm"
          >
            <ImageIcon className="text-cyan" size={28} />
            <span className="mt-2 text-sm font-semibold text-text-primary">Choose from Media Library</span>
            <span className="mt-1 text-xs text-text-secondary">Reuse approved assets</span>
          </button>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center transition-all hover:border-cyan/50"
          >
            <Upload className="text-text-secondary" size={28} />
            <span className="mt-2 text-sm font-semibold text-text-primary">Upload new file</span>
            <span className="mt-1 text-xs text-text-secondary">Saved to Media Library automatically</span>
          </button>
          {supportsAI && (
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="group flex flex-col items-center justify-center rounded-lg border-2 border-[#E5E7EB] bg-gradient-to-br from-cyan/5 via-white to-purple-50 p-6 text-center transition-all hover:border-cyan/60 hover:shadow-sm"
            >
              <Sparkles className="text-cyan transition-transform group-hover:scale-110" size={28} />
              <span className="mt-2 text-sm font-semibold text-text-primary">Generate with AI</span>
              <span className="mt-1 text-xs text-text-secondary">Describe it — pick the best of 4</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:flex-row sm:items-center">
          {displayPreview && resolved?.kind === 'image' && (
            <img
              src={displayPreview}
              alt=""
              className="h-20 w-20 shrink-0 rounded-md object-cover ring-1 ring-[#E5E7EB]"
            />
          )}
          {(!displayPreview || resolved?.kind !== 'image') && (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-white text-2xl ring-1 ring-[#E5E7EB]">
              {resolved?.kind === 'video' ? '🎬' : resolved?.kind === 'document' ? '📄' : '📎'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">{displayName}</p>
            <p className="text-xs text-text-secondary">
              {value.assetId ? 'From Media Library' : 'New upload'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-gray-50"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({ assetId: null, fileName: null, previewUrl: null })
              }
              className="rounded-md border border-transparent px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        role={role}
        onSelect={(f: MediaFile) => {
          onChange({
            assetId: f.id,
            fileName: f.name,
            previewUrl: f.previewUrl,
          });
        }}
      />

      <MediaUploadDrawer
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(created) => {
          const first = created[0];
          if (first) {
            onChange({
              assetId: first.id,
              fileName: first.name,
              previewUrl: first.previewUrl,
            });
          }
        }}
      />

      {supportsAI && (
        <MediaAIGenerateModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          onSelect={(f) => {
            onChange({
              assetId: f.id,
              fileName: f.name,
              previewUrl: f.previewUrl,
            });
          }}
        />
      )}
    </div>
  );
}
