import * as R from './rules.js';
import { chooseMove } from './ai.js';
import { Sound } from './sounds.js';
import { MP, normCode } from './multiplayer.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const delScore = (code) => { try { localStorage.removeItem('onca-score-' + code); } catch (e) {} };
const cfg = { sound: store.get('onca-sound', true), shadows: store.get('onca-shadows', true), name: store.get('onca-name', '') };
Sound.setEnabled(cfg.sound);

/* ---------- placar (partidas ganhas, salvo no aparelho) ---------- */
// Contra o computador: um placar único. Online: um placar por sala (sobrevive a "nova partida" e a atualizar a página).
const scoreKey = () => (G.mode === 'ai' ? 'onca-score-ai' : 'onca-score-' + (G.code || 'sala'));
const loadScore = () => { const s = store.get(scoreKey(), null); return s && typeof s.me === 'number' && typeof s.opp === 'number' ? s : { me: 0, opp: 0 }; };
const oppSide = () => (G.mySide === 'j' ? 'd' : 'j');
function updateScore() {
  if (!G || !G.score) return;
  $('hud-score').textContent = `Placar: ${G.names[G.mySide]} ${G.score.me} × ${G.score.opp} ${G.names[oppSide()]}`;
}

let board = null, pieces = null, G = null, sel = null, aiTimer = null, endTimer = null;

/* ---------- navegação / janelas ---------- */
const openModal = (id) => $(id).classList.remove('hidden');
const closeModals = () => document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('.modal').classList.add('hidden')));

function showMenu() {
  if (G && G.mode === 'online' && G.code) delScore(G.code); // sala encerrada: placar volta a zero na próxima sala
  clearTimeout(aiTimer); clearTimeout(endTimer);
  G = null; sel = null;
  $('game').classList.add('hidden'); $('menu').classList.remove('hidden');
  closeModals();
}

/* ---------- menu ---------- */
function openOnline(focus) {
  $('on-name').value = cfg.name;
  $('on-status').textContent = '';
  $('wait-panel').classList.add('hidden'); $('online-forms').classList.remove('hidden'); $('btn-close-online').classList.remove('hidden');
  if (!MP.supported()) $('on-status').textContent = 'Biblioteca de conexão não carregou. Verifique sua internet e recarregue a página.';
  openModal('m-online');
  setTimeout(() => $(focus).focus(), 50);
}
$('btn-online').onclick = () => openOnline('on-name');
$('btn-create').onclick = () => openOnline('on-name');
$('btn-join').onclick = () => openOnline('on-code');
$('btn-ai').onclick = () => openModal('m-ai');
$('btn-rules').onclick = $('btn-help').onclick = () => openModal('m-rules');
$('btn-settings').onclick = () => {
  $('chk-sound').checked = cfg.sound; $('chk-shadows').checked = cfg.shadows; openModal('m-settings');
};
$('chk-sound').onchange = (e) => { cfg.sound = e.target.checked; store.set('onca-sound', cfg.sound); Sound.setEnabled(cfg.sound); Sound.play('select'); };
$('chk-shadows').onchange = (e) => { cfg.shadows = e.target.checked; store.set('onca-shadows', cfg.shadows); board && board.setShadows(cfg.shadows); };

function getName() {
  const n = $('on-name').value.trim();
  if (!n) { $('on-status').textContent = 'Digite seu nome primeiro.'; $('on-name').focus(); return null; }
  cfg.name = n; store.set('onca-name', n);
  return n;
}
const copy = async (text, btn) => {
  try { await navigator.clipboard.writeText(text); } catch (e) {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
  }
  const old = btn.textContent; btn.textContent = 'Copiado!'; setTimeout(() => (btn.textContent = old), 1500);
};
$('btn-copy-wait').onclick = (e) => copy($('wait-code').textContent, e.target);
$('btn-copy').onclick = (e) => copy($('room-code').textContent, e.target);

/* ---------- online ---------- */
const MPH = {
  onCode(code) {
    $('wait-code').textContent = code; $('on-status').textContent = '';
    if (!G) delScore(code); // sala nova começa com placar zerado
    if (!G) { $('online-forms').classList.add('hidden'); $('wait-panel').classList.remove('hidden'); $('btn-close-online').classList.add('hidden'); openModal('m-online'); }
  },
  onReady(info) {
    closeModals(); setBanner('');
    const first = !G;
    startGame({ mode: 'online', mySide: info.side, names: info.names, state: info.state, code: info.code });
    if (first) Sound.play('join');
  },
  onState(st) { if (G && G.mode === 'online') setState(st); },
  onPeerLeft(closed) {
    if (!G) return;
    setBanner(closed ? 'O adversário encerrou a sala.' : 'Adversário desconectado. Aguardando ele voltar…');
  },
  onError(msg) {
    if (G) { setBanner(msg); return; }
    $('wait-panel').classList.add('hidden'); $('online-forms').classList.remove('hidden'); $('btn-close-online').classList.remove('hidden');
    $('on-status').textContent = msg; openModal('m-online');
  },
};

$('btn-do-create').onclick = () => {
  const n = getName(); if (!n) return;
  if (!MP.supported()) return;
  $('on-status').textContent = 'Criando sala…';
  MP.createRoom(n, $('on-side').value, MPH);
};
$('btn-do-join').onclick = () => {
  const n = getName(); if (!n) return;
  const code = normCode($('on-code').value);
  if (!/^ONCA-\d{4}$/.test(code)) { $('on-status').textContent = 'Código inválido. Exemplo: ONCA-4821'; return; }
  if (!MP.supported()) return;
  delScore(code);
  $('on-status').textContent = 'Conectando à sala…';
  MP.joinRoom(code, n, MPH);
};
$('btn-cancel-wait').onclick = () => { MP.leave(true); $('wait-panel').classList.add('hidden'); $('online-forms').classList.remove('hidden'); $('btn-close-online').classList.remove('hidden'); $('on-status').textContent = ''; };
$('btn-close-online').addEventListener('click', () => { if (!G && MP.role) MP.leave(true); });

/* ---------- contra o computador ---------- */
$('btn-start-ai').onclick = () => {
  const my = $('ai-side').value;
  closeModals();
  startGame({ mode: 'ai', mySide: my, level: $('ai-level').value, state: R.newState(),
    names: { j: my === 'j' ? (cfg.name || 'Você') : 'Computador', d: my === 'd' ? (cfg.name || 'Você') : 'Computador' } });
};

/* ---------- partida ---------- */
async function ensureScene() {
  if (board) return;
  const [{ Board }, { Pieces }] = await Promise.all([import('./board3d.js'), import('./pieces3d.js')]);
  if (board) return;
  board = new Board($('stage'));
  pieces = new Pieces(board);
  board.setShadows(cfg.shadows);
  board.onPick(handlePick);
}

async function startGame(o) {
  clearTimeout(aiTimer); clearTimeout(endTimer);
  G = { ...o }; sel = null; G.score = loadScore();
  $('menu').classList.add('hidden'); $('game').classList.remove('hidden'); $('m-end').classList.add('hidden');
  const token = G;
  try { await ensureScene(); } catch (e) {
    window.__onca_fail && window.__onca_fail('Não foi possível carregar o 3D (Three.js): ' + (e && e.message || e));
    return;
  }
  if (G !== token) return;
  board.resize();
  if (!G.keepCam) board.resetCamera();
  pieces.sync(G.state, true);
  $('room').classList.toggle('hidden', G.mode !== 'online');
  $('room-code').textContent = G.code || '';
  updateHUD(); refresh();
  if (G.state.winner) showEnd(0); else maybeAI();
}

const myTurn = () => G && !G.state.winner && G.state.turn === G.mySide;
const setBanner = (t) => { $('banner').textContent = t; $('banner').classList.toggle('hidden', !t); };
const setMsg = (t) => { $('hud-msg').textContent = t; };
function invalid() { Sound.play('invalid'); }

function handlePick({ idx, pid }) {
  if (!G || !myTurn()) { if (G && !G.state.winner) { setMsg('Vez do adversário.'); invalid(); } return; }
  const s = G.state;
  if (idx === undefined) { idx = pieces.idxOf(pid); if (idx < 0) return invalid(); }
  const moves = R.legalMoves(s);

  if (s.turn === 'd' && R.inHand(s) > 0) { // colocação
    const m = moves.find((x) => x.to === idx);
    return m ? submit(m) : invalid();
  }
  const m = sel !== null && moves.find((x) => x.t !== 'end' && x.from === sel && x.to === idx);
  if (m) { sel = null; return submit(m); }

  const own = G.mySide === 'j' ? idx === s.j : s.dogs.includes(idx);
  if (own && moves.some((x) => x.t !== 'end' && x.from === idx)) {
    sel = idx; Sound.play('select'); setMsg('Escolha uma posição disponível.'); refresh();
  } else { sel = null; invalid(); setMsg(own ? 'Essa peça não tem movimentos.' : 'Escolha uma peça.'); refresh(); }
}

function submit(move) {
  if (G.mode === 'online' && MP.role === 'guest') { MP.sendMove(move); return; }
  if (!applyLocal(move)) return;
  if (G.mode === 'online') MP.publish(G.state); else maybeAI();
}
function applyLocal(move) {
  const r = R.applyMove(G.state, move);
  if (!r.ok) { invalid(); return false; }
  setState(r.state); return true;
}

function setState(ns) {
  const prev = G.state;
  G.state = ns; sel = null;
  const ev = pieces.sync(ns);
  if (ev.captured) { Sound.play('capture'); setMsg('Captura realizada!'); }
  else if (ev.moved) { Sound.play('move'); }
  updateHUD(); refresh();
  if (ns.winner && !prev.winner) {
    const won = ns.winner === G.mySide;
    if (won) G.score.me++; else G.score.opp++;
    store.set(scoreKey(), G.score); updateScore();
    setTimeout(() => Sound.play(won ? 'win' : 'lose'), 600);
    showEnd(1300);
  } else if (!ns.winner && G.mode === 'ai') maybeAI();
}

function maybeAI() {
  if (!G || G.mode !== 'ai' || G.state.winner || G.state.turn === G.mySide) return;
  clearTimeout(aiTimer);
  const token = G;
  aiTimer = setTimeout(() => {
    if (G !== token || G.state.winner) return;
    const m = chooseMove(G.state, G.level);
    if (m) applyLocal(m);
  }, 750);
}

function refresh() {
  if (!board) return;
  const list = [];
  if (myTurn()) {
    const s = G.state, moves = R.legalMoves(s);
    if (s.turn === 'd' && R.inHand(s) > 0) moves.forEach((m) => list.push({ idx: m.to, kind: 'move' }));
    else if (sel !== null) {
      list.push({ idx: sel, kind: 'sel' });
      moves.filter((m) => m.t !== 'end' && m.from === sel).forEach((m) => list.push({ idx: m.to, kind: m.t === 'jump' ? 'jump' : 'move' }));
    }
  }
  board.setHighlights(list);
}

function updateHUD() {
  updateScore();
  const s = G.state, you = (side) => (side === G.mySide ? ' (você)' : '');
  $('hud-j-name').textContent = '🐆 ' + G.names.j + you('j');
  $('hud-d-name').textContent = '🐕 ' + G.names.d + you('d');
  $('hud-j-info').textContent = `Capturas: ${s.captures} / ${R.WIN_CAPTURES}`;
  const inHand = R.inHand(s), alive = R.DOGS - s.captures;
  $('hud-d-info').textContent = `Restantes: ${alive}` + (inHand ? ` · a colocar: ${inHand}` : '');
  $('card-j').classList.toggle('active', !s.winner && s.turn === 'j');
  $('card-d').classList.toggle('active', !s.winner && s.turn === 'd');
  $('btn-endchain').classList.toggle('hidden', !(myTurn() && s.chain !== null));

  if (s.winner) { $('hud-turn').textContent = s.winner === 'j' ? 'A onça venceu!' : 'Os cachorros venceram!'; setMsg(''); return; }
  if (myTurn()) {
    $('hud-turn').textContent = 'Sua vez.';
    if (s.chain !== null) setMsg('Capture de novo ou encerre a jogada.');
    else if (s.turn === 'd' && inHand) setMsg('Escolha uma posição vazia para colocar um cachorro.');
    else if (!$('hud-msg').textContent.startsWith('Captura')) setMsg('Escolha uma peça.');
  } else {
    $('hud-turn').textContent = 'Vez do adversário.';
    if (!$('hud-msg').textContent.startsWith('Captura')) setMsg(G.mode === 'ai' ? 'O computador está pensando…' : 'Aguardando a jogada…');
  }
}

$('btn-endchain').onclick = () => { if (myTurn()) submit({ t: 'end' }); };
$('btn-cam').onclick = () => board && board.resetCamera();
$('btn-leave').onclick = () => {
  if (!confirm('Sair da partida?')) return;
  if (G && G.mode === 'online') MP.leave(true);
  showMenu();
};

/* ---------- fim de partida ---------- */
function showEnd(delay) {
  clearTimeout(endTimer);
  endTimer = setTimeout(() => {
    if (!G || !G.state.winner) return;
    const s = G.state;
    $('end-title').textContent = s.winner === 'j' ? '🐆 A onça venceu!' : '🐕 Os cachorros venceram!';
    const w = G.names[s.winner];
    $('end-sub').textContent = `Vencedor: ${w}. Capturas: ${s.captures}. Cachorros restantes: ${R.DOGS - s.captures}. Placar: ${G.names[G.mySide]} ${G.score.me} × ${G.score.opp} ${G.names[oppSide()]}.`;
    $('btn-closeroom').classList.toggle('hidden', G.mode !== 'online');
    openModal('m-end');
  }, delay);
}
$('btn-rematch').onclick = () => {
  if (!G) return;
  $('m-end').classList.add('hidden');
  if (G.mode === 'online') { MP.rematch(); setMsg(MP.role === 'guest' ? 'Pedindo nova partida…' : ''); }
  else startGame({ ...G, state: R.newState(), keepCam: true });
};
$('btn-tomenu').onclick = () => { if (G && G.mode === 'online') MP.leave(true); showMenu(); };
$('btn-closeroom').onclick = () => { MP.leave(true); showMenu(); };

/* ---------- retomar sala após atualizar a página ---------- */
window.addEventListener('load', () => {
  if (!MP.hasSaved() || !MP.supported()) return;
  const r = MP.resume(MPH);
  if (!r) return;
  if (r.role === 'host') {
    startGame({ mode: 'online', mySide: r.side, names: r.names, state: r.state, code: r.code });
    setBanner('Reconectando… aguardando o adversário voltar à sala.');
  } else {
    $('on-status').textContent = 'Reconectando à sua partida…'; openModal('m-online');
    $('online-forms').classList.add('hidden'); $('btn-close-online').classList.remove('hidden');
  }
});

/* ---------- tela cheia ---------- */
const fsRoot = document.documentElement;
const fsSupported = !!(fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen);
const fsActive = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function toggleFull() {
  try {
    if (fsActive()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else { const p = (fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen).call(fsRoot); if (p && p.catch) p.catch(() => {}); }
  } catch (e) {}
}
function syncFullBtn() {
  document.querySelectorAll('[data-fullscreen]').forEach((b) => { b.textContent = fsActive() ? 'SAIR DA TELA CHEIA' : 'TELA CHEIA'; });
}
document.querySelectorAll('[data-fullscreen]').forEach((b) => { if (fsSupported) b.onclick = toggleFull; else b.classList.add('hidden'); });
document.addEventListener('fullscreenchange', syncFullBtn);
document.addEventListener('webkitfullscreenchange', syncFullBtn);

window.__onca_ready = true;
