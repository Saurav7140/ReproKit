import { z } from 'zod';
import { MASK, REPLAY_LIMITS, SAFE_TAGS, sanitizeUrl, type SafeNode } from './privacy.js';
import { sanitizeStyle, STYLE_LIMIT } from './styles.js';

const id = z.number().int().min(-1).max(1e15);
const coordinate = z.number().min(-1e15).max(1e15);
const dimension = z.number().min(0).max(16_384);
const attributes = z.strictObject({
  style: z.string().max(STYLE_LIMIT).refine((value) => sanitizeStyle(value) === value, 'Replay style must use the safe presentation subset').optional(),
  type: z.enum(['button','checkbox','color','date','datetime-local','email','file','hidden','image','month','number','password','radio','range','reset','search','submit','tel','text','time','url','week']).optional(),
  rr_width: z.string().regex(/^\d{1,5}(\.\d{1,3})?px$/).optional(), rr_height: z.string().regex(/^\d{1,5}(\.\d{1,3})?px$/).optional(),
});
const base = { id, rootId: id.optional() };
const node: z.ZodType<SafeNode> = z.lazy(() => z.discriminatedUnion('type', [
  z.strictObject({ ...base, type: z.literal(0), childNodes: z.array(node).max(REPLAY_LIMITS.nodes) }),
  z.strictObject({ ...base, type: z.literal(1), name: z.literal('html'), publicId: z.literal(''), systemId: z.literal('') }),
  z.strictObject({ ...base, type: z.literal(2), tagName: z.enum(SAFE_TAGS), attributes, childNodes: z.array(node).max(REPLAY_LIMITS.nodes), isShadow: z.boolean().optional(), isShadowHost: z.boolean().optional() }),
  z.strictObject({ ...base, type: z.literal(3), textContent: z.literal(MASK) }),
  z.strictObject({ ...base, type: z.literal(5), textContent: z.literal('') }),
]));
const mutation = z.strictObject({
  source: z.literal(0),
  texts: z.array(z.strictObject({ id, value: z.literal(MASK) })).max(REPLAY_LIMITS.nodes),
  attributes: z.array(z.strictObject({ id, attributes })).max(REPLAY_LIMITS.nodes),
  removes: z.array(z.strictObject({ id, parentId: id })).max(REPLAY_LIMITS.nodes),
  adds: z.array(z.strictObject({ parentId: id, nextId: id.nullable(), node })).max(REPLAY_LIMITS.nodes),
});
export const replayEventSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal(0), timestamp: coordinate, data: z.strictObject({}) }),
  z.strictObject({ type: z.literal(1), timestamp: coordinate, data: z.strictObject({}) }),
  z.strictObject({ type: z.literal(2), timestamp: coordinate, data: z.strictObject({ node, initialOffset: z.strictObject({ left: coordinate, top: coordinate }) }) }),
  z.strictObject({ type: z.literal(4), timestamp: coordinate, data: z.strictObject({ href: z.string().max(2_048).refine((value) => sanitizeUrl(value) === value, 'Replay URL must be sanitized'), width: dimension, height: dimension }) }),
  z.strictObject({ type: z.literal(3), timestamp: coordinate, data: z.discriminatedUnion('source', [
    mutation,
    z.strictObject({ source: z.literal(2), type: z.number().int().min(0).max(10), id, x: coordinate.optional(), y: coordinate.optional() }),
    z.strictObject({ source: z.literal(3), id, x: coordinate, y: coordinate }),
    z.strictObject({ source: z.literal(4), width: dimension, height: dimension }),
    z.strictObject({ source: z.literal(5), id, text: z.literal(MASK), isChecked: z.literal(false) }),
  ]) }),
]).superRefine((event, context) => {
  if (new TextEncoder().encode(JSON.stringify(event)).byteLength > REPLAY_LIMITS.eventBytes) {
    context.addIssue({ code: 'custom', message: 'Replay event exceeds its byte limit' });
  }
  const roots = event.type === 2 ? [event.data.node] : event.type === 3 && event.data.source === 0 ? event.data.adds.map((add) => add.node) : [];
  const pending = roots.map((node) => ({ node, depth: 0 }));
  let count = 0;
  while (pending.length) {
    const entry = pending.pop()!;
    if (++count > REPLAY_LIMITS.nodes || entry.depth > REPLAY_LIMITS.depth) {
      context.addIssue({ code: 'custom', message: 'Replay DOM node or depth limit exceeded' });
      break;
    }
    for (const child of entry.node.childNodes ?? []) pending.push({ node: child, depth: entry.depth + 1 });
  }
});
export type ReplayEvent = z.infer<typeof replayEventSchema>;
