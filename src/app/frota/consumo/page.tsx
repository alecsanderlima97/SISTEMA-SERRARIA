"use client";

import { useState, useEffect } from "react";
import { 
  Fuel, Droplet, ArrowLeft, Save, 
  MapPin, Database, Truck, Construction,
  Calendar, Gauge, DollarSign, Loader2,
  AlertTriangle, CheckCircle2, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getVeiculos, Veiculo } from "@/services/db/frota";
import { createRegistroConsumo, getTanqueStatus, RegistroConsumo } from "@/services/db/consumo";

export default function ConsumoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [tanqueDisponivel, setTanqueDisponivel] = useState(0);

  const [formData, setFormData] = useState<Omit<RegistroConsumo, 'id' | 'createdAt'>>({
    veiculoId: "",
    identificacaoVeiculo: "",
    tipo: "abastecimento",
    origem: "tanque_interno",
    produto: "Diesel S10",
    quantidade: 0,
    km_horas: 0,
    data: new Date().toISOString().split('T')[0],
    valorUnitario: 0,
    valorTotal: 0
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [vData, tData] = await Promise.all([
          getVeiculos(),
          getTanqueStatus()
        ]);
        setVeiculos(vData);
        setTanqueDisponivel(tData.saldoAtual);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, []);

  const handleVeiculoChange = (id: string) => {
    const v = veiculos.find(x => x.id === id);
    setFormData({
      ...formData,
      veiculoId: id,
      identificacaoVeiculo: v ? `${v.identificacao} - ${v.modelo}` : ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.veiculoId) return alert("Selecione um veículo.");
    if (formData.quantidade <= 0) return alert("Quantidade deve ser maior que zero.");
    
    if (formData.tipo === 'abastecimento' && formData.origem === 'tanque_interno' && formData.quantidade > tanqueDisponivel) {
      return alert("Saldo insuficiente no tanque interno!");
    }

    setLoading(true);
    try {
      const result = await createRegistroConsumo(formData);
      if (result.success) {
        router.push("/frota");
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
        <Loader2 className="animate-spin text-primary-500" size={48} />
        <p className="text-slate-400 font-bold animate-pulse">Preparando formulário de consumo...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 uppercase tracking-widest border border-emerald-500/30">
                Registro de Atividade
              </span>
            </div>
            <h1 className="text-4xl font-heading font-black text-white tracking-tight">Lançar <span className="text-primary-500">Consumo</span></h1>
            <p className="text-slate-400 font-medium">Abastecimentos e controle de lubrificantes da frota.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Form Body */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-2xl space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
               <Fuel size={200} />
            </div>

            {/* Seleção de Tipo de Consumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <button
                type="button"
                onClick={() => setFormData({...formData, tipo: 'abastecimento', produto: 'Diesel S10'})}
                className={`p-8 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 text-center group ${
                  formData.tipo === 'abastecimento' 
                  ? "border-primary-500 bg-primary-500/10 text-primary-400 shadow-lg shadow-primary-500/10" 
                  : "border-white/5 bg-white/5 text-slate-500 hover:border-white/10"
                }`}
              >
                <div className={`p-4 rounded-2xl transition-all ${formData.tipo === 'abastecimento' ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-slate-600'}`}>
                  <Fuel size={40} className={formData.tipo === 'abastecimento' ? 'scale-110' : ''} />
                </div>
                <div>
                  <span className="font-black block text-xl tracking-tight">Abastecimento</span>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Diesel ou Gasolina</span>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData({...formData, tipo: 'lubrificante', produto: 'Óleo Motor 15W40'})}
                className={`p-8 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 text-center group ${
                  formData.tipo === 'lubrificante' 
                  ? "border-blue-500 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/10" 
                  : "border-white/5 bg-white/5 text-slate-500 hover:border-white/10"
                }`}
              >
                <div className={`p-4 rounded-2xl transition-all ${formData.tipo === 'lubrificante' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-600'}`}>
                  <Droplet size={40} className={formData.tipo === 'lubrificante' ? 'scale-110' : ''} />
                </div>
                <div>
                  <span className="font-black block text-xl tracking-tight">Lubrificante</span>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Óleo Motor ou Hidráulico</span>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <Truck size={12} /> Veículo / Máquina
                </label>
                <select
                  required
                  className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-bold appearance-none cursor-pointer"
                  value={formData.veiculoId}
                  onChange={(e) => handleVeiculoChange(e.target.value)}
                >
                  <option value="" className="bg-[#0d1117]">Selecione um ativo...</option>
                  {veiculos.map(v => (
                    <option key={v.id} value={v.id} className="bg-[#0d1117]">{v.identificacao} - {v.modelo}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <Database size={12} /> Origem do Produto
                </label>
                <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, origem: 'tanque_interno'})}
                    className={`flex-1 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${
                      formData.origem === 'tanque_interno'
                      ? "bg-primary-500 text-[#0d1117]"
                      : "text-slate-500 hover:text-white"
                    }`}
                  >
                    Serraria
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, origem: 'posto_externo'})}
                    className={`flex-1 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${
                      formData.origem === 'posto_externo'
                      ? "bg-primary-500 text-[#0d1117]"
                      : "text-slate-500 hover:text-white"
                    }`}
                  >
                    Posto
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  Produto Especificado
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Diesel S10, Óleo 15W40..."
                  className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-bold"
                  value={formData.produto}
                  onChange={(e) => setFormData({...formData, produto: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Qtd (Litos)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-black text-xl text-center"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({...formData, quantidade: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">KM / Horas</label>
                  <input
                    required
                    type="number"
                    className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-black text-xl text-center"
                    value={formData.km_horas}
                    onChange={(e) => setFormData({...formData, km_horas: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info & Submit Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           {/* Tanque Info Card */}
           {formData.origem === 'tanque_interno' && (
             <div className="bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl border border-blue-500/20 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group animate-in zoom-in duration-500">
               <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                 <Database size={100} />
               </div>
               
               <div className="relative z-10 space-y-6">
                 <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                     <Database size={28} />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-white tracking-tight">Estoque Interno</h3>
                     <p className="text-blue-400/80 text-[10px] font-black uppercase tracking-widest">Saldo Disponível</p>
                   </div>
                 </div>

                 <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                       <span className="text-4xl font-black text-white tracking-tighter">{tanqueDisponivel.toLocaleString()}</span>
                       <span className="text-sm font-bold text-slate-500">LITROS</span>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                       <div 
                         className="h-full bg-blue-500 transition-all duration-1000" 
                         style={{ width: `${(tanqueDisponivel/15000) * 100}%` }}
                       />
                    </div>
                 </div>

                 {formData.quantidade > tanqueDisponivel && (
                   <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 animate-pulse">
                     <AlertTriangle size={20} />
                     <p className="text-xs font-black uppercase tracking-wider">Saldo insuficiente para este lançamento!</p>
                   </div>
                 )}
               </div>
             </div>
           )}

           {/* Posto Externo Info */}
           {formData.origem === 'posto_externo' && (
             <div className="bg-gradient-to-br from-orange-500/10 to-transparent backdrop-blur-xl border border-orange-500/20 rounded-[40px] p-8 shadow-2xl space-y-6 animate-in zoom-in duration-500">
               <h3 className="text-xl font-black text-white tracking-tight">Custo Externo</h3>
               <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Valor Total (R$)</label>
                    <div className="relative">
                       <DollarSign size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-primary-500" />
                       <input
                         type="number"
                         step="0.01"
                         className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/5 text-white rounded-2xl outline-none focus:ring-2 focus:ring-primary-500/50 font-black text-2xl"
                         value={formData.valorTotal}
                         onChange={(e) => setFormData({...formData, valorTotal: Number(e.target.value)})}
                       />
                    </div>
                 </div>
               </div>
             </div>
           )}

           <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Data do Registro</label>
                <div className="relative">
                  <Calendar size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="date"
                    className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/5 text-white rounded-2xl outline-none focus:ring-2 focus:ring-primary-500/50 font-bold"
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                  />
                </div>
              </div>

              <button
                disabled={loading || (formData.origem === 'tanque_interno' && formData.quantidade > tanqueDisponivel)}
                type="submit"
                className="w-full py-5 bg-primary-500 hover:bg-primary-400 disabled:opacity-30 disabled:hover:scale-100 text-[#0d1117] font-black rounded-3xl transition-all hover:scale-[1.03] active:scale-95 shadow-xl shadow-primary-500/20 flex items-center justify-center gap-3 text-lg"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                {loading ? "PROCESSANDO..." : "SALVAR REGISTRO"}
              </button>
           </div>
        </div>
      </form>
    </div>
  );
}
