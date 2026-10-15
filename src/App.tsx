import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import WeddingMusic from './components/WeddingMusic';

const PurchasedItems = lazy(() => import('./components/PurchasedItems'));
const RegistryList = lazy(() => import('./components/RegistryList'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const WeddingInvitation = lazy(() => import('./components/WeddingInvitation'));
import { api } from './api';
import { SettingsData } from './types';

type Page = 'home' | 'purchased' | 'registry' | 'admin' | 'invitation';

function pageToPath(page: Page): string {
  if (page === 'admin') return '/admin';
  if (page === 'registry') return '/enxoval';
  if (page === 'purchased') return '/comprados';
  if (page === 'invitation') return '/convite';
  return '/';
}

function pathToPage(pathname: string): Page {
  if (pathname === '/admin' || pathname === '/admin/configuracoes/whatsapp') return 'admin';
  if (pathname === '/enxoval') return 'registry';
  if (pathname === '/comprados') return 'purchased';
  if (pathname === '/convite') return 'invitation';
  return 'home';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => pathToPage(window.location.pathname));
  const [settings, setSettings] = useState<SettingsData>({
    pixKey: '',
    pixName: '',
    coupleNames: 'Tais & Yran',
    weddingDate: '2027-02-02',
    ceremonyTime: '16:00',
    invitationMessage: '',
    ceremonyVenue: '',
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
            coupleNames: data.coupleNames ?? 'Tais & Yran',
            weddingDate: data.weddingDate,
            ceremonyTime: data.ceremonyTime ?? '16:00',
            invitationMessage: data.invitationMessage ?? '',
            ceremonyVenue: data.ceremonyVenue ?? '',
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

  useEffect(() => {
    const titles: Record<Page, string> = {
      home: 'Início',
      invitation: 'Convite',
      registry: 'Lista de presentes',
      purchased: 'Itens comprados',
      admin: 'Painel',
    };
    document.title = `${settings.coupleNames || 'Casamento'} — ${titles[currentPage]}`;
  }, [currentPage, settings.coupleNames]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-screen selection:bg-gold/20 selection:text-ink">
      <Navbar onNavigate={navigate} currentPage={currentPage} />
      {currentPage !== 'admin' && <WeddingMusic />}

      <main>
        <Suspense fallback={<p className="px-6 pt-32 text-center font-serif text-2xl" role="status">Carregando…</p>}>
        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Hero
                onNavigate={navigate}
                weddingDate={settings.weddingDate}
                weddingDateLabel={weddingDateLabel}
                coupleNames={settings.coupleNames ?? 'Tais & Yran'}
                ceremonyTime={settings.ceremonyTime ?? '16:00'}
                invitationMessage={settings.invitationMessage}
                ceremonyVenue={settings.ceremonyVenue}
              />
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

          {currentPage === 'invitation' && (
            <motion.div key="invitation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <WeddingInvitation />
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
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-gold/10 px-6 py-12 text-center">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 font-serif text-3xl sm:text-4xl">{settings.coupleNames ?? 'Tais & Yran'}</h2>
          <p className="mb-6 text-xs uppercase tracking-[0.25em] text-ink/50">{weddingDateLabel}</p>
          <p className="text-[10px] uppercase tracking-widest text-ink/40">
            Feito com carinho para o nosso novo começo.
          </p>
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}
