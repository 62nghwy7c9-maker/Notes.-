import { useEffect, useState } from 'react';

export interface MenuItem {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

/**
 * Hook für ein globales Kontextmenü: `open(event, items)` im
 * onContextMenu-Handler aufrufen, `element` einmal rendern.
 */
export function useContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('blur', close);
    };
  }, [menu]);

  const open = (e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  const element = menu ? (
    <div
      className="fixed z-50 min-w-[180px] rounded-xl border border-border bg-surface py-1 shadow-lg"
      style={{
        left: Math.min(menu.x, window.innerWidth - 200),
        top: Math.min(menu.y, window.innerHeight - menu.items.length * 34 - 12),
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menu.items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            setMenu(null);
            item.onClick();
          }}
          className={`block w-full px-3 py-1.5 text-left text-[13px] hover:bg-accent-soft ${
            item.danger ? 'text-danger' : 'text-text'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  ) : null;

  return { open, element };
}
