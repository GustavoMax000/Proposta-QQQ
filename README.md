# Dashboard GCxGC — TSQ 9610 ⚡

[![Node.js](https://img.shields.io/badge/Node.js-v18+-6DA55F?logo=node.js&logoColor=white)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-v3-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![PWA](https://img.shields.io/badge/PWA-Supported-00b4cc?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

Um sistema de monitoramento dinâmico e gestão operacional para o espectrômetro de massa triplo quadrupolo **Thermo Scientific TSQ 9610** acoplado a GCxGC. Desenvolvido para o **LAGOA - Instituto de Química (UFRJ)**.

---

## 🚀 Funcionalidades Principais

- **Monitoramento em Tempo Real**: Visualização dinâmica de KPIs críticos (EMV, m/z 18, 28, 32, Temperaturas).
- **Sistema de Alertas Inteligente**: Detecção automática de vazamentos de vácuo e desgaste de consumíveis (Liner, Septo, EMV) com base em limites técnicos oficiais.
- **Registro Diário Digital**: Substituição de livros físicos por registros eletrônicos de operação e manutenção.
- **Histórico de Tune**: Gráficos evolutivos de performance e estabilidade do equipamento.
- **Relatórios em PDF**: Geração de relatórios anuais e técnicos formatados para impressão.
- **Experiência PWA**: Pode ser instalado como um aplicativo nativo no Windows/Android, funcionando como um software dedicado.

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js com Express.
- **Banco de Dados**: SQLite (persistência de dados local e segura).
- **Frontend**: Vanilla JavaScript (ES6+), CSS3 Moderno (Light Theme).
- **Gráficos**: Chart.js v4.
- **Relatórios**: jsPDF e html2canvas.
- **PWA**: Web Manifest e Service Workers para suporte offline e instalação.

---

## 📁 Estrutura do Projeto

```text
/
├── backend/            # Lógica do servidor e API REST
│   └── data/           # Localização do Banco de Dados (SQLite) e logs
├── public/             # Interface do usuário (HTML, CSS, JS, Assets)
│   ├── js/             # Lógica do dashboard e comunicações API
│   ├── css/            # Design System e variáveis de tema
│   └── assets/         # Ícones e esquemas técnicos
├── scripts/            # Utilitários de inicialização (Batch/VBS)
├── docs/               # Manuais técnicos e backups históricos
└── package.json        # Gerenciamento de dependências
```

---

## ⚙️ Instalação e Configuração

### Pré-requisitos
- [Node.js](https://nodejs.org/) instalado (versão 18 ou superior).

### Instalação
1. Clone ou baixe este repositório para a máquina local.
2. No terminal, dentro da pasta do projeto, instale as dependências:
   ```bash
   npm install
   ```
---

## 🏃 Como Executar

### Modo de Desenvolvimento
No terminal, execute:
```bash
npm start
```
O servidor estará disponível em `http://localhost:3000`.
---

## 📱 Instalação como App (PWA)
1. Acesse `http://localhost:3000` no Google Chrome ou Microsoft Edge.
2. Clique no ícone de "Instalar" (computador com seta) na barra de endereços.
3. O Dashboard agora aparecerá como um programa no seu Menu Iniciar e Área de Trabalho.

---

## 📄 Licença e Uso
Este projeto foi desenvolvido para uso exclusivo do **LAGOA - Laboratório de Apoio ao Desenvolvimento Tecnológico** (Instituto de Química - UFRJ). Todos os direitos reservados.

---
**Desenvolvido como parte da modernização tecnológica do laboratório.**
