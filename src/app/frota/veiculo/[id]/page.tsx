"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVeiculos, Veiculo } from "@/services/db/frota";
import { getHistoricoConsumo, RegistroConsumo } from "@/services/db/consumo";
import Link from "next/link";
import { 
  ArrowLeft, Truck, Calendar, Fuel, 
  Gauge, TrendingUp, History, Settings,
  AlertCircle, CheckCircle2, Droplets,
  Wrench, Activity, ChevronRight, Loader2,
  LucideIcon
} from "lucide-react";

export default function DetalhesVeiculo() {
  const { id } = useParams();
  const router = useRouter();
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
  const [historico, setHistorico] = useState<RegistroConsumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [allVeiculos, allHistorico] = await Promise.all([
          getVeiculos(),
          getHistoricoConsumo(50)
        ]);
        
        const found = allVeiculos.find(v => v.id === id);
        if (found) {
          setVeiculo(found);
          setHistorico(allHistorico.filter(h => h.veiculoId === id));
        }
      } catch (error) {
        console.error("Erro ao carregar detalhes:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-500" size={48} />
        <p className="text-slate-400 font-bold animate-pulse">Sincronizando telemetria...</p>
      </div>
    );
  }

  if (!veiculo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20 text-rose-500">
          <AlertCircle size={48} />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black text-white">Veículo não encontrado</h2>
          <p className="text-slate-500 mt-2">O identificador fornecido não corresponde a nenhum ativo em nossa base.</p>
        </div>
        <button onClick={() => router.back()} className="btn-primary px-8">
          Voltar para Frota
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push("/frota/listagem")} 
            className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all flex items-center justify-center border border-white/5 group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-primary-500/20 text-primary-400 uppercase tracking-widest border border-primary-500/30">
                Ativo Operacional
              </span>
              <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Disponível
              </div>
            </div>
            <h1 className="text-4xl font-heading font-black text-white tracking-tight">
              {veiculo.identificacao}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href={`/frota/veiculo/${id}/editar`}
            className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all border border-white/10 group"
          >
            <Settings size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            EDITAR DADOS
          </Link>
          <Link 
            href="/frota/consumo" 
            className="flex items-center gap-2 px-6 py-4 bg-primary-500 hover:bg-primary-400 text-[#0d1117] font-black rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary-500/20"
          >
            <Fuel size={20} />
            LANÇAR ABASTECIMENTO
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Info Card */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
               <Truck size={240} />
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-10">
              <DetailItem icon={Truck} label="Marca / Modelo" value={`${veiculo.marca} ${veiculo.modelo}`} />
              <DetailItem icon={Calendar} label="Ano de Fabricação" value={veiculo.ano?.toString() || "--"} />
              <DetailItem icon={Fuel} label="Tipo de Combustível" value={veiculo.tipoCombustivel.toUpperCase()} />
              <DetailItem 
                icon={Gauge} 
                label={veiculo.tipo === "maquina" ? "Horímetro Atual" : "Hodômetro Atual"} 
                value={veiculo.tipo === "maquina" ? `${veiculo.horimetroAtual || 0}h` : `${veiculo.hodometroAtual || 0}km`} 
                highlight
              />
              <DetailItem 
                icon={TrendingUp} 
                label="Média Esperada" 
                value={`${veiculo.mediaEsperada || "--"} ${veiculo.tipo === "maquina" ? "L/H" : "KM/L"}`} 
              />
              <DetailItem 
                icon={Activity} 
                label="Categoria" 
                value={veiculo.categoria || "GERAL"} 
              />
            </div>
          </div>

          {/* Performance Chart / Visual */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
             <div className="flex items-center justify-between mb-10">
                <div>
                   <h3 className="text-2xl font-black text-white tracking-tight">Performance e Consumo</h3>
                   <p className="text-slate-400 font-medium">Análise de eficiência dos últimos lançamentos</p>
                </div>
                <div className="flex gap-2">
                   <div className="px-3 py-1 bg-primary-500/10 rounded-full text-[10px] font-black text-primary-400 border border-primary-500/20">EFICIÊNCIA: 92%</div>
                </div>
             </div>

             <div className="h-64 flex items-end justify-between gap-3 px-2">
                {[65, 80, 45, 90, 75, 60, 85, 95, 70, 100].map((h, i) => (
                  <div key={i} className="flex-1 group relative">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 whitespace-nowrap">
                       {h}%
                    </div>
                    <div 
                      style={{ height: `${h}%` }} 
                      className={`w-full rounded-2xl transition-all duration-1000 delay-${i * 100} ${i % 2 === 0 ? "bg-primary-500/40 group-hover:bg-primary-500/60" : "bg-primary-500/10 group-hover:bg-primary-500/30"}`}
                    />
                  </div>
                ))}
             </div>
             <div className="flex justify-between mt-6 px-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                <span>Últimos 30 Dias</span>
                <span>Projeção Mensal</span>
             </div>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="lg:col-span-4 space-y-8">
           {/* Manutencao Card */}
           <div className="bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl border border-blue-500/20 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Wrench size={100} />
              </div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Wrench size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Manutenção</h3>
                    <p className="text-blue-400/80 text-[10px] font-black uppercase tracking-widest">Próxima Revisão</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Status do Óleo</p>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-black">7.500km</span>
                      <span className="text-emerald-500 text-xs font-bold">OK</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Filtros</p>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-black">Em dia</span>
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                  </div>
                </div>

                <button className="w-full py-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-blue-500/20">
                  Agendar Revisão
                </button>
              </div>
           </div>

           {/* Historico Compacto */}
           <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
              <h3 className="text-xl font-black text-white mb-8 tracking-tight flex items-center justify-between">
                Histórico
                <Link href="/frota/historico" className="text-primary-500 text-xs font-black uppercase tracking-widest hover:underline">Ver Tudo</Link>
              </h3>

              <div className="space-y-6">
                {historico.length > 0 ? historico.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex gap-4 items-start group">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-primary-400 transition-colors border border-white/5">
                       <Fuel size={18} />
                    </div>
                    <div className="flex-1 space-y-1">
                       <div className="flex justify-between">
                          <p className="text-sm font-black text-white">{item.quantidade}L de {item.produto}</p>
                          <span className="text-[10px] text-slate-500 font-black uppercase">{new Date(item.data).toLocaleDateString()}</span>
                       </div>
                       <p className="text-xs text-slate-500 font-medium">{item.operador}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10 opacity-30 space-y-3">
                    <History size={40} className="mx-auto" />
                    <p className="text-xs font-bold uppercase tracking-widest">Sem lançamentos</p>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value, highlight = false }: { icon: LucideIcon; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-slate-500 group-hover:text-primary-500 transition-colors" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-xl font-black tracking-tight ${highlight ? "text-primary-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
