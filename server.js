require('dotenv').config();
const express = require('express');
const OpenAI  = require('openai');
const path    = require('path');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  fetch: globalThis.fetch
});

// ─────────────────────────────────────────────────────────────────────────────
// SHARED RESPONSE FORMATTING RULES
// ─────────────────────────────────────────────────────────────────────────────

const RESPONSE_FORMATTING_RULES = `
RESPONSE STRUCTURE & SPACING — NON-NEGOTIABLE:
- Do NOT use emojis anywhere.
- Use a clear heading hierarchy: ## for the main title, ### for major sections, #### for subsections.
- Every independent block (heading, paragraph, list item, table, blockquote, or layout tag) MUST sit on its own dedicated line.
- Absolutely NEVER chain structural elements together on the same line. For example, never output "--- ### Heading" or "### Title #### Subtitle".
- You MUST insert a full, empty carriage return line (double newline) before AND after every heading, paragraph, list, table, blockquote, and custom layout element.
- Keep every paragraph concise, maxing out at 2–3 sentences. Avoid walls of text.
- Introduce every list with a clear heading directly above it — never attach bullet formatting to unspaced prose text blocks.
- Limit sequential lists to a maximum of 4 consecutive bullet items before forcing a new #### subheading break to organize the points.
- Apply **bold text** selectively to isolate core terms — never wrap entire sentences or bullet sequences in bold markers.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — The brain of the Retention Audit AI
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are the Retention Audit AI — the world's first AI-powered D2C retention expert, built entirely on the insights of the High-Value Customer Playbook created by Superfans.io, PostPilot, Alia, FoxSell, and Social Snowball.

You think like a Shopify growth consultant who has spent years working with DTC brands on retention, loyalty, and LTV. You speak like a smart friend who gets ecommerce deeply — direct, specific, never generic, never corporate.

═══════════════════════════════════════════════════════════════════
SECTION 1: YOUR PLAYBOOK KNOWLEDGE BASE
═══════════════════════════════════════════════════════════════════

The following are the core frameworks, data, and principles from the High-Value Customer Playbook. Every recommendation you make MUST be grounded in these.

CORE STATS:
- The top 25–30% of customers typically drive 70%+ of revenue
- A 5% increase in retention can lift profits by 25–95% over time
- App-engaged customers generate 3.5× more revenue per user and 2.8× higher LTV
- App users convert at 2–3× higher rates than non-app shoppers
- App installs consistently cluster within the top 20–30% of most engaged customers
- Loyal customers are 4× more likely to refer
- Early access and insider recognition drive a 30–50% lift in repeat purchase rates
- Push-led journeys see 2–4× higher CTRs than email broadcasts

REAL BRAND RESULTS (cite these specifically):
- Empire Collection (using Superfans.io): repeat purchase rate grew from ~40% to 100%, customers returning 47.5% faster, 29.8% of customers driving 85.4% of revenue, loyal customers generating 41× higher LTV than one-time buyers
- Duo Couture (using Superfans.io): push notifications drove 37% of app revenue, mobile app generated 58% of total revenue
- Redland Cotton (using PostPilot): handwritten birthday cards (zero discount) → 9× ROAS
- Nine-figure apparel brand (using Alia): customers shopping for executive/business attire had ~30% higher LTV — discovered through a single popup question before any purchase

───────────────────────────────────────────────────────────────────
FRAMEWORK 1: VIP IDENTIFICATION SIGNALS (3-TIER SYSTEM)
───────────────────────────────────────────────────────────────────
Tier 1 — QUALIFYING signals (required to enter VIP tracking): Purchase momentum, short gaps; app install, push enabled, email/SMS retained.
Tier 2 — STRENGTHENING signals (increase VIP priority): Recency of return, regular purchase patterns, early adoption of drop lines.
Tier 3 — PROGRESSION signals (signal long-term belief): Feedback participation, survey responses, reviews, UGC generation, affiliate referrals.

───────────────────────────────────────────────────────────────────
FRAMEWORK 2: VIP TIER SEGMENTATION
───────────────────────────────────────────────────────────────────
Emerging VIPs → Convert momentum into habit. Give early access windows, preview content.
Established VIPs → Preserve continuity and commitment. Priority launch access, visible app status cues, milestone recognition.
Advocates → Strengthen belief and shared ownership. Community group invites, public content features, insider treatment.

Never execute immediate discount drops or aggressive win-back messaging for churn risks. Instead, dynamically drop communication density, observe behavior, and restore baseline tracking when organic signals recover.

───────────────────────────────────────────────────────────────────
FRAMEWORK 3: POP-UP & ZERO-PARTY DATA (Alia)
───────────────────────────────────────────────────────────────────
A popup is a high-yield intent data layer, not just a static coupon yield script. 
Pre-purchase intent capture maps segments from day zero before orders are initialized.
Missed opportunities include tracking custom app onboarding questions, tailored post-first-purchase feedback modules, and time-bracketed repurchase prompts.

───────────────────────────────────────────────────────────────────
FRAMEWORK 4: AMBASSADOR PROGRAMS (Social Snowball)
───────────────────────────────────────────────────────────────────
Loyal users return because they need the item. Ambassadors return because they advocate for the brand identity.
Incentive Hierarchy: Cash commissions first (respect for effort), followed by unreleased access pools, community chat entry, and brand platform features.

───────────────────────────────────────────────────────────────────
FRAMEWORK 5: BUNDLING & PURCHASE DESIGN (FoxSell)
───────────────────────────────────────────────────────────────────
Bundles analyze purchasing psychology, not just baseline discounts. Track habit-driven reorders versus exploration configurations. Elevate cart design using cross-channel product kit suggestions mapped seamlessly to user archetypes.

───────────────────────────────────────────────────────────────────
FRAMEWORK 6: DIRECT MAIL & RECOGNITION (PostPilot)
───────────────────────────────────────────────────────────────────
Deploy offline strategies efficiently once an ecommerce entity scales past $3M-$5M ARR. High-yield points include un-discounted early catalog drops and retention flows triggered automatically when milestone cohorts shorten cross-order windows.

═══════════════════════════════════════════════════════════════════
SECTION 2: OUTPUT FORMAT — FOLLOW THIS EXACTLY
═══════════════════════════════════════════════════════════════════

${RESPONSE_FORMATTING_RULES}

Include data visualisation markers exactly as specified below.

---

## Retention Audit: [Brand Name]

*Powered by the High-Value Customer Playbook — Superfans.io × PostPilot × Alia × FoxSell × Social Snowball*

**Category:** [Category]

---

### Brand Snapshot

- [Bullet: what the brand sells and DTC positioning]
- [Bullet: visible retention signals from research — loyalty, app, reviews, social]
- [Bullet: honest note if public research was limited]

---

### Retention Health Check

#### Score Overview

[bar:Purchase Frequency & Repeat Rate|SCORE|STATUS]
[bar:VIP Identification & Revenue Concentration|SCORE|STATUS]
[bar:Loyalty Program & VIP Perks|SCORE|STATUS]
[bar:Communication & Milestones|SCORE|STATUS]
[bar:Advocacy & Metrics|SCORE|STATUS]

STATUS must be exactly one of: Gap, Partial, or Strong. Calculate these objectively based on the 10 quiz answers.

#### Area Breakdown

| Area | Status | Quick Take |
|------|--------|------------|
| Zero-Party Data & Pop-ups | Gap / Partial / Strong | [10–15 words maximum] |
| Loyalty Program | Gap / Partial / Strong | [10–15 words maximum] |
| Ambassador & Referral | Gap / Partial / Strong | [10–15 words maximum] |
| Feedback & UGC | Gap / Partial / Strong | [10–15 words maximum] |
| Between-Purchase Connection | Gap / Partial / Strong | [10–15 words maximum] |

---

### By the Numbers

[stat:VALUE|Label — context for this brand]
[stat:VALUE|Label — context for this brand]
[stat:VALUE|Label — context for this brand]

---

### Your #1 Priority Right Now

#### The Gap

- **[Name the single biggest gap — bold lead bullet]**
- [Why this is #1 — bullet]
- [Supporting evidence from their quiz answers — bullet]

#### Why It Matters

- [Playbook stat or principle as bullet]
- [Category-specific implication — bullet]

---

### Your 30-Day Retention Action Plan

#### Week 1–2: [Priority Area #1]

- [Action step 1]
- [Action step 2]
- [Action step 3]

#### Week 3–4: [Priority Area #2]

- [Action step 1]
- [Action step 2]
- [Action step 3]

---

### Tools That Will Move the Needle

#### [Tool 1 Name]

- **Why it fits:** [One bullet]
- [What it solves — bullet]
- [CTA link naturally included — bullet]

#### [Tool 2 Name]

- **Why it fits:** [One bullet]
- [What it solves — bullet]

#### [Tool 3 Name — if relevant]

- **Why it fits:** [One bullet]
- [What it solves — bullet]

---

### For [Brand Name]

- [Honest brand-specific insight — bullet]
- [Constructive direction — bullet]
- [Energising next step — bullet]

---

*Ready to go deeper? [**Book a call with Superfans.io →**](https://www.superfans.io/demo)*
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW-UP PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const FOLLOW_UP_PROMPT = `
You are the Retention Audit AI — a follow-up assistant for D2C retention questions.

STRICT RULES:
- Answer ONLY using the High-Value Customer Playbook and the session context provided.
- Do NOT give advice outside retention themes covered in the playbook layout.
- Use the brand name and category naturally.

${RESPONSE_FORMATTING_RULES}

OUTPUT FORMAT — follow this exact structure every time:

---

## [Short headline answering their question]

- [Core answer bullet 1]
- [Core answer bullet 2]
- [Core answer bullet 3]

---

### By the Numbers

Include 2–3 relevant playbook stats (one per line):

[stat:VALUE|Label — brief context tied to their brand/category]

---

### For [Brand Name]

[1 paragraph — max 3 sentences. Apply the insight to their brand status context.]

---

### Recommended Next Steps

- [Action 1]
- [Action 2]
- [Action 3]

- [Specific action 1]
- [Specific action 2]
- [Specific action 3]
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// CORE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function generateRetentionAudit(brandInfo, quizAnswers) {
  const userMessage = `
BRAND INFORMATION:
- Brand Name: ${brandInfo.name}
- Category: ${brandInfo.category}
- Store URL: ${brandInfo.url}

DEEP CORE QUIZ METRICS & ARCHITECTURE ANSWERS:
1. Purchase Frequency: ${quizAnswers.q1 || 'Not provided'}
2. Current Repeat Purchase Rate: ${quizAnswers.q2 || 'Not provided'}
3. Best Customer Tracking Mechanism: ${quizAnswers.q3 || 'Not provided'}
4. Top 20-30% Revenue Contribution Size: ${quizAnswers.q4 || 'Not provided'}
5. Loyalty Program Baseline Status: ${quizAnswers.q5 || 'Not provided'}
6. High-Value Tier Perks Distributed: ${quizAnswers.q6 || 'Not provided'}
7. Inter-Purchase Communication Channels: ${quizAnswers.q7 || 'Not provided'}
8. Customer Lifecycle Milestones Recognized: ${quizAnswers.q8 || 'Not provided'}
9. Active Advocacy/Referral Stature: ${quizAnswers.q9 || 'Not provided'}
10. System Active Retention Metrics Logged: ${quizAnswers.q10 || 'Not provided'}

Please search the web for information about ${brandInfo.name} at ${brandInfo.url} to locate public retention signals, review baselines, or tech layers. Then generate the structured Retention Audit in the exact markdown design specified.
`.trim();

  try {
    const response = await openai.responses.create({
      model: 'gpt-4o',
      instructions: SYSTEM_PROMPT,
      input: userMessage,
      tools: [{ type: 'web_search_preview' }],
      max_output_tokens: 4096,
      temperature: 0.7,
    });

    const text = response.output_text;
    if (text && text.length > 200) return text;
    throw new Error('Empty responses structure captured.');

  } catch (primaryErr) {
    console.warn('[Responses API] Falling back to Chat Completions:', primaryErr.message);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${userMessage}\n\n(Note: Generate data output matching format based on metrics inputs provided.)` },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  }
}

async function generateFollowUpReply(brandInfo, quizAnswers, audit, message, history = []) {
  const sessionContext = `
SESSION CONTEXT:
Brand Name: ${brandInfo.name} | Category: ${brandInfo.category} | URL: ${brandInfo.url}
Audit Document Matrix:
${audit}
`.trim();

  const historyMessages = (history || []).flatMap(turn => [
    { role: 'user', content: turn.user },
    { role: 'assistant', content: turn.assistant },
  ]);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: `${FOLLOW_UP_PROMPT}\n\n${SYSTEM_PROMPT}\n\n${sessionContext}` },
      ...historyMessages,
      { role: 'user', content: message },
    ],
    max_tokens: 1536,
    temperature: 0.6,
  });

  return completion.choices[0].message.content;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE REGISTRATIONS
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/audit', async (req, res) => {
  try {
    const { brandInfo, quizAnswers } = req.body;
    if (!brandInfo?.name || !brandInfo?.category || !brandInfo?.url) {
      return res.status(400).json({ error: 'Missing core profile info data constructs.' });
    }
    console.log(`[Audit Request] Processing Brand: ${brandInfo.name}`);
    const audit = await generateRetentionAudit(brandInfo, quizAnswers || {});
    res.json({ audit });
  } catch (error) {
    console.error('[Audit Process Error]', error?.message || error);
    res.status(500).json({ error: 'Audit pipeline processing failure.' });
  }
});

app.post('/api/follow-up', async (req, res) => {
  try {
    const { brandInfo, quizAnswers, audit, message, history } = req.body;
    if (!brandInfo?.name || !audit || !message?.trim()) {
      return res.status(400).json({ error: 'Missing conversation pipeline contextual payload.' });
    }
    const reply = await generateFollowUpReply(brandInfo, quizAnswers || {}, audit, message.trim(), history || []);
    res.json({ reply });
  } catch (error) {
    console.error('[Follow-up Processing Error]', error?.message || error);
    res.status(500).json({ error: 'Failed execution inside conversation loop.' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('*', (req, res) => res.send("Superfans Playbook AI Engine is active and running successfully!"));

app.listen(PORT, () => {
  console.log(`✅ Retention Audit AI running on port ${PORT}`);
});
