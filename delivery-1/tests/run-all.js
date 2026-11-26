#!/usr/bin/env node
// tests/run-all.js — Zero-dependency Node headless runner for FLAPJACK Taste Test (42 suites)
// Reads flapjack.html, extracts its <script> blocks, executes all suites, and writes tests/results.jsonl.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const htmlPath = path.join(rootDir, 'flapjack.html');
const outJsonlPath = path.join(__dirname, 'results.jsonl');

const htmlSource = fs.readFileSync(htmlPath, 'utf8');

// Extract all <script ...>...</script> blocks from flapjack.html
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
const scripts = [];
let m;
while ((m = scriptRegex.exec(htmlSource)) !== null) {
  scripts.push(m[1]);
}

if (scripts.length === 0) {
  console.error('No <script> blocks found in', htmlPath);
  process.exit(1);
}

// Write extracted scripts to a temporary CommonJS module and load via native require()
// (Zero external packages, zero eval, zero new Function, native V8 typed-array speed)
const tmpFile = path.join(os.tmpdir(), 'flapjack_extracted_' + process.pid + '.cjs');
const footer = '\nmodule.exports = { FlapjackUtils, Batter, Griddle, Pan, Whisk, Spatula, Syrup, FlapjackSound, PancakeGame, TasteTest };\n';
fs.writeFileSync(tmpFile, scripts.join('\n') + footer, 'utf8');

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
  Syrup: M.Syrup,
  Sound: M.FlapjackSound,
  Game: M.PancakeGame
};

const htmlSha256 = deps.Utils.sha256(htmlSource);
const { suites } = M.TasteTest.buildSuites(deps, {
  getHtmlSource: () => htmlSource
});

const records = [];
let passed = 0;
let failed = 0;
const tAll0 = Date.now();

console.log('FLAPJACK Headless Taste Test (' + suites.length + ' suites)');
console.log('HTML SHA-256:', htmlSha256);

for (let i = 0; i < suites.length; i++) {
  const s = suites[i];
  const inputSha256 = deps.Utils.sha256(s.inputTag + ':' + s.id);
  const t0 = Date.now();
  let res;
  try {
    res = s.run();
  } catch (err) {
    res = { pass: false, metrics: { error: err && err.stack ? err.stack : String(err) } };
  }
  const durationMs = Date.now() - t0;
  if (res.pass) passed++; else failed++;

  const rec = {
    suiteId: s.id,
    name: s.name,
    pass: !!res.pass,
    htmlSha256,
    inputSha256,
    durationMs,
    metrics: res.metrics
  };
  records.push(rec);
  const tag = res.pass ? 'PASS' : 'FAIL';
  console.log(String(s.id).padStart(2, ' ') + '. [' + tag + '] ' + s.name + ' (' + durationMs + 'ms)');
}

const totalMs = Date.now() - tAll0;
fs.writeFileSync(outJsonlPath, records.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
console.log('---');
console.log('Total:', passed + '/' + suites.length, 'PASS,', failed, 'FAIL in', (totalMs / 1000).toFixed(2) + 's');
console.log('Wrote:', outJsonlPath);
if (failed > 0) process.exit(1);