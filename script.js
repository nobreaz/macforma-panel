/* =========================================================
   Painel Macforma — dados de demonstração
   Toda a "base de dados" vive no localStorage do navegador,
   sob a chave STORAGE_KEY. Isso é uma simulação para pitch:
   quando o projeto fechar e o gateway real for plugado, essa
   camada é trocada por chamadas a um backend de verdade.
   ========================================================= */

const STORAGE_KEY = 'macforma_transacoes';
const SETTINGS_KEY = 'macforma_painel_config';

const PLANOS = [
  { nome: 'Musculação', preco: 119 },
  { nome: 'Musculação + Ginástica', preco: 159 },
  { nome: 'Ginástica', preco: 99 },
];
const DURACOES = ['Mensal', 'Trimestral', 'Semestral', 'Anual'];
const METODOS = ['Cartão de crédito', 'Pix'];
const NOMES = [
  'Carla Menezes', 'Bruno Alves', 'Fernanda Lima', 'Diego Souza', 'Patrícia Nunes',
  'Rafael Costa', 'Juliana Rocha', 'Marcelo Dias', 'Aline Ferreira', 'Thiago Barros',
  'Camila Ribeiro', 'Eduardo Pinto', 'Larissa Cardoso', 'Gustavo Martins', 'Vanessa Teixeira',
  'Rodrigo Faria', 'Beatriz Moura', 'Leonardo Castro', 'Priscila Gomes', 'André Vieira',
  'Renata Cunha', 'Felipe Araújo', 'Débora Santana', 'Vinícius Melo', 'Simone Batista',
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pickStatus() {
  const r = Math.random();
  if (r < 0.78) return 'aprovado';
  if (r < 0.92) return 'pendente';
  return 'recusado';
}

function gerarTransacao(diasAtras) {
  const plano = pick(PLANOS);
  const dt = new Date();
  dt.setDate(dt.getDate() - diasAtras);
  dt.setHours(7 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 60));
  return {
    id: uid(),
    nome: pick(NOMES),
    plano: plano.nome,
    duracao: pick(DURACOES),
    valor: plano.preco + (Math.random() < 0.3 ? Math.floor(Math.random() * 20) - 10 : 0),
    metodo: pick(METODOS),
    status: pickStatus(),
    criadoEm: dt.toISOString(),
  };
}

function seedTransacoes() {
  const lista = [];
  for (let i = 0; i < 42; i++) {
    lista.push(gerarTransacao(Math.floor(Math.random() * 35)));
  }
  lista.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  return lista;
}

function carregarTransacoes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedTransacoes();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return seedTransacoes();
    return parsed;
  } catch (e) {
    return seedTransacoes();
  }
}

function salvarTransacoes(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

let TRANSACOES = carregarTransacoes();
let ULTIMA_NOVA_ID = null;

/* ---------------- Formatação ---------------- */
const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const fmtDataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/* ---------------- Navegação ---------------- */
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');

function irPara(viewId) {
  views.forEach((v) => v.classList.toggle('is-active', v.id === viewId));
  navItems.forEach((n) => n.classList.toggle('is-active', n.dataset.view === viewId));
  window.location.hash = viewId;
  if (viewId === 'view-dashboard') renderDashboard();
  if (viewId === 'view-transacoes') renderTabela();
}

navItems.forEach((n) => n.addEventListener('click', () => irPara(n.dataset.view)));

window.addEventListener('DOMContentLoaded', () => {
  const inicial = window.location.hash.replace('#', '') || 'view-dashboard';
  irPara(document.getElementById(inicial) ? inicial : 'view-dashboard');
  atualizarBadgeSidebar();
});

/* ---------------- KPIs ---------------- */
function dentroDeDias(iso, dias) {
  const diff = (Date.now() - new Date(iso).getTime()) / 86400000;
  return diff >= 0 && diff <= dias;
}

function calcularKpis() {
  const ultimos7 = TRANSACOES.filter((t) => dentroDeDias(t.criadoEm, 7));
  const anteriores7 = TRANSACOES.filter((t) => {
    const diff = (Date.now() - new Date(t.criadoEm).getTime()) / 86400000;
    return diff > 7 && diff <= 14;
  });

  const receita = (lista) => lista.filter((t) => t.status === 'aprovado').reduce((s, t) => s + t.valor, 0);
  const novasAssinaturas = (lista) => lista.filter((t) => t.status === 'aprovado').length;

  const aprovadas = TRANSACOES.filter((t) => t.status === 'aprovado');
  const ticketMedio = aprovadas.length ? aprovadas.reduce((s, t) => s + t.valor, 0) / aprovadas.length : 0;
  const taxaAprovacao = TRANSACOES.length ? (aprovadas.length / TRANSACOES.length) * 100 : 0;

  return {
    receita7: receita(ultimos7),
    receita7Anterior: receita(anteriores7),
    novas7: novasAssinaturas(ultimos7),
    novas7Anterior: novasAssinaturas(anteriores7),
    ticketMedio,
    taxaAprovacao,
    totalAssinaturasAtivas: aprovadas.length,
  };
}

function delta(atual, anterior) {
  if (anterior === 0) return atual > 0 ? { texto: 'novo', classe: 'up' } : { texto: '—', classe: 'flat' };
  const pct = ((atual - anterior) / anterior) * 100;
  const classe = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat';
  const sinal = pct > 0 ? '+' : '';
  return { texto: `${sinal}${pct.toFixed(0)}% vs. semana anterior`, classe };
}

function renderKpis() {
  const k = calcularKpis();
  document.getElementById('kpi-receita').textContent = fmtBRL(k.receita7);
  document.getElementById('kpi-assinaturas').textContent = k.totalAssinaturasAtivas.toLocaleString('pt-BR');
  document.getElementById('kpi-ticket').textContent = fmtBRL(k.ticketMedio);
  document.getElementById('kpi-aprovacao').textContent = `${k.taxaAprovacao.toFixed(0)}%`;

  const dReceita = delta(k.receita7, k.receita7Anterior);
  const dNovas = delta(k.novas7, k.novas7Anterior);

  const elReceita = document.getElementById('kpi-receita-delta');
  elReceita.textContent = dReceita.texto;
  elReceita.className = `kpi-delta ${dReceita.classe}`;

  const elAssin = document.getElementById('kpi-assinaturas-delta');
  elAssin.textContent = `${dNovas.texto === 'novo' ? 'novo esta semana' : dNovas.texto.replace('vs. semana anterior', 'novas na semana')}`;
  elAssin.className = `kpi-delta ${dNovas.classe}`;
}

/* ---------------- Gráfico de linha: receita por dia ---------------- */
function renderReceitaChart() {
  const dias = 14;
  const pontos = [];
  for (let i = dias - 1; i >= 0; i--) {
    const inicio = new Date(); inicio.setHours(0,0,0,0); inicio.setDate(inicio.getDate() - i);
    const fim = new Date(inicio); fim.setDate(fim.getDate() + 1);
    const valor = TRANSACOES
      .filter((t) => t.status === 'aprovado')
      .filter((t) => { const d = new Date(t.criadoEm); return d >= inicio && d < fim; })
      .reduce((s, t) => s + t.valor, 0);
    pontos.push({ data: inicio.toISOString(), valor });
  }

  const W = 640, H = 200, padL = 8, padR = 8, padT = 12, padB = 26;
  const max = Math.max(...pontos.map((p) => p.valor), 100);
  const stepX = (W - padL - padR) / (pontos.length - 1);
  const x = (i) => padL + i * stepX;
  const y = (v) => padT + (H - padT - padB) * (1 - v / max);

  const linePath = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.valor).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${x(pontos.length - 1).toFixed(1)} ${y(0).toFixed(1)} L ${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;

  const gridLines = [0, 0.5, 1].map((f) => {
    const gy = padT + (H - padT - padB) * f;
    const val = Math.round(max * (1 - f));
    return `<line class="viz-grid-line" x1="${padL}" x2="${W - padR}" y1="${gy}" y2="${gy}"></line>
             <text class="viz-axis-text" x="${padL}" y="${gy - 4}">${val >= 1000 ? (val/1000).toFixed(1)+'k' : val}</text>`;
  }).join('');

  const labelIdxs = [0, Math.floor(pontos.length/2), pontos.length - 1];
  const xLabels = labelIdxs.map((i) => `<text class="viz-axis-text" text-anchor="${i===0?'start':i===pontos.length-1?'end':'middle'}" x="${x(i)}" y="${H - 6}">${fmtData(pontos[i].data)}</text>`).join('');

  const svg = document.getElementById('chart-receita');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `
    ${gridLines}
    <path class="viz-area" d="${areaPath}"></path>
    <path class="viz-line" d="${linePath}"></path>
    <circle class="viz-dot" r="4" cx="${x(pontos.length-1)}" cy="${y(pontos[pontos.length-1].valor)}"></circle>
    ${xLabels}
    <line id="receita-crosshair" class="viz-crosshair" x1="0" x2="0" y1="${padT}" y2="${H - padB}" style="opacity:0"></line>
  `;

  const wrap = svg.closest('.viz-wrap');
  const tooltip = wrap.querySelector('.viz-tooltip');
  const crosshair = svg.querySelector('#receita-crosshair');
  const hitRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  hitRect.setAttribute('x', padL); hitRect.setAttribute('y', 0);
  hitRect.setAttribute('width', W - padL - padR); hitRect.setAttribute('height', H);
  hitRect.setAttribute('fill', 'transparent');
  svg.appendChild(hitRect);

  function mover(clientX) {
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    let idx = Math.round((relX - padL) / stepX);
    idx = Math.max(0, Math.min(pontos.length - 1, idx));
    const p = pontos[idx];
    crosshair.setAttribute('x1', x(idx)); crosshair.setAttribute('x2', x(idx));
    crosshair.style.opacity = 1;
    tooltip.innerHTML = `<span class="t-label">${new Date(p.data).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span><span class="t-value">${fmtBRL(p.valor)}</span>`;
    tooltip.classList.add('is-visible');
    const px = (x(idx) / W) * rect.width;
    tooltip.style.left = `${Math.min(Math.max(px - 50, 0), rect.width - 130)}px`;
    tooltip.style.top = `-6px`;
  }
  svg.addEventListener('pointermove', (e) => mover(e.clientX));
  svg.addEventListener('pointerleave', () => { crosshair.style.opacity = 0; tooltip.classList.remove('is-visible'); });
}

/* ---------------- Gráfico de barras: distribuição por plano ---------------- */
function renderPlanosChart() {
  const porPlano = PLANOS.map((p) => ({
    nome: p.nome,
    valor: TRANSACOES.filter((t) => t.plano === p.nome && t.status === 'aprovado').reduce((s, t) => s + t.valor, 0),
  })).sort((a, b) => b.valor - a.valor);

  const max = Math.max(...porPlano.map((p) => p.valor), 1);
  const container = document.getElementById('chart-planos');
  container.innerHTML = porPlano.map((p) => `
    <div class="bar-row">
      <div class="bar-row-label">${p.nome}</div>
      <div class="bar-row-track"><div class="bar-row-fill" style="width:${Math.max((p.valor / max) * 100, 3)}%"></div></div>
      <div class="bar-row-value">${fmtBRL(p.valor)}</div>
    </div>
  `).join('');
}

/* ---------------- Tabela de transações recentes (dashboard) ---------------- */
function renderRecentes() {
  const recentes = TRANSACOES.slice(0, 6);
  const tbody = document.getElementById('tbody-recentes');
  tbody.innerHTML = recentes.map((t) => linhaTransacao(t)).join('');
}

/* ---------------- Página Transações ---------------- */
function linhaTransacao(t) {
  const nova = t.id === ULTIMA_NOVA_ID ? 'is-new' : '';
  return `
    <tr class="${nova}">
      <td>${escapeHtml(t.nome)}</td>
      <td class="cell-muted">${escapeHtml(t.plano)}</td>
      <td class="cell-muted">${escapeHtml(t.duracao)}</td>
      <td class="cell-valor">${fmtBRL(t.valor)}</td>
      <td class="cell-muted">${escapeHtml(t.metodo)}</td>
      <td>${pillStatus(t.status)}</td>
      <td class="cell-muted">${fmtDataHora(t.criadoEm)}</td>
    </tr>
  `;
}

function pillStatus(status) {
  const labels = { aprovado: 'Aprovado', pendente: 'Pendente', recusado: 'Recusado' };
  return `<span class="status-pill status-${status}"><span class="dot"></span>${labels[status]}</span>`;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function renderTabela() {
  const statusFiltro = document.getElementById('filtro-status').value;
  const metodoFiltro = document.getElementById('filtro-metodo').value;
  const busca = document.getElementById('filtro-busca').value.trim().toLowerCase();

  let lista = TRANSACOES.slice();
  if (statusFiltro !== 'todos') lista = lista.filter((t) => t.status === statusFiltro);
  if (metodoFiltro !== 'todos') lista = lista.filter((t) => t.metodo === metodoFiltro);
  if (busca) lista = lista.filter((t) => t.nome.toLowerCase().includes(busca) || t.plano.toLowerCase().includes(busca));

  const tbody = document.getElementById('tbody-transacoes');
  document.getElementById('filtro-count').textContent = `${lista.length} de ${TRANSACOES.length} transações`;

  tbody.innerHTML = lista.length
    ? lista.map((t) => linhaTransacao(t)).join('')
    : `<tr><td colspan="7"><div class="empty-state">Nenhuma transação encontrada com esses filtros.</div></td></tr>`;
}

['filtro-status', 'filtro-metodo'].forEach((id) => {
  document.getElementById(id)?.addEventListener('change', renderTabela);
});
document.getElementById('filtro-busca')?.addEventListener('input', renderTabela);

/* ---------------- Simular novo pagamento (demo ao vivo) ---------------- */
function simularPagamento() {
  const nova = gerarTransacao(0);
  nova.status = Math.random() < 0.85 ? 'aprovado' : 'pendente';
  TRANSACOES.unshift(nova);
  ULTIMA_NOVA_ID = nova.id;
  salvarTransacoes(TRANSACOES);

  mostrarToast('Novo pagamento recebido', `${nova.nome} assinou o plano ${nova.plano} — ${fmtBRL(nova.valor)}`);
  atualizarBadgeSidebar(true);

  const activeView = document.querySelector('.view.is-active')?.id;
  if (activeView === 'view-dashboard') renderDashboard();
  if (activeView === 'view-transacoes') renderTabela();
}

document.getElementById('btn-simular')?.addEventListener('click', simularPagamento);
document.getElementById('btn-simular-transacoes')?.addEventListener('click', simularPagamento);

function atualizarBadgeSidebar(incrementar) {
  const badge = document.getElementById('nav-badge-transacoes');
  if (!badge) return;
  if (incrementar) {
    const atual = parseInt(badge.textContent || '0', 10) || 0;
    badge.textContent = String(atual + 1);
    badge.style.display = 'inline-block';
  }
}

/* ---------------- Toast ---------------- */
function mostrarToast(titulo, corpo) {
  const stack = document.getElementById('toast-stack');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<strong>${escapeHtml(titulo)}</strong>${escapeHtml(corpo)}`;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-visible'));
  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 400);
  }, 4200);
}

/* ---------------- Dashboard: render geral ---------------- */
function renderDashboard() {
  renderKpis();
  renderReceitaChart();
  renderPlanosChart();
  renderRecentes();
}

/* =========================================================
   Editor com IA — interface pronta, respostas simuladas.
   A integração real com a API da Claude entra aqui quando o
   projeto for fechado e a chave de API for configurada.
   ========================================================= */
const RESPOSTAS_SIMULADAS = [
  {
    gatilhos: ['cor', 'cores', 'laranja', 'tema', 'visual'],
    resposta: `Consigo ajustar a paleta de cores do site alterando as variáveis de tema em <code>styles.css</code> — todo o site (botões, títulos, destaques) segue essas variáveis automaticamente, então a mudança é consistente em todas as páginas. Me diga a cor exata (ou "mais escura", "mais vibrante") e eu aplico e gero um preview antes de publicar.`,
  },
  {
    gatilhos: ['preço', 'preco', 'valor', 'plano', 'planos'],
    resposta: `Posso atualizar os valores exibidos na seção de Planos do site. Me diga o novo preço de cada modalidade (Musculação, Ginástica, Combo) e as durações (mensal, trimestral, semestral, anual) que eu atualizo os cards automaticamente — inclusive já refletindo no simulador de assinatura.`,
  },
  {
    gatilhos: ['whatsapp', 'telefone', 'contato', 'numero', 'número'],
    resposta: `Posso trocar o número de WhatsApp em todos os pontos do site de uma vez (botão flutuante, cabeçalho, planos e rodapé) — são todos gerados a partir de uma única configuração, então não corre o risco de ficar um número desatualizado esquecido em algum canto.`,
  },
  {
    gatilhos: ['foto', 'imagem', 'galeria', 'estrutura'],
    resposta: `Posso trocar ou adicionar fotos nas seções "Nossa estrutura" e "Atividades". Me envie os arquivos (ou descreva o que precisa mudar) que eu ajusto o layout da galeria automaticamente para a nova quantidade de imagens.`,
  },
  {
    gatilhos: ['horário', 'horario', 'horarios', 'aula'],
    resposta: `Consigo atualizar a tabela de horário de funcionamento e os horários de aula na seção de Localização. Me passe os novos horários que eu edito o HTML diretamente.`,
  },
  {
    gatilhos: ['texto', 'escrever', 'seção', 'secao', 'sobre'],
    resposta: `Posso reescrever qualquer texto do site mantendo o tom de voz da Macforma (direto, motivacional). Me diga qual seção e o que deve mudar no conteúdo.`,
  },
];

const RESPOSTA_GENERICA = `Entendi o pedido. Em modo real, eu aplicaria essa mudança diretamente nos arquivos do site (HTML/CSS) e mostraria um preview aqui antes de publicar — com a opção de desfazer se algo não ficar do jeito esperado. Nesta demonstração as respostas são simuladas; a integração completa é ativada assim que o projeto for fechado.`;

function gerarRespostaSimulada(texto) {
  const alvo = texto.toLowerCase();
  const match = RESPOSTAS_SIMULADAS.find((r) => r.gatilhos.some((g) => alvo.includes(g)));
  return match ? match.resposta : RESPOSTA_GENERICA;
}

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatForm = document.getElementById('chat-form');

function addMensagem(tipo, htmlConteudo, comTag) {
  const div = document.createElement('div');
  div.className = `msg ${tipo}`;
  div.innerHTML = `${comTag ? '<span class="msg-tag">Preview · resposta simulada</span>' : ''}<p>${htmlConteudo}</p>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function addDigitando() {
  const div = document.createElement('div');
  div.className = 'msg assistant';
  div.id = 'msg-typing';
  div.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function enviarMensagem(texto) {
  if (!texto.trim()) return;
  addMensagem('user', escapeHtml(texto));
  chatInput.value = '';
  addDigitando();
  const delayMs = 650 + Math.random() * 500;
  setTimeout(() => {
    document.getElementById('msg-typing')?.remove();
    addMensagem('assistant', gerarRespostaSimulada(texto), true);
  }, delayMs);
}

chatForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  enviarMensagem(chatInput.value);
});
chatInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    enviarMensagem(chatInput.value);
  }
});
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => enviarMensagem(chip.dataset.prompt || chip.textContent));
});

/* ---------------- Configurações (toggles visuais) ---------------- */
function carregarConfig() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
}
function salvarConfig(cfg) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg)); }

document.querySelectorAll('.switch[data-setting]').forEach((sw) => {
  const cfg = carregarConfig();
  const key = sw.dataset.setting;
  const ligado = cfg[key] !== undefined ? cfg[key] : sw.classList.contains('is-on');
  sw.classList.toggle('is-on', ligado);
  sw.addEventListener('click', () => {
    const novo = !sw.classList.contains('is-on');
    sw.classList.toggle('is-on', novo);
    const c = carregarConfig();
    c[key] = novo;
    salvarConfig(c);
  });
});

/* Ano no rodapé, se existir */
const anoEl = document.getElementById('ano-painel');
if (anoEl) anoEl.textContent = new Date().getFullYear();
