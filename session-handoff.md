# Session Handoff

Use this checklist before ending every session to ensure the next agent can resume without lost context.

---

## End-of-Session Checklist

- [ ] **Update `tasks/current.md`** — set status (in-progress / blocked / done), log decisions made and why, write next steps
- [ ] **Update `progress.md`** — add timestamped entry with action taken, verification results, status
- [ ] **Update `feature_list.json`** — if feature status changed, update it and set `last_updated`
- [ ] **Run `bash init.sh`** — lint, test, and build must all pass
- [ ] **Commit & push** — push working branches; never leave uncommitted work that another agent needs
- [ ] **Note blockers** — if blocked, document what's blocking and who can unblock it in `tasks/current.md`

---

## Session Start

1. Read `tasks/current.md` to resume previous work
2. Check `feature_list.json` for the active feature
3. Run `bash init.sh` to verify a clean starting state
4. Pick up where the last agent left off
