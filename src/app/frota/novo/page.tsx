"use client";

import { useState } from "react";
import { 
  Truck, Save, ArrowLeft, Construction, 
  Car, Settings, Loader2, CheckCircle2,
  ChevronRight, Fuel, Gauge, Calendar,
  Activity, Zap, Info
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createVeiculo, Veiculo } from "@/services/db/frota";

export default function NovoVeiculoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<Veiculo, 'id' | 'createdAt'>>({
    identificacao: "",
    tipo: "caminhao",
    modelo: "",
    marca: "",
    ano: new Date().getFullYear(),
    tipoCombustivel: "diesel",
    horimetroInicial: 0,
    hodometroInicial: 0,
    mediaEsperada: 0,
    categoria: "SERRARIA"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.identificacao || !formData.modelo) return alert("Preencha os campos obrigatórios.");
    
    setLoading(true);
    try {
      const result = await createVeiculo(formData);
      if (result.success) {
        router.push("/frota");
      } else {
        alert("Erro ao cadastrar veículo.");
        setLoading(false);
      }
    } catch (error) {
      alert("Erro crítico no cadastro.");
      setLoading(false);
    }
  };

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
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-primary-500/20 text-primary-400 uppercase tracking-widest border border-primary-500/30">
                Asset Management
              </span>
            </div>
            <h1 className="text-4xl font-heading font-black text-white tracking-tight">Novo <span className="text-primary-500">Ativo</span></h1>
            <p className="text-slate-400 font-medium">Cadastre veículos, máquinas e equipamentos na frota da serraria.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-8 space-y-8">
          {/* Type Selection */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                <Truck size={150} />
             </div>
             
             <div className="relative z-10 space-y-6">
               <h3 className="text-lg font-black text-white tracking-tight uppercase tracking-widest opacity-60">Tipo de Equipamento</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { id: 'caminhao', label: 'Caminhão', icon: Truck, color: 'primary' },
                   { id: 'maquina', label: 'Máquina', icon: Construction, color: 'blue' },
                   { id: 'utilitario', label: 'Utilitário', icon: Car, color: 'emerald' },
                 ].map((t) => (
                   <button
                     key={t.id}
                     type="button"
                     onClick={() => setFormData({...formData, tipo: t.id as any})}
                     className={`p-8 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 text-center group relative overflow-hidden ${
                       formData.tipo === t.id 
                       ? `border-${t.color}-500 bg-${t.color}-500/10 text-${t.color}-400 shadow-lg shadow-${t.color}-500/10` 
                       : "border-white/5 bg-white/5 text-slate-500 hover:border-white/10"
                     }`}
                   >
                     <div className={`p-4 rounded-2xl transition-all ${formData.tipo === t.id ? `bg-${t.color}-500/20 text-${t.color}-400` : 'bg-white/5 text-slate-600'}`}>
                       <t.icon size={40} className={formData.tipo === t.id ? 'scale-110' : ''} />
                     </div>
                     <span className="font-black block text-xl tracking-tight">{t.label}</span>
                   </button>
                 ))}
               </div>
             </div>
          </div>

          {/* Form Details */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-2xl space-y-10 relative overflow-hidden">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <Activity size={12} /> Identificação (Placa/Prefixo)
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="ABC-1234 ou TR-01"
                    className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-black text-xl uppercase"
                    value={formData.identificacao}
                    onChange={(e) => setFormData({...formData, identificacao: e.target.value.toUpperCase()})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <Fuel size={12} /> Tipo de Combustível
                  </label>
                  <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5">
                    {['diesel', 'gasolina', 'flex'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({...formData, tipoCombustivel: c as any})}
                        className={`flex-1 py-3 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${
                          formData.tipoCombustivel === c
                          ? "bg-primary-500 text-[#0d1117]"
                          : "text-slate-500 hover:text-white"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fabricante</label>
                  <input
                    type="text"
                    placeholder="Volvo, Mercedes, Caterpillar..."
                    className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-bold"
                    value={formData.marca}
                    onChange={(e) => setFormData({...formData, marca: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Modelo</label>
                  <input
                    required
                    type="text"
                    placeholder="FH 540, 320D L, S10 High Country..."
                    className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-bold"
                    value={formData.modelo}
                    onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <Gauge size={12} /> {formData.tipo === 'maquina' ? 'Horímetro Inicial' : 'Hodômetro Inicial'}
                  </label>
                  <input
                    type="number"
                    className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-black text-xl"
                    value={formData.tipo === 'maquina' ? formData.horimetroInicial : formData.hodometroInicial}
                    onChange={(e) => setFormData({
                      ...formData, 
                      horimetroInicial: formData.tipo === 'maquina' ? Number(e.target.value) : 0,
                      hodometroInicial: formData.tipo !== 'maquina' ? Number(e.target.value) : 0
                    })}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <Zap size={12} /> Consumo Esperado ({formData.tipo === 'maquina' ? 'L/H' : 'KM/L'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="2.50"
                    className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-black text-xl"
                    value={formData.mediaEsperada || ""}
                    onChange={(e) => setFormData({...formData, mediaEsperada: Number(e.target.value)})}
                  />
                </div>
             </div>
          </div>
        </div>

        {/* Right Column - Secondary & Submit */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                   <Settings size={12} /> Categoria Operacional
                </label>
                <select
                  className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-bold appearance-none cursor-pointer"
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value as any})}
                >
                  <option value="SERRARIA" className="bg-[#0d1117]">Serraria (Indústria)</option>
                  <option value="FLORESTAL" className="bg-[#0d1117]">Florestal (Campo)</option>
                  <option value="TERRAPLANAGEM" className="bg-[#0d1117]">Terraplanagem</option>
                  <option value="LOGISTICA" className="bg-[#0d1117]">Logística (Transporte)</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                   <Calendar size={12} /> Ano de Fabricação
                </label>
                <input
                  type="number"
                  className="w-full bg-white/5 border border-white/5 text-white rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-bold"
                  value={formData.ano}
                  onChange={(e) => setFormData({...formData, ano: Number(e.target.value)})}
                />
              </div>

              <div className="p-6 bg-primary-500/5 border border-primary-500/10 rounded-3xl space-y-3">
                 <div className="flex items-center gap-2 text-primary-400">
                    <Info size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Dica de Gestão</span>
                 </div>
                 <p className="text-xs text-slate-400 font-medium">Definir um consumo esperado permite ao sistema alertar quando um veículo estiver operando fora da eficiência padrão.</p>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full py-5 bg-primary-500 hover:bg-primary-400 text-[#0d1117] font-black rounded-3xl transition-all hover:scale-[1.03] active:scale-95 shadow-xl shadow-primary-500/20 flex items-center justify-center gap-3 text-lg mt-4"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                {loading ? "CADASTRANDO..." : "CONCLUIR CADASTRO"}
              </button>
           </div>
        </div>
      </form>
    </div>
  );
}
