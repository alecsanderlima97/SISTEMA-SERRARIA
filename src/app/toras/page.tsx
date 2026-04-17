import Link from "next/link";

const MOCK_TORAS = [
  { id: "TR-001", data: "17/04/2026", fornecedor: "Agroflorestal São Jorge", placa: "ABC-1234", volume: "32.5 m³", status: "Processado" },
  { id: "TR-002", data: "17/04/2026", fornecedor: "Madeireira do Vale", placa: "XYZ-9876", volume: "45.0 m³", status: "Pátio" },
  { id: "TR-003", data: "16/04/2026", fornecedor: "Fazenda Esperança", placa: "DEF-5678", volume: "28.3 m³", status: "Processado" },
];

export default function TorasPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1"><span className="text-primary-500">Entrada</span> de Toras</h1>
          <p className="text-slate-400 text-sm uppercase tracking-wide">Gestão de Matéria Prima e Romaneios</p>
        </div>
        <div className="text-right">
          <Link href="/toras/nova" className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-lg shadow-primary-500/30">
            + Registrar Nova Carga
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Estoque no Pátio (M³)" value="894.5" icon="🪵" color="text-amber-400" />
        <StatCard title="Entradas (Hoje)" value="3 Cargas" icon="🚚" color="text-blue-400" />
        <StatCard title="Desembolso Est." value="R$ 14.500" icon="💸" color="text-rose-400" />
      </div>

      <div className="glass-panel overflow-hidden border-t-4 border-t-primary-500">
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h3 className="font-heading font-semibold text-lg text-white">Últimos Romaneios Recebidos</h3>
          <input 
            type="text" 
            placeholder="Buscar PLACA ou Fornecedor..." 
            className="input-glass w-64"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4 font-medium border-b border-white/5">Nº Romaneio</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Data</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Fornecedor</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Placa</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Volume Útil</th>
                <th className="px-6 py-4 font-medium border-b border-white/5">Status</th>
                <th className="px-6 py-4 font-medium border-b border-white/5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm content-center">
              {MOCK_TORAS.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                  <td className="px-6 py-4 font-medium text-primary-300">{item.id}</td>
                  <td className="px-6 py-4 text-slate-400">{item.data}</td>
                  <td className="px-6 py-4 text-slate-200">{item.fornecedor}</td>
                  <td className="px-6 py-4 text-slate-300 font-mono bg-black/20 ml-6 inline-block mt-2 px-2 py-1 rounded">{item.placa}</td>
                  <td className="px-6 py-4 font-bold text-white">{item.volume}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${item.status === 'Processado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-white px-2 transition-colors">Visualizar</button>
                    <button className="text-slate-400 hover:text-primary-400 px-2 transition-colors">Imprimir</button>
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
