'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const html = fs.readFileSync('/home/claude/flapjack/delivery-1/flapjack.html', 'utf8');
const scripts = []; const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi; let m; while ((m = re.exec(html))) scripts.push(m[1]);
const tmp = path.join(os.tmpdir(), 'fj_audit_' + process.pid + '.cjs');
fs.writeFileSync(tmp, scripts.join('\n') + '\nmodule.exports={FlapjackUtils,Batter,Griddle,Pan,Whisk,Spatula,Game:PancakeGame};\n');
const M = require(tmp); fs.unlinkSync(tmp);
const U = M.FlapjackUtils;
const out = (k, v) => console.log(k.padEnd(44), v);

// A. hash vectors against Node's own crypto, and the standard CRC-32 check value
const vecs = ['', 'abc', 'The quick brown fox jumps over the lazy dog', 'a'.repeat(1000000)];
for (const v of vecs) out('sha256 len=' + v.length, U.sha256(v) === crypto.createHash('sha256').update(v).digest('hex') ? 'match' : 'MISMATCH');
const rnd = crypto.randomBytes(5000); out('sha256 random 5000 bytes', U.sha256(new Uint8Array(rnd)) === crypto.createHash('sha256').update(rnd).digest('hex') ? 'match' : 'MISMATCH');
out('crc32("123456789") (std check cbf43926)', U.hex32(U.crc32(Uint8Array.from(Buffer.from('123456789')))));

// B. netlist
const net = M.Batter.buildCPU(U);
out('gates / wires / inputs', net.numGates + ' / ' + net.numWires + ' / ' + net.numInputs);
out('flipFlops', Array.isArray(net.flipFlops) ? net.flipFlops.length : net.flipFlops);
let bad = 0; for (let g = 0; g < net.numGates; g++) if (net.gateA[g] >= net.numInputs + g && false) bad++;
out('gates by top block', JSON.stringify(Object.fromEntries([...new Set(net.blockNames.map(b => b.split('/')[1]))].map(t => [t, net.gates.filter(g => g.block.split('/')[1] === t).length]))));

// C. helpers
const game = M.Whisk.assemble(M.Game.PANCAKE_ASM);
function clone(n) { return { numInputs: n.numInputs, numGates: n.numGates, numWires: n.numWires, inputNames: n.inputNames.slice(), gates: n.gates.map(g => ({ ...g })), gateA: n.gateA.slice(), gateB: n.gateB.slice(), gateBlockId: n.gateBlockId.slice(), blockNames: n.blockNames.slice(), flipFlops: n.flipFlops, pins: n.pins, report: n.report }; }
function findGate(n, sub, occ) { let s = 0; for (let i = 0; i < n.gates.length; i++) if (n.gates[i].block.indexOf(sub) !== -1) { if (s++ === occ) return i; } return -1; }
function stuck(n, g, v) { const m = clone(n); const c = v ? m.pins.const0 : m.pins.const1; m.gateA[g] = c; m.gateB[g] = c; return m; }
const FR = 120;
function run(n) {
  const sim = new M.Griddle.GateSimulator(n, U); sim.bus.loadProgram(game.words, 0); sim.reset(true);
  const tape = M.Game.DEMO_TAPE;
  for (let f = 0; f < FR; f++) { sim.bus.keys = tape[f] || 0; let guard = 0; while (sim.bus.ram[M.Game.VAR_FRAME] < f + 1 && guard < 2000) { const r = sim.stepInstruction(); if (r.halted || r.oscillation) break; guard++; } }
  return sim.bus.videoHash();
}
function lock(n) {
  const sim = new M.Griddle.GateSimulator(n, U), twin = new M.Pan.BehaviouralCPU(); const L = new M.Spatula.LockstepRunner(sim, twin, U);
  L.loadProgram(game.words, 0); L.reset(true); const tape = M.Game.DEMO_TAPE;
  for (let f = 0; f < FR; f++) { L.setKeys(tape[f] || 0); let guard = 0; while (twin.ram[M.Game.VAR_FRAME] < f + 1 && !twin.halted && guard < 2000) { const r = L.stepInstruction(); if (!r.ok) return { caught: true, at: twin.retired, field: r.mismatch.field }; guard++; } }
  return { caught: false };
}
const base = run(net); out('baseline video hash (' + FR + ' frames)', U.hex32(base));
// C/D. my own gates, chosen differently from the builder's (it used adder/bit4 and first-of-block faults)
const picks = [['cpu/regfile/r5', 3, 0], ['cpu/alu/adder/bit11', 2, 1], ['cpu/sequencer', 5, 0], ['cpu/decoder', 40, 1], ['cpu/flags', 9, 0], ['cpu/bus', 30, 1], ['cpu/ir', 0, 1], ['cpu/ir', 1, 1]];
for (const [blk, occ, v] of picks) {
  const g = findGate(net, blk, occ); if (g < 0) { out(blk + '#' + occ, 'no such gate'); continue; }
  const mut = stuck(net, g, v); const h = run(mut); const l = lock(mut);
  out(`perturb SA${v} ${blk}#${occ} (gate ${g})`, `video ${U.hex32(h)} ${h === base ? 'UNCHANGED' : 'changed'}; lockstep ${l.caught ? 'caught at retired ' + l.at + ' (' + l.field + ')' : 'NOT caught'}`);
}
// revert check
const g0 = findGate(net, 'cpu/regfile/r5', 3); const m0 = stuck(net, g0, 1); m0.gateA[g0] = net.gateA[g0]; m0.gateB[g0] = net.gateB[g0]; out('revert returns baseline', U.hex32(run(m0)) === U.hex32(base) ? 'yes' : 'NO');
// IR gate names, to test the builder's "bit 0 of IR is always 0" hypothesis
out('first cpu/ir gate blocks', net.gates.filter(g => g.block.indexOf('cpu/ir') === 0).slice(0, 6).map(g => g.id + ':' + g.block).join(' | '));
// ---- hypothesis checks for the two uncaught faults
const FR2 = 600;
function lockN(n, FRn) { const sim = new M.Griddle.GateSimulator(n, U), twin = new M.Pan.BehaviouralCPU(); const L = new M.Spatula.LockstepRunner(sim, twin, U); L.loadProgram(game.words, 0); L.reset(true); const tape = M.Game.DEMO_TAPE; for (let f = 0; f < FRn; f++) { L.setKeys(tape[f] || 0); let guard = 0; while (twin.ram[M.Game.VAR_FRAME] < f + 1 && !twin.halted && guard < 2000) { const r = L.stepInstruction(); if (!r.ok) return 'caught at ' + twin.retired + ' ' + r.mismatch.field; guard++; } } return 'NOT caught in ' + FRn + ' frames'; }
const gd = findGate(net, 'cpu/decoder', 9), gi = findGate(net, 'cpu/ir', 2);
out('builder fault 3: decoder#9 gate id', gd); out('builder fault 12: ir#2 gate id', gi);
out('decoder#9 SA0 lockstep', lockN(stuck(net, gd, 0), 150));
out('ir#2 SA1 lockstep', lockN(stuck(net, gi, 1), 150));
// opcode census of the program
const ops = {}; for (const w of game.words) { const o = (w >> 11) & 31; ops[o] = (ops[o] || 0) + 1; } out('opcode field census (bits15:11)', JSON.stringify(ops));
const un = []; for (let k = 0; k < 40; k++) { const g = findGate(net, 'cpu/ir', k); if (g < 0) break; for (const v of [0, 1]) { const r = lockN(stuck(net, g, v), 40); if (r.startsWith('NOT')) un.push('ir#' + k + '(g' + g + ') SA' + v); } }
out('cpu/ir gates 0-39 uncaught in 40 frames', un.join(', ') || 'none');
for (const k of [10, 20]) for (const v of [0, 1]) out('ir#' + k + ' SA' + v + ' 600 frames lockstep', lockN(stuck(net, findGate(net, 'cpu/ir', k), v), 600));
// are these gates fan-out-free (dead)?  count readers
const readers = g => { const w = net.numInputs + g; let c = 0; for (let i = 0; i < net.numGates; i++) if (net.gateA[i] === w || net.gateB[i] === w) c++; return c; };
out('fanout of ir g47..g50, g60, g72', [47, 48, 49, 50, 60, 72].map(g => 'g' + g + ':' + readers(g)).join(' '));
// trace the fanout chain from ir g47 to see where it leads
function readersOf(g) { const w = net.numInputs + g, r = []; for (let i = 0; i < net.numGates; i++) if (net.gateA[i] === w || net.gateB[i] === w) r.push(i); return r; }
let cur = 47; const chain = []; for (let d = 0; d < 12; d++) { const r = readersOf(cur); chain.push('g' + cur + '[' + net.gates[cur].block + ']->' + (r.length ? r.map(x => 'g' + x + '[' + net.gates[x].block + ']').join(',') : 'NONE')); if (r.length !== 1) break; cur = r[0]; }
console.log(chain.join('\n'));
const ffNames = net.flipFlops.filter(f => JSON.stringify(f).indexOf('ir') !== -1).length; out('flipflops mentioning ir', ffNames);
