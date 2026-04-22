# 💸 Finanças do Casal

Um app web simples e bonito pra controlar finanças em conjunto, sincronizando dados em tempo real entre dois dispositivos via Google Sheets.

![Badge](https://img.shields.io/badge/status-ativo-success)
![Badge](https://img.shields.io/badge/stack-vanilla%20JS-yellow)
![Badge](https://img.shields.io/badge/backend-Google%20Sheets-green)

---

## ✨ Funcionalidades

- 👥 **Múltiplas pessoas** — cadastre quantas quiser, cada uma com sua tabela
- 💰 **Entradas e saídas** com descrição, valor, parcelas, tipo e mês
- 📅 **Controle por mês/ano** — cada lançamento é vinculado a um mês específico
- 🔄 **Parcelas distribuídas** — uma compra em 3x cria automaticamente parcelas nos meses subsequentes
- 🔮 **Previsão de lançamentos futuros** — veja o que vai cair nos próximos meses
- 📊 **Comparativo entre meses** — compare períodos com diferença em R$ e porcentagem
- 🧮 **Totais consolidados** — soma automática quando selecionar várias pessoas
- ☁️ **Sincronização em nuvem** via Google Sheets (grátis)
- 📱 **Responsivo** — funciona bem no celular e no desktop
- 🖤 **Visual limpo** em preto e branco, com destaque colorido pros valores (verde/vermelho)

---

## 🖼️ Estrutura visual
┌──────────────────────────────────────────┐
│  Adicionar pessoa                        │
│  [Gabryel ×] [Namorada ×]                │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│  Período                                 │
│  [Jan/25] [Fev/25] [Mar/25] [🔮 Abr/25]  │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│  Total Geral (se 2+ pessoas)             │
│  Entrada / Saída / Total                 │
│  [ Comparativo entre meses ]             │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│  Gabryel                                 │
│  Big numbers: Entrada / Saída / Total    │
│  [ Form: descrição, valor, parcelas,     │
│    mês, tipo, adicionar ]                │
│  ── Janeiro/2025 ──                      │
│  [ tabela de lançamentos ]               │
│  ── Fevereiro/2025 ──                    │
│  [ tabela de lançamentos ]               │
│  [ Comparativo entre meses ]             │
└──────────────────────────────────────────┘
Copiar
---

## 🚀 Tecnologias

- **HTML5 + CSS3 + JavaScript puro** (sem frameworks)
- **Google Sheets** como banco de dados
- **Google Apps Script** como API backend
- **GitHub Pages** como hospedagem (grátis)

---

## 🛠️ Setup (do zero)

### 1. Planilha do Google Sheets

Crie uma nova planilha com duas abas:

**Aba `pessoas`** (cabeçalhos na linha 1):
| id | nome |
|----|------|

**Aba `lancamentos`** (cabeçalhos na linha 1):
| id | descricao | valor | parcelas | tipo | pessoasIds | mesInicial |
|----|-----------|-------|----------|------|------------|------------|

### 2. Apps Script (API)

1. Na planilha: **Extensões → Apps Script**
2. Cole o código de `apps-script.gs` (veja o arquivo no repositório)
3. Salve e clique em **Implantar → Nova implantação**
4. Tipo: **Aplicativo da Web**
5. Configure:
   - **Executar como**: Eu
   - **Quem pode acessar**: Qualquer pessoa
6. Copie a URL gerada

### 3. Atualize o `app.js`

Substitua a constante `API_URL` pela URL copiada:

javascript
const API_URL = 'https://script.google.com/macros/s/SEU_CODIGO/exec';
4. Hospede no GitHub Pages

Faça upload dos arquivos (index.html, styles.css, app.js) num repositório público
Vá em Settings → Pages
Source: Deploy from a branch → main → /(root) → Save
Aguarde 1-2 minutos e acesse o link gerado


📖 Como usar
Adicionar pessoa

Digite o nome e clique em "Adicionar"
A pessoa aparece como um chip — clique no nome pra filtrar, clique no × pra remover

Adicionar lançamento

Na tabela de cada pessoa, preencha:

Descrição (ex: "Mercado")
Valor (ex: 250.00)
Parcelas (ex: 3 — distribui nos próximos 3 meses)
Mês (padrão: mês atual, pode alterar)
Tipo (Entrada ou Saída)


Clique em "Adicionar"

Filtrar por período

Clique nos chips de meses pra filtrar
Meses futuros aparecem com bordinha tracejada 🔮
Selecione 2+ meses pra aparecer o comparativo

Comparar meses

Com 2+ meses selecionados, aparece um card de comparativo embaixo de cada tabela mostrando:

Valores individuais de cada mês
Diferença entre o primeiro e o último (em R$ e %)
Soma total do período



Lançamentos conjuntos

Quando uma pessoa aparece em múltiplas tabelas, uma sublegenda mostra "com [outra pessoa]"
Quando 2+ pessoas estão selecionadas, aparece uma seção de "Total Geral" somando tudo


🔒 Privacidade

O código do site fica público no GitHub (qualquer um pode ver o HTML/CSS/JS)
Os dados ficam na sua planilha privada do Google
Só quem tem o link do site acessa o app
A URL do Apps Script é um hash aleatório — impossível de adivinhar


⚠️ Limitações conhecidas

Apps Script tem latência de ~1-3s por requisição (uso pessoal funciona bem)
Sem autenticação — quem tem o link acessa
Sem edição de lançamentos (só adicionar/remover)
Remover uma parcela remove todas do mesmo lançamento


🌱 Possíveis melhorias futuras

 Editar lançamentos existentes
 Categorias (mercado, lazer, contas, etc.)
 Gráficos de evolução mensal
 Exportar pra CSV/PDF
 Senha de acesso
 PWA (instalar como app no celular)
 Metas e orçamento mensal
 Dark/light mode


📄 Licença
Uso livre para fins pessoais. Se quiser adaptar pro seu caso, fique à vontade! 💕

Feito com ☕ e planilhas.
Copiar
---

## Como adicionar no GitHub

1. No seu repositório, clique em **"Add file" → "Create new file"**
2. Nome do arquivo: `README.md`
3. Cole o conteúdo acima
4. Clique em **"Commit changes"**

O README vai aparecer automaticamente na página inicial do repositório, formatadinho e bonito! 🎨

---

## Bônus (opcional)

Se quiser deixar ainda mais profissional:

### 1. Adicione um arquivo `apps-script.gs` no repositório
Com o código do Apps Script pra quem quiser fazer fork do projeto conseguir configurar.

### 2. Adicione uma screenshot
Tira um print do app funcionando e salva como `screenshot.png` no repositório. Depois no README adiciona:

markdown
## 📸 Screenshot
![App](screenshot.png)
3. Adicione uma descrição curta no repositório
No topo da página do repositório tem um ícone de engrenagem ⚙️ ao lado do nome. Clica lá e preenche:

Description: "App de controle financeiro pra casal, com sincronização via Google Sheets"
Website: cola o link do GitHub Pages

Pronto, profissional! 🚀
