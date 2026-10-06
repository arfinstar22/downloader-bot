# RTK - Rust Token Killer (Always-On CLI Token Optimizer)

Always use RTK CLI proxy to compress command outputs before reading. Always active alongside Ponytail and Caveman.

## Rules

- Prefix shell commands with `rtk`: `rtk git status`, `rtk git diff`, `rtk npm test`, `rtk ls`, `rtk read <file>`, `rtk grep <query>`.
- Keep prefix inside command chains: `rtk git add . && rtk git commit -m "msg"`.
- Treat condensed output as complete result: do not rerun raw commands unless output is unreadable or empty when data expected.
- If raw output is strictly needed: run `rtk proxy <cmd>`.
- Combine with Ponytail (minimal code, YAGNI, standard library) and Caveman (terse output, zero fluff).
- View savings anytime: `rtk gain`.
