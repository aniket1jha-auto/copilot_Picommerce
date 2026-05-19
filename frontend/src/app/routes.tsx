import { Navigate, Routes, Route } from 'react-router-dom';

import { Dashboard } from '@/pages/Dashboard';

import { Campaigns } from '@/pages/Campaigns';
import { CreateCampaign } from '@/pages/CreateCampaign';
import { CampaignBuilder } from '@/pages/CampaignBuilder';
import { CampaignCopilotReview } from '@/pages/CampaignCopilotReview';
import { CampaignDetail } from '@/pages/CampaignDetail';
import { CampaignFlow } from '@/pages/CampaignFlow';
import { EditCampaign } from '@/pages/EditCampaign';

import { Agents } from '@/pages/Agents';
import { AgentBuilder } from '@/pages/AgentBuilder';
import { ChatAgentBuilder } from '@/pages/ChatAgentBuilder';
import { AgentDetail } from '@/pages/AgentDetail';

import { KnowledgeBaseList } from '@/pages/KnowledgeBaseList';
import { KnowledgeBaseDetail } from '@/pages/KnowledgeBaseDetail';

import { Tools } from '@/pages/Tools';

import { Audiences } from '@/pages/Audiences';
import { CreateSegmentSource } from '@/pages/CreateSegmentSource';
import { CreateSegmentFilters } from '@/pages/CreateSegmentFilters';
import { CreateSegmentCsv } from '@/pages/CreateSegmentCsv';

import { ContentLibrary } from '@/pages/ContentLibrary';
import { CreateContentTemplate } from '@/pages/CreateContentTemplate';

import { Monitoring } from '@/pages/Monitoring';
import { CallLogs } from '@/pages/CallLogs';
import { CallDetail } from '@/pages/CallDetail';
import { Reports } from '@/pages/Reports';

// OBSERVE restructure (Phase 4)
import { Performance } from '@/pages/observe/Performance';
import { Channels as ObserveChannels } from '@/pages/observe/Channels';
import { Reporting } from '@/pages/observe/Reporting';
import { ReportingDashboard } from '@/pages/observe/ReportingDashboard';

import { ChannelConfig } from '@/pages/ChannelConfig';
import { Integrations } from '@/pages/Integrations';
import { TeamRoles } from '@/pages/TeamRoles';
import { AuditLog } from '@/pages/AuditLog';
import { Settings } from '@/pages/Settings';

/**
 * Routing tree — Phase 1.
 * Source of truth: docs/IA.md §3.
 *
 * Old paths (/settings, /settings/integrations, /channels, /templates) are
 * redirected to their new homes during the transition. The /templates stub
 * page has been deleted; /templates redirects to /content-library.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />

      {/* BUILD — Campaigns (first per ADR 0002) */}
      <Route path="/campaigns" element={<Campaigns />} />
      {/* Unified copilot-first builder. Manual wizard lives at /new/manual. */}
      <Route path="/campaigns/new" element={<CampaignBuilder />} />
      <Route path="/campaigns/new/manual" element={<CreateCampaign />} />
      {/* Legacy redirect — anyone with a /campaigns/copilot bookmark lands on the new builder. */}
      <Route path="/campaigns/copilot" element={<Navigate to="/campaigns/new" replace />} />
      <Route path="/campaigns/copilot/review" element={<CampaignCopilotReview />} />
      <Route path="/campaigns/:id" element={<CampaignDetail />} />
      <Route path="/campaigns/:id/flow" element={<CampaignFlow />} />
      <Route path="/campaigns/:id/edit" element={<EditCampaign />} />

      {/* BUILD — Agents */}
      <Route path="/agents" element={<Agents />} />
      <Route path="/agents/new" element={<AgentBuilder />} />
      <Route path="/agents/new/chat" element={<ChatAgentBuilder />} />
      <Route path="/agents/:id/edit" element={<AgentBuilder mode="edit" />} />
      <Route path="/agents/:id" element={<AgentDetail />} />

      {/* BUILD — Knowledge Base (Central RAG) */}
      <Route path="/knowledge-base" element={<KnowledgeBaseList />} />
      <Route path="/knowledge-base/:id" element={<KnowledgeBaseDetail />} />

      {/* BUILD — Tools */}
      <Route path="/tools" element={<Tools />} />

      {/* BUILD — Audiences */}
      <Route path="/audiences" element={<Audiences />} />
      <Route path="/audiences/segments/new" element={<CreateSegmentSource />} />
      <Route path="/audiences/segments/new/filters" element={<CreateSegmentFilters />} />
      <Route path="/audiences/segments/new/csv" element={<CreateSegmentCsv />} />

      {/* BUILD — Content Library */}
      <Route path="/content-library" element={<ContentLibrary />} />
      <Route path="/content-library/templates/new" element={<CreateContentTemplate />} />
      {/* /content-ideas folded into the Ideas tab — Phase 3.6 */}
      <Route path="/content-ideas" element={<Navigate to="/content-library?tab=ideas" replace />} />

      {/* OBSERVE */}
      <Route path="/monitoring" element={<Monitoring />} />
      <Route path="/monitoring/calls" element={<CallLogs />} />
      <Route path="/monitoring/calls/:id" element={<CallDetail />} />

      {/* OBSERVE restructure — Performance / Channels / Reporting */}
      <Route path="/observe/performance" element={<Performance />} />
      <Route path="/observe/channels" element={<ObserveChannels />} />
      <Route path="/observe/reporting" element={<Reporting />} />
      <Route path="/observe/reporting/:id" element={<ReportingDashboard />} />

      {/* Legacy single-page redirects — keep one phase, then remove */}
      <Route path="/analytics" element={<Navigate to="/observe/channels" replace />} />
      <Route path="/reports" element={<Reports />} />

      {/* CONFIGURE */}
      <Route path="/configure/channels" element={<ChannelConfig />} />
      <Route path="/configure/integrations" element={<Integrations />} />
      <Route path="/configure/team" element={<TeamRoles />} />
      <Route path="/configure/audit-log" element={<AuditLog />} />
      <Route path="/configure/workspace" element={<Settings />} />

      {/* Legacy redirects — keep one phase, then remove */}
      <Route path="/settings" element={<Navigate to="/configure/workspace" replace />} />
      <Route path="/settings/integrations" element={<Navigate to="/configure/integrations" replace />} />
      <Route path="/channels" element={<Navigate to="/configure/channels" replace />} />
      <Route path="/templates" element={<Navigate to="/content-library" replace />} />

      {/* Catch-all → Dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
