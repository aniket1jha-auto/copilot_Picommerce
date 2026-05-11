import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui';
import type { KnowledgeBase } from '@/types/knowledgeBase';

interface Props {
  kb: KnowledgeBase;
}

const SPLITTER_LABEL = {
  recursive: 'Recursive character',
  markdown: 'Markdown-aware',
  semantic: 'Semantic boundaries',
} as const;

export function KBConfigurationPanel({ kb }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Embedding</CardTitle>
            <CardSubtitle>How content gets vectorized for retrieval.</CardSubtitle>
          </div>
        </CardHeader>
        <ConfigRow label="Model" value={<code className="font-mono text-[12px]">{kb.embeddingModel}</code>} />
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Chunking</CardTitle>
            <CardSubtitle>How documents get split before indexing.</CardSubtitle>
          </div>
        </CardHeader>
        <ConfigRow label="Splitter" value={SPLITTER_LABEL[kb.splitter]} />
        <ConfigRow label="Chunk size" value={`${kb.chunkSize} tokens`} />
        <ConfigRow label="Overlap" value={`${kb.chunkOverlap} tokens`} />
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>Source</CardTitle>
            <CardSubtitle>Where this KB's content comes from.</CardSubtitle>
          </div>
        </CardHeader>
        <ConfigRow
          label="Source type"
          value={
            kb.source === 'files'
              ? 'Uploaded files'
              : kb.source === 'url'
              ? 'URL crawl (coming Q3)'
              : 'Connected data source (coming Q3)'
          }
        />
        <ConfigRow label="Created" value={new Date(kb.createdAt).toLocaleString('en-AE')} />
        <ConfigRow label="Last updated" value={new Date(kb.updatedAt).toLocaleString('en-AE')} />
      </Card>

      <Card className="lg:col-span-2">
        <CardSubtitle>
          Changing chunk size or embedding model requires re-indexing all documents.
          Editing is stubbed in v1 — contact your delivery team to re-index.
        </CardSubtitle>
      </Card>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-t border-border-subtle py-2 first:border-t-0 first:pt-0">
      <span className="text-[12px] text-text-secondary">{label}</span>
      <span className="text-[13px] text-text-primary">{value}</span>
    </div>
  );
}
