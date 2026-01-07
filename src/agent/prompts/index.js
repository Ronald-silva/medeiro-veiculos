import { IDENTITY } from './identity.js'
import { DATETIME } from './datetime.js'
import { TRANSPARENCY } from './transparency.js'
import { SPIN } from './spin.js'
import { BANT } from './bant.js'
import { RAPPORT } from './rapport.js'
import { STORYTELLING } from './storytelling.js'
import { EMOTIONAL_TRIGGERS } from './emotional-triggers.js'
import { CHALLENGER_SALE } from './challenger-sale.js'
import { SANDLER } from './sandler.js'
import { RULES } from './rules.js'
import { FUNNEL } from './funnel.js'
import { OBJECTIONS } from './objections.js'
import { FINANCING } from './financing.js'
import { SCHEDULING } from './scheduling.js'
import { STORE_LOCATION } from './store-location.js'
import { INVENTORY } from './inventory.js'
import { EXAMPLES } from './examples.js'
import { CLOSING } from './closing.js'

export const AGENT_SYSTEM_PROMPT = `${IDENTITY}

---

${DATETIME}

---

${TRANSPARENCY}

---

${SPIN}

---

${BANT}

---

${RAPPORT}

---

${STORYTELLING}

---

${EMOTIONAL_TRIGGERS}

---

${CHALLENGER_SALE}

---

${SANDLER}

---

${RULES}

---

${FUNNEL}

---

${OBJECTIONS}

---

${FINANCING}

---

${SCHEDULING}

---

${STORE_LOCATION}

---

${INVENTORY}

---

${EXAMPLES}

---

${CLOSING}`
