"use client";

import { useState, useEffect } from "react";
import { getEstoquePacotes } from "@/services/db/estoque";
import { Package, Trash2, Search, Filter, Layers, Ruler } from "lucide-react";

export default function EstoquePage() {
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const data = await getEstoquePacotes();
      setPacotes(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const totalPacotes = pacotes.length;
  const totalVolume = pacotes.reduce((acc, p) => acc + (Number(p.volumeCalculado) || 0), 0);
  const totalPecas = pacotes.reduce((acc, p) => acc + (Number(p.quantidadeCalculada) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1">
            Controle de <span className="text-primary-500">Estoque</span>
          </h1>
          <p className="text-slate-400 text-sm uppercase tracking-wide">Pacotes de Madeira Beneficiada e Serrada</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">Exportar Inventário</button>
          <button className="btn-primary">+ Novo Pacote</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <InventoryStat cardTitle="Pacotes em Estoque" value={totalPacotes} icon={<Package />} color="border-primary-500" />
        <InventoryStat cardTitle="Volume Total (m³)" value={`${totalVolume.toFixed(2)}`} icon={<Layers />} color="border-emerald-500" />
        <InventoryStat cardTitle="Total de Peças" value={totalPecas} icon={<Search />} color="border-amber-500" />
        <InventoryStat cardTitle="Qualidade A (85%)" value="142" icon={<Filter />} color="border-blue-500" />
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-heading font-bold text-white uppercase tracking-wider text-sm opacity-70">Listagem de Pacotes Ativos</h3>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1">
              <input type="text" placeholder="Buscar ID ou Bitola..." className="input-glass w-full pl-10 text-sm py-2" />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
            <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-slate-400">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-[10px] uppercase font-black tracking-widest text-slate-500">
                <th className="px-6 py-4">Identificador</th>
                <th className="px-6 py-4">Data Produção</th>
                <th className="px-6 py-4">Bitola (mm)</th>
                <th className="px-6 py-4">Quant.</th>
                <th className="px-6 py-4">Volume (m³)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pacotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-600 italic">Inventário vazio.</td>
                </tr>
              ) : (
                pacotes.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold text-xs">
                          #
                        </div>
                        <span className="font-mono text-white font-bold">{item.identificador}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(item.dataProducao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-white">
                        <span className="font-bold">{item.espessura}x{item.largura}</span>
                        <span className="text-slate-500 text-xs">({item.comprimento}mm)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-200">{item.quantidadeCalculada} pçs</td>
                    <td className="px-6 py-4 font-bold text-emerald-400">{item.volumeCalculado} m³</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase px-2 py-1 rounded border border-blue-500/20">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2">
                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
                          <Search size={16} />
                        </button>
                        <button className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-slate-400 hover:text-red-400">
                          <Trash2 size={16} />
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

function InventoryStat({ cardTitle, value, icon, color }: any) {
  return (
    <div className={`glass-panel p-6 border-l-4 ${color} relative overflow-hidden group`}>
       <div className="flex items-center gap-4">
        <div className="p-3 bg-white/5 rounded-xl text-slate-400 group-hover:text-white transition-colors">
          {icon}
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">{cardTitle}</p>
          <h4 className="text-2xl font-bold text-white">{value}</h4>
        </div>
      </div>
    </div>
  );
}
