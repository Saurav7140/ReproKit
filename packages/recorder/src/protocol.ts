import { z } from 'zod';
import { actionSchema, errorSchema, requestSchema, replayEventSchema } from '@reprokit/core';

export const packetSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('replay'), event: replayEventSchema }),
  z.strictObject({ kind: z.literal('action'), event: actionSchema }),
  z.strictObject({ kind: z.literal('error'), event: errorSchema }),
  z.strictObject({ kind: z.literal('request'), event: requestSchema }),
]);
export type CapturePacket = z.infer<typeof packetSchema>;
export const END_REASONS = ['stopped', 'discarded', 'navigation', 'tab-closed', 'controller-closed', 'duration-limit', 'event-limit', 'byte-limit', 'evidence-limit', 'connection-lost', 'invalid-message', 'capture-error', 'indicator-removed'] as const;
export type EndReason = typeof END_REASONS[number];
export const CONTENT_KEY = '__reprokitContentV2';
export const PAGE_KEY = '__reprokitPageV2';
export const CAPTURE_LIMITATIONS = [
  'Top-level HTTP(S) HTML only. Full navigation/reload ends capture; no automatic restart.',
  'Text, labels, values, arbitrary DOM attributes, assets, URL paths and error messages are masked or removed. Short unique test IDs and control roles may be retained separately for test drafts. Origins and test IDs can identify an application or tenant; inspect before sharing.',
  'Safe resolved layout and basic colours are retained. Stylesheets, selectors, CSS strings/variables, original fonts, images, canvas, frames, media, selection and closed shadow roots are not captured. Pseudo-elements, transforms and continuous animations may differ.',
  'Failed-request evidence uses completed Resource Timing entries. Unconsumed fetch bodies may delay or omit entries. Method is unknown (OTHER); transport failures, aborts, timeouts and hidden cross-origin status codes may be missing.',
  'Page diagnostics are capped at 50 messages per second; excess diagnostic messages are omitted.',
  'Early errors, requests begun before capture, workers and page-world interference may be missing. Page diagnostics cannot be authenticated against a hostile page.',
  'Replay shows captured behavior only. Authentication, backend state and external services cannot be restored.',
  'Generated steps/tests are editable starting points. Missing locators, masked values, routes, unsupported inputs and assertions require manual completion; no credentials or business expectations are inferred.',
  'Only this open capture page owns the report in memory. Closing/reloading it or restarting the browser discards the report.',
];
