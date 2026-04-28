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
app.post('/api/save', async (req, res) => {
  const { pid, data } = req.body;
  if (!pid || !data) return res.status(400).json({ error: 'Missing pid or data' });
  try {
    const searchRes = await fetch(`https://api.jsonbin.io/v3/b?name=${encodeURIComponent('lb_' + pid)}`, {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    const searchData = await searchRes.json();
    const existing = Array.isArray(searchData) ? searchData.find(b => b.name === 'lb_' + pid) : null;
    if (existing) {
      await fetch(`${JSONBIN_URL}/${existing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
        body: JSON.stringify(data)
      });
      res.json({ success: true, binId: existing.id });
    } else {
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
      res.json({ success: true, binId: created.metadata?.id });
    }
  } catch (e) {
    console.error('Save error:', e);
    res.status(500).json({ error: 'Save failed' });
  }
});

// ═══════════════════════════════════════
// LOAD PROGRESS
// ═══════════════════════════════════════
app.post('/api/load', async (req, res) => {
  const { pid } = req.body;
  if (!pid) return res.status(400).json({ error: 'Missing pid' });
  try {
    const searchRes = await fetch(`https://api.jsonbin.io/v3/b?name=${encodeURIComponent('lb_' + pid)}`, {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    const searchData = await searchRes.json();
    const existing = Array.isArray(searchData) ? searchData.find(b => b.name === 'lb_' + pid) : null;
    if (!existing) return res.json({ found: false });
    const binRes = await fetch(`${JSONBIN_URL}/${existing.id}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    const binData = await binRes.json();
    res.json({ found: true, data: binData.record });
  } catch (e) {
    console.error('Load error:', e);
    res.status(500).json({ error: 'Load failed' });
  }
});

// ═══════════════════════════════════════
// AI ASSESS — with demo fallback
// ═══════════════════════════════════════
app.post('/api/assess', async (req, res) => {
  const { response, situation, goal, criteria, moduleId, stepId } = req.body;
  if (!response || !situation || !criteria) return res.status(400).json({ error: 'Missing fields' });

  const systemPrompt = `You are a strict, professional, rigorous academic assessor and EFL teacher educator. You assess pre-service teachers in classroom simulation exercises. Be CRITICAL, PRECISE, and HONEST. Never give unwarranted praise.

CONTENT MODERATION: Set "inappropriate":true ONLY if the response contains profanity, personal insults directed at students, threats, intimidation, sarcasm used as a weapon against students, overtly dismissive language ("shut up", "I don't care", "because I said so"), aggression, or complete gibberish unrelated to teaching. Do NOT flag: teacher names (including Russian names like Victoria Dmitrievna, Ekaterina Sergeevna, etc.), professional classroom language, firm but respectful correction, honest feedback, or any language that is simply imperfect but professionally appropriate. When in doubt, do NOT flag — score it instead. If inappropriate:true, do NOT fill scores.

SCORING: 5=exceptional/rare, 4=clearly good, 3=adequate with gaps, 2=poor, 1=harmful. Politeness without pedagogical technique = max 3. Each criterion comment MUST quote the student's actual words.`;

  const userPrompt = `SITUATION: ${situation}
GOAL: ${goal}
CRITERIA: ${criteria.map((c, i) => `${i+1}. ${c}`).join(', ')}
STUDENT RESPONSE: "${response}"

Reply ONLY with valid JSON:
{"inappropriate":false,"inappropriateReason":"","scores":[{"criterion":"...","score":3,"comment":"..."}],"lessonGoal":{"achieved":false,"percentage":55,"comments":["observation","suggestion"]},"barDeltas":{"energyDelta":-3,"motivDelta":8,"involveDelta":6,"stressDelta":-5},"highlight":"specific phrase that worked","suggestion":"one concrete improvement","coachNote":"2-3 sentences of honest feedback"}`;

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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Lesson Breakthrough running on port ${PORT}`);
});
