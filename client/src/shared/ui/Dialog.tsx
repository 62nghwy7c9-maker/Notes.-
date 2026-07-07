import { useEffect } from 'react';
import type { ReactNode } from 'react';

/** Schlichter modaler Dialog: Backdrop + Karte, Esc schließt. */
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onMouseDown={onClose}
    >
      <div
        className="w-[380px] rounded-xl border border-border bg-surface p-4 shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-[14px] font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>;
}

export function Button({
  children,
  onClick,
  variant = 'default',
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const styles = {
    default: 'border border-border text-text hover:bg-accent-soft',
    primary: 'bg-accent text-white hover:opacity-90',
    danger: 'bg-danger text-white hover:opacity-90',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-[13px] disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[13px] outline-none focus:border-accent"
    />
  );
}
