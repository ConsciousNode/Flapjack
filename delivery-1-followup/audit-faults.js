#!/usr/bin/env node
// tests/audit-faults.js — Measured reachability and fault-exposure audit for gate 264 (SA0) and gate 74 (SA1)
// Does not modify flapjack.html; reads it and runs Griddle vs Pan lockstep on targeted programs.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const htmlPath = path.join(rootDir, 'flapjack.html');
const htmlSource = fs.readFileSync(htmlPath, 'utf8');

const scripts = [];
const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let m;
while ((m = scriptRe.exec(htmlSource)) !== null) scripts.push(m[1]);

const tmpFile = path.join(os.tmpdir(), 'flapjack_audit_' + process.pid + '.cjs');
fs.writeFileSync(
  tmpFile,
  scripts.join('\n') +
    '\nmodule.exports = { FlapjackUtils, Batter, Griddle, Pan, Whisk, Spatula, PancakeGame, TasteTest };\n',
  'utf8'
);

let M;
try {
  M = require(tmpFile);
} finally {
  try { fs.unlinkSync(tmpFile); } catch (_) {}
}

const deps = {
  Utils: M.FlapjackUtils,
  Batter: M.Batter,
  Griddle: M.Griddle,
  Pan: M.Pan,
  Whisk: M.Whisk,
  Spatula: M.Spatula,
  Game: M.PancakeGame
};

const net = deps.Batter.buildCPU(deps.Utils);

// 1. Backward reachability from all architectural outputs (same set as IR audit)
const archOutputs = [
  ...net.pins.memAddr,
  ...net.pins.memWdata,
  net.pins.memRe,
  net.pins.memWe,
  net.pins.retire,
  net.pins.halted,
  ...net.pins.pc,
  net.pins.flags.z,
  net.pins.flags.n,
  net.pins.flags.c,
  net.pins.flags.v,
  ...net.pins.regs.flat()
];

const reachable = new Uint8Array(net.numWires);
const bStack = archOutputs.slice();
while (bStack.length > 0) {
  const w = bStack.pop();
  if (reachable[w]) continue;
  reachable[w] = 1;
  if (w >= net.numInputs) {
    const gid = w - net.numInputs;
    bStack.push(net.gateA[gid], net.gateB[gid]);
  }
}

// Forward cone helper: find direct consumers and reachable named pins from a wire
function forwardCone(startWire) {
  const seen = new Uint8Array(net.numWires);
  const q = [startWire];
  seen[startWire] = 1;
  const directConsumers = [];
  const blocksReached = new Set();

  while (q.length > 0) {
    const w = q.shift();
    for (let g = 0; g < net.numGates; g++) {
      if (net.gateA[g] === w || net.gateB[g] === w) {
        const outW = net.numInputs + g;
        if (w === startWire) directConsumers.push({ gateId: g, block: net.gates[g].block });
        if (!seen[outW]) {
          seen[outW] = 1;
          blocksReached.add(net.gates[g].block);
          q.push(outW);
        }
      }
    }
  }

  const reachedPins = [];
  const checkPin = (name, w) => { if (seen[w]) reachedPins.push(name); };
  checkPin('memRe', net.pins.memRe);
  checkPin('memWe', net.pins.memWe);
  checkPin('retire', net.pins.retire);
  checkPin('halted', net.pins.halted);
  checkPin('flag_Z', net.pins.flags.z);
  checkPin('flag_N', net.pins.flags.n);
  checkPin('flag_C', net.pins.flags.c);
  checkPin('flag_V', net.pins.flags.v);
  if (net.pins.pc.some(w => seen[w])) reachedPins.push('pc[*]');
  if (net.pins.memAddr.some(w => seen[w])) reachedPins.push('memAddr[*]');
  if (net.pins.memWdata.some(w => seen[w])) reachedPins.push('memWdata[*]');
  for (let r = 1; r < 8; r++) {
    if (net.pins.regs[r].some(w => seen[w])) reachedPins.push('R' + r + '[*]');
  }

  return { directConsumers, reachedPins, blocksReachedCount: blocksReached.size };
}

function inspectGate(gid) {
  const g = net.gates[gid];
  const cone = forwardCone(g.out);
  return {
    gateId: gid,
    block: g.block,
    a: g.a,
    b: g.b,
    out: g.out,
    backwardReachableFromArchOutputs: reachable[g.out] === 1,
    directConsumers: cone.directConsumers,
    reachedArchPins: cone.reachedPins
  };
}

function runShortLockstep(asmSrc, fault) {
  const asm = deps.Whisk.assemble(asmSrc);
  if (!asm.ok) throw new Error('ASM error: ' + JSON.stringify(asm.errors));
  const mutated = M.TasteTest.injectFault(net, fault);
  const sim = new deps.Griddle.GateSimulator(mutated, deps.Utils);
  const twin = new deps.Pan.BehaviouralCPU();
  const lock = new deps.Spatula.LockstepRunner(sim, twin, deps.Utils);
  lock.loadProgram(asm.words, 0);
  lock.reset(true);
  const res = lock.runInstructions(100);
  return {
    ok: res.ok,
    ran: res.ran,
    mismatch: res.mismatch
      ? {
          field: res.mismatch.field,
          retired: res.mismatch.retired,
          cycle: res.mismatch.cycle,
          pc: deps.Utils.hex16(res.mismatch.pc),
          word: deps.Utils.hex16(res.mismatch.word),
          expected: {
            pc: deps.Utils.hex16(res.mismatch.expected.pc),
            halted: res.mismatch.expected.halted,
            regs: Array.from(res.mismatch.expected.regs).map(deps.Utils.hex16),
            writeHash: deps.Utils.hex32(res.mismatch.expected.writeHash)
          },
          actual: {
            pc: deps.Utils.hex16(res.mismatch.actual.pc),
            halted: res.mismatch.actual.halted,
            regs: Array.from(res.mismatch.actual.regs).map(deps.Utils.hex16),
            writeHash: deps.Utils.hex32(res.mismatch.actual.writeHash)
          }
        }
      : null
  };
}

// Verify which gate Fault #3 is (findGateByBlock(net, 'cpu/decoder', 10))
const decGates = net.gates.filter(g => g.block === 'cpu/decoder');
const fault3GateId = decGates[10].id;

console.log('=== 1) FAULT #3: SA0 cpu/decoder ===');
console.log('Verified Fault #3 gateId (10th 0-indexed gate in cpu/decoder):', fault3GateId);
const info264 = inspectGate(fault3GateId);
console.log('Gate 264 structure & reachability:', JSON.stringify(info264, null, 2));

// Trace exact opcode term gate 264 belongs to
// In batter.js decoder:
// First 5 gates (decGates[0..4]) are opN[0..4] = not(IR[11..15]).
// Then for code = 0..26, each opcode is andN(5 wires) = 4 ANDs = 8 NANDs!
// So code 0 (NOP) = decGates[5..12] (8 gates), code 1 (HLT) = decGates[13..20], ...
const idxInDec = fault3GateId - decGates[0].id;
console.log('Offset within cpu/decoder:', idxInDec, '(decGates[0..4] = opN[0..4]; decGates[5..12] = opcode 0 NOP 5-input AND)');
for (let i = 5; i <= 12; i++) {
  const g = decGates[i];
  console.log(`  dec[${i}] gate ${g.id}: a=${g.a}, b=${g.b} -> out=${g.out}, reachable=${reachable[g.out]}`);
}
// Check if opcode 0 (NOP) output wire (decGates[12].out) has ANY consumers!
const nopOutWire = decGates[12].out;
console.log('NOP decoded output wire', nopOutWire, 'forwardCone:', JSON.stringify(forwardCone(nopOutWire), null, 2));

console.log('\n=== 2) GATE 74 (inside IR[2]), STUCK-AT-1 ===');
const info74 = inspectGate(74);
console.log('Gate 74 structure & reachability:', JSON.stringify(info74, null, 2));

// Test Gate 74 SA1 on a short program using PUSH R1 (where Rb = 1 -> IR[2] = 1)
const progPushR1 = `
  LDI R7, 0x0300
  LDI R1, 0xCAFE
  PUSH R1
  POP R2
  HLT
`;
const exp74 = runShortLockstep(progPushR1, { name: 'SA1 gate 74 (IR[2] hold-mux)', type: 'stuck1', gateId: 74 });
console.log('Gate 74 SA1 on PUSH R1 program:', JSON.stringify(exp74, null, 2));

// Also verify whether PANCAKE_ASM ever executes PUSH (opcode 25)
const gameAsm = deps.Whisk.assemble(deps.Game.PANCAKE_ASM);
let pushCountInGame = 0;
for (let i = 0; i < gameAsm.words.length; ) {
  const d = deps.Whisk.disassembleOne(gameAsm.words, i);
  if (d.text.startsWith('PUSH ')) pushCountInGame++;
  i += d.size;
}
console.log('PUSH instructions present in PANCAKE_ASM:', pushCountInGame);

// Verify Gate 74 SA1 on 600-frame demo to confirm zero divergence on demo
const demoMut74 = M.TasteTest.injectFault(net, { name: 'SA1 gate 74', type: 'stuck1', gateId: 74 });
const demoRes74 = M.TasteTest.runDemoLockstep(demoMut74, gameAsm.words, deps.Game.DEMO_TAPE, 600, deps.Game.VAR_FRAME, deps);
console.log('Gate 74 SA1 over 600-frame demo lockstep:', { ok: demoRes74.ok, framesRun: demoRes74.framesRun, retired: demoRes74.retired });