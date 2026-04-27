"use client";

import { useState, useEffect } from "react";
import { Truck, Save, ArrowLeft, Construction, Car, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { getVeiculos, updateVeiculo, Veiculo } from "@/services/db/frota";

export default function EditarVeiculoPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Omit<Veiculo, 'id' | 'createdAt'>>({
    identificacao: "",
    tipo: "caminhao",
    modelo: "",
    marca: "",
    ano: new Date().getFullYear(),
    tipoCombustivel: "diesel",
    horimetroInicial: 0,
    hodometroInicial: 0,
    mediaEsperada: 0,
    categoria: "SERRARIA"
  });

  useEffect(() => {
    async function load() {
      if (!id) return;
      const all = await getVeiculos();
      const found = all.find(v => v.id === id);
      if (found) {
        setFormData({
          identificacao: found.identificacao,
          tipo: found.tipo,
          modelo: found.modelo,
          marca: found.marca || "",
          ano: found.ano || new Date().getFullYear(),
          tipoCombustivel: found.tipoCombustivel,
          horimetroInicial: found.horimetroInicial || 0,
          hodometroInicial: found.hodometroInicial || 0,
          mediaEsperada: found.mediaEsperada || 0,
          categoria: found.categoria || "SERRARIA"
        });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateVeiculo(id as string, formData);
    if (result.success) {
      router.push(`/frota/veiculo/${id}`);
    } else {
      alert("Erro ao atualizar veículo.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary-500" size={48} />
        <p className="text-slate-400 font-bold">Carregando dados do veículo...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500 pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-heading font-black text-white tracking-tight">Editar Veículo</h1>
          <p className="text-slate-400">Atualize as informações do veículo <span className="text-white font-bold">{formData.identificacao}</span>.</p>
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
                className="input-field"
                value={formData.modelo}
                onChange={(e) => setFormData({...formData, modelo: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Média Esperada (KM/L ou L/H)</label>
              <input
                type="number"
                step="0.01"
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

        <div className="flex justify-end gap-4">
          <Link href={`/frota/veiculo/${id}`} className="px-12 py-4 text-slate-400 font-bold hover:text-white transition-colors">
            Cancelar
          </Link>
          <button
            disabled={saving}
            type="submit"
            className="btn-primary w-full md:w-auto px-12 py-4 text-lg"
          >
            {saving ? "Salvando..." : (
              <span className="flex items-center gap-2">
                <Save size={20} />
                Salvar Alterações
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
