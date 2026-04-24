"use client";

import { useState, useEffect } from "react";
import { 
  Truck, Car, Construction, Fuel, 
  Droplet, Plus, History, ArrowRight,
  Gauge, TrendingUp, AlertTriangle, Database
} from "lucide-react";
import Link from "next/link";
import { getVeiculos, Veiculo } from "@/services/db/frota";
import { getTanqueStatus, getHistoricoConsumo, RegistroConsumo, TanqueInterno } from "@/services/db/consumo";

export default function FrotaPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [historico, setHistorico] = useState<RegistroConsumo[]>([]);
  const [tanque, setTanque] = useState<TanqueInterno | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [vData, hData, tData] = await Promise.all([
        getVeiculos(),
        getHistoricoConsumo(10),
        getTanqueStatus()
      ]);
      setVeiculos(vData);
      setHistorico(hData);
      setTanque(tData);
      setLoading(false);
    }
    fetchData();
  }, []);

  const percTanque = tanque ? (tanque.saldoAtual / tanque.capacidade) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header com Ações Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-heading font-black text-white tracking-tight">Gestão de Frotas</h1>
          <p className="text-slate-400 mt-2">Controle de abastecimento, lubrificantes e manutenção.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/frota/consumo" className="btn-primary">
            <Fuel size={20} className="mr-2" />
            Lançar Consumo
          </Link>
          <Link href="/frota/novo" className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center">
            <Plus size={20} className="mr-2" />
            Novo Veículo
          </Link>
        </div>
      </div>

      {/* Grid de KPIs e Tanque */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status do Tanque Interno */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Database size={120} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Tanque da Serraria</h3>
                  <p className="text-slate-400 text-sm">Diesel S10 / S500</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-white">{tanque?.saldoAtual.toLocaleString()}L</span>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Saldo Atual</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-1">
                <span className="text-slate-400">Capacidade: {tanque?.capacidade}L</span>
                <span className={percTanque < 20 ? "text-red-400" : "text-blue-400"}>
                  {percTanque.toFixed(1)}% disponível
                </span>
              </div>
              <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full transition-all duration-1000 ${percTanque < 20 ? "bg-gradient-to-r from-red-600 to-orange-500" : "bg-gradient-to-r from-blue-600 to-cyan-400"}`}
                  style={{ width: `${percTanque}%` }}
                />
              </div>
            </div>

            {percTanque < 20 && (
              <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                <AlertTriangle size={18} />
                <span className="text-sm font-bold">Nível Crítico! Necessário reabastecer o tanque interno.</span>
              </div>
            )}

            <div className="pt-2 flex gap-4">
              <Link 
                href="/frota/tanque" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                <Plus size={18} />
                Entrada Tanque
              </Link>
              <div className="px-6 py-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                <TrendingUp size={18} className="text-green-400" />
                <div className="leading-tight">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Consumo Mês</p>
                  <p className="text-sm font-bold text-white">
                    {historico.reduce((acc, curr) => acc + (curr.tipo === 'abastecimento' ? curr.quantidade : 0), 0).toLocaleString()}L
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo da Frota */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck size={20} className="text-primary-400" />
            Resumo da Frota
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <span className="text-2xl font-black text-white block">{veiculos.length}</span>
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Veículos</span>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <span className="text-2xl font-black text-white block">{veiculos.filter(v => v.tipo === 'maquina').length}</span>
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Máquinas/Equip</span>
            </div>
          </div>
          
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Próxima Manutenção</span>
              <span className="text-orange-400 font-bold">2 Alertas</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 w-[70%]" />
            </div>
          </div>

          <Link href="/frota/listagem" className="flex items-center justify-between p-4 bg-primary-600/10 hover:bg-primary-600/20 rounded-2xl text-primary-400 border border-primary-600/20 transition-all group">
            <span className="font-bold">Gerenciar Veículos</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Histórico Recente de Consumo */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <History size={20} className="text-primary-400" />
            Últimos Lançamentos
          </h3>
          <Link href="/frota/historico" className="text-primary-400 text-sm font-bold hover:underline">Ver Histórico Completo</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 text-left">
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Data</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Veículo</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Medição</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Produto</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Quantidade</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Performance</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {historico.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-4 text-sm text-slate-300">{item.data}</td>
                  <td className="px-8 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{item.identificacaoVeiculo}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-black">{item.tipoVeiculo === 'maquina' ? 'Máquina' : 'Caminhão/Carro'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Gauge size={14} className="text-slate-500" />
                      {item.km_horas.toLocaleString()} {item.tipoVeiculo === 'maquina' ? 'h' : 'km'}
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.tipo === 'abastecimento' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                      <span className="text-sm text-slate-300">{item.produto}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-sm font-bold text-white">{item.quantidade}L</td>
                  <td className="px-8 py-4">
                    {item.media ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${
                          item.tipoVeiculo === 'maquina' ? 'text-blue-400' : 'text-emerald-400'
                        }`}>
                          {item.media.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {item.tipoVeiculo === 'maquina' ? 'L/H' : 'KM/L'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-600">---</span>
                    )}
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-sm text-slate-400 italic">
                      {item.origem === 'tanque_interno' ? 'Serraria' : 'Posto Cidade'}
                    </span>
                  </td>
                </tr>
              ))}
              {historico.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-500">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
