// IA: minimax com poda alfa-beta. Avaliação do ponto de vista da onça.
import * as R from './rules.js';

const DEPTH = { facil: 2, medio: 3, dificil: 5 };

function evaluate(s) {
  const jm = R.jaguarMoves(s);
  const jumps = jm.filter((m) => m.t === 'jump').length;
  const steps = jm.length - jumps;
  return s.captures * 300 + steps * 10 + jumps * 60;
}
const order = (ms) => ms.slice().sort((a, b) => (b.t === 'jump') - (a.t === 'jump'));

function search(s, depth, alpha, beta) {
  if (s.winner) return (s.winner === 'j' ? 1 : -1) * (10000 + depth);
  if (depth === 0) return evaluate(s);
  const moves = R.legalMoves(s);
  if (!moves.length) return evaluate(s);
  const max = s.turn === 'j';
  let best = max ? -Infinity : Infinity;
  for (const m of order(moves)) {
    const v = search(R.applyUnchecked(s, m).state, depth - 1, alpha, beta);
    if (max) { if (v > best) best = v; if (best > alpha) alpha = best; }
    else { if (v < best) best = v; if (best < beta) beta = best; }
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseMove(s, level = 'medio') {
  const moves = R.legalMoves(s);
  if (!moves.length) return null;
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  if (level === 'facil' && Math.random() < 0.3) return rnd(moves);
  const max = s.turn === 'j', depth = DEPTH[level] || 3;
  let best = [], bv = max ? -Infinity : Infinity;
  for (const m of order(moves)) {
    const v = search(R.applyUnchecked(s, m).state, depth - 1, -Infinity, Infinity);
    if (max ? v > bv : v < bv) { bv = v; best = [m]; } else if (v === bv) best.push(m);
  }
  return rnd(best);
}
