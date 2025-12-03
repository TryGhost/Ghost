# 🚀 Guia Rápido - SAST Setup

Este é um guia rápido para começar a usar as ferramentas de SAST configuradas neste repositório.

## ✅ O que já está configurado

- ✅ **CodeQL** - Análise estática do GitHub (gratuita)
- ✅ **Semgrep** - Análise estática adicional (gratuita)
- ✅ **Script de explicação com LLM** - Explica alertas automaticamente

## 🎯 Passos para Ativar

### 1. Habilitar CodeQL no GitHub (2 minutos)

1. Acesse: `https://github.com/[seu-usuario]/[seu-repo]/settings/security`
2. Role até **"Code security and analysis"**
3. Clique em **"Set up"** ao lado de **"CodeQL analysis"**
4. Selecione o workflow `sast-codeql.yml` ou deixe o GitHub criar automaticamente
5. Clique em **"Enable CodeQL"**

**Pronto!** O CodeQL já está ativo e vai executar automaticamente em PRs e pushes.

### 2. (Opcional) Configurar Explicações com IA

Para receber explicações automáticas dos alertas nos PRs:

1. Acesse: `https://github.com/[seu-usuario]/[seu-repo]/settings/secrets/actions`
2. Clique em **"New repository secret"**
3. Nome: `OPENAI_API_KEY`
4. Valor: Sua chave da API OpenAI (obtenha em https://platform.openai.com/api-keys)
5. Clique em **"Add secret"**

**Nota:** Sem a chave da OpenAI, os alertas ainda aparecerão, mas sem explicações detalhadas.

## 📊 Como Ver os Resultados

### No Pull Request
- Os alertas aparecem automaticamente na aba **"Security"**
- Se configurado, um comentário será adicionado ao PR com explicações

### No Repositório
1. Vá para a aba **"Security"** do repositório
2. Clique em **"Code scanning alerts"**
3. Veja todos os alertas encontrados

## 🔍 Executar Localmente (Opcional)

### Semgrep
```bash
# Instalar
pip install semgrep

# Executar
semgrep --config="p/security-audit" --config="p/javascript" .
```

### CodeQL
CodeQL requer setup mais complexo. Recomendamos usar o GitHub Actions.

## 📝 Próximos Passos

1. ✅ CodeQL já está ativo após o passo 1
2. ✅ Semgrep já está ativo (não precisa de configuração)
3. ⚙️ (Opcional) Configure OpenAI para explicações
4. 📖 Leia `.github/SAST_SETUP.md` para detalhes completos

## ❓ Problemas?

- **CodeQL não executa?** Verifique se habilitou em Settings > Security
- **Semgrep não executa?** Verifique os logs em Actions
- **Explicações não aparecem?** Verifique se configurou `OPENAI_API_KEY`

## 📚 Documentação Completa

Veja `.github/SAST_SETUP.md` para:
- Detalhes técnicos
- Personalização avançada
- Troubleshooting detalhado
- Recursos adicionais

---

**Dica:** Faça um commit e push para testar! Os workflows executarão automaticamente.

