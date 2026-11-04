import { useLayoutEffect, useState } from 'react';
import { Icon } from './Icon';
import './appearance-control.css';

export type Appearance = 'system' | 'light' | 'dark';
export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(() => {
    let saved = document.documentElement.dataset.appearance;
    try { saved ??= localStorage.getItem('reprokit-appearance') ?? undefined; } catch { /* Preference storage is optional. */ }
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  });
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => appearance === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : appearance);
  useLayoutEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme = appearance === 'system' ? (media.matches ? 'dark' : 'light') : appearance;
      document.documentElement.dataset.appearance = appearance;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      setResolved(theme);
    };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [appearance]);
  function choose(value: Appearance) {
    setAppearance(value);
    try { localStorage.setItem('reprokit-appearance', value); } catch { /* Appearance still works without storage. */ }
  }
  return { appearance, resolved, choose };
}
export function AppearanceControl({ value, resolved, onChange }: { value: Appearance; resolved: 'light' | 'dark'; onChange: (value: Appearance) => void }) {
  return <div className="appearance-control"><span className="appearance-label">Appearance</span><div className="appearance-options">
    <div className="appearance-toggle" data-mode={resolved} role="group" aria-label="Color theme">
      <span className="appearance-thumb" aria-hidden="true"/>
      <button type="button" aria-label="Light theme" title="Light theme" aria-pressed={resolved === 'light'} onClick={() => onChange('light')}><Icon name="sun"/></button>
      <button type="button" aria-label="Dark theme" title="Dark theme" aria-pressed={resolved === 'dark'} onClick={() => onChange('dark')}><Icon name="moon"/></button>
    </div>
    <button type="button" className="appearance-system" aria-label="Use system appearance" title="Follow device theme" aria-pressed={value === 'system'} onClick={() => onChange('system')}><Icon name="monitor"/></button>
  </div></div>;
}
