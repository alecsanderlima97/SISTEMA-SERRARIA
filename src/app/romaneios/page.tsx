"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, Search, Filter, FileText, 
  Download, Eye, MoreHorizontal, Truck,
  Calendar, User, Box, ArrowRight
} from "lucide-react";
import { getRomaneios, Romaneio } from "@/services/db/romaneios";

export default function RomaneiosPage() {
  const [romaneios, setRomaneios] = useState<Romaneio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      const data = await getRomaneios();
      setRomaneios(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const filtered = romaneios.filter(r => 
    r.clienteNome.toLowerCase().includes(search.toLowerCase()) ||
    r.numeroCarga.toString().includes(search)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Romaneios de <span className="text-primary-500">Saída</span></h1>
          <p className="text-slate-400 mt-1">Controle de carregamentos e madeira serrada vendida.</p>
        </div>
        <Link 
          href="/romaneios/novo" 
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-primary-900/20 active:scale-95 whitespace-nowrap"
        >
          <Plus size={20} />
          Novo Romaneio
        </Link>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou Nº de carga..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary-500 focus:bg-white/10 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all">
          <Filter size={18} />
          Filtros Avançados
        </button>
      </div>

      {/* Table Area */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-8 py-5">Carga / Data</th>
                <th className="px-8 py-5">Cliente / Destino</th>
                <th className="px-8 py-5 text-center">Volume</th>
                <th className="px-8 py-5 text-right">Faturamento</th>
                <th className="px-8 py-5 text-center">Status</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-500">Buscando dados no banco...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <div className="text-slate-500 font-bold mb-1">Nenhum romaneio encontrado</div>
                    <div className="text-slate-600 text-xs">Ajuste os filtros ou crie um novo registro.</div>
                  </td>
                </tr>
              ) : (
                filtered.map((rom) => (
                  <tr key={rom.id} className="hover:bg-white/5 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
                          <Box size={20} />
                        </div>
                        <div>
                          <div className="text-white font-bold tracking-tight">#{rom.numeroCarga}</div>
                          <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1">
                            <Calendar size={10} /> {new Date(rom.dataEmissao).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-slate-200 font-bold">{rom.clienteNome}</div>
                      <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1">
                        <Truck size={10} /> {rom.transportadora || 'Proprio'}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="text-primary-400 font-mono font-bold">{rom.totalM3.toFixed(3)} m³</div>
                      <div className="text-[10px] text-slate-600 font-bold uppercase">{rom.totalPecas} Peças</div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="text-white font-black font-mono">R$ {rom.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        rom.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        rom.status === 'cancelado' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {rom.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link 
                          href={`/romaneios/${rom.id}`}
                          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
                        >
                          <Eye size={16} />
                        </Link>
                        <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10">
                          <Download size={16} />
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
