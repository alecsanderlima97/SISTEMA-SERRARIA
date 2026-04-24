"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, UserPlus, Calculator, Calendar, Search, MoreVertical, FileText, Banknote } from "lucide-react";
import { getFuncionarios, Funcionario } from "@/services/db/rh";

export default function HumanResourcesPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadData() {
      const data = await getFuncionarios();
      setFuncionarios(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const filtered = funcionarios.filter(f => 
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: funcionarios.length,
    ativos: funcionarios.filter(f => f.status === 'ativo').length,
    afastados: funcionarios.filter(f => f.status === 'afastado').length,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Recursos Humanos</h1>
          <p className="text-slate-400">Gestão de colaboradores, cargos e folha de pagamento.</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/rh/folha"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl font-bold transition-all border border-white/10"
          >
            <Calculator size={20} className="text-primary-400" />
            Folha de Pagamento
          </Link>
          <Link 
            href="/rh/novo"
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary-900/20 active:scale-95"
          >
            <UserPlus size={20} />
            Novo Funcionário
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RHStatCard title="Total Colaboradores" value={stats.total} icon={<Users />} color="primary" />
        <RHStatCard title="Funcionários Ativos" value={stats.ativos} icon={<Calendar />} color="emerald" />
        <RHStatCard title="Em Férias/Afastados" value={stats.afastados} icon={<FileText />} color="amber" />
      </div>

      {/* Quadro de Funcionários */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-lg text-white">Quadro de Colaboradores</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar colaborador..."
              className="bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary-500 transition-all w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-xs uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Cargo / Dept.</th>
                <th className="px-6 py-4">Admissão</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Carregando quadro...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Nenhum funcionário encontrado.</td>
                </tr>
              ) : (
                filtered.map((func) => (
                  <tr key={func.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400 font-bold border border-primary-500/20">
                          {func.nome.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-white group-hover:text-primary-300 transition-colors">{func.nome}</div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-tighter">{func.cpf}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-300 font-medium">{func.cargo}</div>
                      <div className="text-xs text-slate-500">{func.tipoContrato}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                      {new Date(func.dataAdmissao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <RHStatusBadge status={func.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link 
                          href={`/rh/holerite/${func.id}`}
                          className="p-2 hover:bg-primary-500/20 text-slate-400 hover:text-primary-400 rounded-lg transition-all"
                          title="Gerar Holerite"
                        >
                          <Banknote size={18} />
                        </Link>
                        <button className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all">
                          <MoreVertical size={18} />
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

function RHStatCard({ title, value, icon, color }: any) {
  const colors: any = {
    primary: "border-primary-500/20 bg-primary-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
  };

  return (
    <div className={`p-6 rounded-2xl border ${colors[color]} backdrop-blur-sm relative overflow-hidden group`}>
      <div className="absolute -right-4 -bottom-4 text-white/5 group-hover:text-white/10 transition-colors">
        {icon && <div className="w-24 h-24">{icon}</div>}
      </div>
      <div className="relative z-10">
        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</div>
        <div className="text-4xl font-black text-white">{value}</div>
      </div>
    </div>
  );
}

function RHStatusBadge({ status }: { status: string }) {
  const configs: any = {
    ativo: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    ferias: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    afastado: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    desligado: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${configs[status] || configs.desligado}`}>
      {status}
    </span>
  );
}
