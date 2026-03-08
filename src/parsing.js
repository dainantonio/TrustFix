window.TrustFixParsing = (() => {
  function fallbackParse(description) {
    const t = description.toLowerCase();
    const trade = /(hvac|ac|cooling|furnace)/.test(t) ? 'hvac' : /(pipe|leak|valve|drain|water)/.test(t) ? 'plumbing' : 'general';
    const severity = /(critical|flood|burst|fire)/.test(t) ? 'critical' : 'moderate';
    const urgency = /(now|asap|urgent|immediately)/.test(t) ? 'emergency' : 'same-day';
    const flags = [];
    if (/(water|leak|flood|wet)/.test(t)) flags.push('potential_water_damage');
    return { trade, severity, urgency, summary: description.slice(0, 120), suggestedActions: ['Inspect site', 'Verify safety', 'Scope repair'], flags };
  }

  async function llmParseIntake(description) {
    const apiKey = window.TRUSTFIX_OPENAI_API_KEY;
    if (!apiKey) throw new Error('No API key');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Return JSON with trade,severity,urgency,summary,suggestedActions,flags' },
          { role: 'user', content: description },
        ],
      }),
    });
    if (!response.ok) throw new Error(`LLM failed ${response.status}`);
    const data = await response.json();
    return JSON.parse(data.choices?.[0]?.message?.content || '{}');
  }

  return { fallbackParse, llmParseIntake };
})();
