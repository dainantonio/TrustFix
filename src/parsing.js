window.TrustFixParsing = (() => {
  function fallbackParse(description) {
    const t = description.toLowerCase();
    const trade = /(hvac|ac|cooling|furnace)/.test(t) ? 'hvac' : /(pipe|leak|valve|drain|water)/.test(t) ? 'plumbing' : 'general';
    const severity = /(critical|flood|burst|fire)/.test(t) ? 'critical' : 'moderate';
    const urgency = /(now|asap|urgent|immediately)/.test(t) ? 'emergency' : 'same-day';
    const flags = [];
    if (/(water|leak|flood|wet)/.test(t)) flags.push('potential_water_damage');
    return {
      trade, severity, urgency,
      summary: description.slice(0, 120),
      suggestedActions: ['Inspect site', 'Verify safety', 'Scope repair'],
      flags,
      _source: 'fallback',
    };
  }

  async function llmParseIntake(description) {
    const SYSTEM_PROMPT = [
      'You are a home-services intake parser.',
      'Given a homeowner problem description, return ONLY a JSON object with these fields:',
      '  trade       — one of: plumbing | hvac | mitigation | general',
      '  severity    — one of: critical | moderate | low',
      '  urgency     — one of: emergency | same-day | scheduled',
      '  summary     — 1-sentence plain-English summary (max 120 chars)',
      '  suggestedActions — array of 3 concise action strings',
      '  flags       — array of strings, e.g. ["potential_water_damage"]',
      'Return valid JSON only. No markdown, no backticks, no extra text.',
    ].join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: description }],
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => response.status);
      throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const raw = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { ...parsed, _source: 'llm' };
  }

  return { fallbackParse, llmParseIntake };
})();
