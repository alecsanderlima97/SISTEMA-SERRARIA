import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, setDoc } from 'firebase/firestore';
const env = await initializeTestEnvironment({ projectId: 'demo-serraria', firestore: { rules: readFileSync(process.argv[2] || new URL('../firestore.rules', import.meta.url),'utf8'), host:'127.0.0.1', port:8089 } });
const users = {
  admin: { cargo:'ADMIN', email:'a@x.com' },
  pendente: { cargo:'PENDENTE', email:'p@x.com' },
  bloqueado: { cargo:'gerente', acessoBloqueado:true, email:'b@x.com' },
  empilha_custom: { cargo:'EMPILHADERISTA', email:'e@x.com', permissoes:{ allowedSections:['view-dashboard'], allowedSubsections:{'view-dashboard':['fluxo-patio']}, writeSections:['view-dashboard'] } },
  empilha_role: { cargo:'EMPILHADERISTA', email:'e2@x.com' },
  romaneio_custom: { cargo:'VENDEDOR', email:'r@x.com', permissoes:{ allowedSections:['view-romaneio-v2'], writeSections:['view-romaneio-v2'] } },
  financeiro_custom: { cargo:'ESCRITORIO', email:'f@x.com', permissoes:{ allowedSections:['view-financeiro','view-dashboard'], writeSections:['view-financeiro'] } },
  frota_custom: { cargo:'MOTORISTA', email:'m@x.com', permissoes:{ allowedSections:['view-frotas'], writeSections:['view-frotas'] } },
  muqueiro: { cargo:'muqueiro', email:'q@x.com' },
  mecanico: { cargo:'mecanico', email:'k@x.com' },
  patrao: { cargo:'patrao', email:'t@x.com' },
  paletes_custom: { cargo:'PALETEIRO', email:'pl@x.com', permissoes:{ allowedSections:['view-paletes'], writeSections:['view-paletes'] } },
  gerente: { cargo:'gerente', email:'g@x.com' },
};
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  for (const [id,u] of Object.entries(users)) await setDoc(doc(db,'usuarios',id), u);
  for (const col of ['financeiro_lancamentos','funcionarios','patio_relatorios','clientes','produtos','romaneios','transportes','estoque','frotas','frota_relatos','entradas','fechamentos_salvos','contas_receber','configuracoes_sistema','estoque_config','romaneios_paletes','paletes_movimentos'])
    await setDoc(doc(db,col,'d1'), { x:1 });
});
const cases = [
  // [user, op, collection, expected]
  ['anon','r','financeiro_lancamentos',false],
  ['pendente','r','financeiro_lancamentos',false], ['pendente','w','financeiro_lancamentos',false], ['pendente','r','funcionarios',false], ['pendente','r','clientes',false],
  ['bloqueado','r','financeiro_lancamentos',false],
  ['admin','r','financeiro_lancamentos',true], ['admin','w','funcionarios',true],
  ['empilha_custom','r','patio_relatorios',true], ['empilha_custom','w','patio_relatorios',true], ['empilha_custom','r','produtos',true],
  ['empilha_custom','r','financeiro_lancamentos',false], ['empilha_custom','r','funcionarios',false],
  ['empilha_role','r','patio_relatorios',true], ['empilha_role','w','patio_relatorios',true], ['empilha_role','r','financeiro_lancamentos',false],
  ['romaneio_custom','r','clientes',true], ['romaneio_custom','r','produtos',true], ['romaneio_custom','r','transportes',true], ['romaneio_custom','w','patio_relatorios',true], ['romaneio_custom','w','contas_receber',true], ['romaneio_custom','w','produtos',true],
  ['romaneio_custom','r','financeiro_lancamentos',false],
  ['financeiro_custom','r','financeiro_lancamentos',true], ['financeiro_custom','w','financeiro_lancamentos',true], ['financeiro_custom','r','funcionarios',true],
  ['frota_custom','w','frota_relatos',true], ['frota_custom','w','estoque',true], ['frota_custom','w','financeiro_lancamentos',true], ['frota_custom','r','funcionarios',false],
  ['muqueiro','w','entradas',true], ['muqueiro','w','fechamentos_salvos',true], ['muqueiro','r','frotas',true], ['muqueiro','r','financeiro_lancamentos',false],
  ['mecanico','w','frota_relatos',true], ['mecanico','r','funcionarios',false],
  ['patrao','r','financeiro_lancamentos',true], ['patrao','w','financeiro_lancamentos',false],
  ['admin','w','configuracoes_sistema',true], ['muqueiro','r','configuracoes_sistema',true], ['muqueiro','w','configuracoes_sistema',false], ['pendente','r','configuracoes_sistema',false],
  ['frota_custom','w','estoque_config',true], ['romaneio_custom','w','estoque_config',false],
  // modulo paletes
  ['anon','r','romaneios_paletes',false], ['pendente','w','paletes_movimentos',false], ['muqueiro','r','romaneios_paletes',false],
  ['gerente','w','romaneios_paletes',true], ['gerente','w','paletes_movimentos',true],
  ['romaneio_custom','w','romaneios_paletes',true], ['romaneio_custom','w','paletes_movimentos',true],
  ['paletes_custom','w','paletes_movimentos',true], ['paletes_custom','r','romaneios_paletes',false], ['paletes_custom','w','patio_relatorios',false], ['paletes_custom','r','produtos',true],
  ['financeiro_custom','r','romaneios_paletes',true], ['frota_custom','r','romaneios_paletes',false],
];
let fail=0;
for (const [u,op,col,exp] of cases) {
  const ctx = u==='anon' ? env.unauthenticatedContext() : env.authenticatedContext(u, { email: users[u].email });
  const db = ctx.firestore(); const ref = doc(db,col,'d1');
  const p = op==='r' ? getDoc(ref) : setDoc(ref,{x:2},{merge:true});
  try { await (exp?assertSucceeds:assertFails)(p); console.log('ok  ',u,op,col,exp); } catch(e){ fail++; console.log('FAIL',u,op,col,'esperado',exp); }
}
console.log('falhas:',fail); await env.cleanup(); process.exit(fail?1:0);
