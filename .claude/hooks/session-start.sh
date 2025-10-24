#!/bin/bash

# HopeScroll Session Start Hook
# Reminds AI assistants of critical constraints and quick start checklist

cat << 'EOF'

═══════════════════════════════════════════════════════════════
🚀 HOPESCROLL SESSION START - CRITICAL REMINDERS
═══════════════════════════════════════════════════════════════

📋 QUICK START CHECKLIST:
  1. Read CLAUDE-SESSION-GUIDE.md for fast onboarding
  2. Check docs/planning/PROJECT_STATUS.md for what's implemented
  3. Review recent work: git log -10 --oneline
  4. Verify working state: npm run build && npm run test

🚫 CRITICAL CONSTRAINTS (Never Violate!):
  • NO OUTLINKS - Everything must work inline (expand in feed)
  • NO EXTERNAL DEPS IN DOMAIN - domain/ must be pure TypeScript
  • ADHD-FIRST DESIGN - No modals for reading, no context switching
  • USE DESIGN SYSTEM - Never hardcode styles, use /components/ui/

📚 KEY DOCS:
  • CLAUDE.md - Full AI assistant guide
  • docs/planning/PRODUCT_VISION.md - Product philosophy
  • docs/planning/DESIGN_DECISIONS.md - Design constraints
  • docs/reference/design-system.md - UI component reference

═══════════════════════════════════════════════════════════════
Remember: Check these constraints before every implementation!
═══════════════════════════════════════════════════════════════

EOF
