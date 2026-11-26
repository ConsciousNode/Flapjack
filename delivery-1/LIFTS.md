# FLAPJACK Provenance & Lifts (`LIFTS.md`)

No external libraries, frameworks, fonts, or third-party source files were lifted or vendored into `flapjack.html` or `tests/run-all.js`. All JavaScript, CSS, HTML, and FLAPJACK assembly code was written from scratch.

Standard public-domain algorithm specifications implemented directly from first principles in `utils.js` and `pancake_game.js`:

| Algorithm / Constant | Location in `flapjack.html` | Specification Reference |
|---|---|---|
| SHA-256 round constants & compression | `<script id="utils-module">` (`FlapjackUtils.sha256`) | FIPS PUB 180-4 (NIST) |
| CRC-32 reflected polynomial `0xEDB88320` | `<script id="utils-module">` (`FlapjackUtils.crc32`) | IEEE 802.3 / ISO 3309 |
| FNV-1a 32-bit offset `0x811c9dc5`, prime `0x01000193` | `<script id="utils-module">`, `<script id="pan-module">` | Fowler–Noll–Vo hash spec |
| Mulberry32 deterministic PRNG (test fuzzing only) | `<script id="utils-module">` (`FlapjackUtils.makeRng`) | Public-domain 32-bit Weyl/hash mixer |
| xorshift16 shift triplet `(7, 9, 8)` | `<script id="game-module">` (`PANCAKE_ASM`, `next_rng`) | George Marsaglia (2003), 16-bit maximal-period shift parameters |
