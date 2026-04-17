import Link from "next/link";

const MOCK_EMPLOYEES = [
  { id: "1", name: "Adenilson Ferreira", role: "Operador de Serra", status: "Ativo", admission: "10/05/2021", department: "Produção" },
  { id: "2", name: "Andrey Silva", role: "Auxiliar Administrativo", status: "Férias", admission: "14/08/2023", department: "Administração" },
  { id: "3", name: "Ricardo Aparecido", role: "Operador de Empilhadeira", status: "Ativo", admission: "03/11/2020", department: "Logística" },
  { id: "4", name: "Célio Batista", role: "Motorista", status: "Ativo", admission: "22/02/2019", department: "Transportes" },
  { id: "5", name: "Nelson Souza", role: "Encarregado Geral", status: "Ativo", admission: "15/01/2018", department: "Produção" },
  { id: "6", name: "Rosana Santos", role: "Aux. Limpeza", status: "Afastado", admission: "05/09/2024", department: "Manutenção" },
];

export default function HumanResourcesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1"><span className="text-primary-500">Recursos</span> Humanos</h1>
          <p className="text-slate-400 text-sm uppercase tracking-wide">Gestão de Equipe e Pagamentos</p>
        </div>
        <div className="text-right">
          <Link href="/rh/novo" className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-lg shadow-primary-500/30">
            + Novo Funcionário
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Ativos" value="48" icon="👥" color="text-blue-400" />
        <StatCard title="Em Férias/Afastados" value="4" icon="🏖️" color="text-amber-400" />
        <StatCard title="Média Salarial Base" value="R$ 2.450" icon="💰" color="text-emerald-400" />
      </div>

      <div className="glass-panel overflow-hidden border-t-4 border-t-primary-500">
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h3 className="font-heading font-semibold text-lg text-white">Quadro de Funcionários</h3>
          <input 
            type="text" 
            placeholder="Buscar por nome ou cargo..." 
            className="input-glass w-64"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4 font-medium border-b border-white/5">Colaborador</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Cargo / Dept.</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Admissão</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Status</th>
                <th className="px-6 py-4 font-medium border-b border-white/5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm content-center">
              {MOCK_EMPLOYEES.map((emp) => (
                <tr key={emp.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200 group-hover:text-primary-300 transition-colors">{emp.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-300">{emp.role}</div>
                    <div className="text-xs text-slate-500">{emp.department}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{emp.admission}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${emp.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        emp.status === 'Férias' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-white px-2 transition-colors">Visualizar</button>
                    <button className="text-slate-400 hover:text-primary-400 px-2 transition-colors">Gerar Vale</button>
                    <button className="text-slate-400 hover:text-rose-400 px-2 pr-0 transition-colors">Holerite</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string, icon: string, color: string }) {
  return (
    <div className="glass-panel p-5 relative overflow-hidden group">
      <div className="absolute -right-2 top-1 text-5xl opacity-[0.03] group-hover:scale-110 transition-transform duration-500 pointer-events-none grayscale">
        {icon}
      </div>
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        <div className={`text-sm ${color}`}>{icon}</div>
      </div>
      <h4 className="text-3xl font-bold text-white">{value}</h4>
    </div>
  );
}
