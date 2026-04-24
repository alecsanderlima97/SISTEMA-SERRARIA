'use client'

import { useEffect, useState } from 'react'
import { getVeiculos, Veiculo } from '@/services/db/frota'
import Link from 'next/link'
import { Plus, Search, Truck, Settings, ArrowRight } from 'lucide-react'

export default function ListagemFrota() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function load() {
      const data = await getVeiculos()
      setVeiculos(data)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = veiculos.filter(v => 
    v.identificacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Gerenciamento de <span className="text-primary-600">Frota</span>
          </h1>
          <p className="text-slate-500 mt-1">Visualize e gerencie todos os veículos e máquinas da empresa.</p>
        </div>
        
        <Link href="/frota/novo" className="btn-primary flex items-center justify-center gap-2 group">
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          Novo Veículo
        </Link>
      </div>

      {/* Filtros e Busca */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por placa, prefixo ou modelo..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(veiculo => (
            <div key={veiculo.id} className="card group hover:scale-[1.02] transition-all duration-500">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl group-hover:bg-primary-600 group-hover:text-white transition-colors duration-500">
                  <Truck size={24} />
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    veiculo.categoria === 'SERRARIA' ? 'bg-blue-100 text-blue-700' :
                    veiculo.categoria === 'FLORESTAL' ? 'bg-green-100 text-green-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {veiculo.categoria || 'NÃO DEFINIDO'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">{veiculo.identificacao}</h3>
                <p className="text-sm text-slate-500">{veiculo.modelo} • {veiculo.tipoCombustivel.toUpperCase()}</p>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</p>
                  <p className="text-lg font-bold text-slate-700">
                    {veiculo.tipo === 'maquina' 
                      ? `${veiculo.horimetroAtual || 0}h` 
                      : `${veiculo.hodometroAtual || 0}km`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média Esperada</p>
                  <p className="text-lg font-bold text-slate-700">
                    {veiculo.mediaEsperada || '--'}
                    <span className="text-[10px] ml-1 text-slate-400 font-medium lowercase">
                      {veiculo.tipo === 'maquina' ? 'L/H' : 'KM/L'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                  <Settings size={20} />
                </button>
                <Link 
                  href={`/frota/veiculo/${veiculo.id}`}
                  className="flex items-center gap-2 text-primary-600 font-bold text-sm hover:gap-3 transition-all"
                >
                  Ver Detalhes
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Truck size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">Nenhum veículo encontrado</h3>
          <p className="text-slate-500">Tente ajustar sua busca ou cadastrar um novo veículo.</p>
        </div>
      )}
    </div>
  )
}
