# AUDIT-1: Flapjack delivery 1

Auditor: Vael Interim. Labels: **Measured** = I ran it and saw it. **Hypothesis** = my reading, not tested. **Not exercised** = I did not do it.

## 0. Up front: the delivered file is not the file REPORT.md describes
**Measured.** `delivery-1/flapjack.html` is 198,183 bytes, sha256 `2a193672…`. REPORT.md describes 198,130 bytes, sha256 `8148e540…`. A 53-byte difference. Cause unknown (**Hypothesis**: changed in transit; asked Kham).

**Update (Kham):** the file was downloaded straight from the Gemini interface, not re-saved or edited by hand. So the mismatch sits between Neon's sandbox and the Gemini download, or in how REPORT computed its hash. Which of the two is **not determined**; I have no copy of the 198,130-byte file to diff. Delivery-1 stays as delivered.

**Resolved (Measured, Neon's figures from Kham):** Neon reports sha256 `8148e540…`, 198,184 bytes UTF-8 on disk, 198,130 JS string code units. My copy of the delivery is 198,183 bytes and 198,129 code units. Appending one `\n` to my copy gives sha256 `8148e540…` exactly. So the files are byte-identical except for a single trailing newline, which the Gemini download dropped. The "198,130 B" in REPORT is a string length, not a byte count (the 54 extra bytes are non-ASCII characters). Not a content change; the delivered file is functionally Neon's file. REPORT's size line is mislabelled, and the hash covers a file with a final newline. Everything below audits the 198,183-byte file as delivered. REPORT's hash claim does not hold for it.

## 1. Builder's own suites
**Measured.** `node tests/run-all.js` on a copy of the delivered file: **42/42 PASS, 93.12 s**. Matches REPORT's count.

## 2. Independent checks (script: `AUDIT-1-script.cjs`)
**Measured.**
- Hand-written SHA-256 matches Node `crypto` on empty, "abc", the fox sentence, 1,000,000 x "a", and 5,000 random bytes.
- Hand-written CRC-32 of "123456789" = `cbf43926` (the standard check value).
- Netlist: 4,741 gates, 167 flip-flops, 20 inputs. Gate count by block: regfile 2,384, alu 848, pc 415, decoder 329, tmp 216, ir 211, bus 187, sequencer 66, flags 63, control 20, clock 2.
- **Perturbation on gates the builder did not use** (it used adder bit4 / gate 3695). I stuck-at one gate each in regfile/r5, adder/bit11, sequencer, decoder, flags, bus, ir#0, ir#1 over 120 frames. All 8 changed the video hash AND were caught by Pan in lockstep (first mismatch: R5 @317, FLAGS @58, PC @1, R2 @58, FLAGS @1, WRITE_HASH @56, PC @1, PC @339). Reverting a fault returned the baseline hash `2570b3c4`.
- Gate-level independence: Griddle's hot path uses only the NAND primitive; arithmetic appears only at the memory/bus boundary (bit packing), which I treat as the allowed gray area.
- Chromium (Playwright) load of the page: **0 console/page errors, 0 network requests**; 17 controls render (Taste Test, Run 600-Frame Demo, Step, Spatula, Sound, Render Demo WAV...).

## 3. The two faults REPORT says were uncaught
REPORT: `SA0 cpu/decoder` (10th gate) and `SA1 cpu/ir` (3rd gate) not caught over 600 frames; hypothesis that they sit in a never-used decode term and in reserved IR bit 0.
- **Measured.** Decoder#9 (gate 264) SA0: not caught in 150 frames. Consistent with REPORT.
- **Measured.** ir#2 (gate 46) SA1 was caught at retired instruction 2 (R7). So the builder's "3rd gate in cpu/ir" is not my ir#2; the two of us index gates differently, and I cannot tell which gate is theirs.
- **Measured.** A scan of cpu/ir gates 0-39 found **gates 47-72 (26 gates, both polarities) and 74 SA1 uncaught in 40 frames**; ir#10 and ir#20 (both polarities) stay uncaught across the full 600 frames. Each of those gates has fan-out 1, forming a chain.
- **Hypothesis.** These are the flip-flop(s) for reserved IR bits 1:0 (ISA.md says always 00), which would make the "reserved bit" explanation right in kind but understated in size: REPORT mentions one gate, I see about 26. Not tested: I did not trace the chain to its flip-flop or check whether it feeds anything observable.
- **Consequence.** Faults inside these gates are indistinguishable from fault-free in this workload. REPORT's "22 of 24 caught" is therefore a statement about its chosen gates, not about the IR block. A proper control for this is a fault in a bit that IS used, which the builder's other 22 provide.

## 4. REPORT vs. suites
**Measured.** Spec trap: REPORT, ISA.md and the page all call out "24 instructions" vs 27 listed, and implement 27. Trap caught.
**Not checked line by line:** REPORT's remaining prose claims beyond the numbers above. Griddle throughput (12,632 insns/s) not re-measured in a quiet environment.

## 5. Not exercised
Web Audio playback in a real audio device; interactive play of PANCAKE; keyboard/touch controls; Pages deployment; Spatula UI. Headless only.

## 5b. Observer report (Kham, 2026-11-27)
**Observed by Kham, not by me:** ran the page in a real browser; the PANCAKE demo autoran with sound effects audible; Kham ran the tests in the page; overall impression: fantastic. Follow-up from Kham: in-page Taste Test showed **42/42**; he played PANCAKE by hand in all modes; it ran smoothly; the flipping mechanic was fun. The root `index.html` is Kham's own Pages deployment. Not yet recorded: device and browser, and whether `index.html` is byte-identical to `delivery-1/flapjack.html` (I have not compared them).

## 6. Verdict against our tiers
See `OURS.md` (published now; sha256 prefix `961a3c86` matches the value committed in README before sending). Short version, **Hypothesis-labelled where I did not measure**: this clears the mechanical tiers (netlist, lockstep, controls, honesty about uncaught faults, planted trap). The hash mismatch is the one flaw in the paper trail and is not the builder's recorded fault until we learn how the file was saved.
