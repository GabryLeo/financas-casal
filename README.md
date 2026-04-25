# 💸 Finanças do Casal

✨ Funcionalidades
📊 Gestão financeira

Múltiplas pessoas com avatares coloridos gerados automaticamente
Lançamentos com parcelas que se distribuem automaticamente nos meses futuros
Filtros combinados por pessoa e por período (mês a mês)
Total geral quando 2+ pessoas estão selecionadas
Lançamentos compartilhados (rateio entre pessoas)

📈 Visualização

Dashboard com gráficos de evolução mensal e distribuição por pessoa (Chart.js)
Sparklines individuais com saldo dos últimos 6 meses
Barra de orçamento mostrando % de gastos vs. entradas
Comparativo automático entre meses selecionados (com diferenças e %)
Animação count-up nos valores totais
Confetti 🎉 quando o saldo vira positivo

🎨 Experiência

Tema claro/escuro com transição circular suave (View Transitions API)
Modo compacto para visualizar mais conteúdo
Modo focus para análise individual de cada pessoa
Toasts com ação de "Desfazer" em remoções
Refresh silencioso a cada 20s (não interrompe digitação)
Skeleton loading na carga inicial
Persistência local de preferências (tema, modo compacto, dashboard)
Responsivo mobile-first


🚀 Tecnologias

HTML, CSS e JavaScript puros — sem frameworks, sem build step
Google Apps Script como backend (planilha como banco de dados)
Chart.js 4 para gráficos
canvas-confetti para celebrações
Inter como tipografia


📦 Estrutura
Copiar.
├── index.html      # Estrutura da página
├── styles.css      # Design system com variáveis de tema
├── app.js          # Lógica do app + integração com API
└── README.md

⚙️ Configuração
1. Backend (Google Apps Script)
Crie uma planilha no Google Sheets com duas abas:
Aba Pessoas
idnome......
Aba Lancamentos
iddescricaovalorparcelastipopessoasIdsmesInicial............entrada/saidaid1,id2YYYY-MM
No menu Extensões → Apps Script, crie um endpoint que aceite as ações:

GET → retorna { pessoas: [], lancamentos: [] }
POST com action:

addPessoa / deletePessoa
addLancamento / deleteLancamento



Publique como Web App (acesso "Qualquer pessoa") e copie a URL.
2. Frontend
No app.js, atualize a constante:
jsCopiarconst API_URL = 'https://script.google.com/macros/s/SUA_URL/exec';
3. Servir
Pode abrir o index.html diretamente, hospedar no GitHub Pages, Netlify, Vercel etc. Não há build step.
bashCopiar# Opcional: servidor local
npx serve .

🎯 Como usar

Adicione pessoas no card superior
Filtre por pessoa clicando nos chips (combine quantos quiser)
Adicione lançamentos no formulário de cada pessoa

Use o campo Parcelas para distribuir o valor por N meses
Selecione Mês e Ano iniciais


Filtre por período clicando nos meses disponíveis
Compare meses selecionando 2 ou mais
Use o modo focus (ícone ⤢) para foco total em uma pessoa


🎨 Personalização
Todas as cores, raios e transições estão em variáveis CSS no topo do styles.css:
cssCopiar:root {
  --radius: 16px;
  --transition: 0.35s cubic-bezier(.4, 0, .2, 1);
}

html[data-theme="dark"]  { /* paleta dark  */ }
html[data-theme="light"] { /* paleta light */ }
Modifique as variáveis --accent, --accent-2, --entrada, --saida para criar seu próprio tema.

🧠 Decisões técnicas

Sem framework: o app é pequeno o suficiente para que vanilla JS seja mais rápido, leve e sem dependências
Refresh otimista: mudanças são aplicadas localmente e sincronizadas em background, com Desfazer em caso de erro
Hash de dados: o polling silencioso só re-renderiza se algo mudou de verdade
Preservação de foco: ao re-renderizar durante digitação, o input ativo mantém posição do cursor
Glassmorphism + blobs: efeito visual moderno sem peso (CSS puro)


📝 Licença
MIT — use, modifique e compartilhe à vontade.

<div align="center">
Feito com ☕ e ❤️ para organizar a vida financeira do casal.
</div>
4. Clique em **"Commit changes"**

O README vai aparecer automaticamente na página inicial do repositório, formatadinho e bonito! 🎨
