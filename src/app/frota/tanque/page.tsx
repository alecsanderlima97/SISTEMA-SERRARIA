"use client";

import { useState, useEffect } from "react";
import { 
  Database, ArrowLeft, Save, 
  Calendar, DollarSign, Truck, 
  FileText, History, TrendingUp,
  Plus, Loader2, CheckCircle2,
  AlertCircle, ArrowUpRight, BarChart3
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  createEntradaTanque, 
  getTanqueStatus, 
  getHistoricoEntradasTanque,
  RegistroEntradaTanque, 
  TanqueInterno 
} from "@/services/db/consumo";

export default function TanquePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [tanque, setTanque] = useState<TanqueInterno | null>(null);
  const [historico, setHistorico] = useState<RegistroEntradaTanque[]>([]);

  const [formData, setFormData] = useState<Omit<RegistroEntradaTanque, 'id' | 'createdAt'>>({
    quantidade: 0,
    valorTotal: 0,
    fornecedor: "",
    notaFiscal: "",
    data: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [tData, hData] = await Promise.all([
          getTanqueStatus(),
          getHistoricoEntradasTanque(10)
        ]);
        setTanque(tData);
        setHistorico(hData);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.quantidade <= 0) return alert("Quantidade deve ser maior que zero.");
    
    setLoading(true);
    try {
      const result = await createEntradaTanque(formData);
      if (result.success) {
        // Reset form or reload data
        const [tData, hData] = await Promise.all([
          getTanqueStatus(),
          getHistoricoEntradasTanque(10)
        ]);
        setTanque(tData);
        setHistorico(hData);
        setFormData({
          quantidade: 0,
          valorTotal: 0,
          fornecedor: "",
          notaFiscal: "",
          data: new Date().toISOString().split('T')[0]
        });
      } else {
        alert("Erro ao salvar registro.");
      }
    } catch (error) {
      alert("Erro crítico ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-slate-400 font-bold animate-pulse">Lendo sensores do tanque...</p>
      </div>
    );
  }

  const percTanque = tanque ? (tanque.saldoAtual / tanque.capacidade) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Link 
            href="/frota" 
            className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all flex items-center justify-center border border-white/5 group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-400 uppercase tracking-widest border border-blue-500/30">
                Logística de Combustível
              </span>
            </div>
            <h1 className="text-4xl font-heading font-black text-white tracking-tight">Tanque <span className="text-blue-500">Interno</span></h1>
            <p className="text-slate-400 font-medium">Gestão de estoque e entradas de Diesel na serraria.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Status Dashboard Section */}
        <div className="lg:col-span-4 space-y-8">
          {/* Main Visual Tank */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Database size={120} />
            </div>

            <div className="relative z-10 space-y-8 text-center">
              <h3 className="text-xl font-black text-white tracking-tight uppercase tracking-widest opacity-60">Status de Nível</h3>
              
              <div className="relative w-48 h-64 mx-auto border-4 border-white/10 rounded-3xl overflow-hidden bg-black/40">
                 {/* Liquid Animation */}
                 <div 
                   className={`absolute bottom-0 left-0 w-full transition-all duration-[2000ms] ease-in-out ${
                     percTanque < 20 ? 'bg-rose-500/40' : 'bg-blue-500/40'
                   }`}
                   style={{ height: `${percTanque}%` }}
                 >
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/40 animate-pulse" />
                 </div>
                 
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-white tracking-tighter">{percTanque.toFixed(0)}%</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preenchimento</span>
                 </div>
              </div>

              <div className="space-y-2">
                <p className="text-5xl font-black text-white tracking-tighter">{tanque?.saldoAtual?.toLocaleString()} <span className="text-xl text-slate-500 font-bold uppercase">L</span></p>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">Saldo Disponível em Estoque</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase">Capacidade Total</p>
                  <p className="text-lg font-bold text-white">{tanque?.capacidade?.toLocaleString()}L</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase">Espaço Livre</p>
                  <p className="text-lg font-bold text-white">{( (tanque?.capacidade || 0) - (tanque?.saldoAtual || 0) ).toLocaleString()}L</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 to-transparent backdrop-blur-xl border border-emerald-500/20 rounded-[40px] p-6 flex gap-4 items-start shadow-xl shadow-emerald-500/5">
            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">Sincronização Ativa</p>
              <p className="text-xs text-slate-500">As entradas registradas aqui atualizam imediatamente o custo médio e o saldo para o módulo de frotas.</p>
            </div>
          </div>
        </div>

        {/* Input and History Section */}
        <div className="lg:col-span-8 space-y-8">
           {/* Form Card */}
           <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
             <div className="flex items-center gap-4 mb-10">
               <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center text-primary-400">
                 <Plus size={24} />
               </div>
               <h3 className="text-2xl font-black text-white tracking-tight">Registrar Compra / Abastecimento Tanque</h3>
             </div>

             <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Database size={12} /> Quantidade Comprada (L)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-black text-2xl"
                    placeholder="0.00"
                    value={formData.quantidade || ""}
                    onChange={(e) => setFormData({...formData, quantidade: Number(e.target.value)})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <DollarSign size={12} /> Valor Total do Pedido
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-black text-2xl"
                    placeholder="R$ 0,00"
                    value={formData.valorTotal || ""}
                    onChange={(e) => setFormData({...formData, valorTotal: Number(e.target.value)})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Truck size={12} /> Fornecedor / Distribuidora
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                    placeholder="Ex: Ipiranga, Petrobras..."
                    value={formData.fornecedor}
                    onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <FileText size={12} /> Número da Nota Fiscal
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                    placeholder="NF-e..."
                    value={formData.notaFiscal}
                    onChange={(e) => setFormData({...formData, notaFiscal: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Calendar size={12} /> Data da Operação
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                  />
                </div>

                <div className="flex items-end">
                   <button
                    disabled={loading}
                    type="submit"
                    className="w-full py-4 bg-blue-500 hover:bg-blue-400 text-white font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    {loading ? "SALVANDO..." : "REGISTRAR ENTRADA"}
                  </button>
                </div>
             </form>
           </div>

           {/* History List */}
           <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400">
                      <History size={20} />
                   </div>
                   <h3 className="text-xl font-black text-white tracking-tight">Histórico de Abastecimentos do Tanque</h3>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/5 text-left">
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Data</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fornecedor / NF</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Quantidade</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Investimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {historico.map((item) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-5 text-sm text-slate-400 font-bold">{item.data}</td>
                        <td className="px-8 py-5">
                           <p className="font-black text-white text-sm group-hover:text-blue-400 transition-colors">{item.fornecedor || 'N/A'}</p>
                           <p className="text-[10px] text-slate-500 font-bold uppercase">NF: {item.notaFiscal || '---'}</p>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-xl text-white">
                           {item.quantidade?.toLocaleString()} <span className="text-[10px] text-slate-500">L</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                           <p className="font-bold text-white">R$ {item.valorTotal?.toLocaleString()}</p>
                           <p className="text-[10px] text-slate-500 font-bold">R$ {(item.valorTotal && item.quantidade) ? (item.valorTotal / item.quantidade).toFixed(3) : '0.000'}/L</p>
                        </td>
                      </tr>
                    ))}
                    {historico.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                           <div className="flex flex-col items-center gap-4 opacity-20">
                              <Database size={64} />
                              <p className="font-black uppercase tracking-widest text-lg">Sem registros</p>
                           </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
