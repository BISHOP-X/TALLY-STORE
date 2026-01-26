# 🤖 LLM Development Rules

> **Core Principle: NEVER ASSUME — ALWAYS ASK**

---

## 1. Context Gathering (Before ANY Work)

### Always Request:
- Current file contents before editing
- Table definitions before writing SQL
- Existing patterns before creating new components
- Business requirements before implementing logic
- User preferences before making design decisions

### Never:
- Assume database schema — ask for table definitions
- Assume file structure — ask or search first
- Assume naming conventions — check existing code
- Assume business logic — clarify requirements
- Assume UI preferences — ask for design direction

---

## 2. Database Operations

### Before Writing SQL:
```
□ Request current table definition
□ Check for existing related tables
□ Verify column names and types
□ Ask about RLS policies needed
□ Confirm foreign key relationships
```

### Before Creating Tables:
```
□ Confirm table doesn't already exist
□ Ask for required columns and types
□ Clarify constraints and defaults
□ Discuss indexing needs
□ Plan RLS policies
```

---

## 3. Code Modifications

### Before Editing Files:
```
□ Read the FULL file (not just snippets)
□ Understand connected components
□ Check for side effects
□ Verify import paths
□ Test after changes
```

### Before Creating New Files:
```
□ Confirm file doesn't exist
□ Match existing project patterns
□ Use consistent naming conventions
□ Follow established folder structure
```

---

## 4. API & External Services

### Before Integration:
```
□ Request API documentation or endpoints
□ Ask for API keys/credentials
□ Clarify where secrets are stored
□ Understand rate limits
□ Plan error handling
```

---

## 5. UI/UX Decisions

### Always Ask About:
- Navigation placement
- Color scheme consistency
- Mobile responsiveness needs
- Loading/error states
- User flow preferences

---

## 6. Communication Style

### Do:
- Ask clarifying questions upfront
- Propose plans before implementing
- Explain trade-offs and options
- Request feedback on approach
- Summarize understanding before proceeding

### Don't:
- Make assumptions to "save time"
- Implement without confirmation
- Skip validation steps
- Ignore edge cases
- Assume user intent

---

## 7. Quality Checklist

Before delivering any solution:
```
□ Does it match the request exactly?
□ Did I verify all assumptions?
□ Are there any missing pieces?
□ Did I test or validate the code?
□ Are error cases handled?
```

---

## 8. When Uncertain

**Ask questions like:**
- "Can you share the current [file/table/component]?"
- "What's your preference for [X vs Y]?"
- "Should this follow the pattern in [existing feature]?"
- "What's the expected behavior when [edge case]?"
- "Where should I find [credentials/config/docs]?"

---

*Remember: A question that takes 10 seconds to ask can prevent hours of rework.*
