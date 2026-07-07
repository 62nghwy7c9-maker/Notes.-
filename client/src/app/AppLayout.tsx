import { ThemeToggle } from './ThemeToggle.js';

/** Ein leerer Spalten-Platzhalter mit Titel und erklärendem Leerzustand. */
function Column({
  title,
  hint,
  className = '',
  action,
}: {
  title: string;
  hint: string;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={`flex min-h-0 flex-col ${className}`}>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <h2 className="text-[13px] font-medium text-muted">{title}</h2>
        {action}
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="max-w-[22ch] text-center text-[13px] leading-relaxed text-muted">
          {hint}
        </p>
      </div>
    </section>
  );
}

/**
 * Grundgerüst der Hauptansicht: Sidebar · Notizliste · Editor · Agent-Panel
 * (07-ui-ux-design.md). In M0 sind alle Bereiche leere Platzhalter.
 */
export function AppLayout() {
  return (
    <div className="grid h-full grid-cols-[240px_288px_1fr_380px] bg-bg text-text">
      <Column
        title="Notizen"
        hint="Ordner erscheinen hier. In M1 kommen Ordnerbaum, Eingang und Navigation."
        className="border-r border-border bg-surface"
        action={<ThemeToggle />}
      />
      <Column
        title="Liste"
        hint="Wähle einen Ordner, um seine Notizen zu sehen. Ctrl/Cmd+N legt eine neue an."
        className="border-r border-border"
      />
      <Column
        title="Editor"
        hint="Noch keine Notiz geöffnet. Der TipTap-Editor folgt in M1."
        className="bg-surface"
      />
      <Column
        title="✦ Agent"
        hint="Der Kreativ-Agent zieht in M4 hier ein (Ctrl/Cmd+J)."
        className="border-l border-border bg-surface"
      />
    </div>
  );
}
