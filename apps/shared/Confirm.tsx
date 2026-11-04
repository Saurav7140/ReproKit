import { useLayoutEffect, useRef } from 'react';
export function Confirm({ title, description, action, onConfirm, onCancel }: { title: string; description: string; action: string; onConfirm: () => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Restore focus before React detaches the dialog and loses the native opener.
  useLayoutEffect(() => { const element = dialog.current!; const opener=document.activeElement; element.showModal(); return () => {element.close();if(opener instanceof HTMLElement&&opener.isConnected)opener.focus();}; }, []);
  return <dialog ref={dialog} aria-labelledby="confirm-title" aria-describedby="confirm-description" onCancel={(event) => { event.preventDefault(); onCancel(); }}><h2 id="confirm-title">{title}</h2><p id="confirm-description">{description}</p><div className="capture-actions"><button className="button" autoFocus onClick={onCancel}>Cancel</button><button className="button primary" onClick={onConfirm}>{action}</button></div></dialog>;
}
