"use client";

import { useState, useEffect } from "react";
import { 
  Fuel, Droplet, ArrowLeft, Save, 
  MapPin, Database, Truck, Construction,
  Calendar, Gauge, DollarSign
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getVeiculos, Veiculo } from "@/services/db/frota";
import { createRegistroConsumo, getTanqueStatus, RegistroConsumo } from "@/services/db/consumo";

export default function ConsumoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [tanqueDisponivel, setTanqueDisponivel] = useState(0);

  const [formData, setFormData] = useState<Omit<RegistroConsumo, 'id' | 'createdAt'>>({
    veiculoId: "",
    identificacaoVeiculo: "",
    tipo: "abastecimento",
    origem: "tanque_interno",
    produto: "Diesel S10",
    quantidade: 0,
    km_horas: 0,
    data: new Date().toISOString().split('T')[0],
    valorUnitario: 0,
    valorTotal: 0
  });

  useEffect(() => {
    async function loadData() {
      const [vData, tData] = await Promise.all([
        getVeiculos(),
        getTanqueStatus()
      ]);
      setVeiculos(vData);
      setTanqueDisponivel(tData.saldoAtual);
    }
    loadData();
  }, []);

  const handleVeiculoChange = (id: string) => {
    const v = veiculos.find(x => x.id === id);
    setFormData({
      ...formData,
      veiculoId: id,
      identificacaoVeiculo: v ? `${v.identificacao} - ${v.modelo}` : ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.veiculoId) return alert("Selecione um veículo.");
    if (formData.quantidade <= 0) return alert("Quantidade deve ser maior que zero.");
    
    if (formData.tipo === 'abastecimento' && formData.origem === 'tanque_interno' && formData.quantidade > tanqueDisponivel) {
      return alert("Saldo insuficiente no tanque interno!");
    }

    setLoading(true);
    const result = await createRegistroConsumo(formData);
    if (result.success) {
      router.push("/frota");
    } else {
      alert("Erro ao salvar registro.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center gap-4">
        <Link href="/frota" className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-heading font-black text-white tracking-tight">Lançar Consumo</h1>
          <p className="text-slate-400">Abastecimento ou troca de lubrificantes.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-8">
          
          {/* Seleção de Tipo de Consumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({...formData, tipo: 'abastecimento', produto: 'Diesel S10'})}
              className={`p-6 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                formData.tipo === 'abastecimento' 
                ? "border-primary-500 bg-primary-500/10 text-primary-400" 
                : "border-white/5 bg-white/5 text-slate-400"
              }`}
            >
              <Fuel size={32} />
              <div className="text-left">
                <span className="font-bold block text-lg">Abastecimento</span>
                <span className="text-xs opacity-60">Diesel ou Gasolina</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, tipo: 'lubrificante', produto: 'Óleo Motor 15W40'})}
              className={`p-6 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                formData.tipo === 'lubrificante' 
                ? "border-purple-500 bg-purple-500/10 text-purple-400" 
                : "border-white/5 bg-white/5 text-slate-400"
              }`}
            >
              <Droplet size={32} />
              <div className="text-left">
                <span className="font-bold block text-lg">Lubrificante</span>
                <span className="text-xs opacity-60">Óleo Motor, Hidráulico, etc.</span>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Veículo / Máquina</label>
              <select
                required
                className="input-field"
                value={formData.veiculoId}
                onChange={(e) => handleVeiculoChange(e.target.value)}
              >
                <option value="">Selecione...</option>
                {veiculos.map(v => (
                  <option key={v.id} value={v.id}>{v.identificacao} - {v.modelo}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Origem</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, origem: 'tanque_interno'})}
                  className={`flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                    formData.origem === 'tanque_interno'
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-white/5 bg-white/5 text-slate-500"
                  }`}
                >
                  <Database size={18} />
                  <span className="font-bold">Serraria</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, origem: 'posto_externo'})}
                  className={`flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                    formData.origem === 'posto_externo'
                    ? "border-orange-500 bg-orange-500/10 text-orange-400"
                    : "border-white/5 bg-white/5 text-slate-500"
                  }`}
                >
                  <MapPin size={18} />
                  <span className="font-bold">Posto</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Produto</label>
              <input
                required
                type="text"
                placeholder="Ex: Diesel S10, Óleo Motor"
                className="input-field"
                value={formData.produto}
                onChange={(e) => setFormData({...formData, produto: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Quantidade (L)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({...formData, quantidade: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Hodômetro / Horímetro</label>
                <input
                  required
                  type="number"
                  className="input-field"
                  value={formData.km_horas}
                  onChange={(e) => setFormData({...formData, km_horas: Number(e.target.value)})}
                />
              </div>
            </div>

            {formData.origem === 'posto_externo' && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Valor Total (R$)</label>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    step="0.01"
                    className="input-field pl-12"
                    value={formData.valorTotal}
                    onChange={(e) => setFormData({...formData, valorTotal: Number(e.target.value)})}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Data</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="date"
                  className="input-field pl-12"
                  value={formData.data}
                  onChange={(e) => setFormData({...formData, data: e.target.value})}
                />
              </div>
            </div>
          </div>

          {formData.origem === 'tanque_interno' && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database size={20} className="text-blue-400" />
                <span className="text-blue-400 font-bold">Disponível no Tanque:</span>
              </div>
              <span className="text-white font-black text-xl">{tanqueDisponivel.toLocaleString()}L</span>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            disabled={loading}
            type="submit"
            className="btn-primary w-full md:w-auto px-12 py-4 text-lg"
          >
            {loading ? "Salvando..." : (
              <span className="flex items-center gap-2">
                <Save size={20} />
                Registrar Consumo
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
