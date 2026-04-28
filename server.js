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

// ── SAVE PROGRESS ──
app.post('/api/save', async (req, res) => {
  const { pid, data } = req.body;
  if (!pid || !data) return res.status(400).json({ error: 'Missing pid or data' });
  try {
    // Check if bin exists for this pid
    const searchRes = await fetch(`https://api.jsonbin.io/v3/b?name=${encodeURIComponent('lb_' + pid)}`, {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    const searchData = await searchRes.json();
    const existing = Array.isArray(searchData) ? searchData.find(b => b.name === 'lb_' + pid) : null;

    if (existing) {
      // Update existing bin
      const updateRes = await fetch(`${JSONBIN_URL}/${existing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
        body: JSON.stringify(data)
      });
      const updated = await updateRes.json();
      res.json({ success: true, binId: existing.id });
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
      res.json({ success: true, binId: created.metadata?.id });
    }
  } catch (e) {
    console.error('Save error:', e);
    res.status(500).json({ error: 'Save failed' });
  }
});

// ── LOAD PROGRESS ──
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

// ── AI ASSESS ──
app.post('/api/assess', async (req, res) => {
  const { response, situation, goal, criteria, moduleId, stepId } = req.body;
  if (!response || !situation || !criteria) return res.status(400).json({ error: 'Missing fields' });

  const systemPrompt = `You are a strict, professional, rigorous academic assessor and EFL teacher educator. You assess pre-service teachers in classroom simulation exercises. Be CRITICAL, PRECISE, and HONEST. Never give unwarranted praise.

CONTENT MODERATION — check FIRST. Set "inappropriate":true if the response contains ANY of:
- Profanity or offensive language
- Insults, name-calling, or personal attacks on students
- Threats or intimidation
- Dismissive or sarcastic language ("shut up", "I don't care", "because I said so")
- Aggressive, condescending, or demeaning tone
- Text completely unrelated to teaching
- Gibberish or deliberate nonsense
If inappropriate:true, do NOT fill scores.

SCORING STANDARDS:
5 = Exceptional, publishable model response. Very rare.
4 = Clearly good with specific evidence. Justified.
3 = Adequate but with clear, nameable gaps.
2 = Poor. Missing key elements or wrong approach.
1 = Harmful or completely off-target.
Politeness without pedagogical technique = max 3.

Each criterion comment MUST quote or paraphrase the student's actual words and explain the score specifically.`;

  const userPrompt = `CLASSROOM SITUATION: ${situation}
LESSON GOAL: ${goal}
ASSESSMENT CRITERIA (score each 1–5):
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}
STUDENT TEACHER'S RESPONSE: "${response}"

Reply ONLY with valid JSON, no markdown:
{
  "inappropriate": false,
  "inappropriateReason": "",
  "scores": [{"criterion":"...","score":3,"comment":"specific comment quoting their words"}],
  "lessonGoal": {"achieved":false,"percentage":55,"comments":["observation","suggestion"]},
  "barDeltas": {"energyDelta":-5,"motivDelta":8,"involveDelta":6,"stressDelta":-6},
  "highlight": "one specific phrase that worked, or honest statement if nothing did",
  "suggestion": "one concrete improvement with example phrasing",
  "coachNote": "2-3 sentences of honest professional feedback naming strengths AND gaps"
}`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    const aiData = await aiRes.json();
    const raw = aiData?.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (e) {
    console.error('AI assess error:', e);
    res.status(500).json({ error: 'Assessment failed', detail: e.message });
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
