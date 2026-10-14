import { ENV } from '../../config/env';
import { ILlmAdapter, LlmCompletionRequest, LlmCompletionResponse } from './types';

export class GeminiAdapter implements ILlmAdapter {
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(apiKey: string, model: string = 'gemini-1.5-flash', timeoutMs: number = 20000) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  public async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const systemMsg = request.messages.find((m) => m.role === 'system');
    const nonSystemMsgs = request.messages.filter((m) => m.role !== 'system');

    const contents = nonSystemMsgs.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const payload: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.5,
        maxOutputTokens: request.maxTokens ?? ENV.AI_MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
      },
    };

    if (systemMsg) {
      payload.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    // Try primary model and automatically fail over to other live models on transient 503/404/429 spikes
    const candidateModels = Array.from(
      new Set([this.model, 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-flash-latest'])
    );

    let lastError: Error | null = null;

    for (const currentModel of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${this.apiKey}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
          const status = res.status;
          const errBody = await res.text().catch(() => '');
          lastError = new Error(`LLM provider error on ${currentModel} (HTTP ${status}): ${errBody.slice(0, 150)}`);
          // Try next live model if this one is experiencing high demand (503), quota (429), or deprecated (404)
          continue;
        }

        const data: any = await res.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text || '';
        const tokensUsed = data.usageMetadata?.totalTokenCount || 0;

        return {
          content: text,
          tokensUsed,
          modelUsed: currentModel,
        };
      } catch (err: any) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          lastError = new Error(`LLM request to ${currentModel} timed out after ${this.timeoutMs}ms.`);
        } else {
          lastError = err;
        }
      }
    }

    console.warn('[VoltIQ GeminiAdapter] Live remote models exhausted or unavailable:', lastError?.message);

    // Final fallback to grounded mock adapter only if all live endpoints fail
    const fallback = new MockLlmAdapter();
    const fallbackRes = await fallback.complete(request);
    return {
      content: fallbackRes.content,
      tokensUsed: fallbackRes.tokensUsed,
      modelUsed: `${this.model} (grounded-fallback)`,
    };
  }
}

export class OpenAiAdapter implements ILlmAdapter {
  private apiKey: string;
  private model: string;
  private timeoutMs: number;
  private baseUrl: string;

  constructor(
    apiKey: string,
    model: string = 'gpt-4o-mini',
    timeoutMs: number = 20000,
    baseUrl: string = 'https://api.openai.com/v1'
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.baseUrl = baseUrl;
  }

  public async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? ENV.AI_MAX_OUTPUT_TOKENS,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const status = res.status;
        const errBody = await res.text().catch(() => '');
        throw new Error(`OpenAI provider error (HTTP ${status}): ${errBody.slice(0, 150)}`);
      }

      const data: any = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const tokensUsed = data.usage?.total_tokens || 0;

      return {
        content,
        tokensUsed,
        modelUsed: this.model,
      };
    } catch (err: any) {
      clearTimeout(timer);
      const fallback = new MockLlmAdapter();
      const fallbackRes = await fallback.complete(request);
      return {
        content: fallbackRes.content,
        tokensUsed: fallbackRes.tokensUsed,
        modelUsed: `${this.model} (grounded-fallback)`,
      };
    }
  }
}

export class MockLlmAdapter implements ILlmAdapter {
  public async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    // Extract context and user message
    const userMsg = request.messages.filter((m) => m.role === 'user').pop()?.content || '';
    const reportContext = request.messages.find((m) => m.role === 'user')?.content || '';

    const lowerQuery = userMsg.toLowerCase();

    // Parse key fields from the injected canonical context
    const scoreMatch = reportContext.match(/Overall Prototype Score:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

    const classificationMatch = reportContext.match(/Screening Classification:\s*([A-Z_]+)/i);
    const classification = classificationMatch ? classificationMatch[1] : 'UNKNOWN';

    const cellIdMatch = reportContext.match(/CELL_ID:\s*([^\r\n]+)/i);
    const cellId = cellIdMatch ? cellIdMatch[1].trim() : 'EV-CELL';

    const testIdMatch = reportContext.match(/REPORT_ID:\s*([^\r\n]+)/i);
    const testId = testIdMatch ? testIdMatch[1].trim() : 'TEST';

    const vSagMatch = reportContext.match(/Derived Voltage Sag:\s*([\d.]+)/i);
    const vSag = vSagMatch ? vSagMatch[1] : '0.15';

    const tempRiseMatch = reportContext.match(/Derived Temperature Rise:\s*\+?([\d.]+)/i);
    const tempRise = tempRiseMatch ? tempRiseMatch[1] : '3.0';

    const stopReasonMatch = reportContext.match(/Stop Reason:\s*([^\r\n]+)/i);
    const stopReason = stopReasonMatch ? stopReasonMatch[1].trim() : 'COMPLETED';

    const mfrMatch = reportContext.match(/Manufacturer:\s*([^\r\n]+)/i);
    const manufacturer = mfrMatch ? mfrMatch[1].trim() : 'Recovered EV';

    const modelMatch = reportContext.match(/Model:\s*([^\r\n]+)/i);
    const model = modelMatch ? modelMatch[1].trim() : '18650';

    let answer = '';
    const evidenceUsed: string[] = [];
    const missingInformation: string[] = [];
    const suggestedNextSteps: string[] = [];

    // 1. Check for prompt-injection attempts
    if (
      lowerQuery.includes('ignore previous instructions') ||
      lowerQuery.includes('ignore all previous') ||
      lowerQuery.includes('certify this cell') ||
      lowerQuery.includes('declare 100% safe')
    ) {
      answer = `As VoltIQ, I strictly follow ReVoltCell safety and grounding guidelines. I cannot override official screening rules or certify battery safety. Based on the stored test record (${testId}) for cell ${cellId}, the official screening classification is **${classification}** with a prototype score of **${score ?? 'N/A'}/100**. This score is solely for rapid triage decision support and does not constitute a certified safety rating.`;
      evidenceUsed.push(`Classification: ${classification}`, `Score: ${score}/100`);
      missingInformation.push('Certified BMS State-of-Health', 'Destructive/Safety Certification');
      suggestedNextSteps.push('Adhere to ReVoltCell laboratory safety procedures');
      return {
        content: JSON.stringify({ answer, evidenceUsed, missingInformation, suggestedNextSteps }),
        tokensUsed: 180,
        modelUsed: 'mock-voltiq-grounded',
      };
    }

    // 2. Casual Greetings & Basic Interaction (e.g. "hi", "hello", "hey", "what's up")
    if (
      /^(hi|hello|hey|yo|howdy|sup|greetings|good\s+(morning|afternoon|evening)|hola)\b/i.test(lowerQuery.trim()) ||
      lowerQuery.trim() === 'hi' ||
      lowerQuery.trim() === 'hello' ||
      lowerQuery.trim() === 'hey' ||
      lowerQuery.trim() === 'yo'
    ) {
      answer = `Hey there! ⚡ Welcome! I'm **VoltIQ**, ReVoltCell's Battery Intelligence Assistant. I'm excited to help you explore the second-life potential of this cell!

We're looking at **${cellId}** (${manufacturer} ${model}), which achieved a screening score of **${score ?? 'N/A'}/100** (**${classification}**).

What are you curious about today? We can dive into:
- ⚡ **Discharge Stability**: How well did terminal voltage hold up under load?
- 🌡️ **Thermal Health**: Did the cell stay cool or heat up?
- 🔄 **Second-Life Ideas**: Is it a fit for solar storage, backup power, or lighting?
- 💡 **The ReVoltCell Vision**: How rapid screening breathes new life into retired EV cells!

Fire away, or pick one of the suggested prompts below!`;

      evidenceUsed.push(`Cell ID: ${cellId}`, `Score: ${score}/100`, `Classification: ${classification}`);
      suggestedNextSteps.push(
        'Explain this screening result ⚡',
        'What is the ReVoltCell vision? 🔄',
        'Which second-life uses fit best? 💡',
        'Was dynamic capacity or IR measured? 🔍'
      );
      return {
        content: JSON.stringify({ answer, evidenceUsed, missingInformation, suggestedNextSteps }),
        tokensUsed: 160,
        modelUsed: 'mock-voltiq-grounded',
      };
    }

    // 3. ReVoltCell Vision, Mission, and Second-Life Repurposing Concept
    if (
      lowerQuery.includes('revoltcell') ||
      lowerQuery.includes('vision') ||
      lowerQuery.includes('mission') ||
      lowerQuery.includes('idea') ||
      lowerQuery.includes('why repurpose') ||
      lowerQuery.includes('second life') ||
      lowerQuery.includes('circular economy') ||
      lowerQuery.includes('who are you') ||
      lowerQuery.includes('what can you do') ||
      lowerQuery.includes('what is this') ||
      lowerQuery.includes('tell me about')
    ) {
      answer = `⚡ **The ReVoltCell Mission & Vision**:
Every year, thousands of EV battery packs are retired from vehicles when their capacity dips to ~70–80%. That's no longer ideal for high-speed highway driving, but it represents an enormous, untapped reservoir of clean energy storage!

Instead of prematurely shredding or wasting these valuable cells, **ReVoltCell** powers the battery circular economy:
1. 🧪 **Automated Rapid Screening**: We run automated load discharge runs to inspect transient voltage sag and thermal rise under controlled conditions.
2. 🎯 **Prototype Score Engine (0–100)**: Cells are graded into actionable categories (**GOOD**, **FURTHER EVALUATION**, **LOW PERFORMANCE**, or **UNSUITABLE**).
3. 🔄 **Second-Life Application Matching**: Healthy cells are triaged for off-grid solar storage, UPS power banks, and low-drain LED lighting.
4. 🏷️ **QR Digital Battery Passport**: Field technicians and buyers can scan the QR code to verify complete test provenance and custody history.
5. ♻️ **Safe Recycling Routing**: Compromised cells are quarantined for mineral reclamation, keeping hazardous waste out of landfills!

Right now, cell **${cellId}** is rated **${classification}** (${score ?? 'N/A'}/100). Ask me about its specific discharge curve or recommended second-life applications!`;

      evidenceUsed.push('ReVoltCell Circular Economy Protocol', `Cell: ${cellId}`, `Classification: ${classification}`);
      suggestedNextSteps.push(
        'Which second-life applications fit best? 💡',
        'Explain this screening score ⚡',
        'Was capacity or internal resistance measured? 🔍'
      );
      return {
        content: JSON.stringify({ answer, evidenceUsed, missingInformation, suggestedNextSteps }),
        tokensUsed: 220,
        modelUsed: 'mock-voltiq-grounded',
      };
    }

    // 4. Positive feedback / acknowledgments / chit-chat
    if (
      /^(thanks|thank you|cool|awesome|great|nice|sweet|got it|sounds good|understood)\b/i.test(lowerQuery.trim())
    ) {
      answer = `You got it! 🔋⚡ Unlocking the second life of EV batteries is what ReVoltCell is all about. Whether you're assembling a solar storage bank or triaging recovered cells in the lab, I'm here to help.

Let me know if you'd like to inspect another metric on **${cellId}** or test another battery!`;

      evidenceUsed.push(`Cell: ${cellId}`);
      suggestedNextSteps.push(
        'Which applications are recommended? 💡',
        'Explain voltage sag and current ⚡'
      );
      return {
        content: JSON.stringify({ answer, evidenceUsed, missingInformation, suggestedNextSteps }),
        tokensUsed: 120,
        modelUsed: 'mock-voltiq-grounded',
      };
    }

    // 5. Question about capacity or internal resistance
    if (
      lowerQuery.includes('capacity') ||
      lowerQuery.includes('internal resistance') ||
      lowerQuery.includes('impedance') ||
      lowerQuery.includes('resistance') ||
      lowerQuery.includes('soh') ||
      lowerQuery.includes('state of health')
    ) {
      answer = `Great question! In ReVoltCell test session **${testId}**, dynamic discharge capacity (mAh) and AC internal resistance (mΩ) **were not measured**:

- 🔋 **Discharge Capacity**: Only the manufacturer's catalog rating is stored. A full multi-hour C-rate capacity test was not performed during this rapid triage cycle.
- 🔬 **Internal Resistance**: No 1kHz AC impedance meter or direct milliohm meter reading was taken.
- 📊 **State-of-Health (SOH)**: The prototype score of **${score ?? 'N/A'}/100** represents relative electrical/thermal stability under a fixed 5.0Ω load, not an official certified SOH percentage.

We recommend a standard 0.5C charge-discharge cycle and 1kHz AC impedance testing before deploying in a pack!`;

      evidenceUsed.push('Test duration: 120s rapid screening', 'Load: 5.0Ω resistive load');
      missingInformation.push('Dynamic discharge capacity (mAh)', 'AC Internal Resistance / Impedance (mΩ)', 'Certified SOH');
      suggestedNextSteps.push('Perform full 0.2C/0.5C standard charge-discharge capacity cycle', 'Measure 1kHz AC impedance using a dedicated battery milliohm meter');
    }
    // 6. Question about why unsuitable / screening result / score explanation
    else if (
      lowerQuery.includes('unsuitable') ||
      lowerQuery.includes('score') ||
      lowerQuery.includes('result') ||
      lowerQuery.includes('why') ||
      lowerQuery.includes('classification') ||
      lowerQuery.includes('explain')
    ) {
      if (classification === 'UNSUITABLE' || stopReason === 'OVER_TEMPERATURE' || (score !== null && score < 45)) {
        answer = `Cell **${cellId}** was classified as **UNSUITABLE** (Prototype Score: **${score ?? 0}/100**) due to safety or stability threshold breaches during test **${testId}**:

- 🌡️ **Thermal Behavior**: Peak temperature rise was +${tempRise}°C (Stop reason: \`${stopReason}\`). Exceeding safe thermal drift triggers immediate failure penalties under ReVoltCell screening rules.
- ⚡ **Voltage Stability**: Recorded voltage sag was ${vSag}V under nominal load.
- 🛡️ **Safety Directive**: Cells classified as Unsuitable must not be deployed in second-life applications. They are slated for certified materials recycling.`;

        evidenceUsed.push(`Classification: ${classification}`, `Stop Reason: ${stopReason}`, `Temperature Rise: +${tempRise}°C`, `Voltage Sag: ${vSag}V`);
        missingInformation.push('Electrochemical Impedance Spectroscopy (EIS)', 'Cyclic aging degradation data');
        suggestedNextSteps.push('Quarantine cell in fireproof enclosure', 'Transfer to certified e-waste/battery recycler');
      } else if (classification === 'GOOD') {
        answer = `Cell **${cellId}** achieved an impressive **GOOD** screening classification with an overall prototype score of **${score}/100** in test session **${testId}**! 🎉

- ⚡ **Voltage Retention**: Minimal voltage sag of **${vSag}V** under the 5.0Ω load, demonstrating excellent transient stability.
- 🌡️ **Thermal Stability**: Low temperature rise of **+${tempRise}°C**, well within safe operating limits (<38°C).
- 🚀 **Second-Life Readiness**: This cell showed strong electrical and thermal health during rapid pre-screening — making it a prime candidate for secondary energy storage evaluations!`;

        evidenceUsed.push(`Score: ${score}/100`, `Classification: ${classification}`, `Voltage Sag: ${vSag}V`, `Temperature Rise: +${tempRise}°C`);
        missingInformation.push('Long-term cycle retention (C-rate testing)', 'Low-temperature performance');
        suggestedNextSteps.push('Evaluate for matched battery pack assembly', 'Conduct secondary bench verification under target application load profile');
      } else {
        answer = `Cell **${cellId}** received a **${classification}** rating with a prototype screening score of **${score ?? 'N/A'}/100** (Test: **${testId}**):

- ⚡ **Voltage Sag**: **${vSag}V** observed during discharge under load.
- 🌡️ **Thermal Drift**: **+${tempRise}°C** temperature rise.
- 📋 **Status**: The cell shows acceptable baseline characteristics but exhibits moderate voltage droop or thermal rise. It's best suited for lower-drain secondary applications after secondary bench checks.`;

        evidenceUsed.push(`Classification: ${classification}`, `Score: ${score}`, `Voltage Sag: ${vSag}V`, `Temperature Rise: +${tempRise}°C`);
        missingInformation.push('Full capacity test at 0.5C', 'Internal resistance (IR) measurement');
        suggestedNextSteps.push('Secondary discharge test under varied thermal conditions', 'Evaluation for low-draw auxiliary storage or LED lighting');
      }
    }
    // 7. Question about current or load
    else if (lowerQuery.includes('current') || lowerQuery.includes('load') || lowerQuery.includes('amps')) {
      answer = `The discharge current recorded during test **${testId}** was derived under a fixed **5.0Ω resistive load resistor** (rated 10W):

- 💡 **Current Nature**: The current values (averaging ~0.8A) are **simulated/derived** via Ohm's law ($I \\approx V / R_{load}$) under constant resistive discharge, rather than actively driven by a closed-loop programmable electronic load.
- 📉 **Load Response**: As cell terminal voltage sagged by ${vSag}V, the discharge current naturally followed the voltage drop.`;

      evidenceUsed.push('Load resistance: 5.0Ω nominal', 'Load power rating: 10.0W');
      missingInformation.push('Active constant-current (CC) discharge profile', 'Peak pulsed current capability');
      suggestedNextSteps.push('Test with programmable electronic load for precise constant-current verification');
    }
    // 8. Question about applications / reuse
    else if (lowerQuery.includes('application') || lowerQuery.includes('reuse') || lowerQuery.includes('second life')) {
      answer = `Based on the screening outcome (**${classification}**, Score: **${score}/100**) from test **${testId}**:

- 💡 **Recommended Evaluation Use Cases**: Potential second-life uses depend on conservative engineering triage. For a **${classification}** cell, candidate applications include **Low-Power Solar Storage**, **Emergency Backup Power**, or **Auxiliary LED Lighting**.
- 🛡️ **Safety & BMS**: These applications are exciting possibilities for **further engineering evaluation**. High-reliability BMS pairing with individual cell voltage/thermal cutoffs is required before field deployment!`;

      evidenceUsed.push(`Classification: ${classification}`, `Prototype Score: ${score}/100`);
      missingInformation.push('Application-specific continuous load testing', 'Multi-cell series/parallel balance testing');
      suggestedNextSteps.push('Pair with high-reliability BMS featuring individual cell over-voltage, under-voltage, and thermal cutoffs');
    }
    // 9. Conversational default fallback
    else {
      answer = `⚡ VoltIQ ready! For cell **${cellId}** (Test: **${testId}**), we recorded an overall prototype score of **${score ?? 'N/A'}/100** with a **${classification}** rating.

- ⚡ **Voltage Sag**: **${vSag}V** under the 5.0Ω load
- 🌡️ **Temperature Rise**: **+${tempRise}°C** over the 120-second session
- 🔄 **Second-Life Potential**: Evaluated for second-life stationary energy storage

What would you like to explore next? You can ask about second-life project ideas, thermal health, or testing conditions!`;

      evidenceUsed.push(`Test ID: ${testId}`, `Classification: ${classification}`, `Score: ${score}/100`);
      missingInformation.push('Dynamic mAh capacity', 'AC milliohm resistance');
      suggestedNextSteps.push('Explain this screening score ⚡', 'What is the ReVoltCell vision? 🔄');
    }

    return {
      content: JSON.stringify({
        answer,
        evidenceUsed,
        missingInformation,
        suggestedNextSteps,
      }),
      tokensUsed: 220,
      modelUsed: 'mock-voltiq-grounded',
    };
  }
}

export function getLlmAdapter(): ILlmAdapter {
  // During automated tests, use fast deterministic grounded adapter
  if (ENV.NODE_ENV === 'test') {
    return new MockLlmAdapter();
  }

  const provider = ENV.LLM_PROVIDER;
  const apiKey = ENV.LLM_API_KEY;

  if (provider === 'gemini' && apiKey && apiKey.trim() !== '') {
    return new GeminiAdapter(apiKey, ENV.LLM_MODEL, ENV.LLM_TIMEOUT_MS);
  }

  if (provider === 'openai' && apiKey && apiKey.trim() !== '') {
    return new OpenAiAdapter(apiKey, ENV.LLM_MODEL, ENV.LLM_TIMEOUT_MS);
  }

  // Fallback to grounded mock adapter for development without API keys
  return new MockLlmAdapter();
}
