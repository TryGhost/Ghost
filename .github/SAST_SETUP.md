# Configuração de SAST (Static Application Security Testing)

Este documento explica como configurar e usar as ferramentas de análise estática de código (SAST) configuradas neste repositório.

## Ferramentas Configuradas

### 1. CodeQL
- **Ferramenta:** GitHub CodeQL (gratuita para projetos open source)
- **Workflow:** `.github/workflows/sast-codeql.yml`
- **Linguagens:** JavaScript e TypeScript
- **Execução:** Automática em PRs e pushes para branches principais

### 2. Semgrep
- **Ferramenta:** Semgrep (gratuita)
- **Workflow:** `.github/workflows/sast-semgrep.yml`
- **Linguagens:** JavaScript, TypeScript, Node.js
- **Execução:** Automática em PRs e pushes para branches principais

## Configuração Inicial

### 1. Habilitar CodeQL no GitHub

O CodeQL já está configurado no workflow, mas você precisa habilitá-lo no GitHub:

1. Vá para **Settings** > **Security** > **Code security and analysis**
2. Em "Code scanning", clique em **Set up** ao lado de "CodeQL analysis"
3. Selecione o workflow `sast-codeql.yml` ou deixe o GitHub criar um automático

### 2. Configurar Secrets (Opcional - para explicações com LLM)

Para habilitar as explicações automáticas de alertas usando LLM:

1. Vá para **Settings** > **Secrets and variables** > **Actions**
2. Adicione os seguintes secrets:
   - `OPENAI_API_KEY`: Sua chave da API OpenAI (opcional, para explicações com GPT)

**Nota:** O `GITHUB_TOKEN` é automaticamente fornecido pelo GitHub Actions e não precisa ser configurado manualmente.

### 3. Configuração do CodeQL

O arquivo `.github/codeql/codeql-config.yml` já está configurado para:
- Ignorar arquivos de teste, node_modules, builds, etc.
- Executar queries de segurança e qualidade
- Focar em vulnerabilidades de segurança

## Como Funciona

### Análise Automática

1. **Em Pull Requests:**
   - CodeQL e Semgrep executam automaticamente
   - Resultados aparecem na aba **Security** do repositório
   - Se configurado, um comentário é adicionado ao PR com explicações dos alertas

2. **Em Pushes para branches principais:**
   - Análises são executadas automaticamente
   - Resultados são armazenados no histórico de segurança

3. **Agendamento:**
   - CodeQL: Toda segunda-feira às 2h UTC
   - Semgrep: Toda terça-feira às 3h UTC

### Explicação de Alertas com LLM

O script `.github/scripts/explain-sast-alerts.py`:
1. Busca alertas de segurança da API do GitHub
2. Usa OpenAI GPT para explicar cada alerta em termos simples
3. Gera um relatório em Markdown com:
   - Explicação do problema
   - Por que é uma preocupação de segurança
   - Como corrigir
   - Boas práticas

## Visualizando Resultados

### No GitHub

1. **Aba Security:**
   - Vá para **Security** > **Code scanning alerts**
   - Veja todos os alertas encontrados
   - Filtre por severidade, linguagem, etc.

2. **No Pull Request:**
   - Os alertas aparecem como comentários (se configurado)
   - Links diretos para o código afetado

### Localmente

Você pode executar Semgrep localmente:

```bash
# Instalar Semgrep
pip install semgrep

# Executar análise
semgrep --config="p/security-audit" --config="p/javascript" --config="p/typescript" .
```

## Tipos de Vulnerabilidades Detectadas

As ferramentas detectam:

- **Injeção de código** (SQL, NoSQL, Command, etc.)
- **Cross-Site Scripting (XSS)**
- **Exposição de informações sensíveis**
- **Autenticação e autorização fracas**
- **Dependências vulneráveis**
- **Uso inseguro de APIs**
- **Problemas de criptografia**
- **Code smells e más práticas**

## Personalização

### Ajustar Regras do CodeQL

Edite `.github/codeql/codeql-config.yml` para:
- Adicionar/remover queries
- Ignorar mais caminhos
- Configurar queries customizadas

### Ajustar Regras do Semgrep

Edite `.github/workflows/sast-semgrep.yml` na seção `config` para:
- Adicionar mais regras: `p/security-audit`, `p/javascript`, etc.
- Usar regras customizadas do Semgrep Registry

### Desabilitar Ferramentas

Para desabilitar uma ferramenta, comente ou remova o workflow correspondente em `.github/workflows/`.

## Troubleshooting

### CodeQL não está executando

1. Verifique se o CodeQL está habilitado em **Settings** > **Security**
2. Verifique se o workflow está no branch correto
3. Veja os logs em **Actions** > **SAST - CodeQL Analysis**

### Semgrep não está executando

1. Verifique os logs em **Actions** > **SAST - Semgrep Analysis**
2. Verifique se há erros de sintaxe no workflow

### Explicações com LLM não estão funcionando

1. Verifique se `OPENAI_API_KEY` está configurado como secret
2. Verifique os logs do job `explain-alerts`
3. O script funciona sem LLM, mas com explicações básicas

## Recursos Adicionais

- [Documentação do CodeQL](https://codeql.github.com/docs/)
- [Documentação do Semgrep](https://semgrep.dev/docs/)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)
- [Semgrep Registry](https://semgrep.dev/r)

## Contribuindo

Para melhorar a configuração de SAST:

1. Adicione regras customizadas se necessário
2. Ajuste os caminhos ignorados conforme o projeto evolui
3. Melhore o script de explicação de alertas
4. Adicione mais ferramentas SAST se necessário

## Licença

As configurações de SAST seguem a mesma licença do projeto principal.

