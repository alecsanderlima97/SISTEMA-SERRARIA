"use client";

import { useState, useEffect } from "react";
import { 
  History, ArrowLeft, Download, 
  Search, Filter, Fuel, Droplet,
  Calendar, Truck
} from "lucide-react";
import Link from "next/link";
import { getHistoricoConsumo, RegistroConsumo } from "@/services/db/consumo";

export default function HistoricoConsumoPage() {
  const [historico, setHistorico] = useState<RegistroConsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");

  useEffect(() => {
    async function fetchData() {
      const hData = await getHistoricoConsumo(100); // Pegar os últimos 100
      setHistorico(hData);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredHistorico = historico.filter(item => {
    const matchesSearch = item.identificacaoVeiculo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.produto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFiltro === "todos" || item.tipo === tipoFiltro;
    return matchesSearch && matchesTipo;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/frota" className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-heading font-black text-white tracking-tight">Histórico de Consumo</h1>
            <p className="text-slate-400">Registros detalhados de combustível e lubrificantes.</p>
          </div>
        </div>
        <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center">
          <Download size={20} className="mr-2 text-primary-400" />
          Exportar Relatório
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar veículo ou produto..."
            className="input-field pl-12 bg-white/5"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative">
          <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <select 
            className="input-field pl-12 bg-white/5 appearance-none"
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
          >
            <option value="todos">Todos os Tipos</option>
            <option value="abastecimento">Abastecimento</option>
            <option value="lubrificante">Lubrificantes</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Calendar size={18} />
          <span>Exibindo últimos 100 registros</span>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 text-left">
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Data</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Veículo</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Tipo</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Produto</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Quantidade</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Odômetro/Horímetro</th>
                <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredHistorico.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-4 text-sm text-slate-400 font-medium">{item.data}</td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-primary-400 transition-colors">
                        <Truck size={14} />
                      </div>
                      <span className="font-bold text-white">{item.identificacaoVeiculo}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1 ${
                      item.tipo === 'abastecimento' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {item.tipo === 'abastecimento' ? <Fuel size={10} /> : <Droplet size={10} />}
                      {item.tipo === 'abastecimento' ? 'Abastecimento' : 'Lubrificante'}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-300 font-medium">{item.produto}</td>
                  <td className="px-8 py-4 font-bold text-white">{item.quantidade}L</td>
                  <td className="px-8 py-4 text-sm text-slate-400">{item.quilometragem || item.horimetro || "-"}</td>
                  <td className="px-8 py-4">
                    <span className="text-xs text-slate-500 font-bold bg-white/5 px-2 py-1 rounded">
                      {item.origem === 'tanque_interno' ? 'TANQUE SERRARIA' : 'POSTO EXTERNO'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredHistorico.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-500">
                      <Search size={48} className="opacity-20" />
                      <p className="font-bold">Nenhum registro encontrado para os filtros selecionados.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
