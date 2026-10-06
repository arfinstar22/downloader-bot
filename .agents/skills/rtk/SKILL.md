---
name: rtk
description: Use RTK (Rust Token Killer) CLI proxy to reduce LLM token consumption by 60-90% on shell commands. Always active alongside ponytail and caveman.
---

# RTK - Rust Token Killer

High-performance CLI proxy that cuts up to 90% of bash output before agent reads it. Always active alongside Ponytail (minimal code) and Caveman (terse responses).

## Rules

1. Always prefix shell commands with `rtk` (e.g. `rtk git status`, `rtk git diff`, `rtk ls`, `rtk npm test`).
2. Keep `rtk` in command chains: `rtk git add . && rtk git commit -m "..."`.
3. Treat compact output as complete. Never re-run raw commands unless output is unusable.
4. If unfiltered output required: run `rtk proxy <cmd>`.
5. Check savings: `rtk gain`.
