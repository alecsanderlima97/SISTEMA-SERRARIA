import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, limit, setDoc, onSnapshot, runTransaction } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithRedirect, signInWithPopup, getRedirectResult, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJBUSmLTTvBriPk4R_Mt4zQq4w9CoP-pk",
  authDomain: "serraria-bcf36.firebaseapp.com",
  projectId: "serraria-bcf36",
  storageBucket: "serraria-bcf36.firebasestorage.app",
  messagingSenderId: "355769974863",
  appId: "1:355769974863:web:68db0137d160ef3a63ea3a",
  measurementId: "G-4RQ1ENFE9S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function reautenticarUsuarioAtual(senha) {
    const user = auth.currentUser;
    if (!user?.email) {
        throw new Error('Usuário autenticado não encontrado. Faça login novamente.');
    }
    const senhaLimpa = (senha || '').trim();
    const credential = EmailAuthProvider.credential(user.email, senhaLimpa);
    await reauthenticateWithCredential(user, credential);
    return true;
}

window.confirmarExclusaoComSenha = async function(mensagemConfirmacao = 'Deseja realmente excluir este registro?', mensagemSenha = 'Digite sua senha de login para confirmar a exclusao:') {
    if (!confirm(mensagemConfirmacao)) return false;

    const senha = prompt(mensagemSenha);
    if (!senha) return false;

    try {
        await reautenticarUsuarioAtual(senha);
        return true;
    } catch (error) {
        console.error('Falha ao validar senha para exclusao:', error);

        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert('Senha incorreta. Exclusao cancelada.');
            return false;
        }

        if (error.code === 'auth/requires-recent-login') {
            alert('Por seguranca, entre novamente no sistema e tente excluir logo em seguida.');
            return false;
        }

        alert('Nao foi possivel validar a senha. Exclusao cancelada.');
        return false;
    }
};

const DEFAULT_EMPRESA_ID = 'vanmarte';
const CLOUD_SNAPSHOT_COLLECTIONS = [
    'produtos',
    'clientes',
    'transportes',
    'romaneios',
    'entradas',
    'empreiteiros',
    'vendas_subprodutos',
    'estoque',
    'estoque_movimentacoes',
    'frotas',
    'frota_abastecimentos',
    'frota_manutencoes',
    'financeiro_lancamentos',
    'financeiro_relatorios_mensais',
    'patio_relatorios',
    'agenda',
    'auditoria_logs',
    'usuarios'
];
const AUDIT_COLLECTION = 'auditoria_logs';
const AUDIT_IGNORED_COLLECTIONS = new Set([
    AUDIT_COLLECTION,
    'backup_snapshots',
    'backup_snapshot_itens'
]);

function getCurrentUserMeta() {
    return window.AppUserContext || {
        uid: auth.currentUser?.uid || null,
        empresaId: DEFAULT_EMPRESA_ID
    };
}

function withTenantMeta(data = {}, isNew = false) {
    const meta = getCurrentUserMeta();
    const now = new Date().toISOString();
    return {
        ...data,
        empresaId: data.empresaId || meta.empresaId || DEFAULT_EMPRESA_ID,
        atualizadoEm: now,
        atualizadoPor: meta.uid || data.atualizadoPor || null,
        ...(isNew ? {
            criadoEm: data.criadoEm || now,
            criadoPor: data.criadoPor || meta.uid || null
        } : {})
    };
}

window.AppTenant = {
    defaultEmpresaId: DEFAULT_EMPRESA_ID,
    getCurrentUserMeta,
    withTenantMeta
};

function prepararResumoAuditoria(data = {}) {
    const resumo = {};
    Object.entries(data || {}).forEach(([key, value]) => {
        if (key === 'items' || key === 'senha' || key === 'password') return;
        if (value === undefined) return;
        if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
            resumo[key] = value;
            return;
        }
        if (Array.isArray(value)) {
            resumo[key] = `[lista:${value.length}]`;
            return;
        }
        resumo[key] = '[objeto]';
    });
    return resumo;
}

async function registrarAuditoria({ acao, colecao, docId, dados = {}, antes = null } = {}) {
    if (!colecao || AUDIT_IGNORED_COLLECTIONS.has(colecao)) return;

    const meta = getCurrentUserMeta();
    const user = auth.currentUser;
    const agora = new Date().toISOString();

    try {
        await addDoc(collection(db, AUDIT_COLLECTION), withTenantMeta({
            acao,
            colecao,
            docId: docId || null,
            usuarioId: meta.uid || user?.uid || null,
            usuarioEmail: user?.email || null,
            dataHora: agora,
            dataHoraEpoch: Date.now(),
            resumo: prepararResumoAuditoria(dados),
            antes: antes ? prepararResumoAuditoria(antes) : null
        }, true));
    } catch (error) {
        console.warn('Nao foi possivel registrar auditoria:', error);
    }
}

async function limparSnapshotsAntigos(maxSnapshots = 10) {
    const snap = await getDocs(query(collection(db, 'backup_snapshots'), orderBy('criadoEmEpoch', 'desc')));
    const docs = snap.docs || [];
    if (docs.length <= maxSnapshots) return;

    const antigos = docs.slice(maxSnapshots);
    for (const backupDoc of antigos) {
        const itensSnap = await getDocs(query(collection(db, 'backup_snapshot_itens'), where('snapshotId', '==', backupDoc.id)));
        for (const itemDoc of itensSnap.docs) {
            await deleteDoc(itemDoc.ref);
        }
        await deleteDoc(backupDoc.ref);
    }
}

async function gerarSnapshotNuvem({ motivo = 'automatico', collections = CLOUD_SNAPSHOT_COLLECTIONS, force = false } = {}) {
    const meta = getCurrentUserMeta();
    const intervalMs = 1000 * 60 * 60 * 6;
    const cacheKey = `orquestrasis_last_cloud_snapshot_at_${meta.empresaId || DEFAULT_EMPRESA_ID}`;
    const ultimo = Number(localStorage.getItem(cacheKey) || 0);
    const agora = Date.now();

    if (!force && ultimo && (agora - ultimo) < intervalMs) {
        return { skipped: true, reason: 'intervalo', nextAllowedAt: ultimo + intervalMs };
    }

    const backupRef = await addDoc(collection(db, 'backup_snapshots'), withTenantMeta({
        motivo,
        criadoEmEpoch: agora,
        totalColecoes: collections.length,
        colecoes: collections,
        status: 'processando'
    }, true));

    try {
        for (const collName of collections) {
            const snap = await getDocs(collection(db, collName));
            const items = [];
            snap.forEach(itemDoc => items.push({ id: itemDoc.id, ...itemDoc.data() }));

            await addDoc(collection(db, 'backup_snapshot_itens'), withTenantMeta({
                snapshotId: backupRef.id,
                colecao: collName,
                totalItens: items.length,
                items
            }, true));
        }

        await updateDoc(doc(db, 'backup_snapshots', backupRef.id), withTenantMeta({
            status: 'concluido',
            concluidoEm: new Date(agora).toISOString()
        }, false));

        localStorage.setItem(cacheKey, String(agora));
        await limparSnapshotsAntigos(10);
        return { skipped: false, snapshotId: backupRef.id };
    } catch (error) {
        await updateDoc(doc(db, 'backup_snapshots', backupRef.id), withTenantMeta({
            status: 'erro',
            erro: error?.message || 'Falha ao gerar snapshot'
        }, false));
        throw error;
    }
}

// Helper global para simplificar operações no Firestore em scripts legado
window.FS = {
    async getCollection(collName, queries = []) {
        try {
            let q = collection(db, collName);
            if (queries && queries.length > 0) {
                q = query(q, ...queries);
            }
            const snap = await getDocs(q);
            const results = [];
            snap.forEach(d => results.push({ id: d.id, ...d.data() }));
            return results;
        } catch (err) {
            console.error(`Erro ao obter coleção ${collName}:`, err);
            throw err;
        }
    },
    async getDoc(collName, docId) {
        try {
            const dSnap = await getDoc(doc(db, collName, docId));
            if (dSnap.exists()) return { id: dSnap.id, ...dSnap.data() };
            return null;
        } catch (err) {
            console.error(`Erro ao obter doc ${collName}/${docId}:`, err);
            throw err;
        }
    },
    async setDoc(collName, docId, data) {
        try {
            const existente = await getDoc(doc(db, collName, docId));
            await setDoc(doc(db, collName, docId), withTenantMeta(data, !existente.exists()));
            await registrarAuditoria({
                acao: existente.exists() ? 'atualizar' : 'criar',
                colecao: collName,
                docId,
                dados: data,
                antes: existente.exists() ? existente.data() : null
            });
        } catch (err) {
            console.error(`Erro ao salvar doc ${collName}/${docId}:`, err);
            throw err;
        }
    },
    async addDoc(collName, data) {
        try {
            const ref = await addDoc(collection(db, collName), withTenantMeta(data, true));
            await registrarAuditoria({ acao: 'criar', colecao: collName, docId: ref.id, dados: data });
            return ref.id;
        } catch (err) {
            console.error(`Erro ao adicionar doc em ${collName}:`, err);
            throw err;
        }
    },
    async updateDoc(collName, docId, data) {
        try {
            const existente = await getDoc(doc(db, collName, docId));
            await updateDoc(doc(db, collName, docId), withTenantMeta(data, false));
            await registrarAuditoria({
                acao: 'atualizar',
                colecao: collName,
                docId,
                dados: data,
                antes: existente.exists() ? existente.data() : null
            });
        } catch (err) {
            console.error(`Erro ao atualizar doc ${collName}/${docId}:`, err);
            throw err;
        }
    },
    async ajustarQuantidadeProduto(produtoId, delta) {
        try {
            const meta = getCurrentUserMeta();
            const prodRef = doc(db, 'produtos', produtoId);
            await runTransaction(db, async (transaction) => {
                const prodSnap = await transaction.get(prodRef);
                if (!prodSnap.exists()) return;

                const atual = Number(prodSnap.data().quantidade || 0);
                const novaQuantidade = Math.max(0, atual + Number(delta || 0));
                transaction.update(prodRef, withTenantMeta({
                    quantidade: novaQuantidade,
                    ultimaMovimentacaoEstoque: {
                        delta: Number(delta || 0),
                        origem: 'romaneio',
                        usuarioId: meta.uid || null,
                        data: new Date().toISOString()
                    }
                }, false));
            });
        } catch (err) {
            console.error(`Erro ao ajustar estoque do produto ${produtoId}:`, err);
            throw err;
        }
    },
    async deleteDoc(collName, docId) {
        try {
            const existente = await getDoc(doc(db, collName, docId));
            await deleteDoc(doc(db, collName, docId));
            await registrarAuditoria({
                acao: 'excluir',
                colecao: collName,
                docId,
                antes: existente.exists() ? existente.data() : null
            });
        } catch (err) {
            console.error(`Erro ao excluir doc ${collName}/${docId}:`, err);
            throw err;
        }
    },
    async gerarSnapshotNuvem(options = {}) {
        try {
            return await gerarSnapshotNuvem(options);
        } catch (err) {
            console.error('Erro ao gerar snapshot em nuvem:', err);
            throw err;
        }
    }
};


// Exportar as funcoes para facilitar os imports nos outros arquivos
export { 
    collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, limit, setDoc, onSnapshot, runTransaction,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged,
    GoogleAuthProvider, signInWithRedirect, signInWithPopup, getRedirectResult, EmailAuthProvider, reauthenticateWithCredential, updatePassword
};


