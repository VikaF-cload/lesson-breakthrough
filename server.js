const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const JSONBIN_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_URL = 'https://api.jsonbin.io/v3/b';

// ═══════════════════════════════════════
// DEMO FEEDBACK BANK — general, warm, non-phrase-specific
// ═══════════════════════════════════════

const GENERIC_SCORES = {
  high: [
    { score: 4, comment: 'Your response demonstrates a clear understanding of the communicative goal. The tone is well-judged for the context and age group.' },
    { score: 4, comment: 'The register is appropriate and consistent throughout — professional without being distant, warm without being informal.' },
    { score: 4, comment: 'You managed the affective dimension effectively. Students are likely to feel safe and ready to engage after this response.' },
    { score: 5, comment: 'Language is clear, accurate, and well-structured. Accessible to your audience without oversimplifying.' },
    { score: 4, comment: 'The communicative purpose of this step is achieved. Your response moves the interaction forward purposefully.' }
  ],
  mid: [
    { score: 3, comment: 'The response addresses the situation adequately. There is room to add more warmth and a clearer communicative signal.' },
    { score: 3, comment: 'Register is generally appropriate, though some phrases lean slightly formal for this age group and context.' },
    { score: 3, comment: 'The affective tone is neutral — not harmful, but the opportunity to actively build safety or engagement is not fully taken.' },
    { score: 4, comment: 'Language is clear and grammatically accurate. Good foundation.' },
    { score: 3, comment: 'The communicative goal is partially met. One more purposeful element — an invitation, a reassurance, or a forward-looking statement — would strengthen this significantly.' }
  ],
  low: [
    { score: 2, comment: 'The response does not yet achieve the communicative goal of this step. Consider what the student needs to hear — not just what needs to be said.' },
    { score: 2, comment: 'The register may be creating distance rather than reducing it. Review the language cards for phrases that work at this level.' },
    { score: 2, comment: 'The affective dimension needs attention. How will students feel after hearing this response? That question should guide your rewrite.' },
    { score: 3, comment: 'Language is clear, which is a good foundation to build on.' },
    { score: 2, comment: 'The communicative purpose of this step is not yet met. Focus on the one thing this moment needs most — and say that, directly and warmly.' }
  ]
};

const DEMO_BANK = {

  s1_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Register appropriateness', score: 4, comment: 'Your tone is well-suited to teenagers — friendly and accessible while remaining professionally grounded.' },
      { criterion: 'Pragmatic appropriateness', score: 4, comment: 'Your introduction serves its communicative purpose well. Name, accessibility signal, and forward-looking tone are all present.' },
      { criterion: 'Affective climate management', score: 4, comment: 'You have actively worked to reduce the initial tension in the room. Students are likely to feel more comfortable after this opening.' },
      { criterion: 'Linguistic accuracy & clarity', score: 5, comment: 'Clear, accurate, and well-paced. The sentence structure is accessible without being simplified.' },
      { criterion: 'Contact-establishing behaviour', score: 4, comment: 'A confident, warm first impression. You addressed the class as partners and left the door open for further interaction.' }
    ],
    lessonGoal: { achieved: true, percentage: 83, comments: ['Students perceive you as accessible and approachable — the primary contact-establishing goal is achieved.', 'Adding one explicit invitation to ask questions would push this even further.'] },
    barDeltas: { energyDelta: -2, motivDelta: 17, involveDelta: 18, stressDelta: -15 },
    highlight: 'A warm, confident opening that set a positive tone immediately.',
    suggestion: 'Try adding a forward-looking statement tied to something specific about the course — it creates anticipation and gives students a reason to be interested from day one.',
    coachNote: 'This is a strong first impression. You established your identity, reduced tension, and invited further interaction — all within a few sentences. The class is likely to perceive you as approachable. The one gap is that staying slightly on the surface — a small personal detail or genuine expression of what you love about English would deepen the connection.'
  },

  s1_mid: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Register appropriateness', score: 3, comment: 'The register is appropriate but sits slightly on the formal side for a teenage audience. Warmth is present but not yet prominent.' },
      { criterion: 'Pragmatic appropriateness', score: 3, comment: 'The basics are covered — name, role, purpose. The response reads more like an announcement than a contact-establishing act.' },
      { criterion: 'Affective climate management', score: 3, comment: 'Polite and professional, which is appropriate — but the initial tension in the room is not actively addressed. Students understand who you are but have not yet decided how they feel about you.' },
      { criterion: 'Linguistic accuracy & clarity', score: 4, comment: 'Grammatically accurate and clearly structured. No issues with comprehension for this age group.' },
      { criterion: 'Contact-establishing behaviour', score: 3, comment: 'Contact is established at a basic level. The marked decrease in distance that characterises a high-level introduction is not yet present.' }
    ],
    lessonGoal: { achieved: false, percentage: 58, comments: ['Students know who you are — the informational goal is met.', 'The relational goal — being perceived as warm and accessible — needs more attention. One human detail and one explicit invitation would make a significant difference.'] },
    barDeltas: { energyDelta: -3, motivDelta: 8, involveDelta: 6, stressDelta: -5 },
    highlight: 'A clear and professional opening — the foundation is solid.',
    suggestion: 'Add one line that signals genuine openness: "If you have questions about anything — the course, the lessons, or anything else — please just ask. That\'s what I\'m here for."',
    coachNote: 'This introduction is professionally correct but communicatively cautious. You have given students information about you but not yet a reason to feel comfortable with you. The difference between a 3 and a 4 here is not about language — it is about taking a small communicative risk: a personal detail, naming the awkwardness, or making a genuine invitation to interact.'
  },

  s1_low: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Register appropriateness', score: 2, comment: 'The register creates distance rather than reducing it. For a first meeting with teenagers, warmth needs to come before formality.' },
      { criterion: 'Pragmatic appropriateness', score: 2, comment: 'The response does not function as a contact-establishing act. It may state facts or begin with instructions, but it does not address the relational need of the moment.' },
      { criterion: 'Affective climate management', score: 1, comment: 'Rather than reducing the initial tension, this response risks increasing it. The classroom feels like the teacher\'s territory, not a shared space.' },
      { criterion: 'Linguistic accuracy & clarity', score: 3, comment: 'Language is clear and grammatically correct — a good foundation to rebuild from.' },
      { criterion: 'Contact-establishing behaviour', score: 1, comment: 'There are no clear signs of friendly first contact. The first impression created here does not prepare students for open, engaged interaction.' }
    ],
    lessonGoal: { achieved: false, percentage: 22, comments: ['Students may know your name, but the relational goal is not yet achieved.', 'Return to the language cards and focus on the first sentence — what is the very first thing a student needs to hear from their teacher?'] },
    barDeltas: { energyDelta: -4, motivDelta: -8, involveDelta: -5, stressDelta: 10 },
    highlight: 'The willingness to speak first is noted — that initiative is important.',
    suggestion: 'Start over with one warm sentence: "Hello everyone — I\'m really glad to meet you." That alone is more effective than a formal or task-focused opening. Build from there.',
    coachNote: 'This response prioritises information or control over human contact. For a first meeting with teenagers, that order needs to be reversed — safety and warmth come before content and rules. Review Card 1 and try again. The goal is not perfection — it is making students feel safe enough to speak.'
  },

  s2_intro_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Warmth & tone', score: 4, comment: 'Your opening builds genuine curiosity and signals that this will be enjoyable rather than evaluative.' },
      { criterion: 'Framing as play not performance', score: 5, comment: 'You established a low-stakes frame before explaining the rules — exactly the right order. Students feel invited, not instructed.' },
      { criterion: 'Register for teenagers', score: 4, comment: 'Natural, energetic, and appropriately casual without losing professional direction.' }
    ],
    lessonGoal: { achieved: true, percentage: 88, comments: ['Students are curious and willing to participate.', 'The transition into the rules will be smooth from this foundation.'] },
    barDeltas: { energyDelta: -2, motivDelta: 14, involveDelta: 16, stressDelta: -12 },
    highlight: 'A warm, energetic introduction that frames the activity as play rather than performance.',
    suggestion: 'Consider naming the social purpose explicitly — "we\'re going to find out a few things about each other" gives students a reason to engage beyond just following instructions.',
    coachNote: 'Strong opening. You created curiosity, removed performance anxiety, and used energy appropriate for this age group. The class is ready to hear the rules — which is exactly the goal of this step.'
  },

  s2_intro_mid: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Warmth & tone', score: 3, comment: 'The introduction names the activity clearly but reads more like an announcement than an invitation.' },
      { criterion: 'Framing as play not performance', score: 2, comment: 'Without an explicit low-stakes signal, students may approach the activity with the same caution they bring to any task.' },
      { criterion: 'Register for teenagers', score: 3, comment: 'Language is appropriate but neutral. A little more energy would help draw students in.' }
    ],
    lessonGoal: { achieved: false, percentage: 52, comments: ['Students understand an activity is coming but are not yet drawn toward it.', 'Add one phrase that frames this as play: "It\'s easy, it\'s fun, and there are no wrong answers."'] },
    barDeltas: { energyDelta: -3, motivDelta: 5, involveDelta: 4, stressDelta: -2 },
    highlight: 'The activity purpose was communicated clearly — a solid starting point.',
    suggestion: 'Before explaining what students will do, tell them how it will feel: "This is a simple game — easy, fun, no pressure." That one sentence transforms the frame completely.',
    coachNote: 'The informational content is there but the affective framing is missing. An ice-breaker introduction has two jobs: explain what will happen, and make students want it to happen. Your response does the first but not yet the second.'
  },

  s2_rules_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Instruction clarity', score: 5, comment: 'Instructions are perfectly sequenced — one action per sentence, with a clear first step. Students can begin immediately.' },
      { criterion: 'Modelling included', score: 4, comment: 'You included a demonstration before releasing students — this is the most effective anxiety-reducer in any communicative activity.' },
      { criterion: 'Reassurance about mistakes', score: 4, comment: 'A reassurance about language accuracy was placed at the right moment — just before students start, when anxiety is highest.' }
    ],
    lessonGoal: { achieved: true, percentage: 90, comments: ['All students can start from these instructions.', 'Adding one comprehension check would push this to exceptional.'] },
    barDeltas: { energyDelta: -2, motivDelta: 12, involveDelta: 15, stressDelta: -10 },
    highlight: 'Clear, reassuring, well-sequenced instructions with a model example included.',
    suggestion: 'Add a brief comprehension check before students start — not "does everyone understand?" but a specific question about the first action: "So what\'s the first thing you do when I say go?"',
    coachNote: 'Excellent instruction sequence. The class is genuinely ready to start, not just technically permitted to. The comprehension check would be the one addition that lifts this to an exceptional level.'
  },

  s2_rules_mid: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Instruction clarity', score: 3, comment: 'The core instructions are present but not fully sequenced. The first action is not stated clearly enough for all students.' },
      { criterion: 'Modelling included', score: 2, comment: 'No demonstration is provided. Hesitant students will wait and watch rather than join in.' },
      { criterion: 'Reassurance about mistakes', score: 3, comment: 'A time limit is given, which helps — but there is no explicit reassurance about language errors.' }
    ],
    lessonGoal: { achieved: false, percentage: 60, comments: ['Confident students will start. Hesitant students will wait.', 'A modelled example and one reassurance phrase would significantly improve inclusivity.'] },
    barDeltas: { energyDelta: -3, motivDelta: 6, involveDelta: 8, stressDelta: -3 },
    highlight: 'The time limit was a good inclusion — it gives students a clear boundary.',
    suggestion: 'Demonstrate one example before releasing students. A 15-second model makes the task accessible to everyone, including those who are less confident.',
    coachNote: 'The instructions work for strong students but leave more anxious students behind. The gap between adequate and good here is a single modelled example — without it, hesitant students hold back, which works against the ice-breaking goal entirely.'
  },

  s2_time_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Clear time warning', score: 5, comment: 'A specific, actionable warning that motivates students to finish rather than simply cutting them off.' },
      { criterion: 'Preview of what comes next', score: 4, comment: 'Students know what follows — the transition will be smooth and engagement maintained.' },
      { criterion: 'Positive tone maintained', score: 4, comment: 'The warning feels like encouragement rather than a deadline. Good energy management.' }
    ],
    lessonGoal: { achieved: true, percentage: 85, comments: ['Transition will be smooth.', 'Students feel the activity is closing naturally, not being cut off.'] },
    barDeltas: { energyDelta: -2, motivDelta: 3, involveDelta: 2, stressDelta: -2 },
    highlight: 'A well-timed, well-worded warning that maintains momentum rather than interrupting it.',
    suggestion: 'You could add a brief signal for what happens immediately after: "thirty seconds, then we come back together" makes the next step even clearer.',
    coachNote: 'Well-timed and well-worded. This is what good time management in communicative activities looks like — the warning maintains energy rather than stopping it.'
  },

  s2_learnt_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Open curious question', score: 5, comment: 'An open, curious, non-evaluative invitation to share. Exactly the right framing for this moment.' },
      { criterion: 'Not framed as assessment', score: 4, comment: 'Students are invited to share discoveries, not to report answers. The social learning purpose is preserved.' },
      { criterion: 'Warm response to first answer', score: 4, comment: 'The follow-up invitation keeps the sharing moving without pressure.' }
    ],
    lessonGoal: { achieved: true, percentage: 88, comments: ['Students share voluntarily.', 'The social learning from the activity is made visible — which reinforces its value.'] },
    barDeltas: { energyDelta: -2, motivDelta: 10, involveDelta: 12, stressDelta: -5 },
    highlight: 'You transformed what could have been an answer-check into a genuine sharing moment.',
    suggestion: 'When the first student shares, validate the content specifically — this models genuine interest and encourages others to contribute.',
    coachNote: 'You used the activity for its communicative purpose rather than just completing it. That distinction — between running an activity and using it — is at the heart of communicative competence.'
  },

  s2_close_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Names what was achieved', score: 5, comment: 'You named what the class did together — making the learning visible and validating the students\' effort.' },
      { criterion: 'Validates class effort', score: 4, comment: 'A specific, honest acknowledgement of what students accomplished — not flattery, but genuine recognition.' },
      { criterion: 'Forward-looking connection', score: 4, comment: 'A clear connection to what comes next — students leave with a sense of continuity and purpose.' }
    ],
    lessonGoal: { achieved: true, percentage: 92, comments: ['Students leave this activity with a positive feeling about the class.', 'The forward-looking connection sets up the rest of the course effectively.'] },
    barDeltas: { energyDelta: -2, motivDelta: 15, involveDelta: 8, stressDelta: -8 },
    highlight: 'A strong conclusion that names the achievement, validates the effort, and connects forward.',
    suggestion: 'This is strong as it stands. A brief personal note — genuine rather than scripted — would be the only possible addition.',
    coachNote: 'Excellent conclusion. You named what happened, validated the effort, and connected it forward. Students leave knowing the activity mattered — which is what makes the ice-breaker promise real.'
  },

  s2_passive_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Quiet individual approach', score: 5, comment: 'You addressed the student without drawing the class\'s attention — preserving their dignity completely.' },
      { criterion: 'Face-saving offer', score: 4, comment: 'You offered a low-pressure way in rather than expecting the student to initiate alone.' },
      { criterion: 'No public naming of passivity', score: 5, comment: 'The student\'s non-participation was never named or highlighted publicly.' }
    ],
    lessonGoal: { achieved: true, percentage: 85, comments: ['The student has a low-pressure way into the activity.', 'Trust is built rather than damaged.'] },
    barDeltas: { energyDelta: -2, motivDelta: 8, involveDelta: 10, stressDelta: -8 },
    highlight: 'A sensitive, individual approach that protected the student\'s dignity while making participation easy.',
    suggestion: 'Making the first step as concrete as possible helps the most anxious students — the more specific the invitation, the easier it is to accept.',
    coachNote: 'Handled with real sensitivity. You protected the student\'s dignity while making it easy to participate. This is what affective-communicative competence looks like in practice.'
  },

  s2_excited_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Calm tone', score: 4, comment: 'Your response stays calm and warm — modelling the regulation you want to see without reacting to the energy.' },
      { criterion: 'Names behaviour not person', score: 5, comment: 'You addressed what was happening without naming who was responsible — keeping the atmosphere positive.' },
      { criterion: 'Activity continues', score: 4, comment: 'You redirected without stopping the activity — momentum is preserved.' }
    ],
    lessonGoal: { achieved: true, percentage: 80, comments: ['Energy is redirected productively.', 'No student is embarrassed and the activity continues.'] },
    barDeltas: { energyDelta: -2, motivDelta: 2, involveDelta: 3, stressDelta: -5 },
    highlight: 'You acknowledged the enthusiasm before redirecting it — far more effective than a straight instruction.',
    suggestion: 'Giving overexcited students a specific challenge can channel their energy productively and keep them engaged.',
    coachNote: 'Well handled. You kept the atmosphere positive while establishing a boundary. The key move was acknowledging the energy before redirecting it — which avoids the resistance that a direct instruction would create.'
  },

  s2_english_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Positive nudge', score: 4, comment: 'You framed the switch to English as an invitation rather than a rule — students respond better to being invited.' },
      { criterion: 'Models a phrase', score: 5, comment: 'Providing the exact phrase students need removes the language barrier completely.' },
      { criterion: 'No penalty framing', score: 5, comment: 'The transition to English is framed as natural progression, not correction of an error.' }
    ],
    lessonGoal: { achieved: true, percentage: 83, comments: ['Students switch to English without losing engagement.', 'The activity continues productively.'] },
    barDeltas: { energyDelta: -2, motivDelta: 5, involveDelta: 6, stressDelta: -4 },
    highlight: 'Modelling the exact phrase before asking students to use English — this is the critical element that makes the switch possible.',
    suggestion: 'After a few exchanges in English, a brief warm acknowledgement reinforces the behaviour without making it feel like surveillance.',
    coachNote: 'You handled the language-switching moment exactly right. The model phrase is what makes this work — telling students to use English without showing them what that looks like creates anxiety, not production.'
  },

  s2_rules_check_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Redirects to purpose not violation', score: 5, comment: 'You named the communicative purpose rather than the rule that was broken — a pedagogically sophisticated move.' },
      { criterion: 'No singling out', score: 5, comment: 'The reminder was addressed to everyone, so no individual felt accused.' },
      { criterion: 'Light tone', score: 4, comment: 'The atmosphere stayed positive while the expectation was restated clearly.' }
    ],
    lessonGoal: { achieved: true, percentage: 87, comments: ['Students refocus on the communicative purpose.', 'No trust is damaged in the process.'] },
    barDeltas: { energyDelta: -2, motivDelta: 3, involveDelta: 5, stressDelta: -3 },
    highlight: 'You corrected the behaviour without creating a disciplinary moment.',
    suggestion: 'This is well handled as it stands.',
    coachNote: 'The mark of a teacher who understands that the relationship with students is always more important than any single rule. You corrected without confronting — and the activity continued.'
  }
};

function getDemoFeedback(criteria, stepId, situation, modId) {
  let base;
  const step = (stepId || '').trim().toLowerCase();
  const mid = (modId || '').trim().toLowerCase();
  const sit = (situation || '').toLowerCase();

  if (mid === 's1' || !step || step === 'undefined' || step === 'null') {
    const r = Math.random();
    base = r > 0.6 ? DEMO_BANK.s1_high : r > 0.25 ? DEMO_BANK.s1_mid : DEMO_BANK.s1_low;
  } else if (step === 'passive') {
    base = DEMO_BANK.s2_passive_high;
  } else if (step === 'excited') {
    base = DEMO_BANK.s2_excited_high;
  } else if (step === 'english') {
    base = DEMO_BANK.s2_english_high;
  } else if (step === 'rules_check') {
    base = DEMO_BANK.s2_rules_check_high;
  } else if (step === 'close') {
    base = DEMO_BANK.s2_close_high;
  } else if (step === 'learnt') {
    base = DEMO_BANK.s2_learnt_high;
  } else if (step === 'time') {
    base = DEMO_BANK.s2_time_high;
  } else if (step === 'rules') {
    base = Math.random() > 0.4 ? DEMO_BANK.s2_rules_high : DEMO_BANK.s2_rules_mid;
  } else if (step === 'intro') {
    base = Math.random() > 0.4 ? DEMO_BANK.s2_intro_high : DEMO_BANK.s2_intro_mid;
  } else {
    base = DEMO_BANK.s2_intro_mid;
  }

  const result = JSON.parse(JSON.stringify(base));
  if (criteria && criteria.length > 0 && base.scores) {
    result.scores = criteria.map((crit, i) => {
      const src = base.scores[i] || base.scores[base.scores.length - 1];
      return { criterion: crit, score: src.score, comment: src.comment };
    });
  }
  return result;
}

// ═══════════════════════════════════════
// SAVE PROGRESS
// ═══════════════════════════════════════
// ── BIN ID CACHE (in-memory, persisted via env JSONBIN_INDEX_ID) ──
const binIdCache = {};
let indexBinId = process.env.JSONBIN_INDEX_ID || null;

async function ensureIndexBin() {
  // Already have it from env var — do nothing
  if (indexBinId) {
    console.log('Index bin loaded from env:', indexBinId);
    return;
  }
  // No env var set — create a new index bin once
  try {
    const res = await fetch(JSONBIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_KEY,
        'X-Bin-Name': 'lb_index',
        'X-Bin-Private': 'false'
      },
      body: JSON.stringify({ bins: {} })
    });
    const data = await res.json();
    indexBinId = data.metadata?.id;
    console.log('═══════════════════════════════════════════════');
    console.log('NEW INDEX BIN CREATED:', indexBinId);
    console.log('ACTION REQUIRED: Set this as JSONBIN_INDEX_ID');
    console.log('in your Render environment variables NOW.');
    console.log('═══════════════════════════════════════════════');
  } catch(e) {
    console.error('Index bin creation failed:', e.message);
  }
}

async function getBinId(pid) {
  if (binIdCache[pid]) return binIdCache[pid];
  if (!indexBinId) return null;
  try {
    const res = await fetch(`${JSONBIN_URL}/${indexBinId}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    const data = await res.json();
    const id = data.record?.bins?.[pid];
    if (id) binIdCache[pid] = id;
    return id || null;
  } catch(e) {
    return null;
  }
}

async function setBinId(pid, binId) {
  binIdCache[pid] = binId;
  if (!indexBinId) return;
  try {
    const res = await fetch(`${JSONBIN_URL}/${indexBinId}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    const data = await res.json();
    const record = data.record || { bins: {} };
    record.bins[pid] = binId;
    await fetch(`${JSONBIN_URL}/${indexBinId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
      body: JSON.stringify(record)
    });
  } catch(e) {
    console.error('Index update failed:', e.message);
  }
}

// Initialise on startup
(async () => {
  await ensureIndexBin();
  console.log('Index bin ready:', indexBinId);
})();

// ── SAVE PROGRESS ──
app.post('/api/save', async (req, res) => {
  const { pid, data } = req.body;
  if (!pid || !data) return res.status(400).json({ error: 'Missing pid or data' });
  try {
    const existingId = await getBinId(pid);
    if (existingId) {
      // Update existing bin
      const updateRes = await fetch(`${JSONBIN_URL}/${existingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
        body: JSON.stringify(data)
      });
      const updated = await updateRes.json();
      if (updated.message && updated.message.includes('error')) throw new Error(updated.message);
      res.json({ success: true, binId: existingId });
    } else {
      // Create new bin
      const createRes = await fetch(JSONBIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_KEY,
          'X-Bin-Name': 'lb_' + pid,
          'X-Bin-Private': 'false'
        },
        body: JSON.stringify(data)
      });
      const created = await createRes.json();
      console.log('Create bin response:', JSON.stringify(created).slice(0, 200));
      const newId = created.metadata?.id;
      if (!newId) throw new Error('No bin ID returned: ' + JSON.stringify(created).slice(0, 100));
      await setBinId(pid, newId);
      res.json({ success: true, binId: newId });
    }
  } catch (e) {
    console.error('Save error:', e.message);
    res.status(500).json({ error: 'Save failed', detail: e.message });
  }
});

// ── LOAD PROGRESS ──
app.post('/api/load', async (req, res) => {
  const { pid } = req.body;
  if (!pid) return res.status(400).json({ error: 'Missing pid' });
  try {
    const existingId = await getBinId(pid);
    if (!existingId) return res.json({ found: false });
    const binRes = await fetch(`${JSONBIN_URL}/${existingId}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    const binData = await binRes.json();
    if (!binData.record) return res.json({ found: false });
    res.json({ found: true, data: binData.record });
  } catch (e) {
    console.error('Load error:', e.message);
    res.status(500).json({ error: 'Load failed' });
  }
});

// ═══════════════════════════════════════
// AI ASSESS — with demo fallback
// ═══════════════════════════════════════
app.post('/api/assess', async (req, res) => {
  const { response, situation, goal, criteria, moduleId, stepId } = req.body;
  if (!response || !situation || !criteria) return res.status(400).json({ error: 'Missing fields' });

  // Scenario-specific rubric anchors
  const RUBRIC_ANCHORS = {
    s1: `
SCENARIO 1 RUBRIC — Self-introduction to a new class of teenagers:

Register appropriateness:
  1-2: Overly formal ("I am your teacher. We will now begin.") or inappropriately casual/childish
  3: Professionally correct but slightly cold or distant — no warmth signal
  4: Warm and accessible — offers informal name option OR acknowledges the awkwardness OR uses inclusive "we/us" language
  5: All of the above PLUS a genuine personal detail or forward-looking statement that creates positive expectation

Pragmatic appropriateness:
  1-2: Response does not function as a self-introduction at all — gives instructions, rules, or irrelevant content
  3: States name and role but no relational move — purely informational
  4: Name + role + at least one relational move (accessibility signal, invitation, shared future)
  5: Name + role + multiple relational moves, all purposeful and well-timed

Affective climate management:
  1-2: Response increases tension — formal, cold, starts with rules or expectations
  3: Neutral — neither increases nor decreases tension noticeably
  4: Explicitly reduces tension — acknowledges first-lesson awkwardness, invites questions, signals safety
  5: Masterfully addresses the emotional state of the room with specific, well-chosen language

Linguistic accuracy & clarity:
  1-2: Errors that impede understanding or sound unprofessional
  3: Minor errors (typos, small grammar mistakes) but meaning is fully clear — reduce by 1 point max
  4: Accurate, clear, natural — appropriate complexity for the audience
  5: Precise, elegant, no errors, register-perfect

Contact-establishing behaviour:
  1-2: No signs of friendly first contact — could be an announcement or instruction
  3: Minimal contact — acknowledges students are there but no warmth moves
  4: Clear friendly contact — at least 2 of: greeting, name offering, pleasure expressed, invitation, forward-looking
  5: Rich, multi-layered contact that leaves students feeling genuinely welcomed`,

    s3: `
SCENARIO 3 RUBRIC — Making contact at the beginning of the lesson (returning class):

Register appropriateness:
  1-2: Overly formal, cold, or inappropriately casual — does not fit teenagers aged 14-16
  3: Correct register but flat — no warmth or personality
  4: Warm, confident, appropriate for teenagers — sounds like a real teacher
  5: Natural, warm, with personal touch — students would genuinely respond

Affective climate management:
  1-2: No attempt to manage classroom mood — begins abruptly or creates tension
  3: Neutral — does not increase tension but does not reduce it either
  4: Actively reduces tension — signals safety, belonging, readiness; reaches hesitant students
  5: Expertly calibrated — mood check included, individual students acknowledged, room ready

Contact-establishing behaviour:
  1-2: No contact moves — could be a broadcast announcement
  3: One contact move only — basic greeting but nothing personalising
  4: At least two clear moves: greeting + mood check OR greeting + personal question OR greeting + transition
  5: Three or more purposeful moves building genuine connection before the lesson begins

Linguistic accuracy & clarity:
  1-2: Errors that impede communication or sound unprofessional
  3: Minor errors only — meaning fully clear
  4: Accurate, natural, no errors
  5: Precise, elegant, perfectly pitched for the group

Lesson transition clarity:
  1-2: No transition — lesson either doesn't start or starts abruptly
  3: Implied transition — students can guess the lesson is starting
  4: Explicit forward-looking statement — students know something specific is coming
  5: Bridge is motivating AND connects to a specific lesson goal or topic

BONUS TASK (s3_bonus) — Relevancy to the topic:
  1-2: Question has no connection to the lesson topic
  3: Loose connection — topic mentioned but not woven into the personal question
  4: Clear connection — personal question naturally leads to the topic
  5: Elegant connection — question is genuinely personal AND perfectly primes the topic`,


    s6: `
SCENARIO 6 RUBRIC — Giving instructions (written modelling step only):

Instruction clarity:
  1-2: Students would not know what to do — steps missing, contradictory, or confusing
  3: Main steps present but at least one important element unclear or implied
  4: All steps clear and in logical order — students can start immediately
  5: All steps clear, explicitly sequenced, with anticipation of likely confusion points

Sequencing:
  1-2: Steps not in the order students would follow them
  3: Mostly correct order but one step misplaced
  4: Correct order matching the task flow
  5: Perfect sequence with explicit connectors (first/then/finally)

Modelling quality (written step):
  Path 1 drill: 1-2 = no base sentence or no model answer; 3 = cycle present but no coaching; 4 = full cycle + rule reminder; 5 = cycle + rule + coaching note
  Path 2 reading: 1-2 = no strategy named or wrong strategy; 3 = strategy named but thinking not shown; 4 = first+last sentence + topic noun + heading choice; 5 = all of the above + explicit "why this heading" reasoning
  Path 3 speaking: 1-2 = reads card aloud; 3 = description present but facts only; 4 = facts + feelings, realistic pace; 5 = facts + feelings + explicit naming of structure

ICQ quality:
  1-2: "Does everyone understand?" or similar social question
  3: Attempts a check but closed-ended or vague
  4: Closed, targets procedure, specific and answerable
  5: Closed + targets the exact danger zone for this task type

Register & transition:
  1-2: Instruction is cold, robotic, or confusing in tone
  3: Functional but flat — students would follow but not feel invited
  4: Warm, clear, appropriate for the age group and task type
  5: Warm, purposeful, energises students for the task`,
    s4: `
SCENARIO 4 RUBRIC — Setting the lesson goals:

Register appropriateness:
  1-2: Overly formal or reads like a lesson plan — "The educational objective of today's lesson is…"
  3: Correct but flat — appropriate language, no warmth or engagement
  4: Warm, direct, natural — sounds like a teacher talking to students, not reciting a document
  5: Warm, engaging, perfectly pitched — students would genuinely want to know what comes next

Goal clarity & completeness (three-part formula: activity + result + personal):
  1-2: Topic only ("Today we study Present Perfect") or task only ("We will do exercises 3 and 4")
  3: Two parts present — usually activity + result, but personal/meaningful connection missing
  4: All three parts present — activity clear, result concrete and observable, personal connection stated
  5: All three parts present AND seamlessly integrated — feels like one natural sentence, not a checklist

Personal/meaningful connection:
  1-2: No connection to students' real life or needs — purely academic or abstract
  3: Implied relevance — students might infer it, but it is not stated
  4: Explicit personal connection — "you'll use this when…", "this helps you…", "you'll be able to…"
  5: Specific and compelling — connects to this class, this age group, this moment

Linguistic accuracy & clarity:
  1-2: Errors that confuse the goal itself — students misunderstand what to do
  3: Minor errors only — meaning fully clear
  4: Accurate, natural, well-structured
  5: Precise, no errors, elegant sentence structure

Lesson transition clarity:
  1-2: No transition — students don't know what happens next
  3: Implied transition — lesson probably starts after this
  4: Explicit forward-looking statement — first step of the lesson named
  5: Smooth and motivating bridge — students feel pulled into the lesson`,

    s6_icq: `
ICQ ASSESSMENT — Student has written one instruction checking question.
Evaluate only: is it a CLOSED question? Does it target PROCEDURE or STRATEGY (not content opinion or general readiness)?
Score 4-5 if: closed, targets procedure/strategy, specific and answerable in a few words.
Score 3 if: attempts a check but slightly vague or could be answered yes/no.
Score 1-2 if: "Does everyone understand?", "Are you ready?", or a content/opinion question.
Keep coachNote to 2 sentences.`,
    s6_quick:`
QUICK RESPONSE ASSESSMENT — Student has written a one-sentence start signal.
Evaluate: Is it in English? Is the register warm and confident (not a question, not aggressive)? Is it a clear signal to begin?
Score 4-5 if: English, warm, confident, unambiguous start signal.
Score 3 if: correct but flat or slightly hesitant.
Score 1-2 if: in Russian, a question, or unclear.
Keep coachNote to 1 sentence.`,
    s9:`
SCENARIO 9 RUBRIC — Finishing the lesson and reflection:

Goal return clarity:
  1-2: Goal not mentioned, or stated so abstractly it could apply to any lesson
  3: Goal named but not connected to what students actually did
  4: Goal named AND connected concretely to the lesson's activities and achievements
  5: Goal return creates a visible moment of recognition — students see the arc from start to finish

Reflection technique quality:
  1-2: "What did you learn today?" with no structure — question fails, silence follows
  3: A technique is introduced but not explained clearly enough for students to know what to produce
  4: One technique introduced clearly, with an example or starter — students know what to do
  5: Technique introduced warmly and purposefully — feels like an invitation, not an assessment

Student engagement:
  1-2: Close happens at students, not with them — no invitation to participate
  3: Reflection invited but no student is specifically included or their response received genuinely
  4: At least one student response elicited and received specifically — teacher responds to the content
  5: Multiple students included, one response received with genuine follow-up, class closes with a student voice

Warm closure:
  1-2: Abrupt end — lesson stops, no close
  3: Polite close but generic — could apply to any lesson on any day
  4: Warm, lesson-specific close — references something real that happened today
  5: Close is specific, warm, and leaves a lasting impression — the last words of this lesson

Forward-looking close:
  1-2: Nothing forward-looking — lesson ends where it ends
  3: Vague forward reference ("see you next time")
  4: Specific forward reference — connects today's learning to what comes next or to life outside the classroom
  5: Forward-looking line that students will actually think about after they leav`,

    s8: `
SCENARIO 8 RUBRIC — Scaffolding, ICQs and CCQs (full assessment steps only):

CCQ/ICQ quality:
  1-2: "Does everyone understand?" or a question that can be answered by nodding — no diagnostic value
  3: Attempts a check but the question is too broad or can be answered from memory rather than understanding
  4: Closed, specific, targets the concept or procedure at its most likely confusion point
  5: Precisely targeted at the exact misunderstanding most likely to be hidden — reveals the gap immediately if it exists

Diagnostic clarity:
  1-2: The teacher's question or response reveals nothing about what the student understands or doesn't
  3: Some diagnostic intent but the follow-up misses the actual gap
  4: Teacher identifies the gap and responds to it specifically
  5: Teacher names the exact misconception, explains why it's a natural error, and provides the correct framing

Scaffolding technique (Path 2 only):
  1-2: Gives the answer, or gives a scaffold that is either too vague or too simple to hold
  3: Scaffold present but not connected to what the student already knows
  4: Bridges from what the student knows to what they need to understand — student could find the answer from it
  5: Minimum effective scaffold — one question or analogy that builds the bridge without crossing it

Face-saving:
  1-2: Publicly names the student's confusion or makes the error visible to the class
  3: Avoids explicit embarrassment but student still feels the correction
  4: Individual, private, warm — student feels supported not exposed
  5: Student's wrong answer is treated as a contribution — their reasoning is acknowledged before the correction

Language accessibility:
  1-2: Uses metalanguage or grammatical terms an A2 learner would not understand
  3: Mostly accessible but one term or concept assumes more language than the student has
  4: Language is fully accessible — concepts explained through examples and context, not grammar terms
  5: Language is calibrated precisely to A1+/A2 — simple, concrete, exemplified, never condescending`,
    s5: `
SCENARIO 5 RUBRIC — Using classroom language:

Register appropriateness & variation:
  1-2: One register used throughout (usually imperatives only) regardless of context; or completely wrong register for the moment
  3: Correct register but no variation — repetitive and flat; technically right but not responsive to context
  4: Register varies with context — imperative for practical moments, softened for individual/sensitive, collective for whole-class; clear awareness of when to shift
  5: Register choice is nuanced, purposeful, and precisely matched to each moment; feels natural not calculated

Classroom language accuracy & naturalness:
  1-2: Phrases are translated from Russian literally and sound unnatural; or contain errors that confuse meaning
  3: Correct but textbook-sounding; phrases work but lack naturalness
  4: Natural, accurate, idiomatic; sounds like a real English teacher not a phrase book
  5: Precise, varied, entirely natural; wide repertoire deployed fluently

Praise — specificity and warmth:
  1-2: No praise present; or praise is actively discouraging ("Finally someone got it")
  3: Generic praise only ("Well done", "Good job") — technically positive but no content
  4: Specific praise naming what worked; warm and genuine
  5: Specific praise + extension ("Can you tell us how you got there?") — reinforces and develops

Transition clarity:
  1-2: No transition; activity ends without acknowledgement and next task begins abruptly
  3: Transition present but mechanical — students understand but don't feel engaged
  4: Clear, warm transition; activity closed, effort acknowledged, new task introduced
  5: Seamless transition that maintains energy and student engagement

Affective climate maintenance:
  1-2: Language creates tension, embarrassment, or confusion
  3: Neutral — language doesn't worsen the atmosphere but doesn't improve it
  4: Language actively maintains warmth and focus throughout
  5: Language restores or elevates the classroom mood even in a difficult moment

CHALLENGE STEPS — additional criterion:
Register under pressure: Did the register choice match the emotional weight of the situation? (low-stress → softened/collective; high-stress → calm, grounded, non-escalating)`,

    s3_bonus: `
BONUS TASK RUBRIC — Personalised question connected to lesson topic:
Score each criterion honestly. The 5th criterion (Relevancy to the topic) is the key one for this task.

Register appropriateness: Is the question warm and appropriate for teenagers?
Affective climate management: Does the question create a safe, inviting opening?
Contact-establishing behaviour: Does it invite genuine personal response?
Linguistic accuracy & clarity: Is the English accurate and natural?
Relevancy to the topic: Does the question connect naturally and personally to the topic? (4 = clear connection, 5 = elegant and seamless)`,

    s2: `
SCENARIO 2 RUBRIC — Ice-breaking activity with a new class:

Affective-communicative (safe space):
  1-2: Activity framed as test or performance — students feel evaluated, not invited
  3: Neutral framing — activity described but no explicit safety signals
  4: Clear low-pressure framing — "no wrong answers", "try it", "I'll go first", or similar
  5: Multiple safety signals + teacher models first + genuine invitation to participate

Communicative-organisational (activity management):
  1-2: Instructions unclear or missing — students cannot start
  3: Basic instructions present but incomplete — some students will be confused
  4: Clear sequenced instructions + time limit OR modelled example
  5: Clear + sequenced + modelled + comprehension check (ICQ)

Register appropriateness:
  1-2: Wrong register for teenagers — either too formal or condescending
  3: Appropriate but flat — no energy or enthusiasm
  4: Warm, energetic, right for teenagers — sounds like a real teacher not a script
  5: Naturally warm, energetic, age-appropriate with personal touch

Linguistic accuracy & clarity:
  1-2: Errors that confuse students about what to do
  3: Minor errors but meaning clear — reduce by 1 max
  4: Accurate and clear — students know exactly what to do
  5: Precise, natural, no errors`
  };

  const rubricAnchor = RUBRIC_ANCHORS[moduleId] || '';

  const systemPrompt = `You are a calibrated assessor of pre-service EFL teachers. Your job is FAIR, EVIDENCE-BASED assessment — neither harsh nor lenient. Use the rubric anchors below to score consistently.

CONTENT MODERATION — check FIRST. Set "inappropriate":true and STOP only for: profanity, personal insults at students, threats, intimidation, weaponised sarcasm, "I don't care"/"whatever"-type dismissals, language that makes students feel unsafe. Do NOT flag: Russian teacher names (Victoria Dmitrievna, Ekaterina Sergeevna etc.), typos, grammatical errors, imperfect but respectful language.

${rubricAnchor}

GENERAL SCORING PRINCIPLES:
- Typos and minor grammar errors reduce Linguistic accuracy by at most 1 point. They do NOT affect other criteria.
- Warmth + accessibility + invitation + name in a self-introduction = 4, not 3.
- Score 1-2 only when the response fails completely at the communicative goal or is harmful.
- Score 3 when the response attempts the goal but is missing clear identifiable elements.
- Score 4 when the response achieves the goal with positive moves you can name and quote.
- Score 5 only for genuinely exceptional responses — rare.

Each criterion comment: 1-2 sentences — quote the student's actual words, explain why that specific score using the rubric.

COACH NOTE: Maximum 5 sentences. (1) Name one specific thing that worked — quote it. (2) Name the single most important gap. (3) One concrete actionable suggestion with example phrasing. Do not repeat criterion comments. Do not be vague.`;

  const userPrompt = `SITUATION: ${situation}
GOAL: ${goal}
CRITERIA: ${criteria.map((c, i) => `${i+1}. ${c}`).join(', ')}
STUDENT RESPONSE: "${response}"

Reply ONLY with valid JSON:
{"inappropriate":false,"inappropriateReason":"","scores":[{"criterion":"...","score":3,"comment":"..."}],"lessonGoal":{"achieved":false,"percentage":55,"comments":["observation","suggestion"]},"barDeltas":{"energyDelta":-3,"motivDelta":8,"involveDelta":6,"stressDelta":-5},"highlight":"specific phrase that worked","suggestion":"one concrete improvement","coachNote":"up to 5 sentences of honest calibrated feedback"}`;

  try {
    console.log('Calling Anthropic API, key present:', !!ANTHROPIC_KEY);
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    const aiData = await aiRes.json();
    console.log('AI status:', aiRes.status);
    if (aiData.error) throw new Error(aiData.error.message || 'API error');
    const raw = aiData?.content?.[0]?.text || '';
    if (!raw) throw new Error('Empty AI response');
    const clean = raw.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('Real AI assessment successful');
    res.json(parsed);
  } catch (e) {
    console.log('AI unavailable, using demo feedback. Reason:', e.message);
    const demo = getDemoFeedback(criteria, stepId, situation, moduleId);
    res.json(demo);
  }
});

// ── REFLECTION QUALITY ──
app.post('/api/assess-reflection', async (req, res) => {
  const { question, answer, scenarioId } = req.body;
  if (!answer || answer.trim().length < 5) return res.json({ qualityScore: 1, qualityLabel: 'minimal' });

  const systemPrompt = `You are assessing the quality of a pre-service EFL teacher's written reflection on a classroom simulation. Score using this rubric:
1 — One word or irrelevant answer, no engagement with the question
2 — Very brief, surface-level, no specific reference to own experience
3 — Adequate — answers the question but stays general, no analysis
4 — Good — references specific actions or choices, shows awareness of why something worked or didn't
5 — Excellent — analytical, connects theory to practice, shows metacommunicative awareness, specific examples
Reply ONLY with valid JSON: {"qualityScore":3,"qualityLabel":"adequate","qualityNote":"one sentence"}`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: 'user', content: `QUESTION: ${question}\nANSWER: "${answer}"` }]
      })
    });
    const aiData = await aiRes.json();
    if (aiData.error) throw new Error(aiData.error.message);
    const raw = aiData?.content?.[0]?.text || '';
    const match = raw.replace(/```json|```/g,'').trim().match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    res.json(JSON.parse(match[0]));
  } catch(e) {
    console.log('Reflection quality AI failed:', e.message);
    // Simple heuristic fallback based on length and content
    const len = answer.trim().split(/\s+/).length;
    const score = len < 5 ? 1 : len < 15 ? 2 : len < 40 ? 3 : len < 80 ? 4 : 5;
    const labels = ['','minimal','brief','adequate','good','excellent'];
    res.json({ qualityScore: score, qualityLabel: labels[score], qualityNote: 'Assessed by length heuristic (API unavailable)' });
  }
});


app.post('/api/assess-voice', async (req, res) => {
  const { transcript, situation, goal, scenarioId } = req.body;
  if (!transcript || !situation) return res.status(400).json({ error: 'Missing fields' });

  const DEMO_VOICE = {

    s9_return: {voiceScores:[{dimension:'Pragmatics & content',score:4,comment:'Goal return is concrete and connected to what students actually did.'},{dimension:'Tone',score:4,comment:'Warm and genuine — sounds like recognition, not administration.'},{dimension:'Clarity',score:4,comment:'Clear and direct — students immediately understand what is being acknowledged.'},{dimension:'Delivery',score:4,comment:'Unhurried — gives the moment the space it deserves.'}],overallVoice:4,voiceInsight:'A genuine moment of recognition that completes the lesson arc.',barDeltas:{energyDelta:3,motivDelta:8,involveDelta:6,stressDelta:-5},classReaction:{s1_name:'Lena',s1_response:'Oh — I actually did say something I couldn\'t say before.',s1_nonverbal:'looks at her notes, something clicking',s2_name:'George',s2_response:'That\'s true.',s2_nonverbal:'puts his bag down',s3_name:'Nick',s3_response:'',s3_nonverbal:'stops packing, looks up'}},
    s9_reflect: {voiceScores:[{dimension:'Pragmatics & content',score:4,comment:'Reflection technique is introduced clearly with a concrete starter.'},{dimension:'Tone',score:4,comment:'Inviting not demanding — students feel asked, not tested.'},{dimension:'Clarity',score:4,comment:'Students know exactly what to produce.'},{dimension:'Delivery',score:4,comment:'Warm pacing — gives students a moment to think.'}],overallVoice:4,voiceInsight:'A well-framed reflection invitation that lowers the barrier without lowering the standard.',barDeltas:{energyDelta:2,motivDelta:5,involveDelta:7,stressDelta:-4},classReaction:{s1_name:'Lena',s1_response:"Today I can describe a lifestyle in English without stopping to think.",s1_nonverbal:'smiling, writes it down',s2_name:'George',s2_response:"I'm surprised I had more to say than I thought.",s2_nonverbal:'thoughtful',s3_name:'Nick',s3_response:'',s3_nonverbal:'listening, pen in hand'}},


    s8_step_icq: { voiceScores:[{dimension:'Pragmatics & content',score:4,comment:'ICQ is specific and closed — targets the procedure not the concept.'},{dimension:'Tone',score:4,comment:'Warm and matter-of-fact — checking without interrogating.'},{dimension:'Clarity',score:4,comment:'One clear question, answerable in a few words.'},{dimension:'Delivery',score:4,comment:'Paced well — students have time to process the question.'}],overallVoice:4,voiceInsight:'A well-formed ICQ that verifies readiness without creating anxiety.',barDeltas:{energyDelta:-1,motivDelta:5,involveDelta:6,stressDelta:-5},classReaction:{s1_name:'Nick',s1_response:'We choose one word for each gap?',s1_nonverbal:'uncertain but engaged',s2_name:'Paul',s2_response:"Yeah I got it, can we start?",s2_nonverbal:'impatient, ready',s3_name:'Lena',s3_response:'Yes — one modal for each sentence.',s3_nonverbal:'nods, notebook open'}},
    s8_step_scaffold: { voiceScores:[{dimension:'Pragmatics & content',score:4,comment:'The scaffold connects the new problem to something already understood.'},{dimension:'Tone',score:4,comment:'Patient and warm — Nick doesn\'t feel interrogated.'},{dimension:'Clarity',score:4,comment:'Concrete and accessible for an A2 learner.'},{dimension:'Delivery',score:4,comment:'Unhurried — gives Nick time to process each step.'}],overallVoice:4,voiceInsight:'A diagnostic scaffold that builds a bridge without crossing it.',barDeltas:{energyDelta:-1,motivDelta:7,involveDelta:5,stressDelta:-6},classReaction:{s1_name:'Nick',s1_response:'Oh... so could, may and might are all fine here?',s1_nonverbal:'looks at the sentence again, something clicking',s2_name:'Lena',s2_response:'',s2_nonverbal:'continues working, hasn\'t noticed',s3_name:'Paul',s3_response:'',s3_nonverbal:'already on sentence 6'}},

    s7: `
SCENARIO 7 RUBRIC — Addressing students personally (full assessment steps only):

Affective-communicative:
  1-2: Response increases student anxiety, embarrassment, or disengagement
  3: Neutral — doesn't worsen but doesn't improve the student's state
  4: Actively reduces anxiety or increases engagement — student feels seen not watched
  5: Precisely calibrated to this student's emotional state — warm, private, purposeful

Error correction technique (Path 3 only):
  1-2: "No. That's wrong." or public correction with no path forward
  3: Softens the correction but gives no information — "Almost!" with nothing to work with
  4: Receives the answer, identifies the gap, gives the student a path (question or hint)
  5: Receives → identifies → paths → acknowledges what was right — full professional sequence

Dignity preservation:
  1-2: Response draws attention to failure, compares to others, or expresses exasperation
  3: Avoids obvious humiliation but student still feels exposed or dismissed
  4: Student's dignity is actively protected — private, specific, forward-looking
  5: Student feels acknowledged and supported — their mistake or struggle becomes a learning moment

Register appropriateness:
  1-2: Wrong register — too formal, too aggressive, or inappropriate for the moment
  3: Appropriate register but flat — lacks warmth or personal touch
  4: Warm, appropriate, natural — sounds like a teacher who sees this student as a person
  5: Register is precisely matched to the student and the emotional weight of the moment

Scaffolding clarity / Instructional specificity (Path 1 only):
  1-2: No concrete next step given — student still doesn't know what to do
  3: A direction is given but vague — "just try something"
  4: One concrete, specific, immediately actionable next step
  5: One step + brief scaffolding note + implied belief that the student can do it`,
    s7_step_open: { voiceScores:[{dimension:'Pragmatics & content',score:4,comment:'Quiet, warm, face-saving approach — no accusation, no public attention.'},{dimension:'Tone',score:4,comment:'Genuinely concerned and supportive — student would feel seen rather than caught.'},{dimension:'Clarity',score:4,comment:'Simple and clear — Nick knows he\'s being offered help, not interrogated.'},{dimension:'Delivery',score:4,comment:'Calm and unhurried — gives the student space to respond.'}],overallVoice:4,voiceInsight:'A warm, private approach that opens rather than demands.',barDeltas:{energyDelta:-1,motivDelta:4,involveDelta:5,stressDelta:-6},classReaction:{s1_name:'Nick',s1_response:'',s1_nonverbal:'looks up briefly, slight relief',s2_name:'Lena',s2_response:'',s2_nonverbal:'continues working, didn\'t notice',s3_name:'Paul',s3_response:'',s3_nonverbal:'glances over briefly'}},
    s7_step_receive: { voiceScores:[{dimension:'Pragmatics & content',score:4,comment:'Receives the answer professionally without verdict — George feels heard, not judged.'},{dimension:'Tone',score:4,comment:'Curious and calm — the class sees a teacher who takes answers seriously.'},{dimension:'Clarity',score:4,comment:'Clear question that opens the conversation rather than closing it.'},{dimension:'Delivery',score:4,comment:'Even pacing — no sign of disappointment or impatience.'}],overallVoice:4,voiceInsight:'Professional and warm — George\'s dignity is intact and Tom has nothing to work with.',barDeltas:{energyDelta:-1,motivDelta:6,involveDelta:4,stressDelta:-5},classReaction:{s1_name:'George',s1_response:'Well... I thought the paragraph was about difficulties.',s1_nonverbal:'looking at the text, reconsidering',s2_name:'Tom',s2_response:'',s2_nonverbal:'smirk fades slightly',s3_name:'Lena',s3_response:'',s3_nonverbal:'looks at her own answer, checking'}},
    s1: { voiceScores:[{dimension:'Pragmatics & content',score:4,comment:'The greeting and self-introduction are well-structured and appropriate for a first meeting with teenagers.'},{dimension:'Tone',score:4,comment:'Warm and accessible — "you can call me" signals approachability without losing authority.'},{dimension:'Clarity',score:4,comment:'Message clearly structured: name, role, forward-looking statement.'},{dimension:'Delivery',score:3,comment:'Pacing appears natural. A deliberate pause after the name introduction would add presence.'}],overallVoice:4,voiceInsight:'A warm, well-structured introduction that makes students feel welcome.',barDeltas:{energyDelta:-2,motivDelta:10,involveDelta:8,stressDelta:-8},classReaction:{s1_name:'Nick',s1_response:'Hello.',s1_nonverbal:'looks up briefly',s2_name:'Lena',s2_response:'Good morning, Ekaterina Sergeevna!',s2_nonverbal:'smiles and sits up straight',s3_name:'Paul',s3_response:'Hi! Are we doing anything fun today?',s3_nonverbal:'raises his hand immediately'}},
    s4_step_formulate: { voiceScores:[{dimension:'Pragmatics & content',score:4,comment:'The goal statement contains the key elements — activity and result are clear.'},{dimension:'Tone',score:4,comment:'Warm and direct — sounds like a teacher, not a lesson plan.'},{dimension:'Clarity',score:4,comment:'Straightforward sentence structure, students would understand immediately.'},{dimension:'Delivery',score:3,comment:'Pacing appears natural. A brief pause before the personal connection would add emphasis.'}],overallVoice:4,voiceInsight:'A clear, purposeful goal statement that orients the class.',barDeltas:{energyDelta:-2,motivDelta:9,involveDelta:7,stressDelta:-6},classReaction:{s1_name:'Lena',s1_response:'Got it.',s1_nonverbal:'nods and opens notebook',s2_name:'Nick',s2_response:'',s2_nonverbal:'looks up from desk',s3_name:'George',s3_response:'Fine.',s3_nonverbal:'still sceptical but listening'}},
    s4_step_check_personal: { voiceScores:[{dimension:'Pragmatics & content',score:4,comment:'The question invites genuine personal connection rather than a simple yes/no.'},{dimension:'Tone',score:4,comment:'Curious and open — students feel invited rather than tested.'},{dimension:'Clarity',score:4,comment:'Question is direct and accessible.'},{dimension:'Delivery',score:3,comment:'Good pacing. A longer pause after asking would give more students time to respond.'}],overallVoice:4,voiceInsight:'An effective personal connection question that makes the goal feel relevant.',barDeltas:{energyDelta:-1,motivDelta:12,involveDelta:10,stressDelta:-8},classReaction:{s1_name:'Lena',s1_response:"I've actually needed to explain where I've been before. This will help!",s1_nonverbal:'leaning forward',s2_name:'Nick',s2_response:'Maybe for social media?',s2_nonverbal:'quiet but responds',s3_name:'George',s3_response:"I guess it's useful for writing emails.",s3_nonverbal:'softens slightly'}},
    s2: { voiceScores:[{dimension:'Pragmatics & content',score:4,comment:'Instructions are clear and the activity is framed as play rather than performance.'},{dimension:'Tone',score:4,comment:'Energetic and encouraging — the language creates a safe atmosphere.'},{dimension:'Clarity',score:3,comment:'Rules are mostly clear. A modelled example would strengthen understanding.'},{dimension:'Delivery',score:3,comment:'Natural sentence breaks suggest good use of pauses.'}],overallVoice:4,voiceInsight:'Warm and well-framed — students are invited rather than instructed.',barDeltas:{energyDelta:-3,motivDelta:12,involveDelta:14,stressDelta:-10},classReaction:{s1_name:'Nick',s1_response:'',s1_nonverbal:'watches others, stays in his seat',s2_name:'Lena',s2_response:"Okay! Can I start?",s2_nonverbal:'already standing up',s3_name:'Paul',s3_response:"Yes! Come on everyone!",s3_nonverbal:'immediately approaches a classmate'}}
  };

  const systemPrompt = `You are a strict EFL teacher educator assessing a pre-service teacher's spoken classroom response from a text transcript. Reply ONLY with valid JSON.`;
  const userPrompt = `SITUATION: ${situation}\nGOAL: ${goal}\nTRANSCRIPT: "${transcript}"\n\nAssess: 1) Pragmatics & content 2) Tone 3) Clarity 4) Delivery\n\nFor barDeltas: warm/clear/engaging = positive motivDelta and involveDelta, negative stressDelta. Cold/unclear/rushed = negative motivDelta, positive stressDelta. Values -12 to +12.\n\nReply: {"voiceScores":[{"dimension":"Pragmatics & content","score":3,"comment":"..."},{"dimension":"Tone","score":4,"comment":"..."},{"dimension":"Clarity","score":3,"comment":"..."},{"dimension":"Delivery","score":3,"comment":"..."}],"overallVoice":3,"voiceInsight":"one sentence","barDeltas":{"energyDelta":-2,"motivDelta":8,"involveDelta":6,"stressDelta":-5},"classReaction":{"s1_name":"Nick","s1_response":"...","s1_nonverbal":"...","s2_name":"Lena","s2_response":"...","s2_nonverbal":"...","s3_name":"Paul","s3_response":"...","s3_nonverbal":"..."}}`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] })
    });
    const aiData = await aiRes.json();
    if (aiData.error) throw new Error(aiData.error.message);
    const raw = aiData?.content?.[0]?.text || '';
    const jsonMatch = raw.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    res.json(JSON.parse(jsonMatch[0]));
  } catch (e) {
    console.log('Voice AI failed, using demo:', e.message);
    res.json(DEMO_VOICE[scenarioId] || DEMO_VOICE[scenarioId?.split('_step_')[0]] || DEMO_VOICE.s1);
  }
});

// ── SAVE RATING ──
app.post('/api/rating', async (req, res) => {
  const { pid, scenarioId, stars, feedback, ts } = req.body;
  if (!pid) return res.status(400).json({ error: 'Missing pid' });
  try {
    const existingId = await getBinId(pid);
    if (existingId) {
      const binRes = await fetch(`${JSONBIN_URL}/${existingId}/latest`, { headers: { 'X-Master-Key': JSONBIN_KEY } });
      const binData = await binRes.json();
      const record = binData.record || {};
      if (!record.ratings) record.ratings = [];
      record.ratings.push({ scenarioId, stars, feedback, ts });
      await fetch(`${JSONBIN_URL}/${existingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
        body: JSON.stringify(record)
      });
    }
    res.json({ success: true });
  } catch (e) {
    console.error('Rating save error:', e);
    res.status(500).json({ error: 'Rating save failed' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Lesson Breakthrough running on port ${PORT}`);
});
