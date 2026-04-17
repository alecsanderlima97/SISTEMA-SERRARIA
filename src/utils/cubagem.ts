/**
 * src/utils/cubagem.ts
 * Utilitários matemáticos para os cálculos da Serraria baseados no legado.
 */

// 1. Cubagem Rápida (Peças Individuais de Madeira Serrada)
export function calcularVolumePecas(
    espessuraCm: number,
    larguraCm: number,
    comprimentoM: number,
    quantidade: number = 1
  ): { volumeUnitario: number; volumeTotal: number } {
    if (!espessuraCm || !larguraCm || !comprimentoM) {
      return { volumeUnitario: 0, volumeTotal: 0 };
    }
  
    const volUni = (espessuraCm / 100) * (larguraCm / 100) * comprimentoM;
    const volTotal = volUni * quantidade;
  
    return {
      volumeUnitario: Number(volUni.toFixed(4)),
      volumeTotal: Number(volTotal.toFixed(4)),
    };
  }
  
  // 2. Cálculo de Fardo Completo
  export function calcularVolumeFardo(
    espessuraCm: number,
    larguraCm: number,
    comprimentoM: number,
    altPecas: number,
    larPecas: number,
    amarras: number = 0
  ): { quantidadeTotal: number; volumeTotal: number } {
    if (!espessuraCm || !larguraCm || !comprimentoM || (!altPecas && !larPecas)) {
      return { quantidadeTotal: 0, volumeTotal: 0 };
    }
  
    const qtdTotal = altPecas * larPecas + amarras;
    const volUni = (espessuraCm / 100) * (larguraCm / 100) * comprimentoM;
    const volTotal = volUni * qtdTotal;
  
    return {
      quantidadeTotal: qtdTotal,
      volumeTotal: Number(volTotal.toFixed(4)),
    };
  }
  
  // 3. Calculadora de Frete
  export function calcularFrete(
    volumeM3: number,
    valorPorM3: number,
    custoExtra: number = 0
  ): number {
    return volumeM3 * valorPorM3 + custoExtra;
  }
  
  // 4. Transformação de Medidas de Cavaco/Pó (Subprodutos)
  export function calcularVolumeSubproduto(
    compM: number,
    largM: number,
    altM: number
  ): number {
    if (!compM || !largM || !altM) return 0;
    return Number((compM * largM * altM).toFixed(3));
  }
  
