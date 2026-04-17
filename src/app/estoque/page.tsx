import Link from "next/link";

const MOCK_ESTOQUE = [
  { id: "PAC-001", bitola: "2.5 x 10", comp: "2.50m", dtProducao: "15/04/2026", pcs: 120, volume: "0.75 m³", status: "Liberado" },
  { id: "PAC-002", bitola: "5.0 x 15", comp: "3.00m", dtProducao: "16/04/2026", pcs: 84, volume: "1.89 m³", status: "Secagem" },
  { id: "PAC-003", bitola: "3.0 x 12", comp: "2.00m", dtProducao: "14/04/2026", pcs: 150, volume: "1.08 m³", status: "Vendido" },
  { id: "PAC-004", bitola: "2.0 x 5", comp: "1.50m", dtProducao: "17/04/2026", pcs: 300, volume: "0.45 m³", status: "Liberado" },
];

export default function EstoquePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1"><span className="text-primary-500">Estoque</span> Madeira Serrada</h1>
          <p className="text-slate-400 text-sm uppercase tracking-wide">Controle de Pacotes e Produção Acabada</p>
        </div>
        <div className="text-right">
          <Link href="/estoque/novo" className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-lg shadow-primary-500/30">
            + Produzir Pacote (Fardo)
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Estoque Total" value="125 m³" icon="🧊" color="text-emerald-400" />
        <StatCard title="Pacotes Disponíveis" value="142" icon="📦" color="text-blue-400" />
        <StatCard title="Em Secagem" value="15" icon="☀️" color="text-amber-400" />
        <StatCard title="Subprodutos (Cavaco)" value="22 m³" icon="🍂" color="text-orange-400" />
      </div>

      <div className="glass-panel overflow-hidden border-t-4 border-t-primary-500">
        <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-white/10 gap-4">
          <h3 className="font-heading font-semibold text-lg text-white">Listagem de Fardos</h3>
          <div className="flex gap-2">
            <select className="input-glass bg-black/40">
              <option value="">Todas Bitolas</option>
              <option value="2.5x10">2.5 x 10</option>
              <option value="5x15">5.0 x 15</option>
            </select>
            <input 
              type="text" 
              placeholder="Buscar ID ou Bitola..." 
              className="input-glass w-64"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4 font-medium border-b border-white/5">ID Pacote</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Bitola (Esp x Lar)</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Comprimento</th>
                <th className="px-6 py-4 font-medium border-b border-white/5 text-center">Peças</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">M³ Total</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Data Prod.</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Status</th>
                <th className="px-6 py-4 font-medium border-b border-white/5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {MOCK_ESTOQUE.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                  <td className="px-6 py-4 font-medium text-primary-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                      {item.id}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{item.bitola}</td>
                  <td className="px-6 py-4 text-slate-300">{item.comp}</td>
                  <td className="px-6 py-4 text-center font-mono text-slate-300 bg-white/5 rounded mx-2">{item.pcs}</td>
                  <td className="px-6 py-4 font-bold text-primary-400">{item.volume}</td>
                  <td className="px-6 py-4 text-slate-400">{item.dtProducao}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider
                      ${item.status === 'Liberado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        item.status === 'Secagem' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                        'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-white px-2 transition-colors" title="Ver Detalhes">🔍</button>
                    <button className="text-slate-400 hover:text-primary-400 px-2 transition-colors" title="Imprimir Etiqueta">🏷️</button>
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
