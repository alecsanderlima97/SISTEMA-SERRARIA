"use client";

import { useState, useEffect } from "react";
import { 
  History, ArrowLeft, Download, 
  Search, Filter, Fuel, Droplet,
  Calendar, Truck, Loader2,
  ChevronRight, MapPin, Gauge,
  ArrowUpRight, ArrowDownRight,
  TrendingUp, Activity
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getHistoricoConsumo, RegistroConsumo } from "@/services/db/consumo";

export default function HistoricoConsumoPage() {
  const router = useRouter();
  const [historico, setHistorico] = useState<RegistroConsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");

  useEffect(() => {
    async function fetchData() {
      try {
        const hData = await getHistoricoConsumo(100); // Pegar os últimos 100
        setHistorico(hData);
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredHistorico = historico.filter(item => {
    const matchesSearch = item.identificacaoVeiculo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.produto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFiltro === "todos" || item.tipo === tipoFiltro;
    return matchesSearch && matchesTipo;
  });

  const handleExport = () => {
    if (filteredHistorico.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const headers = ["Data", "Veiculo", "Tipo", "Produto", "Quantidade (L)", "KM/H", "Media", "Origem"];
    const rows = filteredHistorico.map(item => [
      item.data,
      item.identificacaoVeiculo,
      item.tipo,
      item.produto,
      item.quantidade,
      item.km_horas,
      item.media || "",
      item.origem
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `historico_frota_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-500" size={48} />
        <p className="text-slate-400 font-bold animate-pulse">Compilando registros da frota...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
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
                Auditoria e Telemetria
              </span>
            </div>
            <h1 className="text-4xl font-heading font-black text-white tracking-tight">Histórico de <span className="text-primary-500">Operações</span></h1>
            <p className="text-slate-400 font-medium">Visualização detalhada de todos os lançamentos de consumo e manutenção.</p>
          </div>
        </div>

        <button 
          onClick={handleExport}
          className="bg-white/5 hover:bg-primary-500 hover:text-[#0d1117] text-white px-8 py-4 rounded-3xl font-black transition-all flex items-center justify-center gap-3 border border-white/10 group shadow-xl"
        >
          <Download size={22} className="group-hover:scale-110 transition-transform" />
          EXPORTAR RELATÓRIO COMPLETO
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: 'Registros Totais', value: historico.length, icon: Activity, color: 'text-blue-400' },
           { label: 'Litros Lançados', value: historico.reduce((acc, i) => acc + (i.quantidade || 0), 0).toLocaleString(), icon: Fuel, color: 'text-primary-400' },
           { label: 'Lubrificantes', value: historico.filter(i => i.tipo === 'lubrificante').length, icon: Droplet, color: 'text-purple-400' },
           { label: 'Média de Registros', value: (historico.length / 30).toFixed(1) + '/dia', icon: TrendingUp, color: 'text-emerald-400' },
         ].map((stat, i) => (
           <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-6 group hover:border-white/20 transition-all shadow-lg">
             <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                <stat.icon size={28} />
             </div>
             <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
               <p className="text-2xl font-black text-white">{stat.value}</p>
             </div>
           </div>
         ))}
      </div>

      {/* Filters and Table Area */}
      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
        {/* Filters Header */}
        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row gap-6">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Pesquisar por veículo, produto ou placa..."
              className="w-full pl-16 pr-6 py-5 bg-black/20 border border-white/5 text-white rounded-[24px] outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-bold placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full md:w-64 relative">
            <Filter size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <select 
              className="w-full pl-16 pr-6 py-5 bg-black/20 border border-white/5 text-white rounded-[24px] outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-bold appearance-none cursor-pointer"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
            >
              <option value="todos">Todos os Tipos</option>
              <option value="abastecimento">Abastecimento</option>
              <option value="lubrificante">Lubrificantes</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.01]">
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Informações Básicas</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Operação</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Volumetria</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Métricas</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Origem / Log</th>
                <th className="px-8 py-6 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredHistorico.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => router.push(`/frota/veiculo/${item.veiculoId}`)}
                  className="hover:bg-white/[0.03] transition-all group cursor-pointer"
                >
                  <td className="px-10 py-7">
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-primary-500/20 group-hover:text-primary-400 transition-all border border-white/5">
                           <Truck size={24} />
                        </div>
                        <div>
                           <p className="text-lg font-black text-white group-hover:text-primary-400 transition-colors tracking-tight leading-tight uppercase">{item.identificacaoVeiculo}</p>
                           <div className="flex items-center gap-2 mt-1">
                              <Calendar size={12} className="text-slate-500" />
                              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{item.data}</span>
                           </div>
                        </div>
                     </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="space-y-1.5">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] inline-flex items-center gap-1.5 border ${
                         item.tipo === 'abastecimento' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                       }`}>
                         {item.tipo === 'abastecimento' ? <Fuel size={12} /> : <Droplet size={12} />}
                         {item.tipo === 'abastecimento' ? 'Abastecimento' : 'Lubrificante'}
                       </span>
                       <p className="text-xs font-bold text-slate-300 ml-1">{item.produto}</p>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <div className="space-y-0.5">
                       <p className="text-3xl font-black text-white tracking-tighter">{item.quantidade?.toLocaleString()}</p>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LITROS</p>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-right">
                     <div className="inline-flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                           <Gauge size={14} className="text-slate-400" />
                           <span className="text-sm font-black text-white tracking-tight">{item.km_horas?.toLocaleString()} <span className="text-[10px] text-slate-500 opacity-60">KM/H</span></span>
                        </div>
                        {item.media && (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                             <TrendingUp size={14} />
                             <span className="text-xs font-black tracking-tight">{item.media.toFixed(2)} KM/L</span>
                          </div>
                        )}
                     </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex flex-col gap-2">
                       <div className={`flex items-center gap-2 w-fit px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                         item.origem === 'tanque_interno' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                       }`}>
                          <MapPin size={10} />
                          {item.origem === 'tanque_interno' ? 'Tanque Serraria' : 'Posto Externo'}
                       </div>
                       {item.valorTotal && (
                         <span className="text-sm font-bold text-white ml-1">R$ {item.valorTotal.toLocaleString()}</span>
                       )}
                    </div>
                  </td>
                  <td className="px-8 py-7">
                     <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-slate-600 group-hover:text-primary-500 group-hover:border-primary-500/30 transition-all">
                        <ChevronRight size={20} />
                     </div>
                  </td>
                </tr>
              ))}
              
              {filteredHistorico.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-10 py-32 text-center">
                    <div className="flex flex-col items-center gap-6 max-w-sm mx-auto animate-in zoom-in duration-700">
                       <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-slate-700">
                          <History size={48} />
                       </div>
                       <div className="space-y-2">
                          <h4 className="text-xl font-black text-white tracking-tight">Nenhum Registro Encontrado</h4>
                          <p className="text-slate-500 text-sm font-medium">Tente ajustar seus filtros ou termos de pesquisa para encontrar os lançamentos desejados.</p>
                       </div>
                       <button 
                         onClick={() => {setSearchTerm(""); setTipoFiltro("todos")}}
                         className="text-primary-500 font-black text-xs uppercase tracking-[0.2em] hover:text-white transition-colors"
                       >
                         Limpar Todos os Filtros
                       </button>
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
