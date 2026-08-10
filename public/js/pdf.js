// PDF Report Generator Module.
// Uses jsPDF loaded via CDN on index.html.

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generatePDF(yr, tuneData, savedLogs, correctiveRecords, config) {
  const overlay = document.getElementById('pdf-overlay');
  if (overlay) overlay.classList.add('show');
  
  const status = document.getElementById('pdf-status');
  if (status) status.textContent = 'Iniciando geração do relatório...';

  try {
    await sleep(200);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297;

    // Light-theme color palette
    const hex2rgb = hex => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });
    const teal = hex2rgb('#0d9488'); 
    const tealDim = hex2rgb('#0f766e'); 
    const amber = hex2rgb('#d97706'); 
    const red = hex2rgb('#dc2626'); 
    const green = hex2rgb('#059669'); 
    const blue = hex2rgb('#2563eb'); 
    const bgPage = [248, 250, 252]; 
    const bgCard = [255, 255, 255]; 
    const bgAlt = [241, 245, 249]; 
    const txtMain = [15, 23, 42];  
    const txtMuted = [100, 116, 139]; 
    const txtLabel = [71, 85, 105];  
    const borderC = [226, 232, 240]; 

    const parseYear = s => {
      if (!s) return null;
      const m = String(s).trim().match(/\b(20\d{2})\b/);
      return m ? parseInt(m[1]) : null;
    };

    const tunesYr = tuneData.filter(t => parseYear(t.date) === yr);
    const logsYr = savedLogs.filter(l => parseYear(l.date) === yr);
    const corrYr = correctiveRecords.filter(r => parseYear(r.date) === yr);

    // Dynamic metrics calculation
    const totalInj = logsYr.reduce((s, l) => s + (parseInt(l.inj) || 0), 0);
    const maintenanceFlag = config.hasTune ? 'limpfonte' : 'filter_change';
    const maintenanceCount = logsYr.filter(l => l[maintenanceFlag] === 'SIM').length;

    // ---- PAGE 1: COVER ----
    if (status) status.textContent = 'Gerando capa do relatório...';
    await sleep(200);
    
    // Page background
    doc.setFillColor(...bgPage); doc.rect(0, 0, W, H, 'F');
    // Header strip
    doc.setFillColor(teal.r, teal.g, teal.b); doc.rect(0, 0, W, 52, 'F');
    doc.setFillColor(tealDim.r, tealDim.g, tealDim.b); doc.rect(0, 52, W, 3, 'F');

    // Title block
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('RELATÓRIO ANUAL DE ACOMPANHAMENTO DE EQUIPAMENTO', 105, 18, { align: 'center' });
    
    const tagText = config.details.tags ? config.details.tags.join(' · ') : '';
    doc.text(tagText.toUpperCase(), 105, 25, { align: 'center' });
    
    doc.setFontSize(26); doc.setTextColor(255, 255, 255);
    doc.text(config.details.model || 'Equipamento', 105, 40, { align: 'center' });
    
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(209, 250, 229);
    doc.text(config.details.description || '', 105, 49, { align: 'center' });

    // Year badge
    doc.setFillColor(teal.r, teal.g, teal.b); doc.roundedRect(75, 60, 60, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
    doc.text('Ano de Referência: ' + yr, 105, 69, { align: 'center' });

    // Dynamic specifications table
    const infoY = 82;
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('IDENTIFICAÇÃO DO EQUIPAMENTO', 20, infoY);
    doc.setDrawColor(...borderC); doc.setLineWidth(.4); doc.line(20, infoY + 2, 190, infoY + 2);

    const rows = [
      ['Equipamento', config.details.model || '—'],
      ...((config.details.specs || []).map(s => [s.label, s.value])),
      ['Data do Relatório', new Date().toLocaleDateString('pt-BR')]
    ];

    rows.forEach((r, i) => {
      const y = infoY + 10 + i * 8;
      doc.setFillColor(...(i % 2 === 0 ? bgAlt : [255,255,255]));
      doc.rect(20, y - 5, 170, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...txtMuted);
      doc.text(r[0], 24, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...txtMain);
      doc.text(r[1], 90, y);
    });

    // KPI Summary
    const sumY = infoY + 100;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('RESUMO OPERACIONAL ' + yr, 20, sumY);
    doc.setDrawColor(...borderC); doc.line(20, sumY + 2, 190, sumY + 2);

    const kpiColor = (st) => st === 'ok' ? green : st === 'warn' ? amber : red;
    
    // Standard and specific KPIs
    const kpiList = [
      [String(logsYr.length), 'Dias Registrados', 'ok'],
      [String(totalInj), 'Total de Injeções', 'ok'],
      [String(corrYr.length), 'Manutenções Corretivas', corrYr.length > 0 ? 'alert' : 'ok'],
    ];
    if (config.hasTune) {
      const lastEMV = tunesYr.length > 0 ? tunesYr[tunesYr.length - 1].emv : '—';
      const emvStatus = lastEMV > 2200 ? 'alert' : lastEMV > 1800 ? 'warn' : 'ok';
      kpiList.push([String(tunesYr.length), 'Tunes Realizados', 'ok']);
      kpiList.push([String(maintenanceCount), 'Limpezas da Fonte', maintenanceCount === 0 ? 'warn' : 'ok']);
      kpiList.push([lastEMV + ' V', 'Último EMV', emvStatus]);
    } else {
      kpiList.push([String(maintenanceCount), 'Intervenções Preventivas', 'ok']);
    }

    kpiList.forEach((k, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const bx = 20 + col * 60, by = sumY + 8 + row * 22;
      const clr = kpiColor(k[2]);
      doc.setFillColor(...bgCard); doc.roundedRect(bx, by, 55, 18, 2, 2, 'F');
      doc.setDrawColor(clr.r, clr.g, clr.b); doc.setLineWidth(.6); doc.roundedRect(bx, by, 55, 18, 2, 2, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(clr.r, clr.g, clr.b);
      doc.text(k[0], bx + 27.5, by + 11, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...txtMuted);
      doc.text(k[1], bx + 27.5, by + 16.5, { align: 'center' });
    });

    // ---- PAGE 2: HISTÓRICO DE TUNE (If applicable) ----
    if (config.hasTune) {
      if (status) status.textContent = 'Compilando histórico de tune...';
      await sleep(200);
      doc.addPage();
      doc.setFillColor(...bgPage); doc.rect(0, 0, W, H, 'F');
      doc.setFillColor(teal.r, teal.g, teal.b); doc.rect(0, 0, W, 16, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
      doc.text(`${config.details.model} · RELATÓRIO ANUAL ${yr}`, 20, 10);
      doc.text('HISTÓRICO DE TUNE', 190, 10, { align: 'right' });

      doc.setFontSize(14); doc.setTextColor(...txtMain);
      doc.text('Histórico de Tune — Parâmetros Registrados', 20, 28);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...txtMuted);
      doc.text('Calibrante PFTBA · Ionização EI · ' + tunesYr.length + ' tunes realizados em ' + yr, 20, 34);

      const th = ['Tune', 'Data', 'Operador', 'Fil', 'EMV(V)', 'T.Int(°C)', 'm/z69', 'm/z219', 'm/z502', 'm/z18', 'm/z28', 'm/z32'];
      const colsSizes = [15, 22, 26, 12, 16, 16, 12, 16, 16, 12, 12, 12];
      let tx = 12, ty = 44;
      doc.setFillColor(...bgAlt); doc.rect(10, ty - 6, 190, 9, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(teal.r, teal.g, teal.b);
      let cx = tx;
      th.forEach((h, i) => { doc.text(h, cx, ty); cx += colsSizes[i]; });
      
      tunesYr.forEach((t, ri) => {
        ty += 10;
        doc.setFillColor(...(ri % 2 === 0 ? bgAlt : [255,255,255]));
        doc.rect(10, ty - 6, 190, 9, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        const row = ['#' + t.num, t.date, t.op, 'Fil.' + t.fil, '' + t.emv, '' + t.tint, '' + t.m69, '' + t.m219, '' + t.m502, '' + t.m18, '' + t.m28, '' + t.m32];
        cx = tx;
        row.forEach((val, i) => {
          let clr = [...txtMain];
          if (i === 4 && t.emv > 2200) clr = [amber.r, amber.g, amber.b];
          if (i === 9 && t.m18 > 7) clr = [amber.r, amber.g, amber.b];
          if (i === 10 && t.m28 > 7) clr = [amber.r, amber.g, amber.b];
          if (i === 11 && t.m32 > 1.5) clr = [red.r, red.g, red.b];
          doc.setTextColor(...clr);
          doc.text(val, cx, ty); cx += colsSizes[i];
        });
      });
      ty += 18;
      
      // Limits Legend
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(teal.r, teal.g, teal.b);
      doc.text('LIMITES DE REFERÊNCIA', 20, ty);
      doc.setDrawColor(...borderC); doc.line(20, ty + 2, 190, ty + 2);
      const limits = [
        'EMV — Faixa normal: 1200 a 2500 V. Acima de 2500 V: considerar substituição do electron multiplier.',
        'm/z 18 (umidade) — Limite: < 10% relativo ao m/z 69. Valores altos indicam contaminação da fonte ou vazamento.',
        'm/z 28 (N2) — Limite: < 10% relativo ao m/z 69. Valores altos indicam vazamento de ar.',
        'm/z 32 (O2) — Limite: < 2% relativo ao m/z 69. Valores acima deste limite deterioram filamento e detector.',
        'm/z 219 e m/z 502 — Rastreiam a qualidade do tune com o calibrante PFTBA.'
      ];
      limits.forEach((l, i) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...txtMuted);
        doc.text('•  ' + l, 20, ty + 10 + i * 8, { maxWidth: 170 });
      });
    }

    // ---- PAGE 3: MANUTENÇÃO PREVENTIVA ----
    if (status) status.textContent = 'Gerando plano de manutenção...';
    await sleep(200);
    doc.addPage();
    doc.setFillColor(...bgPage); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(teal.r, teal.g, teal.b); doc.rect(0, 0, W, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text(`${config.details.model} · RELATÓRIO ANUAL ${yr}`, 20, 10);
    doc.text('MANUTENÇÃO PREVENTIVA', 190, 10, { align: 'right' });

    doc.setFontSize(14); doc.setTextColor(...txtMain);
    doc.text('Manutenção Preventiva — Plano e Execução', 20, 28);

    const lastOf = (field) => { 
      const l = [...logsYr].reverse().find(x => x[field] === 'SIM'); 
      return l ? l.date : 'Não registrado'; 
    };

    // Build preventive items list dynamically based on config
    let my = 40;
    doc.setFillColor(...bgAlt); doc.rect(10, my, 190, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('COMPONENTE', 14, my + 6.5);
    doc.text('FREQUÊNCIA', 55, my + 6.5);
    doc.text('ÚLTIMA REALIZ.', 95, my + 6.5);
    doc.text('STATUS', 130, my + 6.5);
    doc.text('OBSERVAÇÕES', 150, my + 6.5);

    const schedule = config.maintenanceSchedule || [];
    schedule.forEach((item, ri) => {
      my += 10;
      doc.setFillColor(...bgPage); doc.rect(10, my, 190, 20, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...txtMain);
      doc.text(item.component, 14, my + 5);
      
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...txtLabel);
      doc.text(item.frequency, 55, my + 5, { maxWidth: 38 });

      // Check field from logs
      let lastDate = '—';
      let statusLabel = 'OK';
      let statusColor = green;
      let obs = '';

      if (item.check && item.check.startsWith('log:')) {
        const fieldName = item.check.split(':')[1];
        lastDate = lastOf(fieldName);
        
        if (fieldName === 'liner' && totalInj > 600) {
          statusLabel = 'MONITORAR';
          statusColor = amber;
          obs = `${totalInj} injeções acumuladas no ano.`;
        } else if (lastDate === 'Não registrado') {
          statusLabel = 'ATENÇÃO';
          statusColor = amber;
          obs = 'Nenhum registro encontrado no ano.';
        } else {
          obs = `Intervenção realizada em ${lastDate}.`;
        }
      }

      doc.setTextColor(...txtLabel);
      doc.text(lastDate, 95, my + 5);
      
      doc.setTextColor(statusColor.r, statusColor.g, statusColor.b); doc.setFont('helvetica', 'bold');
      doc.text(statusLabel, 130, my + 5);
      
      doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
      doc.text(obs, 150, my + 5, { maxWidth: 46 });
      my += 10;
    });

    // ---- PAGE 4: ISSUES & DIAGNOSTICS ----
    if (status) status.textContent = 'Compilando guia de diagnósticos...';
    await sleep(200);
    doc.addPage();
    doc.setFillColor(...bgPage); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(teal.r, teal.g, teal.b); doc.rect(0, 0, W, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text(`${config.details.model} · RELATÓRIO ANUAL ${yr}`, 20, 10);
    doc.text('DIAGNÓSTICO E OCORRÊNCIAS', 190, 10, { align: 'right' });

    doc.setFontSize(14); doc.setTextColor(...txtMain);
    doc.text('Diagnósticos e Ocorrências', 20, 28);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...txtMuted);
    doc.text('Principais incidências e alertas operacionais durante o período.', 20, 35);

    if (corrYr.length === 0) {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129);
      doc.text('Sem ocorrências de manutenção corretiva registradas no ano de ' + yr + '.', 20, 48);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
      doc.text(`O sistema operou de forma estável. Total de ${totalInj} injeções registradas.`, 20, 56);
    } else {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(amber.r, amber.g, amber.b);
      doc.text(`${corrYr.length} manutenção(ões) corretiva(s) registrada(s) em ${yr}.`, 20, 48);
    }

    // Dynamic attention alerts based on rules
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('PONTOS DE ATENÇÃO OPERACIONAIS', 20, 78);
    doc.line(20, 80, 190, 80);

    const alerts = [];
    if (totalInj > 600) {
      alerts.push(['!', `Injeções elevadas no período (${totalInj}) — programar manutenção preventiva.`, [amber.r, amber.g, amber.b]]);
    }
    if (config.hasTune && tunesYr.length > 0) {
      const lastTune = tunesYr[tunesYr.length - 1];
      if (lastTune.emv > 1800) {
        alerts.push(['i', `Tensão de EMV em ${lastTune.emv}V. Monitorar desgaste do multiplicador de elétrons.`, [100, 116, 139]]);
      }
      if (lastTune.m18 > 7) {
        alerts.push(['!', `Nível de umidade (m/z 18) elevado: ${lastTune.m18}%. Limpar a fonte de íons.`, [amber.r, amber.g, amber.b]]);
      }
      if (lastTune.m32 > 1.5) {
        alerts.push(['!', `Risco de vazamento de ar (m/z 32: ${lastTune.m32}%). Checar conexões.`, [red.r, red.g, red.b]]);
      }
    }
    if (maintenanceCount === 0) {
      alerts.push(['!', 'Nenhuma manutenção preventiva cadastrada neste ano. Agendar revisão.', [amber.r, amber.g, amber.b]]);
    }
    if (alerts.length === 0) {
      alerts.push(['v', 'Todos os sistemas avaliados operam em condições ideais.', [16, 185, 129]]);
    }

    let ay = 88;
    alerts.forEach(a => {
      doc.setFillColor(...bgPage); doc.roundedRect(18, ay - 5, 174, 14, 2, 2, 'F');
      doc.setDrawColor(a[2][0], a[2][1], a[2][2]); doc.setLineWidth(.4); doc.roundedRect(18, ay - 5, 174, 14, 2, 2, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(a[2][0], a[2][1], a[2][2]);
      doc.text(a[0], 23, ay + 2.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...txtMuted);
      doc.text(a[1], 30, ay + 2.5, { maxWidth: 158 });
      ay += 18;
    });

    // ---- PAGE 5: SIGNATURES & CORRECTIVE LOG ----
    if (status) status.textContent = 'Gerando assinaturas e logs...';
    await sleep(200);
    doc.addPage();
    doc.setFillColor(...bgPage); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(teal.r, teal.g, teal.b); doc.rect(0, 0, W, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text(`${config.details.model} · RELATÓRIO ANUAL ${yr}`, 20, 10);
    doc.text('MANUTENÇÕES CORRETIVAS E RECOMENDAÇÕES', 190, 10, { align: 'right' });

    doc.setFontSize(14); doc.setTextColor(...txtMain);
    doc.text('Manutenções Corretivas Registradas', 20, 28);

    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(teal.r, teal.g, teal.b);
    doc.text('LOG DE EVENTOS', 20, 42);
    doc.setDrawColor(...borderC); doc.line(20, 44, 190, 44);

    let p5y = 50;
    if (corrYr.length === 0) {
      doc.setFillColor(...bgAlt); doc.roundedRect(18, p5y, 174, 16, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(green.r, green.g, green.b);
      doc.text('Nenhuma manutenção corretiva registrada em ' + yr + '. Sistema estável.', 24, p5y + 10);
      p5y += 24;
    } else {
      corrYr.forEach((r, i) => {
        if (p5y > 180) return; // Avoid overflow on final page
        doc.setFillColor(...bgCard); doc.roundedRect(18, p5y, 174, 30, 2, 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(amber.r, amber.g, amber.b);
        doc.text(r.date + ' — ' + r.resp + ' | Supervisão: ' + r.sup, 22, p5y + 8);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...txtMain);
        doc.text('Problema: ', 22, p5y + 15);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...txtMuted);
        doc.text(r.prob, 44, p5y + 15, { maxWidth: 148 });
        doc.setFont('helvetica', 'bold'); doc.setTextColor(teal.r, teal.g, teal.b);
        doc.text('Ação: ', 22, p5y + 22);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...txtMuted);
        doc.text(r.proc, 36, p5y + 22, { maxWidth: 154 });
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...txtLabel);
        doc.text('Resultado: ', 22, p5y + 28);
        doc.setFont('helvetica', 'normal');
        doc.text(r.result, 48, p5y + 28, { maxWidth: 144 });
        p5y += 36;
      });
    }

    // Signature block
    p5y = 220;
    doc.setFillColor(...bgCard); doc.roundedRect(18, p5y, 174, 38, 2, 2, 'F');
    doc.setDrawColor(...borderC); doc.setLineWidth(.4); doc.roundedRect(18, p5y, 174, 38, 2, 2, 'S');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...txtMuted);
    doc.text('ASSINATURAS E VALIDAÇÃO', 105, p5y + 8, { align: 'center' });
    
    doc.setDrawColor(...borderC);
    doc.line(30, p5y + 22, 90, p5y + 22);
    doc.line(120, p5y + 22, 180, p5y + 22);
    
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...txtMuted);
    doc.text('Responsável pelo Equipamento', 60, p5y + 28, { align: 'center' });
    doc.text('Supervisão / Aprovação', 150, p5y + 28, { align: 'center' });
    doc.text('Data: ___/___/______', 60, p5y + 35, { align: 'center' });
    doc.text('Data: ___/___/______', 150, p5y + 35, { align: 'center' });

    // Header/Footer post-process
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(...bgAlt); doc.rect(0, H - 14, W, 14, 'F');
      doc.setDrawColor(...borderC); doc.line(20, H - 14, W - 20, H - 14);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...txtMuted);
      doc.text(`Relatório Anual · ${config.details.model} · Código: ${config.details.tags[1] || '—'}`, 20, H - 5);
      doc.text('Página ' + i + ' de ' + totalPages, W - 20, H - 5, { align: 'right' });
    }

    if (status) status.textContent = 'Salvando arquivo PDF...';
    await sleep(300);
    doc.save(`Relatorio_Anual_${config.details.model.replace(/ /g, '_')}_${yr}.pdf`);
    if (overlay) overlay.classList.remove('show');
  } catch (e) {
    console.error(e);
    if (overlay) overlay.classList.remove('show');
    alert('Erro ao gerar PDF. Por favor tente novamente.');
  }
}
