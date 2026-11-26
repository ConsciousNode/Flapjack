# FLAPJACK ISA Specification (Rev 1)

## 1. Spec Note on Instruction Count

Section 3 of `SPEC.md` titles the ISA as "24 instructions, fixed encoding" but enumerates **27** distinct mnemonics (`NOP, HLT, MOV, LDI, LD, ST, ADD, ADC, SUB, SBC, AND, OR, XOR, NOT, SHL, SHR, SAR, CMP, JMP, JZ, JNZ, JN, JC, CALL, RET, PUSH, POP`). All **27** enumerated instructions are implemented using a 5-bit opcode field (opcodes `0x00`–`0x1A`; opcodes `0x1B`–`0x1F` are reserved and execute as `NOP`). This contradiction is also logged in `REPORT.md`.

## 2. Programmer's Model

- **Word size:** 16 bits (unsigned `0x0000`–`0xFFFF`, two's complement signed `-32768`–`+32767`).
- **Registers:** `R0`–`R7` (16 bits each).
  - `R0` is hardwired to `0x0000` (reads always return `0x0000`; writes are ignored).
  - `R7` is the stack pointer (`SP`). The stack grows downward (pre-decrement on push/call, post-increment on pop/ret).
- **Program Counter (`PC`):** 16 bits, resets to `0x0000`.
- **Flags (`Z, N, C, V`):** 4 single-bit flip-flops, all reset to `0`.
- **Halted flag (`HALTED`):** 1-bit flip-flop, resets to `0`. Set by `HLT` or any memory write to `0xF003`.

## 3. Memory Map (65,536 Words, Word-Addressed)

| Address Range | Size (Words) | Access | Function |
|---|---|---|---|
| `0x0000`–`0xDFFF` | 57,344 | R/W | Main RAM |
| `0xE000`–`0xEBFF` | 3,072 | R/W | Video RAM (`64 × 48`, row-major, low 4 bits = palette index `0..15`) |
| `0xEC00`–`0xEFFF` | 1,024 | R (returns `0xFFFF`), W ignored | Unmapped |
| `0xF000` | 1 | R | Keyboard bitmask: bit 0 = Left, bit 1 = Right, bit 2 = Space (Flip) |
| `0xF001` | 1 | R | Free-running 16-bit cycle counter (low 16 bits of elapsed clock cycles) |
| `0xF002` | 1 | W (R returns `0xFFFF`) | One-bit speaker (bit 0 sets speaker output level; transitions logged with cycle) |
| `0xF003` | 1 | W (R returns `0xFFFF`) | Halt register (writing any value sets `HALTED = 1`) |
| `0xF004`–`0xFFFF` | 4,092 | R (returns `0xFFFF`), W ignored | Unmapped |

## 4. Fixed Instruction Bit Layout

Every instruction begins with one 16-bit instruction word, optionally followed by one 16-bit immediate word (`imm16`):

```
 15  14  13  12  11 | 10   9   8 |  7   6   5 |  4   3   2 |  1   0
+-------------------+------------+------------+------------+--------+
|      OPCODE       |     Rd     |     Ra     |     Rb     |   00   |
+-------------------+------------+------------+------------+--------+
       5 bits           3 bits       3 bits       3 bits     2 bits
```

- `OPCODE` (bits `15:11`): 5-bit operation code (`0`–`26`).
- `Rd` (bits `10:8`): Destination register (`0`–`7`), or `0` if unused.
- `Ra` (bits `7:5`): Source register A (`0`–`7`), or `0` if unused.
- `Rb` (bits `4:2`): Source register B (`0`–`7`), or `0` if unused.
- Bits `1:0`: Reserved, always `00`.

## 5. Instruction Table, Encodings, and Cycles

| Opcode | Hex | Mnemonic | Assembly Syntax | Words | Cycles | Operation | Flags (Z, N, C, V) |
|---|---|---|---|---|---|---|---|
| 0 | `0x00` | `NOP` | `NOP` | 1 | 2 | No operation | Unchanged |
| 1 | `0x01` | `HLT` | `HLT` | 1 | 2 | `HALTED = 1` | Unchanged |
| 2 | `0x02` | `MOV` | `MOV Rd, Ra` | 1 | 2 | `Rd = Ra` | Unchanged |
| 3 | `0x03` | `LDI` | `LDI Rd, imm16` | 2 | 2 | `Rd = imm16` | Unchanged |
| 4 | `0x04` | `LD` | `LD Rd, [Ra]` | 1 | 2 | `Rd = mem[Ra]` | Unchanged |
| 5 | `0x05` | `ST` | `ST [Ra], Rb` | 1 | 2 | `mem[Ra] = Rb` | Unchanged |
| 6 | `0x06` | `ADD` | `ADD Rd, Ra, Rb` | 1 | 2 | `Rd = (Ra + Rb) & 0xFFFF` | Z, N, C=carry, V=ovf |
| 7 | `0x07` | `ADC` | `ADC Rd, Ra, Rb` | 1 | 2 | `Rd = (Ra + Rb + C) & 0xFFFF` | Z, N, C=carry, V=ovf |
| 8 | `0x08` | `SUB` | `SUB Rd, Ra, Rb` | 1 | 2 | `Rd = (Ra - Rb) & 0xFFFF` | Z, N, C=borrow, V=ovf |
| 9 | `0x09` | `SBC` | `SBC Rd, Ra, Rb` | 1 | 2 | `Rd = (Ra - Rb - C) & 0xFFFF` | Z, N, C=borrow, V=ovf |
| 10 | `0x0A` | `AND` | `AND Rd, Ra, Rb` | 1 | 2 | `Rd = Ra & Rb` | Z, N, C=0, V=0 |
| 11 | `0x0B` | `OR` | `OR Rd, Ra, Rb` | 1 | 2 | `Rd = Ra \| Rb` | Z, N, C=0, V=0 |
| 12 | `0x0C` | `XOR` | `XOR Rd, Ra, Rb` | 1 | 2 | `Rd = Ra ^ Rb` | Z, N, C=0, V=0 |
| 13 | `0x0D` | `NOT` | `NOT Rd, Ra` | 1 | 2 | `Rd = (~Ra) & 0xFFFF` | Z, N, C=0, V=0 |
| 14 | `0x0E` | `SHL` | `SHL Rd, Ra` | 1 | 2 | `Rd = (Ra << 1) & 0xFFFF` | Z, N, C=`Ra[15]`, V=0 |
| 15 | `0x0F` | `SHR` | `SHR Rd, Ra` | 1 | 2 | `Rd = Ra >>> 1` | Z, N, C=`Ra[0]`, V=0 |
| 16 | `0x10` | `SAR` | `SAR Rd, Ra` | 1 | 2 | `Rd = (Ra >>> 1) \| (Ra & 0x8000)` | Z, N, C=`Ra[0]`, V=0 |
| 17 | `0x11` | `CMP` | `CMP Ra, Rb` | 1 | 2 | `res = (Ra - Rb) & 0xFFFF` (no writeback) | Z, N, C=borrow, V=ovf |
| 18 | `0x12` | `JMP` | `JMP imm16` | 2 | 2 | `PC = imm16` | Unchanged |
| 19 | `0x13` | `JZ` | `JZ imm16` | 2 | 2 | `if (Z == 1) PC = imm16` | Unchanged |
| 20 | `0x14` | `JNZ` | `JNZ imm16` | 2 | 2 | `if (Z == 0) PC = imm16` | Unchanged |
| 21 | `0x15` | `JN` | `JN imm16` | 2 | 2 | `if (N == 1) PC = imm16` | Unchanged |
| 22 | `0x16` | `JC` | `JC imm16` | 2 | 2 | `if (C == 1) PC = imm16` | Unchanged |
| 23 | `0x17` | `CALL` | `CALL imm16` | 2 | 3 | `R7 = (R7 - 1) & 0xFFFF; mem[R7] = PC + 2; PC = imm16` | Unchanged |
| 24 | `0x18` | `RET` | `RET` | 1 | 2 | `PC = mem[R7]; R7 = (R7 + 1) & 0xFFFF` | Unchanged |
| 25 | `0x19` | `PUSH` | `PUSH Rb` | 1 | 3 | `R7 = (R7 - 1) & 0xFFFF; mem[R7] = Rb` | Unchanged |
| 26 | `0x1A` | `POP` | `POP Rd` | 1 | 3 | `tmp = mem[R7]; R7 = (R7 + 1) & 0xFFFF; Rd = tmp` | Unchanged |

Notes on edge cases:
- `PUSH R7`: `R7` is decremented in cycle `S1` before `mem[R7] = R7` in cycle `S2` (so the decremented value of `R7` is stored).
- `POP R7`: `R7` is incremented in cycle `S1`, then overwritten with `tmp = mem[old R7]` in cycle `S2`.
- Writing to `R0` (`Rd = 0`) is always ignored, though `CMP` and ALU instructions still update flags normally.

## 6. Flag Definitions (Including `CMP`)

For any instruction that updates flags, let `res` be the 16-bit result:
- **Z (Zero):** `1` if `res == 0x0000`, else `0`.
- **N (Negative):** `res[15]` (MSB of 16-bit result; `1` if signed negative).
- **C (Carry / Borrow):**
  - `ADD`, `ADC`: `1` if unsigned sum exceeds `0xFFFF` (adder carry-out `c16 == 1`), else `0`.
  - `SUB`, `CMP`: `1` if unsigned borrow occurred (`Ra < Rb`, i.e., two's-complement adder `Ra + ~Rb + 1` has `c16 == 0`), else `0`.
  - `SBC`: `1` if unsigned borrow occurred (`Ra < Rb + C_in`, i.e., adder `Ra + ~Rb + (~C_in)` has `c16 == 0`), else `0`.
  - `SHL`: `Ra[15]` (bit shifted out of MSB).
  - `SHR`, `SAR`: `Ra[0]` (bit shifted out of LSB).
  - `AND`, `OR`, `XOR`, `NOT`: `0`.
- **V (Signed Overflow):**
  - `ADD`, `ADC`, `SUB`, `SBC`, `CMP`: `c15 XOR c16` (carry into bit 15 XOR carry out of bit 15 of the 16-bit adder). Equivalently:
    - For `ADD`/`ADC`: `1` iff `Ra[15] == Rb[15]` and `res[15] != Ra[15]`.
    - For `SUB`/`SBC`/`CMP`: `1` iff `Ra[15] != Rb[15]` and `res[15] != Ra[15]`.
  - `AND`, `OR`, `XOR`, `NOT`, `SHL`, `SHR`, `SAR`: `0`.

Specifically, after **`CMP Ra, Rb`**:
- `Z = 1` iff `Ra == Rb`.
- `N = 1` iff `((Ra - Rb) & 0x8000) != 0`.
- `C = 1` iff `Ra < Rb` (unsigned). Thus `JC` after `CMP Ra, Rb` jumps when `Ra < Rb` (unsigned).
- `V = 1` iff signed subtraction `Ra - Rb` overflows 16-bit signed range (`-32768..+32767`).

## 7. Multi-Cycle Sequencer Schedule

The sequencer is a 2-bit state machine (`S0 = 00`, `S1 = 01`, `S2 = 10`) built from NAND flip-flops:
- **S0 (Fetch):** `mem_addr = PC`, `mem_re = 1`, `IR <= mem_rdata`, `PC <= PC + 1`, next state = `S1`.
- **S1 (Execute 1):**
  - 2-cycle instructions (`NOP, HLT, MOV, LDI, LD, ST, ALU, CMP, JMP, Jcc, RET`): complete execution, assert `retire = 1`, next state = `S0`.
  - `PUSH`: `R7 <= R7 - 1`, next state = `S2`.
  - `POP`: `TMP <= mem[R7]`, `R7 <= R7 + 1`, next state = `S2`.
  - `CALL`: `TMP <= mem[PC]`, `PC <= PC + 1`, `R7 <= R7 - 1`, next state = `S2`.
- **S2 (Execute 2):**
  - `PUSH`: `mem[R7] <= Rb`, assert `retire = 1`, next state = `S0`.
  - `POP`: `Rd <= TMP`, assert `retire = 1`, next state = `S0`.
  - `CALL`: `mem[R7] <= PC`, `PC <= TMP`, assert `retire = 1`, next state = `S0`.
