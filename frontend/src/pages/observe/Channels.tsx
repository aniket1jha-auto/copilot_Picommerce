/**
 * Observe → Channels.
 *
 * Aliased to the existing channel-focused Analytics page. The
 * /analytics route still works (redirect lives in routes.tsx) but
 * the canonical home for channel analytics is now /observe/channels
 * — surfaced alongside Performance + Reporting in the OBSERVE
 * sidebar section.
 */
export { Analytics as Channels } from '@/pages/Analytics';
