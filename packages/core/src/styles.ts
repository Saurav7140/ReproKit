// Only resolved presentation values: no selectors, strings, variables, URLs or resource-loading properties.
const length = '(?:-?\\d{1,5}(?:\\.\\d{1,3})?px|auto|none|normal)';
const lengths = new RegExp(`^${length}(?: ${length}){0,15}$`);
const color = /^rgba?\(\d{1,3}(?:\.\d{1,3})?, \d{1,3}(?:\.\d{1,3})?, \d{1,3}(?:\.\d{1,3})?(?:, (?:0|1|0?\.\d{1,3}))?\)$/;
const rules: Record<string, RegExp> = {
  display: /^(?:none|contents|block|inline|inline-block|flex|inline-flex|grid|inline-grid|table|inline-table|table-row|table-cell|table-row-group|table-header-group|table-footer-group|table-column|table-column-group|table-caption|list-item)$/,
  position: /^(?:static|relative|absolute|fixed|sticky)$/,
  'box-sizing': /^(?:content-box|border-box)$/,
  'flex-direction': /^(?:row|row-reverse|column|column-reverse)$/,
  'flex-wrap': /^(?:nowrap|wrap|wrap-reverse)$/,
  'font-family': /^(?:sans-serif|serif|monospace)$/,
  'font-weight': /^(?:[1-9]\d{0,2}|1000)$/,
  'font-style': /^(?:normal|italic|oblique)$/,
  'text-align': /^(?:start|end|left|right|center|justify)$/,
  'white-space': /^(?:normal|pre|nowrap|pre-wrap|pre-line|break-spaces)$/,
  'text-decoration-line': /^(?:none|underline|overline|line-through)(?: (?:underline|overline|line-through)){0,2}$/,
  visibility: /^(?:visible|hidden|collapse)$/,
  opacity: /^(?:0|1|0?\.\d{1,3})$/,
  'z-index': /^(?:auto|-?\d{1,9})$/,
  order: /^-?\d{1,5}$/,
};
for (const property of ['width','height','min-width','min-height','max-width','max-height','top','right','bottom','left','margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','font-size','line-height','letter-spacing','row-gap','column-gap','flex-basis','grid-template-columns','grid-template-rows','border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius']) rules[property] = lengths;
for (const property of ['color','background-color','border-top-color','border-right-color','border-bottom-color','border-left-color']) rules[property] = color;
for (const side of ['top','right','bottom','left']) {
  rules[`border-${side}-width`] = lengths;
  rules[`border-${side}-style`] = /^(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/;
}
for (const property of ['align-items','align-self','align-content','justify-content','justify-items','justify-self']) rules[property] = /^(?:normal|auto|stretch|start|end|center|flex-start|flex-end|baseline|space-between|space-around|space-evenly)$/;
for (const property of ['overflow-x','overflow-y']) rules[property] = /^(?:visible|hidden|clip|scroll|auto)$/;
for (const property of ['flex-grow','flex-shrink']) rules[property] = /^\d{1,3}(?:\.\d{1,3})?$/;
for (const property of ['grid-column-start','grid-column-end','grid-row-start','grid-row-end']) rules[property] = /^(?:auto|-?\d{1,3}|span \d{1,3})$/;

export const STYLE_PROPERTIES = Object.freeze(Object.keys(rules));
export const STYLE_LIMIT = 4096;

export function sanitizeStyle(value: unknown): string {
  if (typeof value !== 'string' || value.length > STYLE_LIMIT) return '';
  const safe = new Map<string, string>();
  for (const declaration of value.split(';')) {
    const colon = declaration.indexOf(':');
    const property = declaration.slice(0, colon).trim();
    const content = declaration.slice(colon + 1).trim();
    if (colon > 0 && Object.hasOwn(rules, property) && rules[property]!.test(content)) safe.set(property, content);
  }
  return [...safe].map(([property, content]) => `${property}:${content}`).join(';');
}
