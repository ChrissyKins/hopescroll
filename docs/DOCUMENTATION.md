# Documentation Strategy

**Version:** 1.0
**Last Updated:** 2025-10-23

## Overview

This document defines the documentation strategy, standards, and maintenance practices for HopeScroll.

## Documentation Framework

HopeScroll follows the **[Diátaxis framework](https://diataxis.fr/)**, a systematic approach to technical documentation that organizes content into four distinct categories based on user needs.

### The Four Documentation Types

| Type | Purpose | Audience Need | Format |
|------|---------|---------------|--------|
| **Tutorials** | Learning | "I want to learn" | Step-by-step lessons |
| **How-To Guides** | Problem-solving | "I want to accomplish X" | Goal-oriented instructions |
| **Reference** | Information | "I need to look up X" | Technical specifications |
| **Explanation** | Understanding | "I want to understand X" | Conceptual discussions |

### 1. Tutorials (Learning-Oriented)

**Goal:** Teach through hands-on experience

**Characteristics:**
- Step-by-step instructions
- Learning-focused, not goal-focused
- Repeatable and reliable
- Immediate feedback
- Safe environment for beginners

**Examples:**
- Getting Started guide
- Your First Content Source
- Building Your First Feature

**Writing guidelines:**
- Use "you" to address the reader
- State prerequisites upfront
- Provide complete, working examples
- Show expected output
- Avoid explaining too much (save for Explanation docs)
- End with "next steps" suggestions

**Location:** `/docs/tutorials/`

---

### 2. How-To Guides (Problem-Oriented)

**Goal:** Solve a specific practical problem

**Characteristics:**
- Goal-oriented
- Assumes prerequisite knowledge
- Focused on results
- Flexible (not prescriptive)
- Real-world scenarios

**Examples:**
- How to add a new content source adapter
- How to deploy to production
- How to set up keyword filtering
- How to debug feed generation

**Writing guidelines:**
- Start with the goal in the title
- List prerequisites
- Provide clear steps
- Explain choices when multiple approaches exist
- Link to related reference docs
- Include troubleshooting section

**Location:** `/docs/how-to/`

---

### 3. Reference (Information-Oriented)

**Goal:** Provide technical specifications

**Characteristics:**
- Accurate and complete
- Consistent structure
- Example-heavy
- Searchable
- Up-to-date

**Examples:**
- API endpoint reference
- Database schema
- Architecture overview
- Configuration options
- Design system components

**Writing guidelines:**
- Use consistent formatting
- Include type signatures
- Provide examples for each item
- Keep it factual (no opinions)
- Use tables for structured data
- Cross-reference related docs

**Location:** `/docs/reference/`

---

### 4. Explanation (Understanding-Oriented)

**Goal:** Deepen understanding of concepts

**Characteristics:**
- Context and background
- Alternative approaches
- Design decisions
- Conceptual connections
- "Why" instead of "how"

**Examples:**
- Why hexagonal architecture?
- Feed algorithm explained
- Content filtering strategy
- Architecture decision records

**Writing guidelines:**
- Explain context and motivation
- Discuss trade-offs
- Connect to broader concepts
- Use analogies and diagrams
- Link to relevant references
- Avoid step-by-step instructions

**Location:** `/docs/explanation/`

---

## Documentation Structure

```
docs/
├── README.md                    # Documentation index
├── DOCUMENTATION.md             # This file - documentation strategy
├── CONTRIBUTING.md              # Contribution guidelines
│
├── tutorials/                   # Learning-oriented
│   ├── getting-started.md
│   ├── first-content-source.md
│   └── building-first-feature.md
│
├── how-to/                      # Problem-oriented
│   ├── add-content-sources.md
│   ├── deploy.md
│   ├── setup-filters.md
│   └── manage-collections.md
│
├── reference/                   # Information-oriented
│   ├── architecture.md
│   ├── api.md
│   ├── database-schema.md
│   ├── design-system.md
│   └── configuration.md
│
└── explanation/                 # Understanding-oriented
    ├── feed-algorithm.md
    ├── content-filtering.md
    └── architecture-decisions.md
```

---

## Documentation Standards

### Writing Style

1. **Clear and Concise**
   - Short sentences (< 25 words)
   - Active voice preferred
   - Simple vocabulary
   - One idea per paragraph

2. **Consistent Terminology**
   - "Content source" not "source" or "feed source"
   - "Content item" not "video" or "post"
   - "User" not "developer" unless specifically referring to contributors

3. **Code Examples**
   - Always include complete, runnable examples
   - Add comments for complex logic
   - Show both good and bad examples when helpful
   - Use syntax highlighting

4. **Visual Aids**
   - Diagrams for complex concepts
   - Screenshots for UI features
   - Tables for structured data
   - Code blocks for examples

### Formatting Standards

#### Headings

```markdown
# Page Title (H1) - Only one per document

## Main Section (H2)

### Subsection (H3)

#### Minor Section (H4) - Use sparingly
```

#### Code Blocks

Always specify language for syntax highlighting:

````markdown
```typescript
// TypeScript example
interface User {
  id: string;
  email: string;
}
```

```bash
# Shell commands
npm run dev
```
````

#### Links

- Use descriptive link text: `[Getting Started Tutorial](./tutorials/getting-started.md)`
- Not: `[Click here](./tutorials/getting-started.md)`
- Use relative paths within docs
- Use absolute URLs for external links

#### Lists

- Unordered lists for non-sequential items
- Ordered lists for sequential steps
- Indent nested lists with 2 spaces

#### Tables

Use tables for structured comparison data:

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data     | Data     | Data     |
```

---

## Maintenance Practices

### When to Update Documentation

Documentation should be updated:

1. **Before code merge** - For new features or API changes
2. **During refactoring** - If public interfaces change
3. **After architecture changes** - Update architecture docs
4. **When adding dependencies** - Update setup guides
5. **Quarterly reviews** - Check for outdated content

### Documentation Review Checklist

When reviewing documentation changes:

- [ ] Correct documentation type (Tutorial/How-To/Reference/Explanation)
- [ ] Code examples are tested and work
- [ ] Links are valid
- [ ] Formatting is consistent
- [ ] Screenshots are current (if applicable)
- [ ] Version/date updated
- [ ] Cross-references added where relevant
- [ ] Grammar and spelling checked

### Versioning

- Documentation versions match major product versions
- Include version number and last updated date in doc header
- Archive old versions in `docs/archive/v{version}/`

**Example header:**
```markdown
# Document Title

**Version:** 1.0
**Last Updated:** 2025-10-23
```

### Deprecation Process

When deprecating features:

1. Add deprecation notice to relevant docs
2. Provide migration path
3. Keep deprecated docs for 2 versions
4. Move to archive before removal

**Example deprecation notice:**
```markdown
> **⚠️ DEPRECATED:** This feature is deprecated as of v2.0.
> Use [New Feature](./new-feature.md) instead.
> This will be removed in v4.0.
```

---

## Tools and Automation

### Markdown Linting

Use markdownlint to ensure consistent formatting:

```bash
npx markdownlint-cli docs/**/*.md
```

### Link Checking

Periodically check for broken links:

```bash
npx markdown-link-check docs/**/*.md
```

### Documentation Testing

- Test all code examples in CI
- Verify commands work in clean environment
- Screenshot updates on UI changes

---

## Documentation for AI Assistants

Special documentation for AI coding assistants like Claude Code.

**Location:** `/CLAUDE.md` (root directory)

**Purpose:**
- Project context and conventions
- Architecture guidelines
- Coding standards
- Common patterns
- Testing requirements

**Maintenance:**
- Update when project conventions change
- Keep concise and actionable
- Include examples of good/bad patterns
- Reference detailed docs for more info

See [CLAUDE.md Guidelines](#claudemd-structure) below.

---

## CLAUDE.md Structure

The `CLAUDE.md` file should contain:

### 1. Project Overview
- Brief description
- Tech stack
- Key features

### 2. Architecture Guidelines
- Layer responsibilities
- Dependency rules
- Design patterns

### 3. File Organization
- Naming conventions
- Directory structure
- Component co-location

### 4. Coding Standards
- TypeScript rules
- React patterns
- Error handling
- Testing requirements

### 5. Common Tasks
- Adding features
- Creating components
- Database changes
- API routes

### 6. Documentation Requirements
- When to create docs
- Which doc type to use
- Standards to follow

**Template:**
```markdown
# HopeScroll - AI Assistant Guide

## Quick Reference
[Essential info here]

## Architecture
[Key architectural patterns]

## Standards
[Coding standards]

## Common Tasks
[Frequent development tasks]

## Documentation
When creating or modifying features, update docs:
- New features → Tutorial or How-To guide
- API changes → Reference docs
- Design decisions → Explanation docs

See [Documentation Strategy](./docs/DOCUMENTATION.md) for details.
```

---

## Contribution Guidelines

### For Contributors

When adding documentation:

1. **Choose the right type**
   - Teaching someone? → Tutorial
   - Solving a problem? → How-To
   - Documenting specs? → Reference
   - Explaining concepts? → Explanation

2. **Follow the template** for that doc type
3. **Test all examples** - They must work
4. **Link to related docs** - Help readers navigate
5. **Update index** - Add to relevant section in `/docs/README.md`

### For Reviewers

Check:
- Correct documentation type
- Follows style guide
- Code examples tested
- Links valid
- Grammar correct
- Cross-references present

---

## Quality Metrics

Good documentation should be:

1. **Findable** - Easy to discover and navigate
2. **Accurate** - Matches current codebase
3. **Complete** - Covers essential use cases
4. **Clear** - Understandable by target audience
5. **Maintainable** - Easy to keep up-to-date

---

## Resources

- [Diátaxis Framework](https://diataxis.fr/)
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Write the Docs Community](https://www.writethedocs.org/)
- [MDN Writing Style Guide](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Writing_style_guide)

---

## Feedback

Documentation improvement suggestions are welcome!

- Open an issue with `documentation` label
- Suggest changes in pull requests
- Join documentation review sessions

---

**Questions about this strategy?** Open a discussion or contact the maintainers.
