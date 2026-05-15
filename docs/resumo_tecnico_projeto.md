# Resumo Técnico do Projeto: Dashboard TSQ 9610 GCxGC-MS/MS

Este documento apresenta uma visão geral da arquitetura, fluxo de dados e possíveis melhorias para o código do dashboard de acompanhamento do equipamento TSQ 9610.

## 1. Resumo Técnico e Arquitetura

O projeto consiste em uma **Single-Page Application (SPA)** desenvolvida em um único arquivo (`index.html`). O sistema funciona como um dashboard interativo focado no monitoramento e gerenciamento operacional do equipamento de espectrometria de massas TSQ 9610. Ele permite ao operador visualizar KPIs em tempo real, checar históricos de *tune* (calibração), acessar rotinas de manutenção preventiva/corretiva, registrar logs diários e gerar relatórios anuais em PDF.

### Linguagens e Tecnologias
- **HTML5:** Estruturação semântica do layout e componentes do dashboard.
- **CSS3 (Vanilla):** Estilização completa nativa utilizando variáveis CSS (Custom Properties) para temas, paleta de cores consistente (inspirada em interfaces de alta tecnologia/cyber), CSS Grid e Flexbox.
- **JavaScript (Vanilla / ES6+):** Lógica de navegação de abas, manipulação do DOM e geração dinâmica do conteúdo da tela.

### Bibliotecas e Frameworks (via CDN)
Não foi utilizado um framework complexo (como React ou Angular), o projeto utiliza ferramentas leves e focadas:
- **Chart.js (v4.4.0):** Para renderização dos gráficos (evolução temporal de EMV, controle de vazamentos e estatísticas de injeção).
- **jsPDF (v2.5.1):** Criação e exportação local do relatório detalhado em formato PDF.
- **html2canvas (v1.4.1):** Assistência na captura do layout para renderização dentro do PDF, se necessário.
- **Google Fonts:** Tipografia customizada utilizando `Space Mono` (para dados tabelados e tags) e `Barlow / Barlow Condensed` (para texto geral e painéis numéricos).

---

## 2. Fluxo de Dados (Entrada, Saída e Armazenamento)

O comportamento atual da aplicação no quesito gerenciamento de dados é estritamente **"in-memory" (em memória local e volátil)**.

### Origem dos Dados (Importação/Leitura)
- Os dados analíticos iniciais (histórico de *tunes*, itens de *troubleshooting* e checklist) **não vêm de um banco de dados externo ou API**.
- Eles estão **"hardcoded"** diretamente no corpo do script JS sob a seção `// DATA` nas constantes `tuneData`, `injectByMonth`, `troubleshootItems` e `checklistItems`.
- Toda vez que a página carrega, o JavaScript lê essas variáveis estáticas e as utiliza para preencher tabelas (função `renderTuneTable()`) e gerar os gráficos (função `initCharts()`).

### Entrada e Armazenamento pelo Usuário
1. **Entrada:** O usuário insere novos dados na aplicação por meio dos formulários HTML (por exemplo, na página "Registro Diário" via `saveLog()` e "Manutenção Corretiva" via `saveCorrectiveMaint()`).
2. **Armazenamento:** Esses dados são capturados pelo DOM (via `document.getElementById(...).value`) e inseridos em dois arrays JavaScript globais chamados `savedLogs` e `correctiveRecords`.
3. **Persistência (Volatilidade):** *Atualmente, não há persistência permanente.* Como os dados são salvos apenas em arrays no JavaScript, **qualquer recarregamento (F5) da página ou fechamento do navegador causará a perda das informações inseridas na sessão.**
4. **Saída:** A saída final é a atualização visual (DOM) com tabelas re-renderizadas ou a exportação dessas informações formatadas em um arquivo PDF.

---

## 3. Possíveis Melhorias para Organização do Código

Atualmente, todo o projeto (CSS, HTML, JS, Bibliotecas) possui mais de 2.000 linhas localizadas em um único arquivo `index.html`. Conforme o projeto cresce, a manutenção ficará mais complexa. Aqui estão melhorias organizacionais:

### A. Separação de Responsabilidades (Refatoração Básica)
- **Modularização de Arquivos:** Separar o código em pelo menos três arquivos:
  - `index.html` (somente estrutura).
  - `style.css` (recortar tudo o que está dentro da tag `<style>`).
  - `script.js` (ou múltiplos arquivos JS, separando a lógica de Gráficos, lógica de PDF e lógica de Interface).

### B. Persistência de Dados (Não perder os dados ao fechar)
- **Local Storage (Solução Rápida):** Implementar `localStorage` para salvar o `savedLogs` e `correctiveRecords` diretamente no cache do navegador local.
- **Backend (Solução Ideal):** Criar uma API backend (usando Node.js/Express, Python/FastAPI) e um banco de dados real (SQLite ou PostgreSQL).

### C. Evolução Arquitetural
- **Framework React/Vue:** Como há muitos gráficos e dados reativos (mudanças de estado alterando a UI), utilizar um framework moderno facilitaria absurdamente o encapsulamento em componentes reutilizáveis, reduzindo a duplicação de marcação HTML e complexidade dos seletores (`getElementById`).

---

## 4. Dicas e Passos de Implementação

Aqui vão instruções práticas para as evoluções imediatas, caso decida prosseguir mantendo em Vanilla JavaScript:

**Dica 1: Implementando persistência simples (LocalStorage)**
Substitua as funções de salvamento de registros para utilizar o banco interno do navegador:
```javascript
// Exemplo de salvar
function saveLog() {
  // ... código que coleta os inputs
  const entry = { date, op, psi, inj, obs };
  
  // Resgata logs anteriores, ou array vazio
  let currentLogs = JSON.parse(localStorage.getItem('myLogs')) || [];
  currentLogs.push(entry);
  
  // Salva no navegador
  localStorage.setItem('myLogs', JSON.stringify(currentLogs));
  
  // Re-renderiza a lista
  renderLogs();
}

// Exemplo para carregar ao iniciar a página (dentro do DOMContentLoaded)
function loadSavedLogs() {
  const saved = JSON.parse(localStorage.getItem('myLogs')) || [];
  savedLogs.push(...saved);
  // chamar funcão de re-renderizar DOM
}
```

**Dica 2: Separação do JS em Módulos**
Se optar por quebrar o `script.js`, no `index.html`, declare o script principal como módulo:
`<script type="module" src="./js/main.js"></script>`
E em `main.js`, faça importações de outros arquivos limpos:
`import { generatePDF } from './js/pdfGenerator.js';`
`import { initCharts } from './js/charts.js';`

**Dica 3: Tratamento de Eventos e Data-binding**
Evite definir ações nas tags como `onclick="showPage('status')"`. Centralize as lógicas num arquivo JS utilizando *Event Listeners*:
```javascript
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    // Pegar um atributo data-target e navegar...
  });
});
```
Isso mantém o HTML enxuto e estritamente semântico.
