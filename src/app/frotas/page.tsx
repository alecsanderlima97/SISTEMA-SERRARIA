"use client";

import { useState, useEffect } from "react";
import { 
  Truck, 
  Fuel, 
  Droplets, 
  Wrench, 
  Plus, 
  Search, 
  Filter,
  History,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  ArrowUpRight
} from "lucide-react";
import { frotasService, Veiculo, Abastecimento } from "@/modules/frotas/services/frotasService";
import { INITIAL_VEHICLES } from "@/modules/frotas/utils/initialData";

export default function FrotasPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "veiculos" | "abastecimentos" | "lubrificantes">("dashboard");

  useEffect(() => {
    async function loadData() {
      try {
        let veics = await frotasService.getVeiculos();
        
        // Se não houver veículos, sugere importar os iniciais
        if (veics.length === 0) {
          // Aqui poderíamos ter um botão de "Setup Inicial"
          // Por enquanto vamos apenas carregar os mockados se falhar
        }
        
        setVeiculos(veics);
        const abs = await frotasService.getAbastecimentosRecent();
        setAbastecimentos(abs);
      } catch (error) {
        console.error("Erro ao carregar dados de frotas:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSetupInicial = async () => {
    if (confirm("Deseja importar a frota inicial baseada na planilha?")) {
      setLoading(true);
      for (const v of INITIAL_VEHICLES) {
        await frotasService.addVeiculo({
          nome: v.nome,
          placa: v.placa,
          categoria: v.categoria as any,
          status: "ATIVO"
        });
      }
      const veics = await frotasService.getVeiculos();
      setVeiculos(veics);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Truck className="text-primary-500" size={36} />
            Gestão de <span className="text-primary-500">Frotas</span>
          </h1>
          <p className="text-slate-400 mt-1">Controle de combustíveis, lubrificantes e manutenção preventiva.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {veiculos.length === 0 && (
            <button 
              onClick={handleSetupInicial}
              className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-sm font-bold hover:bg-amber-500/30 transition-all"
            >
              Setup Inicial
            </button>
          )}
          <button className="px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20">
            <Plus size={18} />
            Novo Registro
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-1">
        <TabButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} label="Dashboard" />
        <TabButton active={activeTab === "veiculos"} onClick={() => setActiveTab("veiculos")} label="Veículos" />
        <TabButton active={activeTab === "abastecimentos"} onClick={() => setActiveTab("abastecimentos")} label="Abastecimentos" />
        <TabButton active={activeTab === "lubrificantes"} onClick={() => setActiveTab("lubrificantes")} label="Lubrificantes" />
      </div>

      {activeTab === "dashboard" && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              label="Veículos Ativos" 
              value={veiculos.filter(v => v.status === "ATIVO").length} 
              subtext={`Total de ${veiculos.length} máquinas`}
              icon={<Truck size={24} />} 
              color="primary"
            />
            <StatCard 
              label="Diesel Interno" 
              value="8.450 L" 
              subtext="Nível do Tanque (85%)"
              icon={<Fuel size={24} />} 
              color="emerald"
            />
            <StatCard 
              label="Consumo Mensal" 
              value="12.200 L" 
              subtext="+4.2% vs mês anterior"
              icon={<TrendingUp size={24} />} 
              color="amber"
            />
            <StatCard 
              label="Manutenções" 
              value="3" 
              subtext="Equipamentos em oficina"
              icon={<Wrench size={24} />} 
              color="rose"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Recent Activity */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <History size={20} className="text-primary-400" />
                    Últimos Abastecimentos
                  </h3>
                  <button className="text-xs text-primary-400 font-bold hover:underline">Ver Todos</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 text-xs font-black uppercase tracking-widest border-b border-white/5">
                        <th className="pb-4">Data</th>
                        <th className="pb-4">Veículo</th>
                        <th className="pb-4">Responsável</th>
                        <th className="pb-4">Qtd (L)</th>
                        <th className="pb-4">Tipo</th>
                        <th className="pb-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-white/5">
                      {abastecimentos.length > 0 ? abastecimentos.slice(0, 5).map((item) => (
                        <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                          <td className="py-4 text-slate-400">{new Date(item.data?.toDate()).toLocaleDateString('pt-BR')}</td>
                          <td className="py-4 font-bold text-white">{item.veiculoNome}</td>
                          <td className="py-4 text-slate-400">{item.responsavel}</td>
                          <td className="py-4">
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg font-bold">
                              {item.litros} L
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${item.origem === 'INTERNO' ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-500/20 text-slate-400'}`}>
                              {item.origem}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <button className="p-2 text-slate-500 hover:text-white transition-colors">
                              <ArrowUpRight size={16} />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 italic">Nenhum registro encontrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Maintenance Alerts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <div className="text-white font-bold">Troca de Óleo</div>
                    <div className="text-rose-400 text-xs font-medium">AXOR 3340 - Vencido há 2 dias</div>
                  </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <div className="text-white font-bold">Revisão Periódica</div>
                    <div className="text-emerald-400 text-xs font-medium">Todos os veículos em dia</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 space-y-6">
              {/* Tanque Visualizer */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 overflow-hidden relative">
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Fuel size={18} className="text-emerald-400" />
                    Tanque Interno
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs text-slate-400 font-bold uppercase">Diesel S10</span>
                        <span className="text-xl font-black text-white">85%</span>
                      </div>
                      <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: '85%' }} />
                      </div>
                      <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-bold">
                        <span>0 L</span>
                        <span>CAPACIDADE: 10.000 L</span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Saldo Atual</span>
                        <span className="text-sm font-bold text-white">8.500 L</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Consumo Hoje</span>
                        <span className="text-sm font-bold text-rose-400">- 420 L</span>
                      </div>
                      <button className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white hover:bg-white/10 transition-all uppercase tracking-widest">
                        Registrar Recebimento
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lubrificantes Info */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Droplets size={18} className="text-blue-400" />
                  Lubrificantes
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">15W40</div>
                      <span className="text-sm font-medium text-slate-300">Motor Diesel</span>
                    </div>
                    <span className="text-sm font-bold text-white">12 Baldes</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">68</div>
                      <span className="text-sm font-medium text-slate-300">Hidráulico</span>
                    </div>
                    <span className="text-sm font-bold text-white">8 Baldes</span>
                  </div>
                  <button className="w-full py-3 bg-primary-500/10 border border-primary-500/20 rounded-2xl text-xs font-bold text-primary-400 hover:bg-primary-500/20 transition-all uppercase tracking-widest">
                    Inventário Completo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "veiculos" && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h3 className="text-xl font-bold text-white">Listagem de Frota</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar veículo ou placa..." 
                    className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary-500/50 w-64"
                  />
                </div>
                <button className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                  <Filter size={18} />
                </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {veiculos.map((v) => (
                <div key={v.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-primary-500/30 transition-all group">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-primary-500/10 text-primary-400 group-hover:scale-110 transition-transform">
                        <Truck size={20} />
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${v.status === 'ATIVO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {v.status}
                      </span>
                   </div>
                   <h4 className="text-white font-bold mb-1 truncate">{v.nome}</h4>
                   <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                        {v.placa || "S/ PLACA"}
                      </span>
                      <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">
                        {v.categoria}
                      </span>
                   </div>
                   <div className="flex gap-2 pt-4 border-t border-white/5">
                      <button className="flex-1 py-2 bg-white/5 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase">Detalhes</button>
                      <button className="flex-1 py-2 bg-white/5 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase">Histórico</button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${active ? 'text-primary-500 border-primary-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, subtext, icon, color }: any) {
  const colorMap: any = {
    primary: "from-primary-500/20 to-transparent text-primary-400",
    emerald: "from-emerald-500/20 to-transparent text-emerald-400",
    amber: "from-amber-500/20 to-transparent text-amber-400",
    rose: "from-rose-500/20 to-transparent text-rose-400",
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} backdrop-blur-md border border-white/10 rounded-3xl p-6 relative group overflow-hidden`}>
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
        <div className="w-24 h-24">{icon}</div>
      </div>
      <div className="relative z-10">
        <div className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center justify-between">
          {label}
        </div>
        <div className="text-3xl font-black text-white tracking-tighter mb-1">{value}</div>
        <div className="text-[10px] font-medium text-slate-500">{subtext}</div>
      </div>
    </div>
  );
}
