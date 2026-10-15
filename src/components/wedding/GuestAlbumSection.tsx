import { useEffect, useState } from 'react';
import type { WeddingThemeConfig } from './ThemeDefinitions';
import { Camera, Upload, CheckCircle2, AlertCircle, X, Heart } from 'lucide-react';
import { api } from '../../api';

type GuestPhoto = {
  id: string;
  guestName: string;
  photoUrl: string;
  caption?: string;
  createdAt: string;
};

type Props = {
  theme: WeddingThemeConfig;
  coupleNames: string;
};

export default function GuestAlbumSection({ theme, coupleNames }: Props) {
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const p = theme.palette;

  const loadPhotos = async () => {
    try {
      const res = await api.get('/guest-photos');
      if (Array.isArray(res?.photos)) {
        setPhotos(res.photos);
      }
    } catch {
      // silencioso se offline
    }
  };

  useEffect(() => {
    void loadPhotos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !photoUrl.trim()) {
      setError('Por favor, informe seu nome e o link da foto.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/guest-photos', {
        guestName: name.trim(),
        photoUrl: photoUrl.trim(),
        caption: caption.trim(),
      });
      setMessage(res.message || 'Foto enviada com sucesso! Ela aparecerá aqui assim que aprovada.');
      setName('');
      setPhotoUrl('');
      setCaption('');
      setTimeout(() => {
        setModalOpen(false);
        setMessage('');
      }, 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar foto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold opacity-60">
            <Camera size={14} /> Memórias Compartilhadas
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif mt-2" style={{ fontFamily: theme.fontTitle }}>
            Álbum dos Convidados
          </h2>
          <p className="mt-3 text-sm opacity-75 max-w-lg mx-auto">
            Tirou fotos durante a cerimônia ou na festa? Envie para nós e faça parte do nosso álbum oficial!
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={theme.buttonClass}
            >
              <span className="inline-flex items-center gap-2">
                <Upload size={14} /> Enviar Minha Foto
              </span>
            </button>
          </div>
        </div>

        {/* Galeria de Fotos Aprovadas */}
        {photos.length === 0 ? (
          <div className={`p-10 ${theme.cardClass} text-center max-w-xl mx-auto`}>
            <p className="text-sm opacity-75 italic">
              Seja o primeiro a compartilhar uma foto com {coupleNames}! Toque no botão acima para enviar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {photos.map((item) => (
              <div key={item.id} className={`overflow-hidden ${theme.cardClass} p-2 flex flex-col`}>
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-neutral-100">
                  <img src={item.photoUrl} alt={item.caption || item.guestName} className="w-full h-full object-cover" />
                </div>
                <div className="p-2 pt-3">
                  <p className="text-xs font-bold leading-tight truncate">{item.guestName}</p>
                  {item.caption && <p className="text-[11px] opacity-70 italic truncate mt-0.5">{item.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Envio */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`max-w-md w-full p-6 sm:p-8 ${theme.cardClass} relative shadow-2xl bg-white`}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-100 opacity-60 hover:opacity-100"
              >
                <X size={20} />
              </button>

              <h3 className="text-2xl font-serif font-bold mb-2 text-neutral-900" style={{ fontFamily: theme.fontTitle }}>
                Compartilhar Foto
              </h3>
              <p className="text-xs text-neutral-600 mb-6">
                Todas as fotos passam pela aprovação dos noivos antes de aparecerem no mural.
              </p>

              {message ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-3 text-sm">
                  <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
                  <span>{message}</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  {error && (
                    <div className="p-3 bg-rose-50 text-rose-800 rounded-lg flex items-center gap-2 text-xs">
                      <AlertCircle size={14} className="shrink-0 text-rose-600" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs uppercase font-semibold text-neutral-700 tracking-wider mb-1">
                      Seu Nome *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex.: Mariana & Lucas"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-semibold text-neutral-700 tracking-wider mb-1">
                      Link da Foto (URL direta da imagem) *
                    </label>
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="https://...foto.jpg"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-semibold text-neutral-700 tracking-wider mb-1">
                      Legenda ou Mensagem (opcional)
                    </label>
                    <input
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Ex.: Momento lindo na pista de dança!"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-full bg-black text-white text-xs uppercase font-bold tracking-widest hover:bg-neutral-800 transition-colors"
                    >
                      {loading ? 'Enviando foto…' : 'Enviar para o Álbum'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
