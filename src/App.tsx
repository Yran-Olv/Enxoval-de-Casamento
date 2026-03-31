import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PurchasedItems from './components/PurchasedItems';
import RegistryList from './components/RegistryList';
import AdminPanel from './components/AdminPanel';
import { api } from './api';
import { SettingsData } from './types';

type Page = 'home' | 'purchased' | 'registry' | 'admin';

function pageToPath(page: Page): string {
  if (page === 'admin') return '/admin';
  if (page === 'registry') return '/enxoval';
  if (page === 'purchased') return '/comprados';
  return '/';
}

function pathToPage(pathname: string): Page {
  if (pathname === '/admin' || pathname === '/admin/configuracoes/whatsapp') return 'admin';
  if (pathname === '/enxoval') return 'registry';
  if (pathname === '/comprados') return 'purchased';
  return 'home';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => pathToPage(window.location.pathname));
  const [settings, setSettings] = useState<SettingsData>({
    pixKey: '',
    pixName: '',
    weddingDate: '2027-02-02',
  });

  const navigate = (page: Page) => {
    setCurrentPage(page);
    const nextPath = pageToPath(page);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  };

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.get('/settings');
        if (data?.weddingDate) {
          setSettings({
            pixKey: data.pixKey ?? '',
            pixName: data.pixName ?? '',
            weddingDate: data.weddingDate,
          });
        }
      } catch {
        // Mantém fallback local quando API não estiver disponível.
      }
    };
    loadSettings();
  }, []);

  const weddingDateLabel = new Date(`${settings.weddingDate}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Suporta abrir URL direta (/admin) e botão voltar/avançar do browser.
  useEffect(() => {
    const onPopState = () => setCurrentPage(pathToPage(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <div className="relative min-h-screen selection:bg-gold/20 selection:text-gold">
      <Navbar onNavigate={navigate} currentPage={currentPage} />

      <main>
        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Hero onNavigate={navigate} weddingDate={settings.weddingDate} weddingDateLabel={weddingDateLabel} />
            </motion.div>
          )}

          {currentPage === 'purchased' && (
            <motion.div
              key="purchased"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
            >
              <PurchasedItems />
            </motion.div>
          )}

          {currentPage === 'registry' && (
            <motion.div
              key="registry"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
            >
              <RegistryList />
            </motion.div>
          )}

          {currentPage === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5 }}
            >
              <AdminPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-gold/10 text-center">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-serif mb-6">Tais & Yran</h2>
          <p className="text-xs uppercase tracking-[0.4em] opacity-40 mb-10">{weddingDateLabel}</p>
          <div className="flex justify-center gap-6 mb-12">
            <div className="w-10 h-10 rounded-full border border-gold/20 flex items-center justify-center text-gold hover:bg-gold hover:text-white transition-all cursor-pointer">
              <span className="font-serif italic">T</span>
            </div>
            <div className="w-10 h-10 rounded-full border border-gold/20 flex items-center justify-center text-gold hover:bg-gold hover:text-white transition-all cursor-pointer">
              <span className="font-serif italic">Y</span>
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest opacity-30">
            Feito com carinho para o nosso novo começo.
          </p>
        </div>
      </footer>
    </div>
  );
}
