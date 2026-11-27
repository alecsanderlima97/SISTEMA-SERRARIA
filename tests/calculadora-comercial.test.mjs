import assert from 'node:assert/strict';
import { calculateCommercialSimulation, COMMERCIAL_MODES, parseDecimal, resolveClientPrice } from '../js/calculadora-comercial-core.mjs';

assert.equal(parseDecimal('R$ 1.010,00'), 1010);
assert.equal(parseDecimal('9,3'), 9.3);
assert.equal(parseDecimal('1.010'), 1010);
assert.equal(resolveClientPrice({ madeira1: 'R$ 1.010,00', madeira2: 675 }, 'Madeira de primeira'), 1010);
assert.equal(resolveClientPrice({ madeira1: 1010, madeira2: 675 }, 'Madeira de segunda'), 675);
assert.equal(resolveClientPrice({ madeiraPinus: 800 }, 'Pinus'), 800);
assert.equal(resolveClientPrice({ nomeMadeiraExtra: 'Cedro', valorMadeiraExtra: '160,00' }, 'Cedro especial'), 160);

const base = {
    taxaPercentual: '9,3',
    descontoPercentual: '0',
    frete: '110,00',
    outrasDespesas: '10,00',
    itens: [{ produto: 'Madeira de primeira', precoOriginal: '1.010,00', quantidade: '2,5' }]
};

const simple = calculateCommercialSimulation({ ...base, modalidade: COMMERCIAL_MODES.SIMPLE });
assert.equal(simple.precoFinalPorM3, 1103.93);
assert.equal(simple.impostosTotal, 234.83);
assert.equal(simple.totalOperacao, 2879.83);
assert.equal(simple.volumeTotal, 2.5);
assert.ok(simple.comparacao.acrescimoSimples);
assert.ok(simple.comparacao.preservacaoLiquido);

const preserve = calculateCommercialSimulation({ ...base, modalidade: COMMERCIAL_MODES.PRESERVE });
assert.equal(preserve.precoFinalPorM3, 1113.56);
assert.equal(preserve.erros.length, 0);

const discount = calculateCommercialSimulation({ ...base, modalidade: COMMERCIAL_MODES.DISCOUNT, descontoPercentual: '10' });
assert.equal(discount.precoFinalPorM3, 909);
assert.equal(discount.descontoTotal, 252.5);

const adjustment = calculateCommercialSimulation({ ...base, modalidade: COMMERCIAL_MODES.ADJUSTMENT, precoAntigo: '900', precoNovo: '990' });
assert.equal(adjustment.reajustePercentual, 10);
assert.equal(adjustment.precoFinalPorM3, 990);

const reverse = calculateCommercialSimulation({ ...base, modalidade: COMMERCIAL_MODES.REVERSE, precoFinalReverso: '1100' });
assert.equal(reverse.valorLiquidoPorM3, 997.7);
assert.equal(reverse.erros.length, 0);

const invalidPreserve = calculateCommercialSimulation({ ...base, modalidade: COMMERCIAL_MODES.PRESERVE, taxaPercentual: '100' });
assert.ok(invalidPreserve.erros.some(error => error.includes('abaixo de 100%')));

console.log('calculadora-comercial: testes de fórmulas passaram');
