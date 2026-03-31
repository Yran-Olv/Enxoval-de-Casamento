import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api';
import { ProdutoComprado } from '../types';
import { Filter, ShoppingBag, Calendar, Tag } from 'lucide-react';

export default function PurchasedItems() {
  const [items, setItems] = useState<ProdutoComprado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await api.get('/purchased');
      setItems(data);
    } catch (err) {
      console.error("Error fetching purchased items:", err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Todos', ...new Set(items.map(item => item.categoria))];
  const filteredItems = filter === 'Todos' ? items : items.filter(item => item.categoria === filter);
  const totalSpent = items.reduce((acc, item) => acc + item.valor, 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gold font-serif text-2xl animate-pulse">Carregando...</div>;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h2 className="text-5xl md:text-7xl font-serif mb-4">Itens já Comprados</h2>
        <p className="text-gold/60 uppercase tracking-widest text-xs">Acompanhe o que já conquistamos para o nosso lar</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Sidebar / Stats */}
        <div className="lg:col-span-1 space-y-8">
          <div className="glass-card p-8 rounded-3xl">
            <h3 className="text-xs uppercase tracking-widest font-bold text-gold mb-6">Resumo</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-sm opacity-50">Total Gasto</span>
                <span className="text-2xl font-serif text-gold">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm opacity-50">Itens Adquiridos</span>
                <span className="text-2xl font-serif text-gold">{items.length}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl">
            <h3 className="text-xs uppercase tracking-widest font-bold text-gold mb-6 flex items-center gap-2">
              <Filter size={14} /> Filtrar por Categoria
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-semibold transition-all ${
                    filter === cat ? 'bg-gold text-white' : 'bg-gold/5 text-gold hover:bg-gold/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card p-6 rounded-3xl flex flex-col justify-between group hover:border-gold/40 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-gold/5 rounded-2xl text-gold">
                        <ShoppingBag size={20} />
                      </div>
                      <span className="text-xs font-bold text-gold/40">#{index + 1}</span>
                    </div>
                    <h4 className="text-2xl font-serif mb-2">{item.nome}</h4>
                    <div className="flex flex-wrap gap-4 text-xs opacity-60">
                      <span className="flex items-center gap-1"><Tag size={12} /> {item.categoria}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(item.dataCompra).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-gold/10 flex justify-between items-center">
                    <span className="text-xs uppercase tracking-widest font-bold opacity-40">Valor Pago</span>
                    <span className="text-xl font-serif text-gold">R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-20 opacity-30">
              <ShoppingBag size={48} className="mx-auto mb-4" />
              <p className="font-serif text-xl italic">Nenhum item encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
