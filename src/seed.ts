import { api } from './api';

const initialItems = [
  { nome: "Jogo de Panelas Antiaderente", descricao: "Conjunto com 5 peças, ideal para o dia a dia.", valor: 350.00, prioridade: "Alta", status: "Disponível" },
  { nome: "Aparelho de Jantar 20 Peças", descricao: "Porcelana branca clássica para 4 pessoas.", valor: 280.00, prioridade: "Alta", status: "Disponível" },
  { nome: "Fritadeira Elétrica AirFryer", descricao: "Capacidade de 4L, cor preta e dourada.", valor: 450.00, prioridade: "Média", status: "Disponível" },
  { nome: "Liquidificador Potente", descricao: "1200W com copo de vidro resistente.", valor: 220.00, prioridade: "Média", status: "Disponível" },
  { nome: "Batedeira Planetária", descricao: "Ideal para massas leves e pesadas.", valor: 580.00, prioridade: "Baixa", status: "Disponível" },
  { nome: "Jogo de Cama King 400 Fios", descricao: "Algodão egípcio, cor bege.", valor: 320.00, prioridade: "Alta", status: "Disponível" },
  { nome: "Toalhas de Banho Fio Penteado", descricao: "Kit com 4 toalhas macias e absorventes.", valor: 180.00, prioridade: "Média", status: "Disponível" },
  { nome: "Micro-ondas 30L", descricao: "Espelhado com diversas funções pré-programadas.", valor: 750.00, prioridade: "Alta", status: "Disponível" },
  { nome: "Cafeteira de Cápsulas", descricao: "Design moderno para cafés expressos.", valor: 490.00, prioridade: "Baixa", status: "Disponível" },
  { nome: "Ferro de Passar a Vapor", descricao: "Base cerâmica com desligamento automático.", valor: 150.00, prioridade: "Média", status: "Disponível" },
  { nome: "Conjunto de Copos de Cristal", descricao: "6 unidades para ocasiões especiais.", valor: 120.00, prioridade: "Baixa", status: "Disponível" },
  { nome: "Aspirador de Pó Robô", descricao: "Limpeza automática para facilitar a rotina.", valor: 890.00, prioridade: "Média", status: "Disponível" },
  { nome: "Mesa de Jantar com 4 Cadeiras", descricao: "Madeira maciça com acabamento elegante.", valor: 1200.00, prioridade: "Alta", status: "Disponível" },
  { nome: "Smart TV 50 polegadas 4K", descricao: "Para nossas noites de cinema.", valor: 2400.00, prioridade: "Alta", status: "Disponível" },
  { nome: "Geladeira Inox Inverse", descricao: "Tecnologia frost free e economia de energia.", valor: 3800.00, prioridade: "Alta", status: "Disponível" }
];

export async function seedRegistry() {
  try {
    const existingItems = await api.get('/registry');
    
    if (existingItems.length === 0) {
      console.log("Iniciando o cadastro de itens iniciais...");
      for (const item of initialItems) {
        await api.post('/registry', item);
      }
      console.log("Itens cadastrados com sucesso!");
    } else {
      console.log("O enxoval já possui itens cadastrados.");
    }
  } catch (error) {
    console.error("Erro ao semear banco de dados:", error);
  }
}
