# FLAPJACK Demo Specification & Reference Hashes

## 1. 16-Colour Video Palette (`64 × 48` VRAM, `0xE000`–`0xEBFF`)

Each VRAM word stores one 4-bit palette index in bits `3:0` (row-major: `addr = 0xE000 + y * 64 + x`).

| Index | Hex | Role in PANCAKE |
|---:|---|---|
| 0 | `#141013` | Charcoal griddle background |
| 1 | `#2b2226` | Cast-iron pan body |
| 2 | `#4d3f45` | Griddle surface / pan rim |
| 3 | `#73646a` | Steel pan handle |
| 4 | `#f6e3b4` | Raw batter cream |
| 5 | `#f2c572` | Light golden pancake |
| 6 | `#d98c36` | Golden-brown pancake |
| 7 | `#8c471c` | Crispy dark-brown edge |
| 8 | `#381c14` | Burnt char (lose state) |
| 9 | `#f5d042` | Butter pad highlight |
| 10 | `#b85d19` | Maple syrup accent |
| 11 | `#d94136` | Burnt / danger status indicator |
| 12 | `#4fa65b` | Active / healthy status indicator |
| 13 | `#5294c4` | Kitchen tile blue |
| 14 | `#e8d8c3` | Score tick indicator |
| 15 | `#ffffff` | Bright highlight |

## 2. 600-Frame Demo Input Tape

Keyboard word at `0xF000` bitmask: `1` = Left (`bit 0`), `2` = Right (`bit 1`), `4` = Space/Flip (`bit 2`). All unlisted frames have key bitmask `0`.

| Frame Range (inclusive) | Key Bitmask | Input Action |
|---|---:|---|
| `0`–`19` | `0` | Idle |
| `20`–`29` | `1` | Move pan left |
| `35`–`44` | `2` | Move pan right |
| `75` | `4` | Flip pancake (side A → B) |
| `85`–`91` | `2` | Move pan right |
| `145` | `4` | Flip pancake (side B → A) |
| `155`–`162` | `1` | Move pan left |
| `215` | `4` | Flip pancake |
| `285` | `4` | Flip pancake |
| `310`–`321` | `2` | Move pan right |
| `360` | `4` | Flip pancake |
| `370`–`381` | `1` | Move pan left |
| `382`–`519` | `0` | Rest on pan (triggers burn state + burn jingle) |
| `520` | `4` | Respawn pancake (seeds xorshift16 from `0xF001`) |
| `530`–`539` | `2` | Move pan right |
| `565` | `4` | Flip respawned pancake |
| `566`–`599` | `0` | Idle to frame 600 |

## 3. Measured 600-Frame Demo Outputs

**Measured:**

| Metric | Griddle (NAND Gates) | Pan (Behavioural Twin) |
|---|---:|---:|
| Frames completed | 600 | 600 |
| Retired instructions | 166,532 | 166,532 |
| Clock cycles | 335,595 | 335,595 |
| Final VRAM FNV-1a hash (3,072 words) | `70d5848a` | `70d5848a` |
| Running memory-write FNV-1a hash | `6737e51f` | `6737e51f` |
| Speaker toggle events (`0xF002`) | 532 | 532 |
| Offline WAV size (22,050 Hz mono 16-bit PCM) | 986,704 bytes | 986,704 bytes |
| Offline WAV sample count | 493,324 | 493,324 |
| Embedded PCM CRC-32 (`CRC3` chunk) | `116f62e9` | `116f62e9` |
| Full WAV byte-array CRC-32 | `cec97c20` | `cec97c20` |
