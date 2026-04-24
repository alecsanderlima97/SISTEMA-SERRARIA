"use client";

import { useState, useEffect } from "react";
import { 
  Database, ArrowLeft, Save, 
  Calendar, DollarSign, Truck, 
  FileText, History, TrendingUp,
  Plus
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
      const [tData, hData] = await Promise.all([
        getTanqueStatus(),
        getHistoricoEntradasTanque(10)
      ]);
      setTanque(tData);
      setHistorico(hData);
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.quantidade <= 0) return alert("Quantidade deve ser maior que zero.");
    
    setLoading(true);
    const result = await createEntradaTanque(formData);
    if (result.success) {
      alert("Entrada registrada com sucesso!");
      router.refresh();
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
      setLoading(false);
    } else {
      alert("Erro ao salvar registro.");
      setLoading(false);
    }
  };

  const percTanque = tanque ? (tanque.saldoAtual / tanque.capacidade) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/frota" className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-heading font-black text-white tracking-tight">Tanque Interno</h1>
            <p className="text-slate-400">Gerenciar abastecimento do tanque da serraria.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Atual */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                <Database size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Status do Tanque</h3>
            </div>

            <div className="space-y-4">
              <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-4xl font-black text-white">{tanque?.saldoAtual.toLocaleString()}L</span>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Saldo Disponível</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>Capacidade: {tanque?.capacidade}L</span>
                  <span>{percTanque.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-1000"
                    style={{ width: `${percTanque}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dica */}
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-3xl p-6 flex gap-4 items-start">
            <TrendingUp className="text-primary-400 shrink-0" size={24} />
            <p className="text-sm text-slate-300">
              O registro de entrada atualiza automaticamente o saldo do tanque que é utilizado no lançamento de consumo da frota.
            </p>
          </div>
        </div>

        {/* Formulário de Entrada */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus size={20} className="text-primary-400" />
              Registrar Compra de Combustível
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Quantidade Comprada (L)</label>
                <div className="relative">
                  <Database size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="input-field pl-12"
                    placeholder="0.00"
                    value={formData.quantidade || ""}
                    onChange={(e) => setFormData({...formData, quantidade: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Valor Total (R$)</label>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    step="0.01"
                    className="input-field pl-12"
                    placeholder="0.00"
                    value={formData.valorTotal || ""}
                    onChange={(e) => setFormData({...formData, valorTotal: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Fornecedor</label>
                <div className="relative">
                  <Truck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    className="input-field pl-12"
                    placeholder="Nome do posto ou distribuidora"
                    value={formData.fornecedor}
                    onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Nota Fiscal</label>
                <div className="relative">
                  <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    className="input-field pl-12"
                    placeholder="Número da NF"
                    value={formData.notaFiscal}
                    onChange={(e) => setFormData({...formData, notaFiscal: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Data da Compra</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    required
                    type="date"
                    className="input-field pl-12"
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                disabled={loading}
                type="submit"
                className="btn-primary w-full md:w-auto px-12 py-4 text-lg"
              >
                {loading ? "Salvando..." : (
                  <span className="flex items-center gap-2">
                    <Save size={20} />
                    Registrar Entrada
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Histórico de Entradas */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <History size={20} className="text-primary-400" />
                Histórico de Entradas
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 text-left">
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Data</th>
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Quantidade</th>
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Valor Total</th>
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Fornecedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historico.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-4 text-sm text-slate-300">{item.data}</td>
                      <td className="px-8 py-4 font-bold text-white">{item.quantidade}L</td>
                      <td className="px-8 py-4 text-sm text-slate-300">
                        {item.valorTotal ? `R$ ${item.valorTotal.toLocaleString()}` : "-"}
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-300">{item.fornecedor || "-"}</td>
                    </tr>
                  ))}
                  {historico.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-slate-500">Nenhum registro de entrada encontrado.</td>
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
