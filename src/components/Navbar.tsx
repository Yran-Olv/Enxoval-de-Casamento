import { motion } from 'motion/react';
import { Heart, Gift, ShoppingBag, Lock } from 'lucide-react';

interface NavbarProps {
  onNavigate: (page: 'home' | 'purchased' | 'registry' | 'admin') => void;
  currentPage: string;
}

export default function Navbar({ onNavigate, currentPage }: NavbarProps) {
  const mobileItems = [
    { id: 'home', label: 'Início', icon: Heart },
    { id: 'registry', label: 'Enxoval', icon: Gift },
    { id: 'purchased', label: 'Comprados', icon: ShoppingBag },
    { id: 'admin', label: 'Admin', icon: Lock },
  ] as const;

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center bg-beige/80 backdrop-blur-md border-b border-gold/10">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => onNavigate('home')}
        className="cursor-pointer"
      >
        <span className="text-2xl font-serif tracking-tighter">T&Y</span>
      </motion.div>

      <div className="hidden md:flex items-center gap-10">
        {[
          { id: 'home', label: 'Início', icon: Heart },
          { id: 'registry', label: 'Enxoval', icon: Gift },
          { id: 'purchased', label: 'Comprados', icon: ShoppingBag },
          { id: 'admin', label: 'Admin', icon: Lock },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as any)}
            className={`flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold transition-colors ${
              currentPage === item.id ? 'text-gold' : 'text-ink/50 hover:text-gold'
            }`}
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="md:hidden flex items-center gap-3">
        {mobileItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-label={item.label}
            className={`p-2 rounded-full border transition-colors ${
              currentPage === item.id
                ? 'text-gold border-gold/40 bg-gold/10'
                : 'text-ink/60 border-gold/15 hover:text-gold'
            }`}
          >
            <item.icon size={18} />
          </button>
        ))}
      </div>
    </nav>
  );
}
