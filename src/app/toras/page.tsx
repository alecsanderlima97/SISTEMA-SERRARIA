"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTorasRomaneios } from "@/services/db/toras";

export default function TorasPage() {
  const [romaneios, setRomaneios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const data = await getTorasRomaneios();
      setRomaneios(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const totalVolume = romaneios.reduce((acc, r) => acc + (Number(r.volumeTotal) || 0), 0);
  const entradasHoje = romaneios.filter(r => {
    const hoje = new Date().toISOString().split('T')[0];
    return r.dataRecebimento === hoje;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1">
            Entrada de <span className="text-primary-500">Toras</span>
          </h1>
          <p className="text-slate-400 text-sm uppercase tracking-wide">Gestão de Matéria Prima e Romaneios de Campo</p>
        </div>
        <div className="flex gap-3">
          <Link href="/toras/nova" className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-6 rounded-lg transition-all shadow-lg shadow-primary-500/20 active:scale-95">
            + Registrar Carga
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Volume Total Acumulado" value={`${totalVolume.toFixed(1)} m³`} icon="🪵" color="text-amber-400" />
        <StatCard title="Entradas (Hoje)" value={`${entradasHoje} Cargas`} icon="🚚" color="text-blue-400" />
        <StatCard title="Custo Médio / m³" value="R$ 185,00" icon="📊" color="text-emerald-400" />
      </div>

      <div className="glass-panel overflow-hidden border-t-4 border-t-primary-500">
        <div className="flex flex-col md:flex-row justify-between items-center p-6 gap-4 border-b border-white/10">
          <h3 className="font-heading font-semibold text-lg text-white">Romaneios Recebidos</h3>
          <div className="relative w-full md:w-64">
             <input 
              type="text" 
              placeholder="Buscar por placa ou fornecedor..." 
              className="input-glass w-full pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Fornecedor</th>
                <th className="px-6 py-4 font-medium">Motorista / Placa</th>
                <th className="px-6 py-4 font-medium">Volume Útil</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {romaneios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhum romaneio de toras registrado ainda.
                  </td>
                </tr>
              ) : (
                romaneios.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(item.dataRecebimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-slate-200 font-medium">{item.fornecedor}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white">{item.motorista}</span>
                        <span className="text-[10px] font-mono text-primary-400 uppercase">{item.placa}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">{item.volumeTotal} m³</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase
                        ${item.status === 'Processado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white" title="Visualizar">
                          👁️
                        </button>
                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-primary-400" title="Imprimir">
                          🖨️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string, icon: string, color: string }) {
  return (
    <div className="glass-panel p-6 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 text-7xl opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 pointer-events-none grayscale">
        {icon}
      </div>
      <div className="flex justify-between items-start mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{title}</p>
        <div className={`text-xl ${color}`}>{icon}</div>
      </div>
      <h4 className="text-3xl font-bold text-white tracking-tight">{value}</h4>
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full w-2/3 ${color.replace('text', 'bg')} opacity-50`}></div>
      </div>
    </div>
  );
}
