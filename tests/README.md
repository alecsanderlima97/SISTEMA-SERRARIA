# Teste das regras do Firestore

Testa, no emulador local (sem tocar no banco real), o que cada perfil pode ler e gravar.

```bash
npm i --no-save firebase-tools@13 @firebase/rules-unit-testing@3 firebase@10
npx firebase emulators:exec --only firestore --project demo-serraria "node tests/firestore-rules.test.mjs"
```

O emulador usa a porta 8089 (ajuste em `firebase.json` se precisar). Resultado esperado: `falhas: 0`.

Para publicar as regras depois de testar:

```bash
npx firebase deploy --only firestore:rules --project <id-do-projeto>
```
