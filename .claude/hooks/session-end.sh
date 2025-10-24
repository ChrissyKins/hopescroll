#!/bin/bash

# HopeScroll Session End Hook
# Ensures session end checklist is completed before ending

cat << 'EOF'

═══════════════════════════════════════════════════════════════
⚠️  SESSION END CHECKLIST - COMPLETE BEFORE STOPPING!
═══════════════════════════════════════════════════════════════

Please ensure ALL of the following are complete:

  [ ] ✅ Updated PROJECT_STATUS.md with changes made
  [ ] ✅ Updated FEATURE_ROADMAP.md if working on epics
  [ ] ✅ Ran 'npm run test' and all tests pass
  [ ] ✅ Ran 'npm run lint' and fixed issues
  [ ] ✅ Committed all changes with descriptive messages
  [ ] ✅ Updated "Last Updated" dates in modified docs
  [ ] ✅ Left clear notes for next session

═══════════════════════════════════════════════════════════════
Why this matters: The next agent needs clear context!
This 10-minute investment saves 30+ minutes later.
═══════════════════════════════════════════════════════════════

EOF

# Check if there are uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
  echo "⚠️  WARNING: You have uncommitted changes!"
  echo ""
  git status --short
  echo ""
fi

# Check if PROJECT_STATUS.md was recently updated (within last 30 minutes)
PROJECT_STATUS="docs/planning/PROJECT_STATUS.md"
if [[ -f "$PROJECT_STATUS" ]]; then
  LAST_MODIFIED=$(stat -c %Y "$PROJECT_STATUS" 2>/dev/null || stat -f %m "$PROJECT_STATUS" 2>/dev/null)
  CURRENT_TIME=$(date +%s)
  TIME_DIFF=$((CURRENT_TIME - LAST_MODIFIED))

  if [[ $TIME_DIFF -gt 1800 ]]; then  # 30 minutes
    echo "⚠️  PROJECT_STATUS.md hasn't been updated in this session!"
    echo "   Last modified: $(date -d @$LAST_MODIFIED 2>/dev/null || date -r $LAST_MODIFIED 2>/dev/null)"
    echo ""
  fi
fi
