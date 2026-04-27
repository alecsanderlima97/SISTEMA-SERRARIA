"use client";

import { useEffect, useState } from "react";
import { getVeiculos, Veiculo, importarVeiculosIniciais } from "@/services/db/frota";
import { INITIAL_VEHICLES } from "@/services/db/initialData";
import Link from "next/link";
import { 
  Plus, Search, Truck, Settings, 
  ArrowRight, Download, Filter,
  Car, Construction, Bike, Loader2,
  ChevronRight, LayoutGrid
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ListagemFrota() {
  const router = useRouter();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("TODOS");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getVeiculos();
      setVeiculos(data);
    } catch (error) {
      console.error("Erro ao carregar veículos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImport = async () => {
    if (!confirm("Deseja importar os veículos iniciais padrão?")) return;
    
    setImporting(true);
    const result = await importarVeiculosIniciais(INITIAL_VEHICLES);
    if (result.success) {
      alert(`${result.count} veículos importados com sucesso!`);
      loadData();
    } else {
      alert("Erro ao importar veículos.");
    }
    setImporting(false);
  };

  const filtered = veiculos.filter(v => {
    const matchesSearch = v.identificacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.modelo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoria === "TODOS" || v.categoria === selectedCategoria;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-500" size={48} />
        <p className="text-slate-400 font-bold animate-pulse">Organizando sua frota...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-400 uppercase tracking-widest border border-blue-500/30">
              Inventário de Ativos
            </span>
          </div>
          <h1 className="text-4xl font-heading font-black text-white tracking-tight">
            Sua <span className="text-primary-500">Frota</span>
          </h1>
          <p className="text-slate-400 font-medium">Gerenciamento completo de {veiculos.length} veículos e máquinas.</p>
        </div>
        
        <div className="flex gap-3">
          {veiculos.length === 0 && (
            <button 
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold flex items-center gap-2 transition-all border border-white/10"
            >
              <Download size={20} className="text-primary-400" />
              {importing ? "Importando..." : "Setup Inicial"}
            </button>
          )}
          <Link 
            href="/frota/novo" 
            className="flex items-center gap-2 px-6 py-3.5 bg-primary-500 hover:bg-primary-400 text-[#0d1117] font-black rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary-500/20 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            NOVO VEÍCULO
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white/5 backdrop-blur-xl p-4 rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none">
          <LayoutGrid size={80} />
        </div>

        <div className="relative flex-1 w-full z-10">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por placa, prefixo ou modelo..."
            className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary-500/50 transition-all outline-none text-white placeholder:text-slate-600 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto z-10">
          <div className="p-4 bg-white/5 rounded-2xl text-slate-500 border border-white/5">
            <Filter size={20} />
          </div>
          <select 
            className="flex-1 md:flex-none bg-white/5 border border-white/5 text-slate-300 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all min-w-[200px] font-bold"
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
          >
            <option value="TODOS">Todas Categorias</option>
            <option value="SERRARIA">Serraria</option>
            <option value="FLORESTAL">Florestal</option>
            <option value="TERRAPLANAGEM">Terraplanagem</option>
          </select>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(veiculo => (
          <div 
            key={veiculo.id} 
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 group hover:border-primary-500/30 transition-all duration-500 relative overflow-hidden flex flex-col h-full"
          >
            {/* Background Icon Decor */}
            <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700 pointer-events-none">
              <Truck size={160} />
            </div>

            <div className="flex items-start justify-between mb-8 relative z-10">
              <div className={`p-5 rounded-3xl transition-all duration-500 shadow-lg ${
                veiculo.tipo === "maquina" ? "bg-blue-500/10 text-blue-400 shadow-blue-500/5" :
                veiculo.tipo === "moto" ? "bg-orange-500/10 text-orange-400 shadow-orange-500/5" :
                veiculo.tipo === "carro" ? "bg-emerald-500/10 text-emerald-400 shadow-emerald-500/5" :
                "bg-primary-500/10 text-primary-400 shadow-primary-500/5"
              }`}>
                {veiculo.tipo === "maquina" ? <Construction size={32} /> :
                 veiculo.tipo === "moto" ? <Bike size={32} /> :
                 veiculo.tipo === "carro" ? <Car size={32} /> :
                 <Truck size={32} />}
              </div>
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                veiculo.categoria === "SERRARIA" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                veiculo.categoria === "FLORESTAL" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                "bg-orange-500/10 text-orange-400 border-orange-500/20"
              }`}>
                {veiculo.categoria || "GERAL"}
              </span>
            </div>

            <div className="space-y-1 relative z-10 mb-8">
              <h3 className="text-3xl font-black text-white group-hover:text-primary-400 transition-colors tracking-tight">{veiculo.identificacao}</h3>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">{veiculo.modelo}</p>
            </div>

            <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-8 relative z-10 flex-1">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Atual</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-xl font-black text-white">
                    {veiculo.tipo === "maquina" 
                      ? `${veiculo.horimetroAtual || 0}h` 
                      : `${veiculo.hodometroAtual || 0}km`}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Performance</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-black text-slate-300 group-hover:text-white transition-colors">
                    {veiculo.mediaEsperada || "--"}
                  </p>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    {veiculo.tipo === "maquina" ? "L/H" : "KM/L"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between relative z-10">
              <Link 
                href={`/frota/veiculo/${veiculo.id}/editar`}
                className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all flex items-center justify-center border border-white/5"
              >
                <Settings size={22} />
              </Link>
              <button 
                onClick={() => router.push(`/frota/veiculo/${veiculo.id}`)}
                className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl text-primary-400 font-black text-xs uppercase tracking-widest transition-all group/btn border border-white/5 hover:border-primary-500/30"
              >
                Detalhes
                <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-32 bg-white/5 rounded-[60px] border-2 border-dashed border-white/10 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5">
            <Truck size={48} className="text-slate-700" />
          </div>
          <h3 className="text-3xl font-black text-white">Nenhum veículo encontrado</h3>
          <p className="text-slate-500 max-w-md mx-auto mt-3 font-medium">Não encontramos nenhum resultado para sua busca. Tente ajustar os filtros ou cadastrar um novo veículo.</p>
          <button 
            onClick={() => {setSearchTerm(""); setSelectedCategoria("TODOS")}}
            className="mt-10 px-8 py-4 bg-primary-500/10 text-primary-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-500 hover:text-[#0d1117] transition-all"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}
    </div>
  );
}
