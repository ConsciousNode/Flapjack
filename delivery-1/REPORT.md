# FLAPJACK Verification Report (`REPORT.md`)

Environment: Node `v18.20.4`, Linux x86_64 sandbox.
`flapjack.html` SHA-256: `8148e5400982bf69fdb1e9388a72b29930c99d8e81bd4e363b3c08da9df28268` (198,130 bytes).

## 1. Spec Part Status Table

| Spec § | Part | Status | Suites Exercised / Missing Coverage |
|---|---|---|---|
| §1 | Naming (`Batter`, `Griddle`, `Pan`, `Whisk`, `Spatula`, `Syrup`, `Burnt Edges`, `Taste Test`) | built and tested | Suites 1–42 |
| §2 | 16-bit Machine, Memory Map, NAND-Only Flip-Flops, Oscillation Detection | built and tested | Suites 2, 3, 4, 5, 8, 9, 10, 17 |
| §3 | ISA (27 instructions, fixed 16-bit encoding, `ISA.md`) | built and tested | Suites 9–17, 21, 22 |
| §4 | Batter (Structural NAND compiler, block map, critical path, SHA-256) | built and tested | Suites 1, 2, 3, 4, 5, 6, 7 |
| §5 | Griddle (Event-driven NAND simulator, oscillation detection, toggle & eval counters) | built and tested | Suites 3–17, 24, 25, 26, 30 |
| §6 | Pan (Independent behavioural twin) & Lockstep (`diff`) | built and tested | Suites 9–17, 23, 24, 26 |
| §7 | Whisk (Two-pass assembler, macros, directives, errors, round-trip disassembler) | built and tested | Suites 18, 19, 20, 21, 22 |
| §8 | PANCAKE Game (Assembly-only, 8.8 physics, xorshift16, 600-frame demo) | built and tested | Suites 21, 23, 24, 25 |
| §9 | Spatula (Time-travel debugger, 4,096 checkpoints, reversibility, scrubbing) | built and tested | Suites 27, 28, 29 |
| §10 | Syrup (Power heatmap treemap, Joules counter, top-3 blocks) | built and tested | Suite 30 |
| §11 | Burnt Edges (In-memory fault lab: 24 real faults + 2 control faults; no shipped switches) | built and tested | Suites 34–39, 41 |
| §12 | Sound (Offline 22,050 Hz PCM WAV + embedded CRC-32; Web Audio live player) | built and not fully tested | Offline WAV & CRC-32 tested in Suites 31, 32, 33; live Web Audio autoplay/playback path not exercised in headless Node |
| §13 | Taste Test (42 numbered suites in-page & headless `tests/run-all.js` → `results.jsonl`) | built and tested | Suites 1–42 (headless Node run verified; in-browser DOM click execution not exercised in headless Node) |
| §14 | Forbidden / Independence & Static Scan | built and tested | Suites 25, 26, 40, 41 |
| §15 | Deliverables (`flapjack.html`, `tests/`, `ISA.md`, `DEMO.md`, `LIFTS.md`, `REPORT.md`) | built and tested | All files generated and verified against `results.jsonl` |
| §16 | Style (Zero-dependency DOM-builder UI, keyboard + mouse, no autoplay) | built and not fully tested | Static rules verified in Suite 40; interactive browser rendering/input not exercised in headless Node |

## 2. Batter Build Report & Gate Census

**Measured:**

| Metric | Value |
|---|---:|
| Total 2-input NAND gates | 4,741 |
| Master-slave D flip-flops (built from NANDs) | 167 |
| Critical-path depth (FF output / input → FF D input) | 73 gates |
| Critical-path endpoint | `cpu/flags/flag_Z` |
| Netlist deterministic SHA-256 | `58dcc9b8064d2673d1d0f8d8592b21408e46f3214d60e856ac5c3a547b530ae2` |
| Build time (Suite 1, two builds) | 70 ms |

**Measured:** Top-level block NAND counts:

| Top-Level Block | NAND Count |
|---|---:|
| `cpu/regfile` | 2,384 |
| `cpu/alu` | 848 |
| `cpu/pc` | 415 |
| `cpu/decoder` | 329 |
| `cpu/tmp` | 216 |
| `cpu/ir` | 211 |
| `cpu/bus` | 187 |
| `cpu/sequencer` | 66 |
| `cpu/flags` | 63 |
| `cpu/control` | 20 |
| `cpu/clock` | 2 |
| **Sum** | **4,741** |

## 3. Simulation Performance, Spatula Memory, Perturbation & Sound

**Measured:**

| Metric | Value | Source Suite |
|---|---:|---|
| Pan throughput (600-frame demo) | 2,250,432 insns/s | Suite 23 |
| Griddle throughput (600-frame demo lockstep) | 12,632 insns/s | Suite 24 |
| Griddle gate evaluations/sec | 80,554,197 evals/s | Suite 24 |
| ALU 8-bit exhaustive adder cases | 65,536 | Suite 6 |
| ALU 16-bit random fuzz cases | 100,000 | Suite 7 |
| Whisk PANCAKE assembly size | 887 words (55 symbols) | Suite 21 |
| Whisk round-trip random fuzz | 2,000 insns (2,524 words) | Suite 22 |
| Perturbation baseline VRAM hash (`gateId=3695`) | `70d5848a` | Suite 25 |
| Perturbation mutated VRAM hash (`gateId=3695` SA1) | `6da17080` | Suite 25 |
| Perturbation reverted VRAM hash | `70d5848a` | Suite 25 |
| Spatula reversibility trace | 20,000 insns (5 checkpoints, 0 mismatches) | Suite 27 |
| Spatula history memory at 100,000 insns | 3,024,416 bytes (2.88 MB, 25 checkpoints) | Suite 28 |
| Demo WAV size / samples (22,050 Hz mono PCM) | 986,704 bytes / 493,324 samples | Suite 31 |
| Demo WAV embedded PCM CRC-32 / full WAV CRC-32 | `116f62e9` / `cec97c20` | Suite 31 |
| Full headless 42-suite runtime | 115.08 s (42/42 PASS) | `tests/run-all.js` |

## 4. Syrup Power Heatmap Counters (600-Frame Demo)

**Measured:** Total toggles across 335,595 cycles = `408,179,556`; total estimated energy at `1.0e-12` J/toggle = `4.082e-4` J.

| Rank | Block | Total Toggles | Toggles / Cycle | Estimated Energy (J) |
|---:|---|---:|---:|---:|
| 1 | `cpu/regfile` | 196,642,655 | 585.95 | `1.966e-4` |
| 2 | `cpu/alu` | 48,539,004 | 144.64 | `4.854e-5` |
| 3 | `cpu/pc` | 47,242,500 | 140.77 | `4.724e-5` |

## 5. Burnt Edges Fault-Lab Table (Suites 34–39)

**Measured:** 24 injected faults + 2 unreachable control faults, run in lockstep over the 600-frame demo (`166,532` retired instructions max).

| # | Suite | Fault Name | Type | Caught? | Retired Insn at Catch | First Mismatched Field |
|---:|---:|---|---|---|---:|---|
| 1 | 34 | `SA0 cpu/alu/adder/bit0` | `stuck0` | Yes | 57 | `R1` |
| 2 | 34 | `SA0 cpu/pc/inc/bit0` | `stuck0` | Yes | 1 | `PC` |
| 3 | 34 | `SA0 cpu/decoder` | `stuck0` | **No** | — | — |
| 4 | 34 | `SA0 cpu/regfile/r1` | `stuck0` | Yes | 20 | `R1` |
| 5 | 34 | `SA0 cpu/flags` | `stuck0` | Yes | 57 | `FLAGS` |
| 6 | 34 | `SA0 cpu/bus/addr_mux` | `stuck0` | Yes | 4 | `WRITE_HASH` |
| 7 | 35 | `SA1 cpu/alu/adder/bit2` | `stuck1` | Yes | 62 | `R2` |
| 8 | 35 | `SA1 cpu/pc/inc/bit1` | `stuck1` | Yes | 2 | `PC` |
| 9 | 35 | `SA1 cpu/sequencer` | `stuck1` | Yes | 1 | `PC` |
| 10 | 35 | `SA1 cpu/regfile/r2` | `stuck1` | Yes | 58 | `R2` |
| 11 | 35 | `SA1 cpu/alu/out_mux` | `stuck1` | Yes | 340 | `FLAGS` |
| 12 | 35 | `SA1 cpu/ir` | `stuck1` | **No** | — | — |
| 13 | 36 | `SWAP alu/adder bit0 & bit1` | `swap_inputs` | Yes | 61 | `R1` |
| 14 | 36 | `SWAP bus/addr_mux bit0 & bit1` | `swap_inputs` | Yes | 4 | `WRITE_HASH` |
| 15 | 36 | `INV alu/adder/bit1 sum` | `invert_out` | Yes | 57 | `R1` |
| 16 | 36 | `INV pc/inc/bit0 sum` | `invert_out` | Yes | 1 | `PC` |
| 17 | 37 | `MISSING_CARRY adder/bit3/carry` | `stuck0` | Yes | 62 | `R2` |
| 18 | 37 | `MISSING_CARRY adder/bit7/carry` | `stuck0` | Yes | 58 | `FLAGS` |
| 19 | 37 | `STUCK_PC bit0` | `stuck0` | Yes | 59 | `PC` |
| 20 | 37 | `STUCK_PC bit4` | `stuck1` | Yes | 1 | `PC` |
| 21 | 38 | `UNCLOCKED_FF pc_0` | `unclock_ff` | Yes | 1 | `PC` |
| 22 | 38 | `UNCLOCKED_FF r1_0` | `unclock_ff` | Yes | 1 | `R1` |
| 23 | 38 | `SWAP regfile/read_a mux inputs` | `swap_inputs` | Yes | 56 | `WRITE_HASH` |
| 24 | 38 | `SWAP regfile/read_b mux inputs` | `swap_inputs` | Yes | 4 | `WRITE_HASH` |
| 25 | 39 | `CONTROL_INVISIBLE unreachable gate SA0` | `control_unreachable` | **No** (expected) | — | — |
| 26 | 39 | `CONTROL_INVISIBLE unreachable gate SA1` | `control_unreachable` | **No** (expected) | — | — |

**Hypothesis:** Fault #3 (`SA0 cpu/decoder`, 10th gate in `cpu/decoder`) sits inside an opcode decode term for an instruction (such as `HLT` or `ADC`/`SBC`) never executed during the 600-frame demo loop, and Fault #12 (`SA1 cpu/ir`, 3rd gate in `cpu/ir`) sits inside bit 0 of the Instruction Register, which is always `0` for valid encodings (bits `1:0` are reserved `00`). Both are reported uncaught rather than masked or swapped out.

## 6. Spec Contradictions Caught

1. **§3 Instruction Count Contradiction:** Section 3 is titled *"The ISA (24 instructions, fixed encoding)"*, yet lists **27** distinct mnemonics (`NOP, HLT, MOV, LDI, LD, ST, ADD, ADC, SUB, SBC, AND, OR, XOR, NOT, SHL, SHR, SAR, CMP, JMP, JZ, JNZ, JN, JC, CALL, RET, PUSH, POP`).
   - **Action taken:** Implemented all **27** listed instructions using a 5-bit opcode field (`0x00`–`0x1A`; `0x1B`–`0x1F` reserved as `NOP`) across Batter, Griddle, Pan, Whisk, and `ISA.md`.
2. **§11 vs §13 Fault-Lab Packaging Tension:** Section 11 states *"Burnt Edges (the fault lab) — never in the shipped build"* and *"The shipped HTML has no fault switches, no mutant flags, no debug backdoors"*, while Section 13 states that the in-page Taste Test panel *"runs at least 40 numbered suites ... The same suites must run headlessly with Node ... It must include, at minimum: ... 13. The fault-lab table (§11), with the two control faults."*
   - **Action taken:** Kept Batter, Griddle, Pan, Whisk, Spatula, Syrup, Sound, and the production UI completely free of any fault switches, mutant flags, or backdoors (verified by Suite 41). The `TasteTest` module clones the netlist array in memory inside Suites 25 and 34–39 only, so both in-page Taste Test and `tests/run-all.js` run the exact same 42 suites without polluting the CPU or simulator.

## 7. Known Gaps

- **Headless-only verification of UI & Web Audio:** `tests/run-all.js` runs in Node without a browser DOM or Web Audio engine. Canvas rendering, mouse/keyboard handlers, and Web Audio autoplay-policy error messaging in `FlapjackUI` / `FlapjackSound.LiveSpeaker` are implemented in `flapjack.html` but have not been executed inside a live browser engine during this build.
- **Demo fault coverage:** 22 of 24 real injected faults were caught during the 600-frame demo; 2 (`SA0 cpu/decoder`, `SA1 cpu/ir`) were not triggered by the demo workload and remain reported uncaught above.
- **Reproducibility of `results.jsonl`:** Timing fields (`durationMs`, `panIPS`, `griddleIPS`, `gateEvalsPerSec`) vary with host CPU load; all hashes, gate counts, toggle counts, and fault-catch instruction indices are deterministic.
