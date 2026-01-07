# Modular AI Agent Prompts

This directory contains the modularized system prompts for the Medeiros Veículos AI Sales Agent (Camila).

## Structure

The original 680-line monolithic prompt has been split into **19 focused, maintainable modules**:

### Core Identity & Configuration
- **identity.js** (14 lines) - Agent identity, expertise, and primary objective
- **datetime.js** (30 lines) - Date/time handling, greetings, and temporal intelligence
- **transparency.js** (47 lines) - AI transparency, human handoff rules, and Adel mention protocol

### Sales Methodologies
- **spin.js** (36 lines) - SPIN Selling methodology (Situation, Problem, Implication, Need)
- **bant.js** (34 lines) - BANT Framework (Budget, Authority, Need, Timeline)
- **sandler.js** (32 lines) - Sandler System (Pain > Budget > Decision)
- **challenger-sale.js** (14 lines) - Challenger Sale approach for reframing beliefs

### Rapport & Persuasion
- **rapport.js** (31 lines) - Building emotional connection and mirroring
- **storytelling.js** (17 lines) - Real success stories for sales
- **emotional-triggers.js** (31 lines) - 5 core psychological triggers (FOMO, Status, Security, Freedom, Belonging)

### Sales Process
- **rules.js** (28 lines) - Absolute rules (no hallucination, short responses, feminine tone)
- **funnel.js** (37 lines) - 6-stage sales funnel (Opening > Qualification > Recommendation > Value > Scheduling > Objections)
- **objections.js** (47 lines) - 3-level objection handling framework
- **financing.js** (19 lines) - Financing discussion protocol (avoid specific values online)
- **scheduling.js** (101 lines) - Comprehensive scheduling rules, business hours, and examples

### Business Information
- **store-location.js** (6 lines) - Store address, hours, contact info
- **inventory.js** (14 lines) - Current vehicle inventory overview

### Training & Examples
- **examples.js** (65 lines) - 3 complete conversation examples demonstrating methodologies
- **closing.js** (25 lines) - Golden rules and motivational closing

### Index
- **index.js** (93 lines) - Imports all modules and combines them into `AGENT_SYSTEM_PROMPT`

## Usage

Import the combined prompt from the index:

```javascript
import { AGENT_SYSTEM_PROMPT } from './agent/prompts/index.js'
```

Or import individual sections for customization:

```javascript
import { SPIN } from './agent/prompts/spin.js'
import { BANT } from './agent/prompts/bant.js'
import { EMOTIONAL_TRIGGERS } from './agent/prompts/emotional-triggers.js'

// Create custom prompt
const customPrompt = `${SPIN}\n\n---\n\n${BANT}`
```

## Benefits of Modularization

1. **Maintainability** - Easy to update specific sections without affecting others
2. **Testability** - Test individual methodologies independently
3. **Reusability** - Mix and match sections for different agent configurations
4. **Collaboration** - Multiple team members can work on different sections
5. **Version Control** - Clear git diffs when specific techniques are updated
6. **Documentation** - Each file serves as self-documenting sales methodology reference

## File Size Distribution

- **Smallest**: store-location.js (6 lines)
- **Largest**: scheduling.js (101 lines)
- **Average**: ~35 lines per module
- **Total**: 721 lines (includes separators in index.js)

## Migration from Original

The original `src/constants/agentPrompts.js` file contained the AGENT_SYSTEM_PROMPT as a single 680-line string.

To migrate:

1. Update imports in files that use `AGENT_SYSTEM_PROMPT`:
   ```javascript
   // OLD
   import { AGENT_SYSTEM_PROMPT } from '../constants/agentPrompts.js'

   // NEW
   import { AGENT_SYSTEM_PROMPT } from '../agent/prompts/index.js'
   ```

2. (Optional) Keep the original file for backward compatibility or remove after migration is complete.

## Maintenance Guidelines

When updating prompts:

1. Identify which module contains the section to update
2. Edit only that specific file
3. Maintain the export format: `export const SECTION_NAME = \`...\``
4. Test the combined prompt via index.js
5. Update this README if adding new modules

## Version

Created: 2026-01-07
Based on: agentPrompts.js (Version ELITE SALES - Updated 26/12/2025)
