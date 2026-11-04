import { sanitizeStyle } from './styles.js';
export { sanitizeStyle, STYLE_PROPERTIES } from './styles.js';
export const MASK = '[masked]' as const;
export const TEST_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
export const CONTROL_ROLES = ['button', 'link', 'textbox', 'searchbox', 'checkbox', 'radio', 'combobox', 'spinbutton', 'slider'] as const;
export const SAFE_TAGS = ['html','head','body','div','span','p','a','button','input','textarea','select','option','form','label','fieldset','legend','main','section','article','aside','header','footer','nav','ul','ol','li','dl','dt','dd','h1','h2','h3','h4','h5','h6','table','thead','tbody','tfoot','tr','td','th','caption','colgroup','col','br','hr','pre','code','strong','em','b','i','u','s','small','sub','sup','details','summary','dialog'] as const;
const INPUT_TYPES = ['button','checkbox','color','date','datetime-local','email','file','hidden','image','month','number','password','radio','range','reset','search','submit','tel','text','time','url','week'];
export const REPLAY_LIMITS = { nodes: 5_000, depth: 64, eventBytes: 512 * 1024 } as const;
export type SafeAttributes = { type?: string; rr_width?: string; rr_height?: string; style?: string };
export type SafeNode = { type: 0 | 1 | 2 | 3 | 5; id: number; rootId?: number; childNodes?: SafeNode[]; tagName?: typeof SAFE_TAGS[number]; attributes?: SafeAttributes; textContent?: typeof MASK | ''; name?: 'html'; publicId?: ''; systemId?: ''; isShadow?: boolean; isShadowHost?: boolean };

/** Keep origin; redact every path segment, query, fragment and userinfo. */
export function sanitizeUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 8_192) return 'https://redacted.invalid/';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return 'https://redacted.invalid/';
    return `${url.origin}${url.pathname === '/' ? '/' : '/[redacted]'}`;
  } catch { return 'https://redacted.invalid/'; }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unsupported capture shape');
  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e15) throw new Error('Invalid capture number');
  return value;
}
function id(value: unknown): number {
  const result = number(value);
  if (!Number.isInteger(result) || result < -1) throw new Error('Invalid node id');
  return result;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > REPLAY_LIMITS.nodes) throw new Error('Capture node limit');
  return value;
}
export function sanitizeAttributes(value: unknown): SafeAttributes {
  const attrs = object(value);
  const result: SafeAttributes = {};
  if (typeof attrs.type === 'string' && INPUT_TYPES.includes(attrs.type)) result.type = attrs.type;
  if (typeof attrs.style === 'string') result.style = sanitizeStyle(attrs.style);
  for (const key of ['rr_width', 'rr_height'] as const) {
    if (typeof attrs[key] === 'string' && /^\d{1,5}(\.\d{1,3})?px$/.test(attrs[key])) result[key] = attrs[key];
  }
  return result;
}

/** Explicit rrweb allowlist; unsupported channels are dropped, never copied generically. */
export function sanitizeReplayEvent(value: unknown): Record<string, unknown> | null {
  const event = object(value);
  const timestamp = number(event.timestamp);
  const data = object(event.data);
  let nodes = 0;
  function node(raw: unknown, depth = 0): SafeNode {
    if (++nodes > REPLAY_LIMITS.nodes || depth > REPLAY_LIMITS.depth) throw new Error('Capture node limit');
    const input = object(raw);
    const base = { id: id(input.id), ...(input.rootId === undefined ? {} : { rootId: id(input.rootId) }) };
    if (input.type === 0) return { ...base, type: 0, childNodes: list(input.childNodes).map((child) => node(child, depth + 1)) };
    if (input.type === 1) return { ...base, type: 1, name: 'html', publicId: '', systemId: '' };
    if (input.type === 3 || input.type === 5) return { ...base, type: input.type, textContent: input.type === 3 ? MASK : '' };
    if (input.type !== 2) throw new Error('Unsupported DOM node');
    const known = typeof input.tagName === 'string' && (SAFE_TAGS as readonly string[]).includes(input.tagName);
    return {
      ...base, type: 2, tagName: known ? input.tagName as SafeNode['tagName'] : 'div',
      attributes: known ? sanitizeAttributes(input.attributes) : {},
      childNodes: known ? list(input.childNodes).map((child) => node(child, depth + 1)) : [],
      ...(input.isShadow === true ? { isShadow: true } : {}), ...(input.isShadowHost === true ? { isShadowHost: true } : {}),
    };
  }
  let clean: unknown;
  switch (event.type) {
    case 0: case 1: clean = {}; break;
    case 2: {
      const offset = object(data.initialOffset);
      clean = { node: node(data.node), initialOffset: { left: number(offset.left), top: number(offset.top) } };
      break;
    }
    case 4: clean = { href: sanitizeUrl(data.href), width: number(data.width), height: number(data.height) }; break;
    case 3: {
      switch (data.source) {
        case 0: clean = {
          source: 0,
          texts: list(data.texts).map((raw) => ({ id: id(object(raw).id), value: MASK })),
          attributes: list(data.attributes).map((raw) => ({ id: id(object(raw).id), attributes: sanitizeAttributes(object(raw).attributes) })),
          removes: list(data.removes).map((raw) => ({ id: id(object(raw).id), parentId: id(object(raw).parentId) })),
          adds: list(data.adds).map((raw) => { const add = object(raw); return { parentId: id(add.parentId), nextId: add.nextId === null ? null : id(add.nextId), node: node(add.node) }; }),
        }; break;
        case 2: clean = { source: 2, type: id(data.type), id: id(data.id), ...(data.x === undefined ? {} : { x: number(data.x) }), ...(data.y === undefined ? {} : { y: number(data.y) }) }; break;
        case 3: clean = { source: 3, id: id(data.id), x: number(data.x), y: number(data.y) }; break;
        case 4: clean = { source: 4, width: number(data.width), height: number(data.height) }; break;
        case 5: clean = { source: 5, id: id(data.id), text: MASK, isChecked: false }; break;
        default: return null;
      }
      break;
    }
    default: return null;
  }
  const result = { type: event.type, timestamp, data: clean };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > REPLAY_LIMITS.eventBytes) throw new Error('Capture event byte limit');
  return result;
}
