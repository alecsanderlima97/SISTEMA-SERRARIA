"use client";

import { useState, useEffect } from "react";
import { 
  Truck, Droplets, Archive, History, 
  Plus, TrendingUp,
  AlertTriangle, Fuel, Gauge, Activity,
  ArrowRight, Loader2, LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getVeiculos, Veiculo } from "@/services/db/frota";
import { getHistoricoConsumo, getTanqueStatus, RegistroConsumo, TanqueInterno } from "@/services/db/consumo";

export default function FrotaDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [historico, setHistorico] = useState<RegistroConsumo[]>([]);
  const [tanque, setTanque] = useState<TanqueInterno | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [vData, hData, tData] = await Promise.all([
          getVeiculos(),
          getHistoricoConsumo(10),
          getTanqueStatus()
        ]);
        setVeiculos(vData);
        setHistorico(hData);
        setTanque(tData);
      } catch (error) {
        console.error("Erro ao carregar dados da frota:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-500" size={48} />
        <p className="text-slate-400 font-bold animate-pulse">Carregando painel de frota...</p>
      </div>
    );
  }

  const percentualTanque = tanque ? (tanque.saldoAtual / tanque.capacidade) * 100 : 0;

  return (
    <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-primary-500/20 text-primary-400 uppercase tracking-widest border border-primary-500/30">
              Módulo de Logística
            </span>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sincronizado
            </div>
          </div>
          <h1 className="text-4xl font-heading font-black text-white tracking-tight">
            Gestão de <span className="text-primary-500">Frotas</span>
          </h1>
          <p className="text-slate-400 font-medium">Controle de consumo, manutenção e logística de veículos.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            href="/frota/novo" 
            className="flex items-center gap-2 px-6 py-3.5 bg-primary-500 hover:bg-primary-400 text-[#0d1117] font-black rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary-500/20 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            CADASTRAR VEÍCULO
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Frota Ativa" 
          value={veiculos.length} 
          subtitle="Veículos cadastrados"
          icon={Truck} 
          color="blue"
        />
        <KPICard 
          title="Consumo Médio" 
          value="2.4" 
          subtitle="KM/L Geral"
          icon={Fuel} 
          color="emerald"
        />
        <KPICard 
          title="Alertas" 
          value="02" 
          subtitle="Manutenção pendente"
          icon={AlertTriangle} 
          color="rose"
        />
        <KPICard 
          title="Operação" 
          value="94%" 
          subtitle="Disponibilidade"
          icon={Activity} 
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Quick Actions Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
              <Plus size={20} className="text-primary-400" />
              Ações Operacionais
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <ActionLink 
                href="/frota/listagem" 
                icon={Truck} 
                title="Frota Completa" 
                description="Ver e gerenciar veículos"
                color="blue"
              />
              <ActionLink 
                href="/frota/consumo" 
                icon={Droplets} 
                title="Lançar Consumo" 
                description="Diesel e Lubrificantes"
                color="emerald"
              />
              <ActionLink 
                href="/frota/tanque" 
                icon={Archive} 
                title="Estoque Tanque" 
                description="Controle interno de Diesel"
                color="orange"
              />
              <ActionLink 
                href="/frota/historico" 
                icon={History} 
                title="Histórico" 
                description="Relatórios de abastecimento"
                color="slate"
              />
            </div>
          </div>

          {/* Tank Status Card */}
          <div className="bg-gradient-to-br from-orange-500/10 to-transparent backdrop-blur-xl border border-orange-500/20 rounded-[32px] p-8 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Fuel size={120} className="text-orange-500" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white">Tanque Interno</h3>
                  <p className="text-orange-400/80 text-xs font-bold uppercase tracking-wider">Diesel S10</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                  <Droplets size={24} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-medium">Saldo Atual</span>
                  <span className="text-white font-black">{tanque?.saldoAtual.toLocaleString()}L / {tanque?.capacidade.toLocaleString()}L</span>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className={`h-full transition-all duration-1000 ${percentualTanque < 20 ? 'bg-rose-500' : 'bg-orange-500'}`}
                    style={{ width: `${percentualTanque}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase text-right tracking-widest">
                  {percentualTanque.toFixed(1)}% da capacidade
                </p>
              </div>

              <button 
                onClick={() => router.push('/frota/tanque')}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all border border-white/5"
              >
                Gerenciar Tanque
              </button>
            </div>
          </div>
        </div>

        {/* Historico Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white">Lançamentos Recentes</h3>
                <p className="text-slate-400 text-sm">Últimos abastecimentos e trocas de óleo</p>
              </div>
              <Link href="/frota/historico" className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all">
                <History size={20} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <th className="px-8 py-4">Data</th>
                    <th className="px-8 py-4">Veículo</th>
                    <th className="px-8 py-4">Produto</th>
                    <th className="px-8 py-4">Quantidade</th>
                    <th className="px-8 py-4">Média</th>
                    <th className="px-8 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historico.length > 0 ? historico.slice(0, 6).map((item) => (
                    <tr 
                      key={item.id} 
                      className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => {
                        if (item.veiculoId) {
                          router.push(`/frota/veiculo/${item.veiculoId}`);
                        }
                      }}
                    >
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{new Date(item.data).toLocaleDateString()}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">{item.tipo}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-primary-400 transition-colors">
                            <Truck size={14} />
                          </div>
                          <span className="text-sm font-black text-white">{item.identificacaoVeiculo}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-300 font-medium">{item.produto}</td>
                      <td className="px-8 py-5 text-sm text-white font-black">{item.quantidade}L</td>
                      <td className="px-8 py-5">
                        {item.media ? (
                          <span className="px-2 py-1 bg-primary-500/10 text-primary-400 rounded text-xs font-bold">
                            {item.media} {item.tipoVeiculo === 'maquina' ? 'L/H' : 'KM/L'}
                          </span>
                        ) : '--'}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <ArrowRight size={16} className="ml-auto text-slate-700 group-hover:text-primary-500 transition-all group-hover:translate-x-1" />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-600">
                          <History size={48} className="opacity-20" />
                          <p className="font-bold">Nenhum registro encontrado</p>
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

function KPICard({ title, value, subtitle, icon: Icon, color }: { title: string; value: string | number; subtitle: string; icon: LucideIcon; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500/20 text-blue-400 border-blue-500/20",
    emerald: "from-emerald-500/20 text-emerald-400 border-emerald-500/20",
    rose: "from-rose-500/20 text-rose-400 border-rose-500/20",
    indigo: "from-indigo-500/20 text-indigo-400 border-indigo-500/20",
    orange: "from-orange-500/20 text-orange-400 border-orange-500/20",
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} to-transparent backdrop-blur-xl border rounded-[32px] p-6 relative group overflow-hidden hover:scale-[1.02] transition-all duration-500`}>
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
        <Icon size={120} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-2xl bg-white/5 text-white/40 group-hover:text-white transition-colors`}>
            <Icon size={20} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <div className="text-3xl font-black text-white tracking-tighter">{value}</div>
          <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function ActionLink({ href, icon: Icon, title, description, color }: { href: string; icon: LucideIcon; title: string; description: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500 group-hover:bg-blue-500/20",
    emerald: "text-emerald-500 group-hover:bg-emerald-500/20",
    orange: "text-orange-500 group-hover:bg-orange-500/20",
    slate: "text-slate-400 group-hover:bg-slate-400/20",
  };

  return (
    <Link 
      href={href} 
      className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center transition-all ${colorMap[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <h4 className="text-sm font-black text-white tracking-tight">{title}</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{description}</p>
        </div>
      </div>
      <ArrowRight size={18} className="text-slate-700 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}
