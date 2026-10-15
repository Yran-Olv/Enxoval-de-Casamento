import { useEffect, useState } from 'react';
import { Heart, Gift, ShoppingBag, Lock, Mail, Menu, X } from 'lucide-react';

interface NavbarProps {
  onNavigate: (page: 'home' | 'purchased' | 'registry' | 'admin' | 'invitation') => void;
  currentPage: string;
}

const items = [
  { id: 'home', label: 'Início', icon: Heart },
  { id: 'invitation', label: 'Convite', icon: Mail },
  { id: 'registry', label: 'Presentes', icon: Gift },
  { id: 'purchased', label: 'Comprados', icon: ShoppingBag },
  { id: 'admin', label: 'Admin', icon: Lock },
] as const;

export default function Navbar({ onNavigate, currentPage }: NavbarProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [currentPage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (page: (typeof items)[number]['id']) => {
    setOpen(false);
    onNavigate(page);
  };

  return (
    <nav className="fixed top-0 left-0 z-50 w-full border-b border-gold/10 bg-beige/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <button type="button" onClick={() => go('home')} className="min-h-11 font-serif text-2xl tracking-tight">
          T&Y
        </button>

        <div className="hidden items-center gap-8 md:flex">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              className={`flex min-h-11 items-center gap-2 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                currentPage === item.id ? 'text-ink' : 'text-ink/55 hover:text-ink'
              }`}
              aria-current={currentPage === item.id ? 'page' : undefined}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-gold/20 md:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
          <span className="sr-only">{open ? 'Fechar menu' : 'Abrir menu'}</span>
        </button>
      </div>

      {open && (
        <div id="menu-mobile" className="border-t border-gold/10 bg-beige px-4 py-3 md:hidden">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm ${
                currentPage === item.id ? 'bg-white text-ink' : 'text-ink/70'
              }`}
              aria-current={currentPage === item.id ? 'page' : undefined}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
