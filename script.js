/* ════════════════════════════════════════════════════
   EISENFLOW — script.js
   Pure JavaScript · No frameworks · No dependencies
   localStorage para persistência entre sessões
════════════════════════════════════════════════════ */

'use strict';

/* ── CONSTANTS ─────────────────────────────────────── */

const STORAGE_KEY = 'eisenflow_tasks_v2';

const SCORE_WEIGHTS = {
  impact:     30,
  urgency:    25,
  deadline:   20,   // calculado via esforço × inverso_delegação
  effort:     10,   // maior esforço = menor score (penalidade)
  dependency: 10,   // delegável = menor prioridade pessoal
  risk:        5,
};

const LEVEL = { 3: 'Alto', 2: 'Médio', 1: 'Baixo' };
const URGENCY_LABEL  = { 3: 'Alta', 2: 'Média', 1: 'Baixa' };
const IMPACT_LABEL   = { 3: 'Alto', 2: 'Médio', 1: 'Baixo' };
const EFFORT_LABEL   = { 3: 'Alto', 2: 'Médio', 1: 'Baixo' };

const QUADRANTS = {
  iu: { label: 'Fazer Agora',      color: '#f5a623' },
  in: { label: 'Planejar',         color: '#2dd4bf' },
  nu: { label: 'Delegar',          color: '#60a5fa' },
  nn: { label: 'Eliminar / Adiar', color: '#555c72' },
};

const ACTION_LABELS = {
  do_now:    'Fazer agora',
  schedule:  'Planejar / Agendar',
  delegate:  'Delegar',
  eliminate: 'Eliminar',
};

/* ── SEED DATA (loaded only when localStorage is empty) ─ */

const SEED_TASKS = [
  {
    id: 'seed_t1',
    title: 'Enviar relatório de expedição',
    nextStep: 'Abrir a planilha de expedição e validar as NFs do dia antes de compilar o relatório.',
    risk: 'Pode atrasar decisões da equipe e gerar cobrança da gestão ainda hoje.',
    urgency: 3, impact: 3, effort: 2, duration: 45,
    canDelegate: false,
    tags: ['NF', 'expedição', 'relatório'],
    done: false, createdAt: Date.now(),
  },
  {
    id: 'seed_t2',
    title: 'Responder e-mail do financeiro',
    nextStep: 'Responder confirmando os dados de expedição solicitados.',
    risk: 'Atraso no fechamento contábil do dia.',
    urgency: 3, impact: 2, effort: 1, duration: 10,
    canDelegate: false,
    tags: ['e-mail', 'financeiro'],
    done: false, createdAt: Date.now() - 1000,
  },
  {
    id: 'seed_t3',
    title: 'Atualizar status das NFs no sistema',
    nextStep: 'Enviar instrução ao assistente com os campos a atualizar.',
    risk: 'Baixo — pode ser feita por qualquer operador treinado.',
    urgency: 3, impact: 1, effort: 1, duration: 15,
    canDelegate: true,
    tags: ['NF', 'sistema'],
    done: false, createdAt: Date.now() - 2000,
  },
  {
    id: 'seed_t4',
    title: 'Confirmar disponibilidade de transportadora',
    nextStep: 'Passar roteiro de confirmação para o assistente.',
    risk: 'Nenhum risco imediato se delegado agora.',
    urgency: 2, impact: 1, effort: 1, duration: 5,
    canDelegate: true,
    tags: ['transportadora', 'logística'],
    done: false, createdAt: Date.now() - 3000,
  },
  {
    id: 'seed_t5',
    title: 'Criar dashboard de KPIs logísticos',
    nextStep: 'Bloquear horário no calendário: quinta-feira, manhã.',
    risk: 'Sem visibilidade de dados = decisões baseadas em feeling.',
    urgency: 1, impact: 3, effort: 3, duration: 180,
    canDelegate: false,
    tags: ['dashboard', 'KPI', 'logística'],
    done: false, createdAt: Date.now() - 4000,
  },
  {
    id: 'seed_t6',
    title: 'Treinar assistente no processo de NFs',
    nextStep: 'Montar roteiro de treinamento antes da sessão.',
    risk: 'Equipe continuará dependente de você para tarefas operacionais.',
    urgency: 1, impact: 2, effort: 2, duration: 90,
    canDelegate: false,
    tags: ['treinamento', 'delegação'],
    done: false, createdAt: Date.now() - 5000,
  },
  {
    id: 'seed_t7',
    title: 'Reorganizar layout da planilha de expedição',
    nextStep: 'Arquivar essa tarefa e revisar no próximo ciclo.',
    risk: 'Nenhum.',
    urgency: 1, impact: 1, effort: 2, duration: 60,
    canDelegate: false,
    tags: ['planilha', 'organização'],
    done: false, createdAt: Date.now() - 6000,
  },
];

/* ── STATE ─────────────────────────────────────────── */

let tasks        = [];
let selectedId   = null;
let editingId    = null;  // null = nova tarefa; string = editando
let focusTask    = null;
let focusInterval = null;
let focusSecsLeft = 0;
let focusTotalSecs = 0;
let focusPaused  = false;
let currentView  = 'matrix';

/* ════════════════════════════════════════════════════
   SCORE ENGINE
════════════════════════════════════════════════════ */

function calcScore(urgency, impact, effort, canDelegate) {
  // urgency: 1-3, impact: 1-3, effort: 1-3, canDelegate: bool
  const u = urgency;  // 1-3
  const i = impact;   // 1-3
  const e = effort;   // 1-3 (mais esforço = penalidade leve)
  const d = canDelegate ? 1 : 0;

  // Normaliza pesos: urgência e impacto dominam
  const score =
    (i / 3)   * SCORE_WEIGHTS.impact   +
    (u / 3)   * SCORE_WEIGHTS.urgency  +
    (u / 3)   * SCORE_WEIGHTS.deadline +  // urgência também representa prazo
    ((3 - e + 1) / 3) * SCORE_WEIGHTS.effort +  // esforço alto = menor score
    ((1 - d) * SCORE_WEIGHTS.dependency) +       // não delegável = mais crítico
    (i / 3)   * SCORE_WEIGHTS.risk;

  return Math.min(100, Math.round(score));
}

function calcQuadrant(urgency, impact) {
  const isImportant = impact >= 2;
  const isUrgent    = urgency >= 2;
  if (isImportant && isUrgent)  return 'iu';
  if (isImportant && !isUrgent) return 'in';
  if (!isImportant && isUrgent) return 'nu';
  return 'nn';
}

function calcAction(quadrant, canDelegate) {
  if (quadrant === 'iu') return canDelegate ? 'delegate' : 'do_now';
  if (quadrant === 'in') return 'schedule';
  if (quadrant === 'nu') return 'delegate';
  return 'eliminate';
}

function buildExplanation(task) {
  const { urgency, impact, effort, canDelegate, quadrant } = task;
  const parts = [];

  if (quadrant === 'iu') {
    parts.push('Essa tarefa tem urgência ' + URGENCY_LABEL[urgency].toLowerCase() +
      ' e impacto ' + IMPACT_LABEL[impact].toLowerCase() + ' — precisa de atenção imediata.');
    if (!canDelegate) parts.push('Não pode ser delegada, então depende diretamente de você.');
    else parts.push('Embora delegável, a urgência justifica sua ação agora.');
  } else if (quadrant === 'in') {
    parts.push('Tarefa importante, mas sem urgência imediata.');
    parts.push('Se não agendada, pode virar urgência futura. Bloqueie tempo na agenda.');
  } else if (quadrant === 'nu') {
    parts.push('Tem pressa, mas o impacto é baixo para exigir seu foco pessoal.');
    parts.push('Delegue e preserve sua energia para o que realmente importa.');
  } else {
    parts.push('Baixo impacto e sem urgência real.');
    parts.push('Elimine ou adie indefinidamente. Não deixe ocupar espaço mental.');
  }

  if (effort === 3) parts.push('O esforço alto sugere dividir em etapas menores.');
  return parts.join(' ');
}

function enrichTask(raw) {
  const score    = calcScore(raw.urgency, raw.impact, raw.effort, raw.canDelegate);
  const quadrant = calcQuadrant(raw.urgency, raw.impact);
  const action   = calcAction(quadrant, raw.canDelegate);
  return {
    ...raw,
    score,
    quadrant,
    action,
    explanation: buildExplanation({ ...raw, quadrant }),
  };
}

/* ════════════════════════════════════════════════════
   PERSISTENCE
════════════════════════════════════════════════════ */

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        tasks = parsed.map(enrichTask);
        return;
      }
    }
  } catch (e) { /* ignore */ }
  // Seed
  tasks = SEED_TASKS.map(enrichTask);
  saveTasks();
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    showToast('Erro ao salvar no navegador.', 'error');
  }
}

function genId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/* ════════════════════════════════════════════════════
   SCORE COLOR
════════════════════════════════════════════════════ */

function scoreColor(score) {
  if (score >= 78) return '#f5a623';
  if (score >= 50) return '#2dd4bf';
  if (score >= 32) return '#60a5fa';
  return '#555c72';
}

function formatDuration(mins) {
  if (mins < 60) return mins + 'min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? h + 'h ' + m + 'min' : h + 'h';
}

/* ════════════════════════════════════════════════════
   RENDER: MATRIX
════════════════════════════════════════════════════ */

function renderMatrix() {
  const active = tasks.filter(t => !t.done);

  ['iu', 'in', 'nu', 'nn'].forEach(q => {
    const container = document.getElementById('q-' + q);
    container.innerHTML = '';
    const qTasks = active.filter(t => t.quadrant === q)
                         .sort((a, b) => b.score - a.score);

    if (qTasks.length === 0) {
      container.innerHTML = '<div class="empty-quadrant">Nenhuma tarefa aqui.</div>';
      return;
    }

    qTasks.forEach(task => {
      const card = buildTaskCard(task);
      container.appendChild(card);
    });
  });

  const avgScore = active.length
    ? Math.round(active.reduce((s, t) => s + t.score, 0) / active.length)
    : 0;

  const metaEl = document.getElementById('matrix-meta-text');
  metaEl.textContent = active.length
    ? active.length + ' tarefa' + (active.length !== 1 ? 's' : '') + ' ativa' + (active.length !== 1 ? 's' : '') +
      ' · Score médio: ' + avgScore
    : 'Nenhuma tarefa ativa. Adicione uma atividade!';

  metaEl.style.color = active.length ? 'var(--text3)' : 'var(--amber)';
}

function buildTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card' + (selectedId === task.id ? ' selected' : '') + (task.done ? ' done-card' : '');
  card.dataset.id = task.id;

  const topTags = [];
  if (task.urgency === 3) topTags.push('<span class="tag tag-urgency">urgência alta</span>');
  if (task.impact  === 3) topTags.push('<span class="tag tag-impact">impacto alto</span>');
  if (task.canDelegate)   topTags.push('<span class="tag tag-delegate">delegável</span>');
  if (task.effort  === 3) topTags.push('<span class="tag tag-effort">esforço alto</span>');
  topTags.push('<span class="tag tag-time">' + formatDuration(task.duration) + '</span>');

  card.innerHTML =
    '<div class="task-card-top">' +
      '<div class="task-title">' + esc(task.title) + '</div>' +
      '<div class="task-score" style="color:' + scoreColor(task.score) + '">' + task.score + '</div>' +
    '</div>' +
    '<div class="task-tags">' + topTags.join('') + '</div>';

  card.addEventListener('click', () => selectTask(task.id));
  return card;
}

/* ════════════════════════════════════════════════════
   RENDER: DETAIL PANEL
════════════════════════════════════════════════════ */

function selectTask(id) {
  selectedId = id;
  renderMatrix();
  renderDetailPanel();
  renderSidebar();
}

function renderDetailPanel() {
  const body = document.getElementById('detail-body');
  if (!selectedId) {
    body.innerHTML = '<div class="detail-empty">Selecione uma tarefa para ver a análise completa.</div>';
    return;
  }

  const task = tasks.find(t => t.id === selectedId);
  if (!task) {
    body.innerHTML = '<div class="detail-empty">Tarefa não encontrada.</div>';
    return;
  }

  const sc = scoreColor(task.score);
  const delegLabel = task.canDelegate ? 'Sim' : 'Não';
  const delegColor = task.canDelegate ? 'var(--teal)' : 'var(--text3)';

  const customTags = (task.tags || [])
    .map(t => '<span class="tag tag-custom">' + esc(t) + '</span>')
    .join('');

  const focusBtn = !task.done
    ? '<button class="btn-focus" id="d-btn-focus">▶ Entrar em Modo Foco</button>'
    : '<div style="text-align:center;font-size:11px;color:var(--green);padding:8px;">✓ Tarefa concluída</div>';

  body.innerHTML =
    // Score
    '<div class="score-big">' +
      '<div class="score-big-num" style="color:' + sc + '">' + task.score + '</div>' +
      '<div>' +
        '<div class="score-big-label">' + esc(QUADRANTS[task.quadrant].label) + '</div>' +
        '<div class="score-big-sub">' + ACTION_LABELS[task.action] + ' · ' + formatDuration(task.duration) + '</div>' +
      '</div>' +
    '</div>' +

    // Title box
    '<div class="detail-task-box">' +
      '<div class="detail-task-name">' + esc(task.title) + '</div>' +
      '<div class="detail-task-time mono">Score calculado em ' + new Date(task.createdAt || Date.now()).toLocaleDateString('pt-BR') + '</div>' +
    '</div>' +

    // Analysis rows
    '<div>' +
      '<div class="section-label">Análise</div>' +
      '<div class="analysis-rows">' +
        row('Urgência',  URGENCY_LABEL[task.urgency]) +
        row('Impacto',   IMPACT_LABEL[task.impact])   +
        row('Esforço',   EFFORT_LABEL[task.effort])   +
        row('Duração',   formatDuration(task.duration)) +
        rowColor('Delegável', delegLabel, delegColor)  +
        row('Quadrante', QUADRANTS[task.quadrant].label) +
      '</div>' +
    '</div>' +

    // Explanation
    '<div>' +
      '<div class="section-label">Por que essa prioridade?</div>' +
      '<div class="explanation-box">' + esc(task.explanation) + '</div>' +
    '</div>' +

    // Next step
    (task.nextStep
      ? '<div><div class="section-label">Próximo passo</div>' +
        '<div class="next-step-box">' + esc(task.nextStep) + '</div></div>'
      : '') +

    // Risk
    (task.risk
      ? '<div><div class="section-label">Risco se adiar</div>' +
        '<div class="risk-box">' + esc(task.risk) + '</div></div>'
      : '') +

    // Tags
    (customTags
      ? '<div><div class="section-label">Tags</div><div class="detail-tags">' + customTags + '</div></div>'
      : '') +

    // Focus button
    focusBtn +

    // Action buttons
    '<div class="btn-action-row">' +
      '<button class="btn-edit-task" id="d-btn-edit">✎ Editar</button>' +
      '<button class="btn-done-task" id="d-btn-done">' + (task.done ? '↩ Reabrir' : '✓ Concluir') + '</button>' +
      '<button class="btn-delete-task" id="d-btn-delete">✕ Excluir</button>' +
    '</div>';

  // Events
  const btnFocus = document.getElementById('d-btn-focus');
  if (btnFocus) btnFocus.addEventListener('click', () => startFocus(task));

  document.getElementById('d-btn-done').addEventListener('click', () => toggleDone(task.id));
  document.getElementById('d-btn-edit').addEventListener('click', () => openModal(task.id));
  document.getElementById('d-btn-delete').addEventListener('click', () => deleteTask(task.id));
}

function row(key, val) {
  return '<div class="analysis-row"><span class="ar-key">' + esc(key) + '</span>' +
         '<span class="ar-val">' + esc(val) + '</span></div>';
}
function rowColor(key, val, color) {
  return '<div class="analysis-row"><span class="ar-key">' + esc(key) + '</span>' +
         '<span class="ar-val" style="color:' + color + '">' + esc(val) + '</span></div>';
}

/* ════════════════════════════════════════════════════
   RENDER: SIDEBAR
════════════════════════════════════════════════════ */

function renderSidebar() {
  const active = tasks.filter(t => !t.done).sort((a, b) => b.score - a.score);
  const done   = tasks.filter(t => t.done);

  document.getElementById('done-count').textContent   = done.length;
  document.getElementById('active-count').textContent = active.length;

  // Mission critical (top score, quadrant iu)
  const missionWrap = document.getElementById('mission-card-wrap');
  const mission = active.find(t => t.quadrant === 'iu');
  if (mission) {
    const sc = scoreColor(mission.score);
    missionWrap.innerHTML =
      '<div class="mission-card" data-id="' + mission.id + '">' +
        '<div class="mission-badge"><span class="pulse-dot"></span> Em foco agora</div>' +
        '<div class="mission-title">' + esc(mission.title) + '</div>' +
        '<div class="mission-why">' +
          URGENCY_LABEL[mission.urgency].toLowerCase() + ' urgência · impacto ' +
          IMPACT_LABEL[mission.impact].toLowerCase() +
          (mission.canDelegate ? ' · delegável' : ' · não delegável') +
        '</div>' +
        '<div class="score-ring">' +
          '<div class="score-num" style="color:' + sc + '">' + mission.score + '</div>' +
          '<div class="score-bar-wrap"><div class="score-bar-fill" style="width:' + mission.score + '%;background:' + sc + '"></div></div>' +
        '</div>' +
      '</div>';
    missionWrap.querySelector('.mission-card').addEventListener('click', () => selectTask(mission.id));
  } else {
    missionWrap.innerHTML = '<div class="empty-mission">Nenhuma tarefa urgente.<br>Adicione atividades.</div>';
  }

  // Quick wins: <= 20 min, not done
  const qwList = document.getElementById('quick-wins-list');
  const qw = active.filter(t => t.duration <= 20).slice(0, 4);
  if (qw.length) {
    qwList.innerHTML = qw.map((t, i) =>
      '<div class="quick-win" data-id="' + t.id + '" style="' + (i === qw.length - 1 ? 'border-bottom:none' : '') + '">' +
        '<span class="qw-dot" style="background:var(--teal)"></span>' +
        '<span class="qw-title">' + esc(t.title) + '</span>' +
        '<span class="qw-time">' + formatDuration(t.duration) + '</span>' +
      '</div>'
    ).join('');
    qwList.querySelectorAll('.quick-win').forEach(el =>
      el.addEventListener('click', () => selectTask(el.dataset.id)));
  } else {
    qwList.innerHTML = '<div class="empty-mission">Sem ganhos rápidos.</div>';
  }

  // Delegate
  const delList = document.getElementById('delegate-list');
  const dels = active.filter(t => t.canDelegate).slice(0, 3);
  if (dels.length) {
    delList.innerHTML = dels.map(t =>
      '<div class="delegate-item">' +
        '<span class="qw-dot" style="background:var(--blue)"></span>' +
        '<div><div class="qw-title">' + esc(t.title) + '</div>' +
        '<div class="del-person">→ delegar</div></div>' +
      '</div>'
    ).join('');
  } else {
    delList.innerHTML = '<div class="empty-mission">Sem tarefas delegáveis.</div>';
  }
}

/* ════════════════════════════════════════════════════
   RENDER: PLANO DO DIA
════════════════════════════════════════════════════ */

function renderPlano() {
  const active = tasks.filter(t => !t.done).sort((a, b) => b.score - a.score);
  const done   = tasks.filter(t =>  t.done);

  // Stat cards
  const doNow    = active.filter(t => t.action === 'do_now');
  const schedule = active.filter(t => t.action === 'schedule');
  const deleg    = active.filter(t => t.canDelegate);
  const elim     = active.filter(t => t.quadrant === 'nn');
  const totalMinutes = doNow.reduce((s, t) => s + t.duration, 0);

  const stats = [
    { val: active.length,                       label: 'Ativas',       color: 'var(--amber)' },
    { val: formatDuration(totalMinutes) || '—', label: 'Tempo crítico', color: 'var(--teal)'  },
    { val: deleg.length,                        label: 'Delegáveis',   color: 'var(--blue)'  },
    { val: done.length,                         label: 'Concluídas',   color: 'var(--green)' },
  ];

  document.getElementById('stat-cards').innerHTML = stats.map(s =>
    '<div class="stat-card">' +
      '<div class="stat-val" style="color:' + s.color + '">' + s.val + '</div>' +
      '<div class="stat-label">' + s.label + '</div>' +
    '</div>'
  ).join('');

  // Plano do dia — fazer agora
  const doNowEl = document.getElementById('plano-do-now');
  if (doNow.length) {
    doNowEl.innerHTML = doNow.map(t =>
      '<div class="plano-row" data-id="' + t.id + '">' +
        '<div class="plano-row-score" style="color:' + scoreColor(t.score) + '">' + t.score + '</div>' +
        '<div class="plano-row-title">' + esc(t.title) + '</div>' +
        '<div class="plano-row-time">' + formatDuration(t.duration) + '</div>' +
      '</div>'
    ).join('');
    doNowEl.querySelectorAll('.plano-row').forEach(el =>
      el.addEventListener('click', () => { selectTask(el.dataset.id); switchView('matrix'); }));
  } else {
    doNowEl.innerHTML = '<div class="plano-empty">Nenhuma tarefa para fazer agora. 🎉</div>';
  }

  // Plano — schedule
  const schedEl = document.getElementById('plano-schedule');
  if (schedule.length) {
    schedEl.innerHTML = schedule.map(t =>
      '<div class="plano-row" data-id="' + t.id + '">' +
        '<div class="plano-row-score" style="color:' + scoreColor(t.score) + '">' + t.score + '</div>' +
        '<div class="plano-row-title">' + esc(t.title) + '</div>' +
        '<div class="plano-row-time">' + formatDuration(t.duration) + '</div>' +
      '</div>'
    ).join('');
    schedEl.querySelectorAll('.plano-row').forEach(el =>
      el.addEventListener('click', () => { selectTask(el.dataset.id); switchView('matrix'); }));
  } else {
    schedEl.innerHTML = '<div class="plano-empty">Nenhuma tarefa para planejar.</div>';
  }

  // Breakdown
  const total = active.length || 1;
  const qData = [
    { key: 'iu', name: 'Fazer Agora', color: '#f5a623' },
    { key: 'in', name: 'Planejar',    color: '#2dd4bf' },
    { key: 'nu', name: 'Delegar',     color: '#60a5fa' },
    { key: 'nn', name: 'Eliminar',    color: '#555c72' },
  ];
  document.getElementById('breakdown').innerHTML = qData.map(q => {
    const cnt = active.filter(t => t.quadrant === q.key).length;
    const pct = Math.round((cnt / total) * 100);
    return '<div class="breakdown-row">' +
      '<div class="breakdown-name" style="color:' + q.color + '">' + q.name + '</div>' +
      '<div class="breakdown-bar-wrap"><div class="breakdown-bar-fill" style="width:' + pct + '%;background:' + q.color + '"></div></div>' +
      '<div class="breakdown-count">' + cnt + '</div>' +
    '</div>';
  }).join('');
}

/* ════════════════════════════════════════════════════
   VIEWS
════════════════════════════════════════════════════ */

function renderAll() {
  renderMatrix();
  renderSidebar();
  renderDetailPanel();
  if (currentView === 'plano') renderPlano();
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === view);
  });
  if (view === 'plano') renderPlano();
}

/* ════════════════════════════════════════════════════
   TASK CRUD
════════════════════════════════════════════════════ */

function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTasks();
  renderAll();
  showToast(t.done ? '✓ Tarefa concluída!' : '↩ Tarefa reaberta', t.done ? 'success' : '');
}

function deleteTask(id) {
  if (!confirm('Excluir esta tarefa permanentemente?')) return;
  tasks = tasks.filter(t => t.id !== id);
  if (selectedId === id) selectedId = null;
  saveTasks();
  renderAll();
  showToast('Tarefa excluída.', '');
}

/* ════════════════════════════════════════════════════
   MODAL: NOVA / EDITAR TAREFA
════════════════════════════════════════════════════ */

function openModal(editId = null) {
  editingId = editId;
  const modal = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title-text');
  const preview = document.getElementById('score-preview');

  preview.style.display = 'none';

  if (editId) {
    titleEl.textContent = 'Editar Atividade';
    const t = tasks.find(t => t.id === editId);
    if (!t) return;
    document.getElementById('f-title').value    = t.title;
    document.getElementById('f-nextstep').value = t.nextStep || '';
    document.getElementById('f-risk').value     = t.risk || '';
    document.getElementById('f-urgency').value  = t.urgency;
    document.getElementById('f-impact').value   = t.impact;
    document.getElementById('f-effort').value   = t.effort;
    document.getElementById('f-duration').value = t.duration;
    document.getElementById('f-delegate').value = t.canDelegate ? 'true' : 'false';
    document.getElementById('f-tags').value     = (t.tags || []).join(', ');
  } else {
    titleEl.textContent = 'Nova Atividade';
    document.getElementById('f-title').value    = '';
    document.getElementById('f-nextstep').value = '';
    document.getElementById('f-risk').value     = '';
    document.getElementById('f-urgency').value  = '2';
    document.getElementById('f-impact').value   = '2';
    document.getElementById('f-effort').value   = '2';
    document.getElementById('f-duration').value = '30';
    document.getElementById('f-delegate').value = 'false';
    document.getElementById('f-tags').value     = '';
  }

  modal.classList.add('open');
  document.getElementById('f-title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('score-preview').style.display = 'none';
  editingId = null;
}

function getFormValues() {
  return {
    title:       document.getElementById('f-title').value.trim(),
    nextStep:    document.getElementById('f-nextstep').value.trim(),
    risk:        document.getElementById('f-risk').value.trim(),
    urgency:     parseInt(document.getElementById('f-urgency').value),
    impact:      parseInt(document.getElementById('f-impact').value),
    effort:      parseInt(document.getElementById('f-effort').value),
    duration:    parseInt(document.getElementById('f-duration').value) || 30,
    canDelegate: document.getElementById('f-delegate').value === 'true',
    tags:        document.getElementById('f-tags').value
                   .split(',').map(s => s.trim()).filter(Boolean),
  };
}

function previewScore() {
  const v = getFormValues();
  if (!v.title) { showToast('Preencha o título primeiro.', 'error'); return; }

  const score    = calcScore(v.urgency, v.impact, v.effort, v.canDelegate);
  const quadrant = calcQuadrant(v.urgency, v.impact);
  const action   = calcAction(quadrant, v.canDelegate);
  const sc       = scoreColor(score);

  const preview = document.getElementById('score-preview');
  preview.style.display = 'block';
  preview.innerHTML =
    '<div style="display:flex;align-items:center;gap:14px;margin-bottom:10px;">' +
      '<div class="sp-score" style="color:' + sc + '">' + score + '</div>' +
      '<div>' +
        '<div class="sp-quad">' + QUADRANTS[quadrant].label + '</div>' +
        '<div style="font-size:11px;color:var(--text2);margin-top:2px;">' + ACTION_LABELS[action] + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="score-preview-row"><span class="sp-key">Urgência</span><span class="sp-val">' + URGENCY_LABEL[v.urgency] + '</span></div>' +
    '<div class="score-preview-row"><span class="sp-key">Impacto</span><span class="sp-val">'  + IMPACT_LABEL[v.impact]   + '</span></div>' +
    '<div class="score-preview-row"><span class="sp-key">Esforço</span><span class="sp-val">'  + EFFORT_LABEL[v.effort]   + '</span></div>' +
    '<div class="score-preview-row"><span class="sp-key">Delegável</span><span class="sp-val" style="color:' + (v.canDelegate ? 'var(--teal)' : 'var(--text3)') + '">' + (v.canDelegate ? 'Sim' : 'Não') + '</span></div>';
}

function saveTask() {
  const v = getFormValues();
  if (!v.title) { showToast('O título é obrigatório.', 'error'); return; }

  if (editingId) {
    const idx = tasks.findIndex(t => t.id === editingId);
    if (idx >= 0) {
      tasks[idx] = enrichTask({ ...tasks[idx], ...v });
      showToast('Tarefa atualizada!', 'success');
    }
  } else {
    const raw = { id: genId(), ...v, done: false, createdAt: Date.now() };
    tasks.unshift(enrichTask(raw));
    selectedId = tasks[0].id;
    showToast('Tarefa adicionada!', 'success');
  }

  saveTasks();
  closeModal();
  renderAll();
}

/* ════════════════════════════════════════════════════
   FOCUS MODE
════════════════════════════════════════════════════ */

function startFocus(task) {
  focusTask      = task;
  focusTotalSecs = task.duration * 60;
  focusSecsLeft  = focusTotalSecs;
  focusPaused    = false;

  document.getElementById('focus-title').textContent = task.title;
  document.getElementById('focus-step').textContent  = task.nextStep || 'Execute o próximo passo agora.';
  document.getElementById('focus-meta').innerHTML =
    '<span style="color:var(--amber)">Score: ' + task.score + '</span>' +
    '<span style="color:var(--text3)">·</span>' +
    '<span style="color:var(--teal)">' + formatDuration(task.duration) + '</span>' +
    '<span style="color:var(--text3)">·</span>' +
    '<span style="color:var(--text3)">' + QUADRANTS[task.quadrant].label + '</span>';

  updateFocusTimer();
  document.getElementById('focus-overlay').classList.add('open');
  document.getElementById('btn-pause-focus').textContent = '⏸ Pausar';

  if (focusInterval) clearInterval(focusInterval);
  focusInterval = setInterval(tickFocus, 1000);
}

function tickFocus() {
  if (focusPaused) return;
  focusSecsLeft--;
  if (focusSecsLeft <= 0) {
    focusSecsLeft = 0;
    clearInterval(focusInterval);
    document.getElementById('focus-timer').textContent = '00:00';
    showToast('⏱ Tempo esgotado! Tarefa concluída?', 'success');
  }
  updateFocusTimer();
}

function updateFocusTimer() {
  const m = Math.floor(focusSecsLeft / 60).toString().padStart(2, '0');
  const s = (focusSecsLeft % 60).toString().padStart(2, '0');
  const timerEl    = document.getElementById('focus-timer');
  const progressEl = document.getElementById('focus-progress');
  const urgent     = focusSecsLeft <= 60 && focusSecsLeft > 0;

  timerEl.textContent = m + ':' + s;
  timerEl.classList.toggle('urgent', urgent);

  const pct = focusTotalSecs > 0 ? ((focusTotalSecs - focusSecsLeft) / focusTotalSecs) * 100 : 0;
  progressEl.style.width = pct + '%';
  progressEl.classList.toggle('urgent', urgent);
}

function exitFocus() {
  clearInterval(focusInterval);
  focusInterval = null;
  focusTask = null;
  document.getElementById('focus-overlay').classList.remove('open');
}

function togglePauseFocus() {
  focusPaused = !focusPaused;
  document.getElementById('btn-pause-focus').textContent = focusPaused ? '▶ Retomar' : '⏸ Pausar';
}

/* ════════════════════════════════════════════════════
   TOAST
════════════════════════════════════════════════════ */

let toastTimer = null;

function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'toast ' + type;
  // force reflow
  void el.offsetWidth;
  el.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2800);
}

/* ════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════ */

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

function setDate() {
  const now = new Date();
  const opts = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  const str = now.toLocaleDateString('pt-BR', opts);
  document.getElementById('datechip').textContent = str;
  document.getElementById('plano-date').textContent =
    now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

/* ════════════════════════════════════════════════════
   EVENT LISTENERS
════════════════════════════════════════════════════ */

function bindEvents() {
  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // New task button
  document.getElementById('btn-open-modal').addEventListener('click', () => openModal());

  // Modal: close / cancel
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Modal: save
  document.getElementById('modal-save').addEventListener('click', saveTask);

  // Modal: preview score
  document.getElementById('btn-preview-score').addEventListener('click', previewScore);

  // Modal: Enter key to save
  document.getElementById('modal-overlay').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) saveTask();
    if (e.key === 'Escape') closeModal();
  });

  // Focus overlay: exit + pause
  document.getElementById('btn-exit-focus').addEventListener('click', exitFocus);
  document.getElementById('btn-pause-focus').addEventListener('click', togglePauseFocus);

  // Focus overlay: Escape to exit
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('focus-overlay').classList.contains('open')) exitFocus();
      if (document.getElementById('modal-overlay').classList.contains('open')) closeModal();
    }
  });
}

/* ════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  loadTasks();
  setDate();
  bindEvents();
  renderAll();
  // Auto-select highest score task
  const top = tasks.filter(t => !t.done).sort((a, b) => b.score - a.score)[0];
  if (top) selectTask(top.id);
});
