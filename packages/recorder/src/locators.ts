import { CONTROL_ROLES, TEST_ID_PATTERN } from '@reprokit/core/privacy';
import type { Report } from '@reprokit/core';

type Locator = Extract<Report['evidence'], { kind: 'web' }>['actions'][number]['locator'];
function role(element: Element): string | null {
  const explicit = element.getAttribute('role');
  if (explicit) return (CONTROL_ROLES as readonly string[]).includes(explicit) ? explicit : null;
  if (element.localName === 'button') return 'button';
  if (element.localName === 'a' && element.hasAttribute('href')) return 'link';
  if (element.localName === 'textarea') return 'textbox';
  if (element instanceof HTMLSelectElement) return element.multiple || element.size > 1 ? null : 'combobox';
  if (element instanceof HTMLInputElement) {
    if (['button', 'submit', 'reset', 'image'].includes(element.type)) return 'button';
    if (['text', 'email', 'tel', 'url'].includes(element.type)) return 'textbox';
    if (element.type === 'search') return 'searchbox';
    if (element.type === 'number') return 'spinbutton';
    if (element.type === 'range') return 'slider';
    if (element.type === 'checkbox' || element.type === 'radio') return element.type;
  }
  return null;
}

export function captureLocator(element: Element): Locator {
  const unavailable: Locator = { kind: 'unavailable', value: '' };
  if (element.getRootNode() !== document) return unavailable;
  const testId = element.getAttribute('data-testid');
  const testElements = document.querySelectorAll('[data-testid]');
  if (testId && TEST_ID_PATTERN.test(testId) && testElements.length <= 5000 && [...testElements].filter((entry) => entry.getAttribute('data-testid') === testId).length === 1) return { kind: 'testId', value: testId };
  const value = role(element);
  if (!value) return unavailable;
  const controls = document.querySelectorAll('button,a[href],input,textarea,select,[role]');
  if (controls.length > 5000) return unavailable;
  const matches = [...controls].filter((entry) => role(entry) === value && !entry.closest('[hidden],[inert],[aria-hidden="true"]') && getComputedStyle(entry).visibility === 'visible' && entry.getClientRects().length > 0);
  return matches.length === 1 && matches[0] === element ? { kind: 'role', value } : unavailable;
}
