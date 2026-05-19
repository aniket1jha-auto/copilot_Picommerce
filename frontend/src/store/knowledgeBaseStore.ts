import { create } from 'zustand';
import type {
  KnowledgeBase,
  KBDocument,
  KBDocumentStatus,
  KBStatus,
} from '@/types/knowledgeBase';
import {
  mockKnowledgeBases,
  mockKnowledgeBaseDocuments,
} from '@/data/mock/knowledgeBases';

interface KBState {
  knowledgeBases: KnowledgeBase[];
  documents: KBDocument[];

  // KB CRUD
  setStatus: (id: string, status: KBStatus) => void;
  createKB: (
    input: Pick<KnowledgeBase, 'name' | 'description' | 'source'> &
      Partial<
        Pick<
          KnowledgeBase,
          | 'embeddingModel'
          | 'chunkSize'
          | 'chunkOverlap'
          | 'splitter'
          | 'documentCount'
          | 'chunkCount'
        >
      >,
  ) => KnowledgeBase;
  updateKB: (id: string, patch: Partial<KnowledgeBase>) => void;
  deleteKB: (id: string) => void;
  getKB: (id: string) => KnowledgeBase | undefined;

  // Document CRUD
  addDocuments: (
    kbId: string,
    docs: Array<Pick<KBDocument, 'name' | 'type' | 'sizeBytes'>>,
  ) => KBDocument[];
  deleteDocument: (docId: string) => void;
  setDocumentStatus: (docId: string, status: KBDocumentStatus) => void;
  getDocuments: (kbId: string) => KBDocument[];
}

let docIdCounter = 1_000_000;
const nextDocId = () => `kbdoc-${(++docIdCounter).toString(36)}`;

/** Recompute aggregate stats on a KB from its documents. */
function recomputeAggregates(
  knowledgeBases: KnowledgeBase[],
  documents: KBDocument[],
  kbId: string,
): KnowledgeBase[] {
  const docs = documents.filter((d) => d.knowledgeBaseId === kbId);
  const documentCount = docs.length;
  const chunkCount = docs.reduce((s, d) => s + d.chunkCount, 0);
  const anyIndexing = docs.some((d) => d.status === 'indexing');
  const anyFailed = docs.some((d) => d.status === 'failed');
  const status: KBStatus =
    documentCount === 0
      ? 'empty'
      : anyIndexing
        ? 'indexing'
        : anyFailed
          ? 'error'
          : 'ready';
  return knowledgeBases.map((kb) =>
    kb.id === kbId
      ? { ...kb, documentCount, chunkCount, status, updatedAt: new Date().toISOString() }
      : kb,
  );
}

export const useKnowledgeBaseStore = create<KBState>((set, get) => ({
  knowledgeBases: mockKnowledgeBases,
  documents: mockKnowledgeBaseDocuments,

  setStatus: (id, status) =>
    set((s) => ({
      knowledgeBases: s.knowledgeBases.map((kb) =>
        kb.id === id ? { ...kb, status, updatedAt: new Date().toISOString() } : kb,
      ),
    })),

  createKB: (input) => {
    const id = `kb-${String(Date.now()).slice(-6)}`;
    const now = new Date().toISOString();
    const kb: KnowledgeBase = {
      id,
      name: input.name,
      description: input.description,
      source: input.source,
      status: input.source === 'files' && (input.documentCount ?? 0) > 0 ? 'indexing' : 'empty',
      documentCount: input.documentCount ?? 0,
      chunkCount: input.chunkCount ?? 0,
      tokenCount: 0,
      embeddingModel: input.embeddingModel ?? 'text-embedding-3-large',
      chunkSize: input.chunkSize ?? 512,
      chunkOverlap: input.chunkOverlap ?? 64,
      splitter: input.splitter ?? 'recursive',
      usedByAgentIds: [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ knowledgeBases: [kb, ...s.knowledgeBases] }));

    // Mock indexing — flip to ready after 2.5s if it was indexing
    if (kb.status === 'indexing') {
      setTimeout(() => {
        set((s) => ({
          knowledgeBases: s.knowledgeBases.map((k) =>
            k.id === id ? { ...k, status: 'ready', updatedAt: new Date().toISOString() } : k,
          ),
        }));
      }, 2500);
    }
    return kb;
  },

  updateKB: (id, patch) =>
    set((s) => ({
      knowledgeBases: s.knowledgeBases.map((kb) =>
        kb.id === id ? { ...kb, ...patch, updatedAt: new Date().toISOString() } : kb,
      ),
    })),

  deleteKB: (id) =>
    set((s) => ({
      knowledgeBases: s.knowledgeBases.filter((kb) => kb.id !== id),
      documents: s.documents.filter((d) => d.knowledgeBaseId !== id),
    })),

  getKB: (id) => get().knowledgeBases.find((kb) => kb.id === id),

  addDocuments: (kbId, incoming) => {
    const now = new Date().toISOString();
    const created: KBDocument[] = incoming.map((d) => ({
      id: nextDocId(),
      knowledgeBaseId: kbId,
      name: d.name,
      type: d.type,
      sizeBytes: d.sizeBytes,
      // Chunk count is a rough estimate while we wait for "indexing" to finish.
      chunkCount: Math.max(1, Math.round(d.sizeBytes / 2048)),
      status: 'indexing',
      uploadedAt: now,
    }));

    set((s) => {
      const docs = [...s.documents, ...created];
      return {
        documents: docs,
        knowledgeBases: recomputeAggregates(s.knowledgeBases, docs, kbId),
      };
    });

    // Mock indexing — flip each doc to indexed after a short stagger
    created.forEach((doc, i) => {
      setTimeout(
        () => {
          set((s) => {
            const docs = s.documents.map((d) =>
              d.id === doc.id ? { ...d, status: 'indexed' as KBDocumentStatus } : d,
            );
            return {
              documents: docs,
              knowledgeBases: recomputeAggregates(s.knowledgeBases, docs, kbId),
            };
          });
        },
        1500 + i * 400,
      );
    });

    return created;
  },

  deleteDocument: (docId) =>
    set((s) => {
      const doc = s.documents.find((d) => d.id === docId);
      const docs = s.documents.filter((d) => d.id !== docId);
      return {
        documents: docs,
        knowledgeBases: doc
          ? recomputeAggregates(s.knowledgeBases, docs, doc.knowledgeBaseId)
          : s.knowledgeBases,
      };
    }),

  setDocumentStatus: (docId, status) =>
    set((s) => {
      const docs = s.documents.map((d) => (d.id === docId ? { ...d, status } : d));
      const doc = docs.find((d) => d.id === docId);
      return {
        documents: docs,
        knowledgeBases: doc
          ? recomputeAggregates(s.knowledgeBases, docs, doc.knowledgeBaseId)
          : s.knowledgeBases,
      };
    }),

  getDocuments: (kbId) => get().documents.filter((d) => d.knowledgeBaseId === kbId),
}));
