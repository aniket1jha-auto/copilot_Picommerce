import type { ContentTemplateRow } from '@/types/contentLibrary';
import { MOCK_CONTENT_TEMPLATES } from '@/data/mock/contentLibraryTemplates';

// v2 bumped for the Arabic / UAE rewrite so any cached India-locale
// templates from the previous schema get superseded automatically.
const STORAGE_KEY = 'picommerce.contentTemplates.v2';

function safeParseTemplates(raw: string | null): ContentTemplateRow[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as ContentTemplateRow[];
  } catch {
    return null;
  }
}

export function loadContentTemplates(): ContentTemplateRow[] {
  if (typeof window === 'undefined') return MOCK_CONTENT_TEMPLATES;
  const parsed = safeParseTemplates(window.localStorage.getItem(STORAGE_KEY));
  return parsed && parsed.length > 0 ? parsed : MOCK_CONTENT_TEMPLATES;
}

export function saveContentTemplates(templates: ContentTemplateRow[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

