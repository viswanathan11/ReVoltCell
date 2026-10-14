import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { getLlmAdapter } from './llmAdapter';
import { ReportContextBuilder } from './reportContextBuilder';
import { VOLTIQ_SYSTEM_PROMPT, VOLTIQ_RESPONSE_FORMAT_INSTRUCTIONS } from './systemPrompt';
import { ChatMode, ChatRequestBody, ChatResponseBody, LlmMessage } from './types';

export class AiService {
  /**
   * Resolves a test record or a cell's latest test record from the database.
   */
  public static async resolveReport(identifier: string) {
    // 1. Try to find by testId
    let test = await prisma.test.findUnique({
      where: { testId: identifier },
      include: {
        cell: true,
        analysis: true,
        applications: true,
        measurements: {
          orderBy: { elapsedSeconds: 'asc' },
          take: 50,
        },
      },
    });

    if (test) {
      return { test, cell: test.cell };
    }

    // 2. Fallback: try to find by cellId and resolve latest test
    const cell = await prisma.cell.findUnique({
      where: { cellId: identifier },
      include: {
        tests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            analysis: true,
            applications: true,
            measurements: {
              orderBy: { elapsedSeconds: 'asc' },
              take: 50,
            },
          },
        },
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        applications: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cell) {
      if (identifier === 'OVERVIEW' || identifier === 'SYSTEM' || identifier.toLowerCase().includes('overview')) {
        const cellCount = await prisma.cell.count();
        const testCount = await prisma.test.count();
        return {
          test: {
            testId: 'SYSTEM-OVERVIEW',
            cellId: 'OPERATIONS',
            status: 'READY',
            loadResistanceOhms: 5.0,
            loadPowerRatingWatts: 10.0,
            initialVoltage: 3.7,
            finalVoltage: null,
            minimumVoltage: null,
            averageCurrent: null,
            maximumCurrent: null,
            initialTemperature: 25.0,
            maximumTemperature: null,
            temperatureRise: null,
            testDurationSeconds: 0,
            stopReason: `Inventory Status: ${cellCount} cells, ${testCount} tests recorded. Bench ready for hardware testing.`,
            measurements: [],
            analysis: null,
            applications: [],
          },
          cell: {
            cellId: 'OPERATIONS',
            manufacturer: 'ReVoltCell Platform',
            model: 'Hardware Screening Jig',
            chemistry: 'Li-ion (18650/21700)',
            cellType: '18650',
            nominalVoltage: 3.7,
            ratedCapacityMah: 2500,
            source: 'Laboratory Ingestion Bench',
            lifecycleEvents: [],
          } as any,
        };
      }
      return null;
    }

    const latestTest = cell.tests[0] || null;
    if (!latestTest) {
      // Cell exists but has no tests yet
      return {
        test: {
          testId: `UNTESTED-${cell.cellId}`,
          cellId: cell.cellId,
          status: 'UNTESTED',
          loadResistanceOhms: 5.0,
          loadPowerRatingWatts: 10.0,
          initialVoltage: cell.nominalVoltage,
          finalVoltage: null,
          minimumVoltage: null,
          averageCurrent: null,
          maximumCurrent: null,
          initialTemperature: null,
          maximumTemperature: null,
          temperatureRise: null,
          testDurationSeconds: 0,
          stopReason: null,
          measurements: [],
          analysis: cell.analyses[0] || null,
          applications: cell.applications || [],
        },
        cell,
      };
    }

    return { test: latestTest, cell };
  }

  /**
   * Answers a query about a specific canonical test report.
   */
  public static async chatAboutReport(params: {
    identifier: string;
    body: ChatRequestBody;
    clientIp?: string;
  }): Promise<ChatResponseBody> {
    const { identifier, body } = params;
    const mode: ChatMode = body.mode || 'dashboard';

    // 1. Load canonical report from database
    const resolved = await this.resolveReport(identifier);
    if (!resolved) {
      throw new AppError(
        `Battery test report '${identifier}' was not found.`,
        404,
        'REPORT_NOT_FOUND'
      );
    }

    const { test, cell } = resolved;
    const analysis = test.analysis || null;
    const applications = test.applications || [];

    // 2. Build canonical, structured report context
    const context = ReportContextBuilder.buildContext({
      test,
      cell,
      analysis,
      applications,
      mode,
    });

    const formattedReportContext = ReportContextBuilder.formatPromptContext(context);

    // 3. Assemble LLM prompt messages
    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: `${VOLTIQ_SYSTEM_PROMPT}\n\n${VOLTIQ_RESPONSE_FORMAT_INSTRUCTIONS}`,
      },
      {
        role: 'user',
        content: `Here is the canonical ReVoltCell test report data to evaluate:\n\n${formattedReportContext}\n\nPlease interpret this report with high energy, engaging dialogue, and ready insights.`,
      },
      {
        role: 'assistant',
        content: JSON.stringify({
          answer: `Hey there! ⚡ I've loaded report **${test.testId}** for cell **${cell.cellId}** (${cell.manufacturer} ${cell.model}). Ready to unlock this battery's second-life potential with you! What would you like to explore first?`,
          evidenceUsed: [`Report: ${test.testId}`, `Cell: ${cell.cellId}`],
          missingInformation: [],
          suggestedNextSteps: ['Explain this screening result ⚡', 'What is the ReVoltCell vision? 🔄'],
        }),
      },
    ];

    // Append permitted recent history (max 4 prior messages, each bounded)
    if (Array.isArray(body.history)) {
      const sanitizedHistory = body.history.slice(-4);
      for (const h of sanitizedHistory) {
        if (h.role === 'user' || h.role === 'assistant') {
          messages.push({
            role: h.role,
            content: String(h.content || '').slice(0, 1000),
          });
        }
      }
    }

    // Append the current user message
    messages.push({
      role: 'user',
      content: body.message.trim(),
    });

    // 4. Invoke LLM provider via internal adapter
    const adapter = getLlmAdapter();
    let completion;
    try {
      completion = await adapter.complete({
        messages,
        temperature: 0.5,
      });
    } catch (err: any) {
      // Safe error return without leaking internal keys or stack traces
      throw new AppError(
        `VoltIQ AI service temporarily unavailable: ${err.message || 'Provider request failure'}`,
        502,
        'AI_PROVIDER_ERROR'
      );
    }

    // 5. Parse structured response
    let parsed: any;
    try {
      // Remove any markdown fence formatting if present
      let raw = completion.content.trim();
      if (raw.startsWith('```json')) {
        raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      } else if (raw.startsWith('```')) {
        raw = raw.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      }
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        answer: completion.content,
        evidenceUsed: [`Report ${test.testId}`],
        missingInformation: [],
        suggestedNextSteps: [],
      };
    }

    // 6. Generate dynamic suggested follow-up questions tailored to this report
    const suggestedQuestions = this.generateSuggestedQuestions(context);

    const conversationId = body.conversationId || `conv-${crypto.randomUUID().slice(0, 8)}`;

    return {
      testId: test.testId,
      cellId: cell.cellId,
      mode,
      conversationId,
      answer: parsed.answer || 'No analysis available for this query.',
      evidenceUsed: Array.isArray(parsed.evidenceUsed) ? parsed.evidenceUsed : [],
      missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
      suggestedQuestions,
      disclaimer: context.disclaimer,
    };
  }

  private static generateSuggestedQuestions(context: any): string[] {
    const classification = context.screeningOutcome.classification;
    const questions: string[] = [];

    if (classification === 'UNSUITABLE') {
      questions.push('What specific thresholds caused this cell to fail screening? ⚠️');
      questions.push('Why should this cell be recycled rather than repurposed? ♻️');
    } else if (classification === 'GOOD') {
      questions.push('Which second-life applications fit this cell best? 💡');
      questions.push('How stable was the voltage retention during the discharge run? ⚡');
    } else {
      questions.push('Explain the screening score breakdown for this cell 📊');
      questions.push('What secondary bench tests are needed before considering reuse? 🔬');
    }

    questions.push('What is the ReVoltCell vision for EV battery repurposing? 🔄');
    questions.push('Was dynamic discharge capacity or internal resistance measured? 🔍');

    return questions.slice(0, 4);
  }
}
