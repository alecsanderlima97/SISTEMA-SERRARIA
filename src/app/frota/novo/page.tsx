"use client";

import { useState } from "react";
import { Truck, Save, ArrowLeft, Construction, Car, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createVeiculo, Veiculo } from "@/services/db/frota";

export default function NovoVeiculoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<Veiculo, 'id' | 'createdAt'>>({
    identificacao: "",
    tipo: "caminhao",
    modelo: "",
    marca: "",
    ano: new Date().getFullYear(),
    tipoCombustivel: "diesel",
    horimetroInicial: 0,
    hodometroInicial: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await createVeiculo(formData);
    if (result.success) {
      router.push("/frota");
    } else {
      alert("Erro ao cadastrar veículo.");
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
          <h1 className="text-3xl font-heading font-black text-white tracking-tight">Novo Veículo</h1>
          <p className="text-slate-400">Cadastre um caminhão ou máquina na frota.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-8">
          {/* Seleção de Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setFormData({...formData, tipo: 'caminhao'})}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                formData.tipo === 'caminhao' 
                ? "border-primary-500 bg-primary-500/10 text-primary-400" 
                : "border-white/5 bg-white/5 text-slate-400 hover:border-white/20"
              }`}
            >
              <Truck size={32} />
              <span className="font-bold">Caminhão</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, tipo: 'maquina'})}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                formData.tipo === 'maquina' 
                ? "border-blue-500 bg-blue-500/10 text-blue-400" 
                : "border-white/5 bg-white/5 text-slate-400 hover:border-white/20"
              }`}
            >
              <Construction size={32} />
              <span className="font-bold">Máquina</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, tipo: 'utilitario'})}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                formData.tipo === 'utilitario' 
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" 
                : "border-white/5 bg-white/5 text-slate-400 hover:border-white/20"
              }`}
            >
              <Car size={32} />
              <span className="font-bold">Utilitário / Carro</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Placa ou Prefixo</label>
              <input
                required
                type="text"
                placeholder="Ex: ABC-1234 ou TR-01"
                className="input-field"
                value={formData.identificacao}
                onChange={(e) => setFormData({...formData, identificacao: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Tipo de Combustível</label>
              <select
                className="input-field"
                value={formData.tipoCombustivel}
                onChange={(e) => setFormData({...formData, tipoCombustivel: e.target.value as any})}
              >
                <option value="diesel">Diesel</option>
                <option value="gasolina">Gasolina</option>
                <option value="flex">Flex</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Marca</label>
              <input
                type="text"
                placeholder="Ex: Volvo, Caterpillar, Toyota"
                className="input-field"
                value={formData.marca}
                onChange={(e) => setFormData({...formData, marca: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Modelo</label>
              <input
                required
                type="text"
                placeholder="Ex: FH 540, 320D"
                className="input-field"
                value={formData.modelo}
                onChange={(e) => setFormData({...formData, modelo: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Horímetro / Hodômetro Inicial</label>
              <input
                type="number"
                className="input-field"
                value={formData.tipo === 'maquina' ? formData.horimetroInicial : formData.hodometroInicial}
                onChange={(e) => setFormData({
                  ...formData, 
                  horimetroInicial: formData.tipo === 'maquina' ? Number(e.target.value) : 0,
                  hodometroInicial: formData.tipo !== 'maquina' ? Number(e.target.value) : 0
                })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Média Esperada (KM/L ou L/H)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 2.5"
                className="input-field"
                value={formData.mediaEsperada || ""}
                onChange={(e) => setFormData({...formData, mediaEsperada: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Categoria</label>
              <select
                className="input-field"
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value as any})}
              >
                <option value="">Selecione...</option>
                <option value="SERRARIA">Serraria</option>
                <option value="FLORESTAL">Florestal</option>
                <option value="TERRAPLANAGEM">Terraplanagem</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Ano</label>
              <input
                type="number"
                className="input-field"
                value={formData.ano}
                onChange={(e) => setFormData({...formData, ano: Number(e.target.value)})}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            disabled={loading}
            type="submit"
            className="btn-primary w-full md:w-auto px-12 py-4 text-lg"
          >
            {loading ? "Cadastrando..." : (
              <span className="flex items-center gap-2">
                <Save size={20} />
                Cadastrar Veículo
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
