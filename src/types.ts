export interface ProdutoComprado {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  dataCompra: string;
  imagem?: string;
}

export interface EnxovalItem {
  id: string;
  nome: string;
  descricao?: string;
  valor: number;
  prioridade: 'Alta' | 'Média' | 'Baixa';
  status: 'Disponível' | 'Reservado' | 'Comprado';
  reservadoPor?: string;
}

export interface Reserva {
  id: string;
  enxovalId: string;
  nome: string;
  whatsapp: string;
  mensagem?: string;
  dataReserva: string;
}

export interface SettingsData {
  id?: string;
  pixKey: string;
  pixName: string;
  weddingDate: string;
  whatsappNumber?: string;
  whaticketApiUrl?: string;
  whaticketToken?: string;
  whaticketUserId?: string;
  whaticketQueueId?: string;
  whaticketTemplate?: string;
  whaticketSign?: boolean;
  whaticketClose?: boolean;
}
