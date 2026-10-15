import type { InviteTheme } from '../../../server/domain';
import { INVITE_PALETTES } from '../../../server/domain';

export type WeddingThemeConfig = {
  id: InviteTheme;
  name: string;
  subtitle: string;
  palette: typeof INVITE_PALETTES[keyof typeof INVITE_PALETTES];
  fontTitle: string;
  fontScript: string;
  fontBody: string;
  containerClass: string;
  cardClass: string;
  buttonClass: string;
  badgeClass: string;
  dividerStyle: 'organic' | 'floral' | 'hairline' | 'editorial' | 'botanic' | 'artdeco';
  description: string;
  samplePhoto: string;
};

export const WEDDING_THEMES: Record<InviteTheme, WeddingThemeConfig> = {
  boho: {
    id: 'boho',
    name: 'Boho Terroso',
    subtitle: 'Terracota, areia e aconchego natural com textura artesanal',
    palette: INVITE_PALETTES.boho,
    fontTitle: '"Cormorant Garamond", Georgia, serif',
    fontScript: '"Great Vibes", cursive',
    fontBody: '"Inter", sans-serif',
    containerClass: 'bg-[#f8f1e8] text-[#4a3328]',
    cardClass: 'bg-[#fffaf5] border border-[#eddccb] rounded-2xl shadow-sm hover:shadow-md transition-shadow',
    buttonClass: 'rounded-full bg-[#a15c38] text-[#fff8f3] hover:bg-[#8d4d2e] shadow-sm tracking-wider uppercase text-xs font-semibold px-6 py-3',
    badgeClass: 'bg-[#a15c38]/15 text-[#a15c38] border border-[#a15c38]/30 rounded-full px-3 py-1 text-xs font-medium',
    dividerStyle: 'organic',
    description: 'Estilo rústico e acolhedor com tons quentes de barro cozido, formas orgânicas, história em formato de diário e varal de fotos.',
    samplePhoto: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
  },
  romantico: {
    id: 'romantico',
    name: 'Romântico',
    subtitle: 'Marfim, rosé, caligrafia fluida e detalhes florais atemporais',
    palette: INVITE_PALETTES.romantico,
    fontTitle: '"Playfair Display", Georgia, serif',
    fontScript: '"Great Vibes", cursive',
    fontBody: '"Montserrat", sans-serif',
    containerClass: 'bg-[#fff5f3] text-[#49343a]',
    cardClass: 'bg-[#fffdfc] border border-[#eedde2] rounded-3xl shadow-[0_8px_30px_rgb(165,108,125,0.06)] hover:shadow-[0_12px_40px_rgb(165,108,125,0.12)] transition-shadow',
    buttonClass: 'rounded-full bg-[#a56c7d] text-[#fffafc] hover:bg-[#865365] shadow-md tracking-widest uppercase text-xs font-semibold px-7 py-3.5',
    badgeClass: 'bg-[#a56c7d]/15 text-[#a56c7d] border border-[#a56c7d]/25 rounded-full px-3.5 py-1 text-xs font-medium',
    dividerStyle: 'floral',
    description: 'Aura apaixonada e suave, cartões com bordas arredondadas, história contada como carta de amor e ornamentos florais discretos.',
    samplePhoto: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80',
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Moderno',
    subtitle: 'Monocromático, linhas arquitetônicas finas e muito respiro',
    palette: INVITE_PALETTES.minimal,
    fontTitle: '"Montserrat", sans-serif',
    fontScript: '"Montserrat", sans-serif',
    fontBody: '"Inter", sans-serif',
    containerClass: 'bg-[#f5f5f3] text-[#171717]',
    cardClass: 'bg-[#ffffff] border border-[#dededb] rounded-none shadow-none hover:border-[#171717] transition-colors',
    buttonClass: 'rounded-none bg-[#171717] text-[#ffffff] hover:bg-[#333333] tracking-[0.25em] uppercase text-xs font-medium px-8 py-3.5',
    badgeClass: 'bg-[#171717]/5 text-[#171717] border border-[#171717]/20 rounded-none px-2.5 py-1 text-[11px] uppercase tracking-wider',
    dividerStyle: 'hairline',
    description: 'Arquitetura moderna e direta, foco absoluto na fotografia limpa, tipografia geométrica e linhas finas impecáveis.',
    samplePhoto: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial de Moda',
    subtitle: 'Alta-costura, tipografia marcante em caixa-alta e layout de revista',
    palette: INVITE_PALETTES.editorial,
    fontTitle: '"Playfair Display", serif',
    fontScript: '"Playfair Display", serif',
    fontBody: '"Inter", sans-serif',
    containerClass: 'bg-[#f4f4f2] text-[#161616]',
    cardClass: 'bg-[#ffffff] border border-[#e4e4e4] rounded-sm shadow-sm hover:shadow-lg transition-shadow',
    buttonClass: 'rounded-sm bg-[#111111] text-[#ffffff] hover:bg-black tracking-[0.3em] uppercase text-xs font-bold px-8 py-4',
    badgeClass: 'bg-black text-white px-3 py-1 text-[10px] uppercase font-bold tracking-[0.2em]',
    dividerStyle: 'editorial',
    description: 'Inspirado em editoriais de moda (Vogue), com composições assimétricas de texto e foto, galeria em película e tipografia dramática.',
    samplePhoto: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80',
  },
  jardim: {
    id: 'jardim',
    name: 'Jardim Botânico',
    subtitle: 'Verde-sálvia, oliva, creme e folhagens botânicas elegantes',
    palette: INVITE_PALETTES.jardim,
    fontTitle: '"Cormorant Garamond", serif',
    fontScript: '"Great Vibes", cursive',
    fontBody: '"Inter", sans-serif',
    containerClass: 'bg-[#eef3ee] text-[#243128]',
    cardClass: 'bg-[#fbfdfb] border border-[#d5e3d8] rounded-2xl shadow-sm hover:border-[#3f6b4e] transition-colors',
    buttonClass: 'rounded-full bg-[#3f6b4e] text-[#f7fbf7] hover:bg-[#2f5a40] shadow-sm tracking-wider uppercase text-xs font-semibold px-6 py-3',
    badgeClass: 'bg-[#3f6b4e]/15 text-[#3f6b4e] border border-[#3f6b4e]/30 rounded-full px-3 py-1 text-xs font-medium',
    dividerStyle: 'botanic',
    description: 'Inspirado em estufas e jardins ao ar livre, com títulos em itálico poético, tons terrosos suaves de sálvia e ramos decorativos.',
    samplePhoto: 'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?auto=format&fit=crop&w=800&q=80',
  },
  gala: {
    id: 'gala',
    name: 'Noite de Gala',
    subtitle: 'Grafite, preto e ouro champanhe com geometria Art Déco',
    palette: INVITE_PALETTES.gala,
    fontTitle: '"Cinzel", serif',
    fontScript: '"Great Vibes", cursive',
    fontBody: '"Montserrat", sans-serif',
    containerClass: 'bg-[#141318] text-[#f4ecdf]',
    cardClass: 'bg-[#211e26] border border-[#3a3442] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:border-[#c6a36a] transition-colors',
    buttonClass: 'rounded-none bg-[#c6a36a] text-[#1a140c] hover:bg-[#dfba7a] shadow-[0_4px_20px_rgba(198,163,106,0.3)] tracking-[0.25em] uppercase text-xs font-bold px-8 py-3.5 border border-[#dfba7a]',
    badgeClass: 'bg-[#c6a36a]/15 text-[#c6a36a] border border-[#c6a36a]/40 px-3 py-1 text-xs uppercase font-semibold tracking-widest',
    dividerStyle: 'artdeco',
    description: 'Cerimônia formal e sofisticada, convites apresentados como credenciais de evento VIP, contagem em painel split-flap e molduras douradas.',
    samplePhoto: 'https://images.unsplash.com/photo-1519225424987-a2f2dd9c9b5f?auto=format&fit=crop&w=800&q=80',
  },
  classico: {
    id: 'classico',
    name: 'Romântico Clássico',
    subtitle: 'Tons de marfim e areia com estética clássica e sóbria',
    palette: INVITE_PALETTES.classico,
    fontTitle: '"Cormorant Garamond", serif',
    fontScript: '"Great Vibes", cursive',
    fontBody: '"Inter", sans-serif',
    containerClass: 'bg-[#f6f0e7] text-[#3f332b]',
    cardClass: 'bg-[#fffdf9] border border-[#eadfd2] rounded-2xl shadow-sm hover:shadow-md transition-shadow',
    buttonClass: 'rounded-full bg-[#7d6244] text-[#fffaf4] hover:bg-[#6f5438] shadow-sm tracking-wider uppercase text-xs font-semibold px-6 py-3',
    badgeClass: 'bg-[#7d6244]/15 text-[#7d6244] border border-[#7d6244]/30 rounded-full px-3 py-1 text-xs font-medium',
    dividerStyle: 'organic',
    description: 'Paleta clássica e serena que valoriza o tradicionalismo e a leveza da celebração.',
    samplePhoto: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
  },
};
