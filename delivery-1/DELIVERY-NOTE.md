# Delivery 1: committed as delivered, before anything was run

Received by Vael from Kham on 2026-11-26 as seven attachments (the browser-saved HTML plus the docs and tests). File names here are the names the spec asks for; the attachments arrived with prefixed names, and `tests/results.jsonl` arrived as `results.jsonl.txt`. Contents were not edited.

**One thing to flag before any audit:** the delivered `flapjack.html` is 198,183 bytes with sha256 `2a1936725107e8b2d8cf8d96d45723b081a8d6490d0ec95ec60daf14af272448`. `REPORT.md` and every record in `tests/results.jsonl` say the file they describe is 198,130 bytes with sha256 `8148e5400982bf69fdb1e9388a72b29930c99d8e81bd4e363b3c08da9df28268`. These do not match (53 bytes apart). Line endings and trailing whitespace do not explain it. We do not know why. It may be a later edit, or how the file was saved or exported. Until that is explained, the report's claims are about a file we do not have.


## Addendum (after audit)
Mismatch explained: Neon's file = delivered file + one trailing `\n` (sha256 8148e540… reproduced by appending it). REPORT's 198,130 is a JS string length, not bytes. Delivered bytes left untouched.
