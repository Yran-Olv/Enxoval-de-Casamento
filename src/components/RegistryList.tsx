import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api';
import { EnxovalItem } from '../types';
import { Gift, CheckCircle2, Clock, Send, X, Copy, Check, HeartHandshake, MessageCircle } from 'lucide-react';

function buildGuestShareMessage(opts: {
  couple: string;
  itemNome: string;
  guestNome: string;
  mensagem: string;
  pixKey: string;
  pixName: string;
}) {
  const pixBlock = opts.pixKey.trim()
    ? `Chave PIX: ${opts.pixKey.trim()}\nTitular: ${opts.pixName.trim() || '—'}`
    : 'A chave PIX está na página do enxoval no site.';
  const recado = opts.mensagem.trim() ? `\n\nRecado: ${opts.mensagem.trim()}` : '';
  return (
    `Olá ${opts.couple}! Reservei no site o presente "${opts.itemNome}".\n\n` +
    `Vocês podem comprar o item por conta própria e entregar direto, ou receber o valor via PIX:\n${pixBlock}` +
    recado +
    `\n\nAbraço,\n${opts.guestNome.trim() || '—'}`
  );
}

export default function RegistryList() {
  type Notice = { type: 'success' | 'error'; message: string };
  const [items, setItems] = useState<EnxovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<EnxovalItem | null>(null);
  const [reservationForm, setReservationForm] = useState({ nome: '', whatsapp: '', mensagem: '' });
  const [pixDonationForm, setPixDonationForm] = useState({ nome: '', whatsapp: '', valor: '', mensagem: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPixSubmitting, setIsPixSubmitting] = useState(false);
  const [siteSettings, setSiteSettings] = useState({ pixKey: '', pixName: '', coupleNames: 'Tais & Yran' });
  const [reserveModalPhase, setReserveModalPhase] = useState<'form' | 'success'>('form');
  const [guestShareText, setGuestShareText] = useState('');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const showNotice = (type: Notice['type'], message: string) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 4500);
  };

  const fetchData = async () => {
    try {
      const [reg, set] = await Promise.all([
        api.get('/registry'),
        api.get('/settings')
      ]);
      setItems(reg);
      setSiteSettings({
        pixKey: set.pixKey ?? '',
        pixName: set.pixName ?? '',
        coupleNames: set.coupleNames ?? 'Tais & Yran',
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      showNotice('error', 'Não foi possível carregar o enxoval agora.');
    } finally {
      setLoading(false);
    }
  };

  const closeReserveModal = () => {
    setSelectedItem(null);
    setReserveModalPhase('form');
    setGuestShareText('');
    setReservationForm({ nome: '', whatsapp: '', mensagem: '' });
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsSubmitting(true);
    try {
      await api.post('/reservations', {
        enxovalId: selectedItem.id,
        nome: reservationForm.nome,
        whatsapp: reservationForm.whatsapp,
        mensagem: reservationForm.mensagem
      });

      const share = buildGuestShareMessage({
        couple: siteSettings.coupleNames,
        itemNome: selectedItem.nome,
        guestNome: reservationForm.nome,
        mensagem: reservationForm.mensagem,
        pixKey: siteSettings.pixKey,
        pixName: siteSettings.pixName,
      });
      setGuestShareText(share);
      setReserveModalPhase('success');
      showNotice(
        'success',
        'Reserva confirmada. Os noivos recebem um aviso automático com as opções de presente e a chave PIX.'
      );
      fetchData();
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Erro ao realizar reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = items.length > 0 ? (items.filter(i => i.status === 'Comprado').length / items.length) * 100 : 0;

  const handleCopyPix = () => {
    if (siteSettings.pixKey) {
      navigator.clipboard.writeText(siteSettings.pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePixDonationNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPixSubmitting(true);
    try {
      const valor =
        pixDonationForm.valor.trim() === ""
          ? undefined
          : Number(pixDonationForm.valor.replace(/\s/g, '').replace(',', '.'));
      if (valor != null && !Number.isFinite(valor)) {
        throw new Error('Valor do PIX inválido.');
      }

      await api.post('/pix-donations', {
        nome: pixDonationForm.nome,
        whatsapp: pixDonationForm.whatsapp,
        valor,
        mensagem: pixDonationForm.mensagem,
      });

      showNotice('success', 'Aviso de PIX enviado com sucesso. Muito obrigado pelo carinho!');
      setPixDonationForm({ nome: '', whatsapp: '', valor: '', mensagem: '' });
      setIsPixModalOpen(false);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Falha ao enviar aviso de PIX.');
    } finally {
      setIsPixSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gold font-serif text-2xl animate-pulse">Carregando Enxoval...</div>;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className={`fixed top-6 right-6 z-[120] max-w-sm px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-sm ${
              notice.type === 'success'
                ? 'bg-green-500/90 text-white border-green-200/30'
                : 'bg-red-500/90 text-white border-red-200/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <p className="text-sm leading-relaxed">{notice.message}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="opacity-80 hover:opacity-100 transition-opacity"
                aria-label="Fechar notificação"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h2 className="text-5xl md:text-7xl font-serif mb-4">Nosso Enxoval</h2>
        <p className="text-gold/60 uppercase tracking-widest text-xs mb-8">Escolha um item para nos presentear e fazer parte do nosso novo lar</p>
        
        <div className="max-w-md mx-auto">
          <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold mb-2 opacity-60">
            <span>Progresso do Enxoval</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gold/10 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gold"
            />
          </div>
        </div>
      </motion.div>

      {/* PIX Section */}
      {siteSettings.pixKey && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 max-w-2xl mx-auto"
        >
          <div className="glass-card p-8 md:p-12 rounded-[40px] text-center border-gold/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gold/5 rounded-full -ml-12 -mb-12" />
            
            <h3 className="text-3xl font-serif mb-4">Contribuição Espontânea</h3>
            <p className="text-sm opacity-60 mb-8 max-w-md mx-auto italic">
              "Se você deseja nos presentear com qualquer outro valor para ajudar na construção do nosso lar, ficaremos imensamente gratos!"
            </p>

            <div className="bg-white/50 border border-gold/10 rounded-3xl p-6 md:p-8 inline-block w-full">
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-40 block mb-2">Chave PIX</span>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <code className="text-lg md:text-xl font-mono text-gold break-all">{siteSettings.pixKey}</code>
                <button 
                  onClick={handleCopyPix}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all ${
                    copied ? 'bg-green-500 text-white' : 'bg-gold text-white hover:bg-gold/90'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar Chave'}
                </button>
              </div>
              {siteSettings.pixName && (
                <p className="mt-4 text-[10px] uppercase tracking-widest font-bold opacity-40">
                  Titular: {siteSettings.pixName}
                </p>
              )}
              <div className="mt-6">
                <button
                  onClick={() => setIsPixModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ink text-white text-[10px] uppercase tracking-widest font-bold hover:opacity-90 transition-opacity"
                >
                  <HeartHandshake size={14} /> Já fiz o PIX
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`glass-card p-8 rounded-3xl flex flex-col justify-between relative overflow-hidden group ${
              item.status !== 'Disponível' ? 'opacity-60 grayscale-[0.5]' : 'hover:border-gold/50'
            }`}
          >
            {item.prioridade === 'Alta' && (
              <div className="absolute top-0 right-0 bg-gold text-white px-4 py-1 text-[10px] uppercase tracking-widest font-bold rounded-bl-2xl">
                Prioridade
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-2xl ${
                  item.status === 'Disponível' ? 'bg-gold/10 text-gold' : 
                  item.status === 'Reservado' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
                }`}>
                  {item.status === 'Disponível' ? <Gift size={20} /> : 
                   item.status === 'Reservado' ? <Clock size={20} /> : <CheckCircle2 size={20} />}
                </div>
                <div>
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${
                    item.status === 'Disponível' ? 'text-gold' : 
                    item.status === 'Reservado' ? 'text-blue-500' : 'text-green-500'
                  }`}>
                    {item.status}
                  </span>
                  {item.status === 'Reservado' && (
                    <p className="text-[10px] italic opacity-60">por {item.reservadoPor}</p>
                  )}
                </div>
              </div>

              <h3 className="text-3xl font-serif mb-3">{item.nome}</h3>
              <p className="text-sm opacity-60 mb-6 line-clamp-2">{item.descricao || 'Sem descrição disponível.'}</p>
            </div>

            <div className="mt-auto">
              <div className="flex justify-between items-end mb-8">
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">Valor Estimado</span>
                <span className="text-2xl font-serif text-gold">R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              {item.status === 'Disponível' ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setReserveModalPhase('form');
                    setGuestShareText('');
                    setSelectedItem(item);
                  }}
                  className="w-full py-4 bg-gold text-white rounded-2xl text-xs uppercase tracking-widest font-bold shadow-lg shadow-gold/20"
                >
                  Quero Presentear
                </motion.button>
              ) : (
                <button disabled className="w-full py-4 border border-gold/10 text-gold/30 rounded-2xl text-xs uppercase tracking-widest font-bold cursor-not-allowed">
                  {item.status === 'Reservado' ? 'Já Reservado' : 'Já Comprado'}
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center py-20 opacity-40">
            <Gift size={48} className="mx-auto mb-4" />
            <p className="font-serif text-2xl italic">Ainda não há itens no enxoval.</p>
            <p className="text-xs uppercase tracking-widest mt-2">Os noivos estão preparando a lista com carinho.</p>
          </div>
        )}
      </div>

      {/* Reservation Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeReserveModal}
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-beige p-8 md:p-12 rounded-[40px] shadow-2xl border border-gold/20"
            >
              <button 
                type="button"
                onClick={closeReserveModal}
                className="absolute top-8 right-8 text-gold/40 hover:text-gold transition-colors"
              >
                <X size={24} />
              </button>

              {reserveModalPhase === 'success' ? (
                <div className="text-center space-y-6 pt-2">
                  <div className="w-16 h-16 bg-green-500/15 text-green-700 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={36} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif mb-2">Reserva confirmada</h3>
                    <p className="text-sm opacity-70 leading-relaxed">
                      Os noivos recebem um aviso automático com os dados da reserva, as formas de presentear (comprar o item ou PIX) e a chave PIX cadastrada no site.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(guestShareText);
                        showNotice('success', 'Mensagem copiada. Cole no WhatsApp se quiser avisar também.');
                      }}
                      className="w-full py-4 border-2 border-gold/30 text-ink rounded-2xl text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 hover:bg-gold/5 transition-colors"
                    >
                      <Copy size={16} /> Copiar mensagem (opcional)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(`https://wa.me/?text=${encodeURIComponent(guestShareText)}`, '_blank');
                      }}
                      className="w-full py-4 bg-gold text-white rounded-2xl text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
                    >
                      <MessageCircle size={18} /> Abrir WhatsApp com essa mensagem
                    </button>
                    <button
                      type="button"
                      onClick={closeReserveModal}
                      className="w-full py-3 text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-80"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gold/10 text-gold rounded-full flex items-center justify-center mx-auto mb-6">
                      <Gift size={32} />
                    </div>
                    <h3 className="text-4xl font-serif mb-2">Reservar presente</h3>
                    <p className="text-sm opacity-60 italic">Você escolheu: <span className="text-gold font-bold not-italic">{selectedItem.nome}</span></p>
                  </div>

                  <form onSubmit={handleReserve} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Seu nome</label>
                      <div className="relative">
                        <input 
                          required
                          type="text"
                          value={reservationForm.nome}
                          onChange={e => setReservationForm({...reservationForm, nome: e.target.value})}
                          placeholder="Ex: Maria Silva"
                          className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:outline-none focus:border-gold transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Seu WhatsApp</label>
                      <div className="relative">
                        <input 
                          required
                          type="tel"
                          value={reservationForm.whatsapp}
                          onChange={e => setReservationForm({...reservationForm, whatsapp: e.target.value})}
                          placeholder="Ex: (11) 99999-9999"
                          className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:outline-none focus:border-gold transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Mensagem (opcional)</label>
                      <div className="relative">
                        <textarea 
                          value={reservationForm.mensagem}
                          onChange={e => setReservationForm({...reservationForm, mensagem: e.target.value})}
                          placeholder="Deixe um recado carinhoso..."
                          rows={3}
                          className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:outline-none focus:border-gold transition-all text-sm resize-none"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        disabled={isSubmitting}
                        type="submit"
                        className="w-full py-5 bg-gold text-white rounded-2xl text-sm uppercase tracking-widest font-bold shadow-xl shadow-gold/20 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Processando...' : (
                          <>
                            <Send size={18} /> Confirmar reserva
                          </>
                        )}
                      </button>
                    </div>
                    
                    <p className="text-[10px] text-center opacity-40 px-6 leading-relaxed">
                      O item fica reservado em seu nome. Os noivos recebem um aviso automático (com PIX e opções de presente). Você não precisa abrir o WhatsApp — só se quiser avisar por conta própria.
                    </p>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPixModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPixModalOpen(false)}
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-beige p-8 md:p-12 rounded-[40px] shadow-2xl border border-gold/20"
            >
              <button
                onClick={() => setIsPixModalOpen(false)}
                className="absolute top-8 right-8 text-gold/40 hover:text-gold transition-colors"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-gold/10 text-gold rounded-full flex items-center justify-center mx-auto mb-6">
                  <HeartHandshake size={30} />
                </div>
                <h3 className="text-4xl font-serif mb-2">Avisar Doação PIX</h3>
                <p className="text-sm opacity-60 italic">Envie seus dados para os noivos receberem uma mensagem personalizada.</p>
              </div>

              <form onSubmit={handlePixDonationNotice} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Seu Nome</label>
                  <input
                    required
                    type="text"
                    value={pixDonationForm.nome}
                    onChange={e => setPixDonationForm({ ...pixDonationForm, nome: e.target.value })}
                    placeholder="Ex: Maria Silva"
                    className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:outline-none focus:border-gold transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Seu WhatsApp</label>
                  <input
                    required
                    type="tel"
                    value={pixDonationForm.whatsapp}
                    onChange={e => setPixDonationForm({ ...pixDonationForm, whatsapp: e.target.value })}
                    placeholder="Ex: (11) 99999-9999"
                    className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:outline-none focus:border-gold transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Valor enviado (opcional)</label>
                  <input
                    type="text"
                    value={pixDonationForm.valor}
                    onChange={e => setPixDonationForm({ ...pixDonationForm, valor: e.target.value })}
                    placeholder="Ex: 150,00"
                    className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:outline-none focus:border-gold transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 ml-4">Mensagem (opcional)</label>
                  <textarea
                    value={pixDonationForm.mensagem}
                    onChange={e => setPixDonationForm({ ...pixDonationForm, mensagem: e.target.value })}
                    placeholder="Deixe uma mensagem carinhosa..."
                    rows={3}
                    className="w-full px-6 py-4 bg-white/50 border border-gold/10 rounded-2xl focus:outline-none focus:border-gold transition-all text-sm resize-none"
                  />
                </div>

                <button
                  disabled={isPixSubmitting}
                  type="submit"
                  className="w-full py-5 bg-gold text-white rounded-2xl text-sm uppercase tracking-widest font-bold shadow-xl shadow-gold/20 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isPixSubmitting ? 'Enviando...' : (<><Send size={18} /> Enviar Aviso</>)}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
