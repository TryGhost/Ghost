# 🚀 Como Ativar o CodeQL (Passo a Passo)

## ⚠️ IMPORTANTE: O CodeQL NÃO funciona automaticamente até você habilitá-lo!

Mesmo com o workflow criado, você precisa habilitar o Code Scanning no GitHub.

## 📋 Passo a Passo para Ativar

### Opção 1: Ativação Automática (Recomendado)

1. **Acesse as configurações de segurança:**
   ```
   https://github.com/[SEU-USUARIO]/Ghost/settings/security
   ```

2. **Role até a seção "Code security and analysis"**

3. **Encontre "Code scanning" e clique em "Set up"**

4. **O GitHub vai detectar o workflow `sast-codeql.yml` automaticamente**

5. **Clique em "Enable CodeQL"**

6. **Pronto!** Agora o CodeQL vai executar em todos os PRs e pushes.

### Opção 2: Ativação Manual via Actions

1. Vá para **Actions** no seu repositório
2. Clique em **"CodeQL"** na barra lateral (se aparecer)
3. Clique em **"Set up this workflow"**
4. Selecione o arquivo `.github/workflows/sast-codeql.yml`
5. Clique em **"Start commit"**

## ✅ Como Verificar se Está Funcionando

1. **Faça um commit e push:**
   ```bash
   git add .
   git commit -m "test: trigger CodeQL"
   git push
   ```

2. **Vá para a aba "Actions"** no GitHub
3. **Você deve ver o workflow "SAST - CodeQL Analysis" executando**

4. **Após a execução, vá para "Security" > "Code scanning alerts"**
5. **Os resultados aparecerão lá!**

## 🔍 Onde Visualizar os Resultados

### 1. Na Aba Security (Principal)

**Caminho:** `https://github.com/[usuario]/Ghost/security`

- Clique em **"Code scanning"** no menu lateral
- Ou clique em **"Code scanning alerts"**
- Veja todos os alertas encontrados

### 2. No Pull Request

Quando você abrir um PR:

- **Aba "Security"** no PR mostra alertas relacionados
- **Aba "Checks"** mostra o status da análise
- **Comentários automáticos** (se configurado com LLM)

### 3. Na Aba Actions

**Caminho:** `https://github.com/[usuario]/Ghost/actions`

- Veja os logs da execução
- Veja o tempo de execução
- Veja se houve erros

### 4. No Código (Inline)

- Os alertas aparecem como **anotações inline** no código
- Clique no número da linha para ver o alerta
- Veja sugestões de correção

## 📊 Exemplo Visual de Onde Encontrar

```
GitHub Repository
├── Code (aba principal)
├── Issues
├── Pull requests
├── Actions ← Veja os workflows executando aqui
├── Projects
├── Wiki
├── Security ← RESULTADOS DO CODEQL AQUI!
│   ├── Code scanning ← Clique aqui!
│   │   ├── Code scanning alerts ← Todos os alertas
│   │   └── Code scanning results ← Resultados por execução
│   └── Dependabot alerts
└── Settings
    └── Security
        └── Code security and analysis ← Ative aqui!
```

## 🎯 O Que Você Verá nos Resultados

1. **Lista de Alertas:**
   - Severidade (Error, Warning, Note)
   - Localização (arquivo e linha)
   - Tipo de vulnerabilidade
   - Descrição do problema

2. **Detalhes do Alerta:**
   - Código problemático destacado
   - Explicação do problema
   - Sugestões de correção
   - Links para documentação

3. **Estatísticas:**
   - Total de alertas
   - Alertas por severidade
   - Alertas por linguagem
   - Tendência ao longo do tempo

## ⚡ Dica Rápida

**Para testar rapidamente:**

1. Crie um arquivo de teste com um problema conhecido:
   ```javascript
   // test-vulnerability.js
   const userInput = req.query.input;
   eval(userInput); // ⚠️ Isso vai gerar um alerta!
   ```

2. Faça commit e push
3. Abra um PR
4. Veja o alerta aparecer em **Security > Code scanning alerts**

## ❓ Problemas Comuns

### "Code scanning não está habilitado"
→ Você precisa ativar em Settings > Security primeiro!

### "Nenhum alerta encontrado"
→ Pode ser que não haja problemas, ou o CodeQL ainda está analisando (pode levar alguns minutos)

### "Workflow não executa"
→ Verifique se o workflow está no branch correto e se o Code Scanning está habilitado

## 📚 Próximos Passos

Após ativar:
1. ✅ Faça um PR de teste
2. ✅ Veja os resultados em Security > Code scanning
3. ✅ Configure OpenAI API key (opcional) para explicações automáticas
4. ✅ Leia `.github/SAST_SETUP.md` para personalização avançada

---

**Lembre-se:** O CodeQL só funciona DEPOIS de você habilitá-lo em Settings > Security!

