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
// DEMO FEEDBACK BANK
// ═══════════════════════════════════════
const DEMO_BANK = {
 
  // SCENARIO 1 — Self-introduction
  s1_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Register appropriateness', score: 4, comment: 'Your language struck the right balance for teenagers — warm and accessible without slipping into informality. Phrases like "you can call me Katya" signal approachability while maintaining professional credibility.' },
      { criterion: 'Pragmatic appropriateness', score: 4, comment: 'Every element of your introduction served the contact-establishing goal. You named yourself, invited interaction, and looked forward to the term — nothing was wasted or off-purpose.' },
      { criterion: 'Affective climate management', score: 4, comment: 'Your acknowledgement that "first lessons can feel a bit strange" directly addressed the tension in the room. This is a sophisticated de-escalation move — naming discomfort reduces it.' },
      { criterion: 'Linguistic accuracy & clarity', score: 5, comment: 'Grammatically accurate, clear sentence structure, and well-paced. Accessible to a B1–B2 teenage audience without oversimplifying.' },
      { criterion: 'Contact-establishing behaviour', score: 4, comment: 'You presented yourself briefly and confidently, set a positive tone immediately, and addressed the class as communication partners. The forward-looking statement "I hope we discover this together" was particularly effective.' }
    ],
    lessonGoal: { achieved: true, percentage: 82, comments: ['Students perceive you as accessible and friendly — the primary goal is achieved.', 'Consider adding one more explicit invitation to ask questions to push this further.'] },
    barDeltas: { energyDelta: -2, motivDelta: 17, involveDelta: 18, stressDelta: -15 },
    highlight: '"You can call me Katya — whichever feels more comfortable" — this single phrase signals accessibility, gives students a choice, and reduces formality without losing authority.',
    suggestion: 'Add a forward-looking statement tied to something specific: "I hope this term we\'ll find some things in English that genuinely surprise you" creates more expectation than a general "I hope we\'ll work well together."',
    coachNote: 'This is a strong first impression. You established your identity, reduced tension, and invited further interaction — all within a few sentences. The class registered you as approachable. The one gap is that your introduction stays slightly on the surface — a small personal detail or genuine expression of what you love about English would have created a stronger emotional connection.'
  },
 
  s1_mid: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Register appropriateness', score: 3, comment: 'Your language is appropriate but sits slightly on the formal side for a teenage audience. "I will be conducting your English lessons this term" is grammatically correct but creates distance rather than reducing it.' },
      { criterion: 'Pragmatic appropriateness', score: 3, comment: 'You covered the basics — name, role, course — but the introduction reads more like an announcement than a contact-establishing act. The communicative purpose of reducing distance was only partially achieved.' },
      { criterion: 'Affective climate management', score: 3, comment: 'Your tone is polite and professional, which is appropriate, but it does not actively address the tension visible in the room. Students understand who you are but have not yet decided how they feel about you.' },
      { criterion: 'Linguistic accuracy & clarity', score: 4, comment: 'Grammatically accurate and clearly structured. No issues with comprehension for this age group.' },
      { criterion: 'Contact-establishing behaviour', score: 3, comment: 'Contact is established at a basic level — students know your name and your role. But the marked decrease in distance that characterises a high-level contact-establishing act is not yet present. Students would describe this introduction as "fine" rather than "warm".' }
    ],
    lessonGoal: { achieved: false, percentage: 58, comments: ['Students understand who is in front of them — the informational goal is met.', 'The relational goal — being perceived as accessible and friendly — needs more work. Try adding one human detail and one explicit invitation.'] },
    barDeltas: { energyDelta: -3, motivDelta: 8, involveDelta: 6, stressDelta: -5 },
    highlight: 'Your name and role were communicated clearly — students know the basics.',
    suggestion: 'Add one line that signals accessibility: "If something isn\'t clear, or you have a question about anything — please just ask. That\'s exactly what this space is for." This single addition would significantly shift the tone.',
    coachNote: 'This introduction is professionally correct but communicatively cautious. You have given students information about you but not yet given them a reason to feel comfortable with you. The gap between a 3 and a 4 here is not about language — it is about taking a small communicative risk: sharing something genuine, naming the awkwardness, or making an explicit invitation to interact.'
  },
 
  s1_low: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Register appropriateness', score: 2, comment: 'The register is either too formal and distancing ("Silence please, we will now begin") or too minimal to establish any communicative tone at all.' },
      { criterion: 'Pragmatic appropriateness', score: 2, comment: 'The response does not function as a self-introduction in the communicative sense. It states facts or issues instructions but makes no attempt to establish a relationship with the class.' },
      { criterion: 'Affective climate management', score: 1, comment: 'Rather than reducing the initial tension, this response risks increasing it. Starting with rules, commands, or a cold factual statement signals that the classroom is the teacher\'s territory, not a shared space.' },
      { criterion: 'Linguistic accuracy & clarity', score: 3, comment: 'Language is clear and grammatically correct, but accuracy alone cannot compensate for the communicative failure at other levels.' },
      { criterion: 'Contact-establishing behaviour', score: 1, comment: 'There are no signs of friendly first contact. The first impression created here does not contribute to student readiness for further interaction — if anything, it creates resistance.' }
    ],
    lessonGoal: { achieved: false, percentage: 22, comments: ['The informational minimum — students know your name — may be met, but the relational goal is not achieved.', 'Return to the language cards and the model answer before trying again. Focus on the first sentence: what is the very first thing a student needs to hear from you?'] },
    barDeltas: { energyDelta: -4, motivDelta: -8, involveDelta: -5, stressDelta: 10 },
    highlight: 'Nothing in this response stood out as effective for contact-establishing purposes.',
    suggestion: 'Start over with a single warm sentence: "Hello everyone — I\'m really glad to meet you." That alone is more effective than everything in your current response. Build from there.',
    coachNote: 'This response prioritises information transfer or control over human contact. For a first meeting with teenagers, that order needs to be reversed — safety and warmth come before content and rules. Review Card 1 (The First Thirty Seconds) and try again. The goal is not perfection — it is making students feel safe enough to speak.'
  },
 
  // SCENARIO 2 — Introducing the game (step 1)
  s2_intro_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Warmth & tone', score: 4, comment: 'Your opening "Right — let\'s do something a little different" immediately signals a break from routine and builds curiosity. The energy is warm and inclusive.' },
      { criterion: 'Framing as play not performance', score: 5, comment: '"There are no wrong answers" placed before the rules is exactly right — it removes the evaluative frame before students can apply it.' },
      { criterion: 'Register for teenagers', score: 4, comment: 'Natural, energetic, not childish. Teenagers respond well to a teacher who sounds genuinely interested rather than professionally cheerful.' }
    ],
    lessonGoal: { achieved: true, percentage: 88, comments: ['Students are curious and willing — the affective goal is achieved.', 'The transition into the rules will be smooth from this foundation.'] },
    barDeltas: { energyDelta: -2, motivDelta: 14, involveDelta: 16, stressDelta: -12 },
    highlight: '"There are no wrong answers" — placed at the start before explaining the rules, this single phrase sets an entire emotional tone for the activity.',
    suggestion: 'You could strengthen this further by naming the social purpose explicitly: "We\'re going to find out a few things about each other" gives students a reason to engage beyond just following instructions.',
    coachNote: 'Strong opening. You created curiosity, removed performance anxiety, and used appropriate energy for this age group. The class is ready to hear the rules — which is exactly the goal of this step.'
  },
 
  s2_intro_mid: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Warmth & tone', score: 3, comment: 'Your introduction names the activity clearly but reads more like an announcement than an invitation. "We will now do an activity" sets a task frame rather than a play frame.' },
      { criterion: 'Framing as play not performance', score: 2, comment: 'The introduction does not explicitly signal that this is low-stakes. Without a reassurance about mistakes or an emphasis on fun, students may approach it as they would any other task — cautiously.' },
      { criterion: 'Register for teenagers', score: 3, comment: 'Language is appropriate but neutral. Teenagers respond to energy and genuine enthusiasm — this introduction does not yet communicate that.' }
    ],
    lessonGoal: { achieved: false, percentage: 52, comments: ['Students understand an activity is coming but are not yet drawn toward it.', 'Add one phrase that frames this as play: "It\'s easy, it\'s fun, and there are no wrong answers."'] },
    barDeltas: { energyDelta: -3, motivDelta: 5, involveDelta: 4, stressDelta: -2 },
    highlight: 'The activity name and basic purpose were communicated clearly.',
    suggestion: 'Before explaining what students will do, tell them how it will feel: "This is a simple game — easy, fun, no pressure." That one sentence transforms the frame from task to play.',
    coachNote: 'The informational content is there but the affective framing is missing. An ice-breaker introduction has two jobs: explain what will happen and make students want it to happen. Your response does the first but not yet the second.'
  },
 
  // SCENARIO 2 — Explaining rules (step 2)
  s2_rules_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Instruction clarity', score: 5, comment: 'Your instructions are perfectly sequenced: "First walk around, then ask a question, then write the name." One action per sentence. Students can start immediately.' },
      { criterion: 'Modelling included', score: 4, comment: '"I\'ll join in too — so you can ask me as well" is a light but effective model — it shows the activity in action and removes the teacher from the evaluator role.' },
      { criterion: 'Reassurance about mistakes', score: 4, comment: '"Don\'t worry about mistakes — just try" placed before the start signal is well-timed. It lands at the moment of maximum anxiety.' }
    ],
    lessonGoal: { achieved: true, percentage: 90, comments: ['All students can start from these instructions.', 'The comprehension check before releasing students would push this to an exceptional level.'] },
    barDeltas: { energyDelta: -2, motivDelta: 12, involveDelta: 15, stressDelta: -10 },
    highlight: '"You don\'t need long answers — just Yes, I do is fine" — this phrase removes the language barrier that could prevent hesitant students from participating.',
    suggestion: 'Add one ICQ before releasing students: "So what\'s the first thing you do when I say go?" This ensures even the most anxious student knows exactly what to do.',
    coachNote: 'Excellent instruction sequence. Clear, reassuring, well-modelled. The class is genuinely ready to start, not just technically permitted to. The one addition that would make this exceptional is a quick comprehension check — not "does everyone understand?" but a specific question about the first action.'
  },
 
  s2_rules_mid: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Instruction clarity', score: 3, comment: 'The core instructions are present but not fully sequenced. "Walk around and ask questions" tells students what to do in general but doesn\'t specify the first action clearly enough.' },
      { criterion: 'Modelling included', score: 2, comment: 'No demonstration or example question is provided. Students with lower confidence will hesitate because they don\'t know exactly what an acceptable question sounds like.' },
      { criterion: 'Reassurance about mistakes', score: 3, comment: 'A time limit is given which helps, but there is no explicit reassurance about language errors or short answers. Some students will worry their English isn\'t good enough.' }
    ],
    lessonGoal: { achieved: false, percentage: 60, comments: ['Confident students will start. Hesitant students will wait and watch.', 'Adding a modelled example and one reassurance phrase would significantly improve inclusivity.'] },
    barDeltas: { energyDelta: -3, motivDelta: 6, involveDelta: 8, stressDelta: -3 },
    highlight: 'The time limit was well-placed — it gives students a clear boundary and reduces the anxiety of an open-ended task.',
    suggestion: 'Demonstrate one example before releasing students: "So for example — if the card says \'Find someone who has a pet\', you walk up and ask: Do you have a pet? Like that. Simple." This 15-second addition makes the task accessible to everyone.',
    coachNote: 'The instructions work for strong students but leave weaker or more anxious students behind. The gap between adequate and good here is a single modelled example. Without seeing what the activity looks like in practice, hesitant students will hold back — which works against the ice-breaking goal entirely.'
  },
 
  // SCENARIO 2 — Managing time (step)
  s2_time_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Clear time warning', score: 5, comment: '"One more minute — try to finish the last one or two" gives a specific, actionable warning that motivates without cutting students off.' },
      { criterion: 'Preview of what comes next', score: 4, comment: '"Then we\'ll share what you found out" prepares students for the transition and maintains engagement.' },
      { criterion: 'Positive tone maintained', score: 4, comment: 'The warning feels like encouragement rather than a deadline. Energy stays up.' }
    ],
    lessonGoal: { achieved: true, percentage: 85, comments: ['Transition will be smooth.', 'Students feel the activity is closing naturally, not being cut off.'] },
    barDeltas: { energyDelta: -2, motivDelta: 3, involveDelta: 2, stressDelta: -2 },
    highlight: '"Try to finish the last one or two" — specific and motivating. Students know exactly what to aim for in the remaining time.',
    suggestion: 'You could add a light signal: "Thirty seconds after that, we\'ll come back together" makes the next transition even clearer.',
    coachNote: 'Well-timed and well-worded. The warning maintains momentum rather than interrupting it — which is the mark of good time management in communicative activities.'
  },
 
  // SCENARIO 2 — Asking what students learnt (step)
  s2_learnt_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Open curious question', score: 5, comment: '"What did you find out? Did anyone discover something surprising?" — open, curious, non-evaluative. Exactly right.' },
      { criterion: 'Not framed as assessment', score: 4, comment: 'No reference to "correct answers" or "checking". Students are invited to share discoveries, not report results.' },
      { criterion: 'Warm response to first answer', score: 4, comment: 'The follow-up "Who else?" keeps the sharing moving without pressure.' }
    ],
    lessonGoal: { achieved: true, percentage: 88, comments: ['Students share voluntarily.', 'The social learning from the activity is made visible — which reinforces its value.'] },
    barDeltas: { energyDelta: -2, motivDelta: 10, involveDelta: 12, stressDelta: -5 },
    highlight: '"Did anyone discover something surprising?" — this question creates genuine curiosity rather than just asking students to report facts.',
    suggestion: 'When the first student shares, validate the content not just the act of sharing: "Oh interesting — so Lena plays guitar" rather than just "Good, thank you." This models genuine interest.',
    coachNote: 'You transformed what could have been an answer-check into a genuine sharing moment. That is the difference between running an activity and using it for its communicative purpose.'
  },
 
  // SCENARIO 2 — Finishing the game (step)
  s2_close_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Names what was achieved', score: 5, comment: '"We just had our first real conversation as a group" — naming the achievement explicitly makes the learning visible and validates the students\' effort.' },
      { criterion: 'Validates class effort', score: 4, comment: '"You\'ve already spoken English today" — specific, true, and encouraging without being falsely positive.' },
      { criterion: 'Forward-looking connection', score: 4, comment: '"We\'re going to build on this all term" creates a narrative arc that connects this activity to everything that follows.' }
    ],
    lessonGoal: { achieved: true, percentage: 92, comments: ['Students leave this activity with a positive feeling about the class.', 'The forward-looking connection sets up the rest of the course effectively.'] },
    barDeltas: { energyDelta: -2, motivDelta: 15, involveDelta: 8, stressDelta: -8 },
    highlight: '"We just had our first real conversation as a group" — this sentence does everything a conclusion needs to do: names the achievement, validates the students, and gives the activity meaning.',
    suggestion: 'This is strong. The only addition would be a very brief personal note: "I\'m genuinely glad to have met you all" — but this is a refinement, not a correction.',
    coachNote: 'Excellent conclusion. You named what happened, validated the effort, and connected it forward. Students leave this activity knowing it mattered — which is precisely what makes the ice-breaker promise real.'
  },
 
  // OPT steps
  s2_passive_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Quiet individual approach', score: 5, comment: 'You moved toward the student without drawing attention — the response is addressed to them specifically, not announced to the class.' },
      { criterion: 'Face-saving offer', score: 4, comment: '"Shall we start together?" removes the need for the student to initiate alone, which is exactly the barrier that passive students face.' },
      { criterion: 'No public naming of passivity', score: 5, comment: 'At no point is the student\'s non-participation named or highlighted. Their dignity is fully preserved.' }
    ],
    lessonGoal: { achieved: true, percentage: 85, comments: ['The student has a low-pressure way into the activity.', 'Trust is built rather than damaged.'] },
    barDeltas: { energyDelta: -2, motivDelta: 8, involveDelta: 10, stressDelta: -8 },
    highlight: '"Shall we start together?" — this is the ideal passive student invitation. It offers support without naming the problem.',
    suggestion: 'You might add a very specific first step: "Let\'s find someone together — I\'ll ask the first question." The more concrete the first step, the easier it is for an anxious student to take it.',
    coachNote: 'Handled with real sensitivity. You protected the student\'s dignity while making it easy to participate. This is what affective-communicative competence looks like in practice.'
  },
 
  s2_excited_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Calm tone', score: 4, comment: 'Your response stays calm and warm — not reactive to the energy level. This models the regulation you want to see.' },
      { criterion: 'Names behaviour not person', score: 5, comment: '"Let\'s keep moving but in walking pace" addresses what is happening without naming who is doing it.' },
      { criterion: 'Activity continues', score: 4, comment: 'You redirect without stopping the activity — momentum is preserved.' }
    ],
    lessonGoal: { achieved: true, percentage: 80, comments: ['Energy is redirected productively.', 'No student is embarrassed and the activity continues.'] },
    barDeltas: { energyDelta: -2, motivDelta: 2, involveDelta: 3, stressDelta: -5 },
    highlight: '"Great energy — let\'s keep it in walking pace" — acknowledges the enthusiasm before redirecting it. This is far more effective than a negative instruction.',
    suggestion: 'Add a challenge to channel the energy: "Try to get to five names before the minute is up." Giving overexcited students a specific goal redirects their energy productively.',
    coachNote: 'Well handled. You kept the atmosphere positive while establishing a boundary. The key move was acknowledging the energy before redirecting it — which avoids the resistance that a straight instruction would create.'
  },
 
  s2_english_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Positive nudge', score: 4, comment: '"Let\'s try in English now" is an invitation, not a rule. The framing matters — students respond to being invited rather than instructed.' },
      { criterion: 'Models a phrase', score: 5, comment: 'Providing the exact phrase students need ("Do you have a pet? Try it.") removes the language barrier completely. Students know exactly what to say.' },
      { criterion: 'No penalty framing', score: 5, comment: 'No reference to Russian being wrong. The transition to English is framed as natural progression, not correction.' }
    ],
    lessonGoal: { achieved: true, percentage: 83, comments: ['Students switch to English without losing engagement.', 'The activity continues productively.'] },
    barDeltas: { energyDelta: -2, motivDelta: 5, involveDelta: 6, stressDelta: -4 },
    highlight: 'Modelling the exact phrase before asking students to use English — this removes the language barrier that was preventing the switch.',
    suggestion: 'After a few exchanges, acknowledge the switch positively: "I can hear some English now — well done." This reinforces the behaviour without making it feel like surveillance.',
    coachNote: 'You handled the language-switching moment exactly right. The model phrase is the critical element — telling students to use English without showing them what that looks like creates anxiety, not production.'
  },
 
  s2_rules_check_high: {
    inappropriate: false, inappropriateReason: '',
    scores: [
      { criterion: 'Redirects to purpose not violation', score: 5, comment: '"The point is the conversation, not the card" — you named the purpose rather than the rule-breaking. This is pedagogically sophisticated.' },
      { criterion: 'No singling out', score: 5, comment: 'The reminder is addressed to everyone, so no individual feels accused.' },
      { criterion: 'Light tone', score: 4, comment: '"That\'s where the fun is" keeps the atmosphere positive while restating the rule.' }
    ],
    lessonGoal: { achieved: true, percentage: 87, comments: ['Students refocus on the communicative purpose.', 'No trust is damaged.'] },
    barDeltas: { energyDelta: -2, motivDelta: 3, involveDelta: 5, stressDelta: -3 },
    highlight: '"The point isn\'t to fill the card, it\'s to have a conversation" — reframing the task in terms of purpose rather than rules is exactly the right approach.',
    suggestion: 'This is well done. No significant changes needed.',
    coachNote: 'You corrected the behaviour without creating a disciplinary moment. That is the mark of a teacher who understands that the relationship with students is always more important than any single rule.'
  }
};
 
function getDemoFeedback(criteria, stepId, situation) {
  // Determine which demo feedback to use based on context
  let base;
  const sit = (situation || '').toLowerCase();
  const step = (stepId || '').toLowerCase();
 
  if (sit.includes('introduc') && sit.includes('yourself')) {
    // Scenario 1 — vary by random chance to show different score levels
    const r = Math.random();
    base = r > 0.6 ? DEMO_BANK.s1_high : r > 0.25 ? DEMO_BANK.s1_mid : DEMO_BANK.s1_low;
  } else if (step === 'intro' || sit.includes('introduce the activity') || sit.includes('introducing')) {
    base = Math.random() > 0.4 ? DEMO_BANK.s2_intro_high : DEMO_BANK.s2_intro_mid;
  } else if (step === 'rules' || sit.includes('explaining') || sit.includes('rules')) {
    base = Math.random() > 0.4 ? DEMO_BANK.s2_rules_high : DEMO_BANK.s2_rules_mid;
  } else if (step === 'time' || sit.includes('minute remains') || sit.includes('time')) {
    base = DEMO_BANK.s2_time_high;
  } else if (step === 'learnt' || sit.includes('what they found') || sit.includes('share')) {
    base = DEMO_BANK.s2_learnt_high;
  } else if (step === 'close' || sit.includes('conclusion') || sit.includes('close')) {
    base = DEMO_BANK.s2_close_high;
  } else if (step === 'passive' || sit.includes('not moving') || sit.includes('passive')) {
    base = DEMO_BANK.s2_passive_high;
  } else if (step === 'excited' || sit.includes('running') || sit.includes('overexcited')) {
    base = DEMO_BANK.s2_excited_high;
  } else if (step === 'english' || sit.includes('russian') || sit.includes('english use')) {
    base = DEMO_BANK.s2_english_high;
  } else if (step === 'rules_check' || sit.includes('copying') || sit.includes('rule-following')) {
    base = DEMO_BANK.s2_rules_check_high;
  } else {
    // Generic fallback
    base = DEMO_BANK.s2_intro_mid;
  }
 
  // Map scores to actual criteria passed in
  const result = { ...base };
  if (criteria && criteria.length > 0 && base.scores) {
    result.scores = criteria.map((crit, i) => {
      const existing = base.scores[i] || base.scores[base.scores.length - 1];
      return { criterion: crit, score: existing.score, comment: existing.comment };
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
 
CONTENT MODERATION: Set "inappropriate":true if the response contains profanity, insults, threats, dismissive language, aggression, or gibberish. If inappropriate:true, do NOT fill scores.
 
SCORING: 5=exceptional/rare, 4=clearly good, 3=adequate with gaps, 2=poor, 1=harmful. Politeness without pedagogical technique = max 3. Each criterion comment MUST quote the student's actual words.`;
 
  const userPrompt = `SITUATION: ${situation}
GOAL: ${goal}
CRITERIA: ${criteria.map((c, i) => `${i+1}. ${c}`).join(', ')}
STUDENT RESPONSE: "${response}"
 
Reply ONLY with valid JSON:
{"inappropriate":false,"inappropriateReason":"","scores":[{"criterion":"...","score":3,"comment":"..."}],"lessonGoal":{"achieved":false,"percentage":55,"comments":["observation","suggestion"]},"barDeltas":{"energyDelta":-3,"motivDelta":8,"involveDelta":6,"stressDelta":-5},"highlight":"specific phrase that worked","suggestion":"one concrete improvement","coachNote":"2-3 sentences of honest feedback"}`;
 
  // Try real AI first
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
    // Fall back to demo feedback
    console.log('AI failed, using demo feedback. Reason:', e.message);
    const demo = getDemoFeedback(criteria, stepId, situation);
    res.json(demo);
  }
});
 
// ── SERVE APP ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Lesson Breakthrough running on port ${PORT}`);
});
