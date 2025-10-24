# HopeScroll Claude Code Hooks

This directory contains hooks that help AI assistants follow HopeScroll's development guidelines.

## Installed Hooks

### Session Start Hook (`session-start.sh`)
- **Triggers:** At the beginning of each Claude Code session
- **Purpose:** Reminds AI assistants of critical constraints and quick start checklist
- **Displays:**
  - Quick start checklist (read docs, check status, verify build)
  - Critical constraints (no outlinks, pure domain layer, ADHD-first, design system)
  - Key documentation references

### Session End Hook (`session-end.sh`)
- **Triggers:** When Claude Code stops responding (session end)
- **Purpose:** Ensures session end checklist is completed
- **Checks:**
  - Displays session end checklist
  - Warns if there are uncommitted changes
  - Warns if PROJECT_STATUS.md hasn't been updated recently (30+ minutes)

## How Hooks Work

Hooks are configured in `.claude/settings.json` and execute automatically:

```json
{
  "hooks": {
    "SessionStart": [/* runs at session start */],
    "Stop": [/* runs when Claude stops responding */]
  }
}
```

The hooks run shell scripts that provide reminders and checks to ensure development guidelines are followed.

## Testing Hooks

You can manually test the hooks:

```bash
# Test session start hook
bash .claude/hooks/session-start.sh

# Test session end hook
bash .claude/hooks/session-end.sh
```

## Modifying Hooks

To modify the hooks:

1. Edit the shell scripts in `.claude/hooks/`
2. Make sure scripts are executable: `chmod +x .claude/hooks/*.sh`
3. Test the modified scripts manually
4. The changes will apply automatically in the next session

## Additional Hook Ideas

Future hooks could be added for:

- **PreToolUse (Edit)**: Block edits to `/domain` files that import external dependencies
- **PreToolUse (Write)**: Warn when creating new files (prefer editing existing)
- **PostToolUse (Edit)**: Check for hardcoded styles in component files
- **PreCompact**: Remind to update documentation before compacting

## Resources

- [Claude Code Hooks Guide](https://docs.claude.com/en/docs/claude-code/hooks-guide)
- [CLAUDE.md](../../CLAUDE.md) - Full development guidelines
- [CLAUDE-SESSION-GUIDE.md](../../CLAUDE-SESSION-GUIDE.md) - Session workflow guide
