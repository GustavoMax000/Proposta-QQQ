// Unified configuration definitions for different equipment types.
// This is the Single Source of Truth (SSOT) shared with the frontend.

const configs = {
  "tsq-9610": {
    "hasTune": true,
    "hasVacuumIntegrity": true,
    "hasTroubleshoot": true,
    "details": {
      "model": "Thermo Scientific TSQ 9610",
      "description": "Espectrômetro de massa triplo quadrupolo acoplado a cromatógrafo gasoso.",
      "tags": ["GC/MS", "Código 12E797", "Método 5.389", "Ionização EI", "Gás: He", "Triagem IX"],
      "specs": [
        { "label": "Temperatura Máx. Transfer Line", "value": "400 °C" },
        { "label": "Temperatura Fonte (EI)", "value": "0 – 350 °C" },
        { "label": "Detectores", "value": "MCP (Electron Multiplier)" },
        { "label": "Software", "value": "TSQ Series 5.0+" },
        { "label": "Filamentos", "value": "Duplo (1 e 2)" },
        { "label": "Calibrante", "value": "PFTBA" }
      ]
    },
    "logFields": [
      { "id": "psi", "label": "Pressão Injetor (psi)", "type": "number", "step": 0.1, "category": "cg", "placeholder": "14.0" },
      { "id": "corte", "label": "Corte da Coluna (cm)", "type": "number", "step": 0.5, "category": "cg", "placeholder": "—" },
      { "id": "trpi", "label": "tR do PI (min)", "type": "number", "step": 0.01, "category": "cg", "placeholder": "—" },
      { "id": "he", "label": "Troca Cilindro He", "type": "select", "options": ["Não", "SIM"], "category": "preventives" },
      { "id": "collision_gas", "label": "Troca Cilindro Gás Colisão", "type": "select", "options": ["Não", "SIM"], "category": "preventives" },
      { "id": "limpinj", "label": "Limpeza Injetor", "type": "select", "options": ["Não", "SIM"], "category": "preventives" },
      { "id": "septo", "label": "Troca Septo", "type": "select", "options": ["Não", "SIM"], "category": "preventives" },
      { "id": "liner", "label": "Troca Liner", "type": "select", "options": ["Não", "SIM"], "category": "preventives" },
      { "id": "col", "label": "Troca Coluna", "type": "select", "options": ["Não", "SIM"], "category": "preventives" },
      { "id": "col_model", "label": "Selecione a Coluna", "type": "select_column", "category": "cg" },
      { "id": "limpfonte", "label": "Limpeza Fonte", "type": "select", "options": ["Não", "SIM"], "category": "preventives" },
      { "id": "trocaoleo", "label": "Troca óleo da bomba de vácuo", "type": "select", "options": ["Não", "SIM"], "category": "preventives" }
    ],
    "tuneFields": [
      { "id": "fil", "label": "Filamento", "type": "select", "options": ["1", "2"] },
      { "id": "tinterf", "label": "T Interface (°C)", "type": "number", "placeholder": "280" },
      { "id": "emv", "label": "EMV (V)", "type": "number", "placeholder": "1842" },
      { "id": "m69", "label": "m/z 69 (%)", "type": "number", "step": 0.1, "placeholder": "100" },
      { "id": "m219", "label": "m/z 219 (%)", "type": "number", "step": 0.1, "placeholder": "—" },
      { "id": "m502", "label": "m/z 502 (%)", "type": "number", "step": 0.1, "placeholder": "—" },
      { "id": "m18", "label": "m/z 18 (umidade)", "type": "number", "step": 0.1, "placeholder": "—" },
      { "id": "m28", "label": "m/z 28 (N₂)", "type": "number", "step": 0.1, "placeholder": "—" },
      { "id": "m32", "label": "m/z 32 (O₂)", "type": "number", "step": 0.1, "placeholder": "—" }
    ],
    "statusRules": {
      "offline": { "field": "sistema", "operator": "in", "values": ["Não", "Nao", "n", "NÃO", "não"] },
      "noop": [
        { "field": "linerInjections", "operator": ">=", "value": 800 },
        { "field": "emv", "operator": ">=", "value": 2500 },
        { "field": "m18", "operator": ">=", "value": 10 },
        { "field": "m28", "operator": ">=", "value": 10 },
        { "field": "m32", "operator": ">=", "value": 2 },
        { "field": "tinterf", "operator": ">=", "value": 400 }
      ],
      "alert": [
        { "field": "linerInjections", "operator": ">=", "value": 600 },
        { "field": "emv", "operator": ">=", "value": 2200 },
        { "field": "m18", "operator": ">=", "value": 8 },
        { "field": "m28", "operator": ">=", "value": 8 },
        { "field": "m32", "operator": ">=", "value": 1.5 },
        { "field": "tinterf", "operator": ">=", "value": 380 }
      ]
    },
    "kpis": [
      { "id": "psi", "label": "Pressão Injetor", "source": "log", "field": "psi", "unit": "psi", "statusField": "psi" },
      { "id": "tinterf", "label": "Temp. Interface (MS)", "source": "tune", "field": "tinterf", "unit": "°C", "limit": "Máx. recomendado: 400 °C" },
      { "id": "fil", "label": "Filamento Ativo", "source": "tune", "field": "fil", "unit": "", "limit": "Filamento 2 em standby" },
      { "id": "linerInjections", "label": "Injeções (Liner)", "source": "calc", "field": "linerInjections", "unit": "", "limit": "Limite recomendado: 400–800" },
      { "id": "emv", "label": "EMV (Última Tune)", "source": "tune", "field": "emv", "unit": "V", "limit": "Faixa típica: 1200–2500 V" },
      { "id": "m18", "label": "m/z 18 (Umidade)", "source": "tune", "field": "m18", "unit": "%", "limit": "Limite: < 10% rel. m/z 69" },
      { "id": "m28", "label": "m/z 28 (N₂ – Vazam.)", "source": "tune", "field": "m28", "unit": "%", "limit": "Limite: < 10% rel. m/z 69" },
      { "id": "m32", "label": "m/z 32 (O₂ – Vazam.)", "source": "tune", "field": "m32", "unit": "%", "limit": "Limite: < 2% rel. m/z 69" }
    ],
    "checklist": [
      "Verificar energia e LEDs de status (Power, Vacuum, Tune)",
      "Confirmar pressão do gás de arraste (He) no cilindro",
      "Registrar Tambiente (temperatura do laboratório)",
      "Verificar pressão no injetor e registrar em psi",
      "Confirmar nível de óleo da bomba foreline",
      "Verificar parâmetros de vácuo e temperatura no software",
      "Checar ausência de mensagens de erro no TSQ Series",
      "Registrar número de injeções do dia e acumular no liner"
    ],
    "troubleshoot": [
      {
        "symptom": "⚡ Perda de sensibilidade / queda repentina de sinal",
        "severity": "alert",
        "causes": "Fonte EI contaminada, vazamento de vácuo, coluna contaminada ou sangramento excessivo, filamento danificado, electron multiplier envelhecido, gases contaminados ou pressão incorreta, problemas de tune/calibração.",
        "steps": [
          "Verificar background: m/z 18 (H2O), m/z 28 (N2) e m/z 32 (O2). Valores elevados indicam contaminação ou vazamento.",
          "Verificar pressão/vácuo: estabilidade da bomba turbo, manifold pressure.",
          "Rodar EI Full Tune (PFTBA): Avaliar abundância, resolução, EMV e emissão do filamento.",
          "Verificar filamento: corrente de emissão, alternar para filamento 2.",
          "Verificar se o EMV está próximo ou acima de 2500V; se sim, considerar substituição de electron multiplier.",
          "Inspecionar e limpar fonte: ion volume, repeller, lenses.",
          "Avaliar coluna/inlet: liner, septo, e em último caso corte de 2-5 cm.",
          "Verificar gases: He e Ar, traps/reguladores."
        ]
      },
      {
        "symptom": "🌡️ Temperatura da interface instável ou acima do limite",
        "severity": "warn",
        "causes": "Transfer line desconectada ou com mau contato; superaquecimento da coluna cromatográfica; configuração de método incorreta.",
        "steps": [
          "Verificar a temperatura definida no método: Transfer Line Max = 400 °C absoluto",
          "Conferir se a coluna instalada é compatível com a temperatura programada.",
          "Reconectar o cabo da transfer line ao MS e verificar no software TSQ Series se o valor está sendo lido corretamente.",
          "Verificar aumento do background em massas típicas de sangramento (ex: m/z 207, 281, 355)"
        ]
      },
      {
        "symptom": "💧 m/z 18 elevado (umidade na fonte)",
        "severity": "warn",
        "causes": "Fonte de íons aberta recentemente (sistema ainda em equilíbrio); vazamento de água no gás de arraste; coluna não condicionada; instrumento recém-ligado.",
        "steps": [
          "Aguardar ≥ 2 horas após ligar o sistema para o vácuo estabilizar.",
          "Verificar o cilindro de He: usar He ultra-puro (pureza ≥ 99,999%). Checar armadilha de água/O₂ inline.",
          "Condicionar a coluna antes de realizar tuning — programação de forno crescente.",
          "Se m/z 18 > 10% persiste, limpar a fonte de íons."
        ]
      },
      {
        "symptom": "🔴 m/z 28 ou m/z 32 elevados (vazamento de ar)",
        "severity": "alert",
        "causes": "Vazamento na conexão da coluna ao injetor ou ao MS; o-ring do manifold danificado; liner ou septo com mau contato; fitting da transfer line frouxo.",
        "steps": [
          "Verificar com leak detector ou isobutano (método de exclusão) todas as conexões: injetor, transfer line, manifold door.",
          "Checar septo do injetor — substituir se necessário (uso recomendado: <150 injeções).",
          "Verificar o o-ring do manifold door e o vent valve o-ring.",
          "Se m/z 32 > 2%, parar imediatamente as corridas — o O₂ deteriora o filamento e os componentes do eletromultiplicadora.",
          "Reconectar a coluna ao MS com o procedimento correto de SilTite fitting."
        ]
      },
      {
        "symptom": "📉 EMV crescente a cada tune (> 2200 V)",
        "severity": "warn",
        "causes": "Desgaste natural do electron multiplier (MCP); contaminação por amostras de alta concentração; operação em pressão subótima.",
        "steps": [
          "Monitorar tendência do EMV nos tunes consecutivos — crescimento contínuo indica fim de vida.",
          "Se EMV > 2500 V com baixa sensibilidade, solicitar substituição do electron multiplier (MCP plate).",
          "Manter o melhor vácuo possível: verificar óleo da bomba foreline mensalmente.",
          "Limitar corridas a alta concentração — usar diluições ou injeção split agressivo."
        ]
      },
      {
        "symptom": "⏱️ Variação de tempo de retenção do PI (tR)",
        "severity": "warn",
        "causes": "Variação de pressão no injetor; coluna degradada ou com volume morto; temperatura do forno instável; troca de lote de gás de arraste.",
        "steps": [
          "Verificar a pressão no injetor (registrar diariamente) — comparar com valores históricos.",
          "Verificar a temperatura do forno do GC no início e fim da corrida.",
          "Confirmar que o liner está limpo e com volume morto mínimo.",
          "Se o tR mudou > 0.05 min em relação ao histórico, investigar antes de injetar amostras reais.",
          "Realizar corte da coluna (2–5 cm) se observado alargamento de pico além do corte."
        ]
      },
      {
        "symptom": "🔧 Falha ao iniciar — bomba ou vácuo não estabelecido",
        "severity": "alert",
        "causes": "Bomba foreline sem óleo ou com óleo saturado; o-ring do manifold mal posicionado; vent valve aberta; falha elétrica da bomba turbomolecular.",
        "steps": [
          "Verificar nível e qualidade do óleo da bomba foreline antes de ligar.",
          "Confirmar que o vent valve knob está totalmente fechado (girar 1,5 voltas horário após venting).",
          "Verificar se o manifold door está travado corretamente (4 parafusos T20).",
          "Seguir procedimento completo de Power On: Powering On the TSQ 9610 System (Hardware Manual, Cap. 1).",
          "Se turbomolecular não atingir velocidade em 10 min, contatar suporte Thermo Fisher Scientific."
        ]
      }
    ],
    "maintenanceSchedule": [
      { "component": "Liner (Injetor)", "frequency": "A cada 400-800 injeções", "check": "log:liner" },
      { "component": "Septo (Injetor)", "frequency": "A cada 150 injeções", "check": "log:septo" },
      { "component": "Corte de Coluna (1D)", "frequency": "Sempre que houver perda de resolução ou alteração de tR", "check": "log:corte" },
      { "component": "Limpeza da Fonte", "frequency": "Conforme EMV/sensibilidade", "check": "log:limpfonte" },
      { "component": "Óleo da Bomba Foreline", "frequency": "Anual ou em caso de contaminação", "check": "log:trocaoleo" }
    ]
  },
  "generic-hplc": {
    "hasTune": false,
    "hasVacuumIntegrity": false,
    "hasTroubleshoot": true,
    "details": {
      "model": "HPLC-UV Genérico",
      "description": "Sistema de Cromatografia Líquida de Alta Eficiência com detector de Absorção UV/Visível.",
      "tags": ["HPLC", "Fase Reversa", "Detector UV/Vis", "Pressão Máx. 400 bar"],
      "specs": [
        { "label": "Pressão Máxima de Operação", "value": "400 bar" },
        { "label": "Faixa de Vazão", "value": "0.01 – 10.0 mL/min" },
        { "label": "Wavelength UV", "value": "190 – 900 nm" },
        { "label": "Compartimento Coluna", "value": "0 – 80 °C" },
        { "label": "Capacidade Auto-amostrador", "value": "120 Vials" }
      ]
    },
    "logFields": [
      { "id": "pressure", "label": "Pressão de Operação (bar)", "type": "number", "step": 1, "category": "hplc", "placeholder": "150" },
      { "id": "flow", "label": "Fluxo da Bomba (mL/min)", "type": "number", "step": 0.01, "category": "hplc", "placeholder": "1.00" },
      { "id": "wavelength", "label": "Comprimento de Onda (nm)", "type": "number", "step": 1, "category": "hplc", "placeholder": "254" },
      { "id": "mobile_phase", "label": "Fase Móvel Ativa", "type": "text", "category": "hplc", "placeholder": "A: Água / B: Acetonitrila (50:50)" },
      { "id": "lamp_energy", "label": "Energia da Lâmpada D2 (AU)", "type": "number", "step": 1, "category": "hplc", "placeholder": "1200" },
      { "id": "purga", "label": "Purga Realizada?", "type": "select", "options": ["Não", "SIM"], "category": "preventives" },
      { "id": "frit", "label": "Troca de Frita/Filtro Online", "type": "select", "options": ["Não", "SIM"], "category": "preventives" },
      { "id": "seal_change", "label": "Troca de Selos do Pistão", "type": "select", "options": ["Não", "SIM"], "category": "preventives" }
    ],
    "tuneFields": [],
    "statusRules": {
      "offline": { "field": "sistema", "operator": "in", "values": ["Não", "Nao", "n", "NÃO", "não"] },
      "noop": [
        { "field": "pressure", "operator": ">=", "value": 380 },
        { "field": "lamp_energy", "operator": "<=", "value": 300 }
      ],
      "alert": [
        { "field": "pressure", "operator": ">=", "value": 300 },
        { "field": "lamp_energy", "operator": "<=", "value": 600 }
      ]
    },
    "kpis": [
      { "id": "pressure", "label": "Pressão Ativa", "source": "log", "field": "pressure", "unit": "bar", "statusField": "pressure" },
      { "id": "flow", "label": "Vazão Programada", "source": "log", "field": "flow", "unit": "mL/min" },
      { "id": "lamp_energy", "label": "Energia Lâmpada UV", "source": "log", "field": "lamp_energy", "unit": "AU" },
      { "id": "wavelength", "label": "Comprimento Onda", "source": "log", "field": "wavelength", "unit": "nm" }
    ],
    "checklist": [
      "Verificar se há vazamentos nas conexões capilares (PEEK ou inox)",
      "Confirmar o nível das garrafas de fase móvel e descarte",
      "Garantir a ausência de bolhas na bomba (purgar se necessário)",
      "Ligar a lâmpada D2 e aguardar estabilização de baseline",
      "Verificar se a temperatura do compartimento da coluna está ajustada",
      "Registrar a pressão de operação estável"
    ],
    "troubleshoot": [
      {
        "symptom": "⚠️ Pressão do sistema muito alta (> 300 bar)",
        "severity": "warn",
        "causes": "Entupimento da coluna cromatográfica, frita pré-coluna entupida, sal precipitado em tampões.",
        "steps": [
          "Desconectar a coluna e verificar a pressão residual; se a pressão cair, o entupimento é na coluna.",
          "Verificar e substituir a frita do filtro de entrada ou pré-coluna.",
          "Lavar o sistema com água morna se houver suspeita de sal precipitado."
        ]
      },
      {
        "symptom": "📉 Baseline instável ou com ruído excessivo",
        "severity": "warn",
        "causes": "Bolhas de ar na cabeça da bomba, energia da lâmpada UV baixa, flutuação de temperatura.",
        "steps": [
          "Realizar procedimento de purga (purge) a 5.0 mL/min com fase móvel degaseificada por 5 minutos.",
          "Verificar a energia da lâmpada; considerar substituição se estiver < 300 AU.",
          "Garantir que a tampa do compartimento da coluna esteja totalmente fechada."
        ]
      }
    ],
    "maintenanceSchedule": [
      { "component": "Filtro Pré-Coluna", "frequency": "A cada 300 injeções ou alteração de pressão", "check": "log:frit" },
      { "component": "Selo de Pistão", "frequency": "Semestral ou em vazamento", "check": "log:seal_change" },
      { "component": "Lâmpada D2 (UV)", "frequency": "A cada 2000 horas de uso", "check": "log:lamp_energy" }
    ]
  },
  "generic-hplc": {
    "hasTune": false,
    "hasVacuumIntegrity": false,
    "hasTroubleshoot": true,
    "details": {
      "model": "HPLC-UV Genérico",
      "description": "Sistema de Cromatografia Líquida de Alta Eficiência com detector de Absorção UV/Visível.",
      "tags": ["HPLC", "Fase Reversa", "Detector UV/Vis", "Pressão Máx. 400 bar"],
      "specs": [
        { "label": "Pressão Máxima de Operação", "value": "400 bar" },
        { "label": "Faixa de Vazão", "value": "0.01 – 10.0 mL/min" },
        { "label": "Wavelength UV", "value": "190 – 900 nm" },
        { "label": "Compartimento Coluna", "value": "0 – 80 °C" },
        { "label": "Capacidade Auto-amostrador", "value": "120 Vials" }
      ]
    },
    "logFields": [
      { "id": "pressure", "label": "Pressão de Operação (bar)", "type": "number", "step": 1, "category": "hplc", "placeholder": "150" },
      { "id": "flow", "label": "Fluxo da Bomba (mL/min)", "type": "number", "step": 0.01, "category": "hplc", "placeholder": "1.00" },
      { "id": "wavelength", "label": "Comprimento de Onda (nm)", "type": "number", "step": 1, "category": "hplc", "placeholder": "254" },
      { "id": "mobile_phase", "label": "Fase Móvel Ativa", "type": "text", "category": "hplc", "placeholder": "A: Água / B: Acetonitrila (50:50)" },
      { "id": "lamp_energy", "label": "Energia da Lâmpada D2 (AU)", "type": "number", "step": 1, "category": "hplc", "placeholder": "1200" },
      { "id": "purga", "label": "Purga Realizada?", "type": "select", "options": ["Não", "SIM"], "category": "preventives" },
      { "id": "frit", "label": "Troca de Frita/Filtro Online", "type": "select", "options": ["Não", "SIM"], "category": "preventives" },
      { "id": "seal_change", "label": "Troca de Selos do Pistão", "type": "select", "options": ["Não", "SIM"], "category": "preventives" }
    ],
    "tuneFields": [],
    "statusRules": {
      "offline": { "field": "sistema", "operator": "in", "values": ["Não", "Nao", "n", "NÃO", "não"] },
      "noop": [
        { "field": "pressure", "operator": ">=", "value": 380 },
        { "field": "lamp_energy", "operator": "<=", "value": 300 }
      ],
      "alert": [
        { "field": "pressure", "operator": ">=", "value": 300 },
        { "field": "lamp_energy", "operator": "<=", "value": 600 }
      ]
    },
    "kpis": [
      { "id": "pressure", "label": "Pressão Ativa", "source": "log", "field": "pressure", "unit": "bar", "statusField": "pressure" },
      { "id": "flow", "label": "Vazão Programada", "source": "log", "field": "flow", "unit": "mL/min" },
      { "id": "lamp_energy", "label": "Energia Lâmpada UV", "source": "log", "field": "lamp_energy", "unit": "AU" },
      { "id": "wavelength", "label": "Comprimento Onda", "source": "log", "field": "wavelength", "unit": "nm" }
    ],
    "checklist": [
      "Verificar se há vazamentos nas conexões capilares (PEEK ou inox)",
      "Confirmar o nível das garrafas de fase móvel e descarte",
      "Garantir a ausência de bolhas na bomba (purgar se necessário)",
      "Ligar a lâmpada D2 e aguardar estabilização de baseline",
      "Verificar se a temperatura do compartimento da coluna está ajustada",
      "Registrar a pressão de operação estável"
    ],
    "troubleshoot": [
      {
        "symptom": "⚠️ Pressão do sistema muito alta (> 300 bar)",
        "severity": "warn",
        "causes": "Entupimento da coluna cromatográfica, frita pré-coluna entupida, sal precipitado em tampões.",
        "steps": [
          "Desconectar a coluna e verificar a pressão residual; se a pressão cair, o entupimento é na coluna.",
          "Verificar e substituir a frita do filtro de entrada ou pré-coluna.",
          "Lavar o sistema com água morna se houver suspeita de sal precipitado."
        ]
      },
      {
        "symptom": "📉 Baseline instável ou com ruído excessivo",
        "severity": "warn",
        "causes": "Bolhas de ar na cabeça da bomba, energia da lâmpada UV baixa, flutuação de temperatura.",
        "steps": [
          "Realizar procedimento de purga (purge) a 5.0 mL/min com fase móvel degaseificada por 5 minutos.",
          "Verificar a energia da lâmpada; considerar substituição se estiver < 300 AU.",
          "Garantir que a tampa do compartimento da coluna esteja totalmente fechada."
        ]
      }
    ],
    "maintenanceSchedule": [
      { "component": "Filtro Pré-Coluna", "frequency": "A cada 300 injeções ou alteração de pressão", "check": "log:frit" },
      { "component": "Selo de Pistão", "frequency": "Semestral ou em vazamento", "check": "log:seal_change" },
      { "component": "Lâmpada D2 (UV)", "frequency": "A cada 2000 horas de uso", "check": "log:lamp_energy" }
    ]
  }
};

module.exports = configs;
