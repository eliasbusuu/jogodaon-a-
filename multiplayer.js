// Multiplayer online por sala privada usando PeerJS (WebRTC, ligação direta entre os dois jogadores).
// O anfitrião (quem cria a sala) é a autoridade: valida TODAS as jogadas com rules.js.
// Não precisa de servidor próprio nem de conta/configuração: funciona direto no GitHub Pages.
import { applyMove, newState } from './rules.js';

const PFX = 'jogodaonca-', KEY = 'onca-room';
let peer = null, conn = null, role = null, room = null, H = {}, closed = false;
let joined = false, tries = 0, maxTries = 1, hostAttempts = 0;

const other = (s) => (s === 'j' ? 'd' : 'j');
const pid = (code) => PFX + code.toLowerCase();
const genCode = () => 'ONCA-' + Math.floor(1000 + Math.random() * 9000);
const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify({ ...o, ts: Date.now() })); } catch (e) {} };
const load = () => { try { const o = JSON.parse(localStorage.getItem(KEY)); return o && Date.now() - o.ts < 12 * 3600e3 ? o : null; } catch (e) { return null; } };
const clear = () => { try { localStorage.removeItem(KEY); } catch (e) {} };
const names = (r) => (r.hostSide === 'j'
  ? { j: r.hostName, d: r.guestName || 'Convidado' }
  : { j: r.guestName || 'Convidado', d: r.hostName });
const info = () => ({ side: room.hostSide, names: names(room), state: room.state, code: room.code });
const send = (c, d) => { try { if (c && c.open) c.send(d); } catch (e) {} };

export function normCode(c) {
  c = String(c || '').trim().toUpperCase().replace(/\s+/g, '');
  return /^\d{4}$/.test(c) ? 'ONCA-' + c : c;
}

/* ---------- anfitrião ---------- */
function startHost(isNew) {
  closed = false; role = 'host';
  peer = new Peer(pid(room.code));
  peer.on('open', () => { hostAttempts = 0; save({ role: 'host', room }); H.onCode && H.onCode(room.code); });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  peer.on('error', (e) => {
    if (e.type === 'unavailable-id') {
      try { peer.destroy(); } catch (x) {}
      if (isNew && hostAttempts++ < 6) { room.code = genCode(); startHost(true); }
      else if (!isNew && hostAttempts++ < 10) setTimeout(() => !closed && startHost(false), 2500);
      else H.onError && H.onError('Não foi possível abrir a sala. Crie uma nova.');
    } else if (e.type !== 'peer-unavailable') H.onError && H.onError('Erro de conexão: ' + e.type);
  });
  peer.on('connection', (c) => {
    c.on('data', (d) => { try { hostData(c, d); } catch (e) {} });
    c.on('close', () => { if (conn === c) { conn = null; H.onPeerLeft && H.onPeerLeft(); } });
    c.on('error', () => {});
  });
}

function refuse(c) { send(c, { t: 'full' }); setTimeout(() => { try { c.close(); } catch (e) {} }, 400); }

function hostData(c, d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'hello') {
    const nm = String(d.name || 'Convidado').slice(0, 20);
    if (room.started && room.guestName && room.guestName !== nm) return refuse(c);
    if (conn && conn !== c && conn.open) {
      if (room.guestName === nm) { const old = conn; conn = null; try { old.close(); } catch (e) {} }
      else return refuse(c);
    }
    conn = c; room.guestName = nm; room.started = true; save({ role: 'host', room });
    send(c, { t: 'welcome', side: other(room.hostSide), names: names(room), state: room.state, code: room.code });
    H.onReady && H.onReady(info());
    return;
  }
  if (c !== conn) return;
  if (d.t === 'move') {
    const r = room.state.turn === other(room.hostSide) ? applyMove(room.state, d.move) : { ok: false };
    if (r.ok) { room.state = r.state; save({ role: 'host', room }); send(c, { t: 'state', state: room.state }); H.onState && H.onState(room.state); }
    else send(c, { t: 'state', state: room.state }); // ressincroniza o convidado
  } else if (d.t === 'rematch') MP.rematch();
  else if (d.t === 'bye') { conn = null; H.onPeerLeft && H.onPeerLeft(true); }
}

/* ---------- convidado ---------- */
function connectGuest() {
  if (closed || !peer || peer.destroyed) return;
  const c = peer.connect(pid(room.code), { reliable: true });
  conn = c;
  c.on('open', () => c.send({ t: 'hello', name: room.name }));
  c.on('data', (d) => { try { guestData(d); } catch (e) {} });
  c.on('close', () => { if (conn !== c) return; if (joined) H.onPeerLeft && H.onPeerLeft(); retry(); });
  c.on('error', () => {});
}
function retry() { if (closed) return; setTimeout(() => { if (!closed && (!conn || !conn.open)) connectGuest(); }, 3000); }

function guestData(d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'welcome' || d.t === 'restart') {
    joined = true; tries = 0;
    save({ role: 'guest', code: room.code, name: room.name });
    H.onReady && H.onReady({ side: d.side, names: d.names, state: d.state, code: d.code });
  } else if (d.t === 'state') H.onState && H.onState(d.state);
  else if (d.t === 'full') { H.onError && H.onError('Sala cheia, ou a partida já começou com outra pessoa.'); MP.leave(true); }
  else if (d.t === 'bye') { closed = true; clear(); H.onPeerLeft && H.onPeerLeft(true); }
}

/* ---------- API pública ---------- */
export const MP = {
  supported: () => typeof Peer !== 'undefined',
  get role() { return role; },

  createRoom(name, sideChoice, handlers) {
    H = handlers; hostAttempts = 0;
    room = { code: genCode(), hostName: name, guestName: null, started: false, state: newState(),
      hostSide: sideChoice === 'j' || sideChoice === 'd' ? sideChoice : (Math.random() < 0.5 ? 'j' : 'd') };
    startHost(true);
  },

  joinRoom(code, name, handlers, resumed) {
    H = handlers; closed = false; role = 'guest'; joined = false; tries = 0; maxTries = resumed ? 6 : 1;
    room = { code: normCode(code), name };
    peer = new Peer();
    peer.on('open', connectGuest);
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
    peer.on('error', (e) => {
      if (closed) return;
      if (e.type === 'peer-unavailable') {
        if (joined || ++tries < maxTries) retry();
        else { H.onError && H.onError('Sala não encontrada. Confira o código (ou o anfitrião fechou a sala).'); MP.leave(true); }
      } else H.onError && H.onError('Erro de conexão: ' + e.type);
    });
    setTimeout(() => { if (!closed && !joined && !resumed) { H.onError && H.onError('Tempo esgotado ao conectar. Tente de novo.'); MP.leave(true); } }, 20000);
  },

  // Retoma uma sala salva (após atualizar a página). Retorna dados para o anfitrião, null para o convidado.
  resume(handlers) {
    const s = load();
    if (!s) return null;
    if (s.role === 'host') {
      H = handlers; room = s.room; hostAttempts = 0; startHost(false);
      return { role: 'host', ...info() };
    }
    MP.joinRoom(s.code, s.name, handlers, true);
    return { role: 'guest' };
  },
  hasSaved: () => !!load(),

  sendMove(move) { send(conn, { t: 'move', move }); },

  // Anfitrião: publica o novo estado (após validar a própria jogada).
  publish(state) {
    if (role !== 'host') return;
    room.state = state; save({ role: 'host', room });
    send(conn, { t: 'state', state });
  },

  rematch() {
    if (role === 'host') {
      room.hostSide = other(room.hostSide); room.state = newState(); save({ role: 'host', room });
      send(conn, { t: 'restart', side: other(room.hostSide), names: names(room), state: room.state, code: room.code });
      H.onReady && H.onReady(info());
    } else send(conn, { t: 'rematch' });
  },

  leave(clearSaved = true) {
    closed = true;
    send(conn, { t: 'bye' });
    const p = peer;
    setTimeout(() => { try { p && p.destroy(); } catch (e) {} }, 400);
    peer = null; conn = null; role = null; joined = false;
    if (clearSaved) clear();
  },
};
