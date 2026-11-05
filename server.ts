import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.post('/api/ai-sleep-recommendations', async (req, res) => {
    try {
      const {
        activeCaffeineMg = 0,
        activeBacPercent = 0,
        activeNicotineMg = 0,
        sleepReadinessScore = 100,
        targetBedtime = '22:30',
        caffeineCutoffTime = '13:30',
        alcoholCutoffTime = '18:30',
        tobaccoCutoffTime = '20:00',
        recentEntries = [],
        recentSleepRecords = [],
        predictedScore = 92,
      } = req.body || {};

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in environment.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const prompt = `You are a board-certified sleep chronobiology and pharmacokinetic coaching engine for "Affected Zzs — Substance & Sleep Biometrics".
Analyze the user's current biometric clearance state and recent intake/sleep logs to generate actionable, physiological, and specific recommendations for maximizing tonight's sleep architecture (REM & Slow-Wave Deep Sleep).

Current Biometric Telemetry:
- Active Caffeine Level: ${Number(activeCaffeineMg).toFixed(1)} mg (Safe sleep threshold: <= 45 mg)
- Estimated BAC: ${Number(activeBacPercent).toFixed(3)}% (Safe sleep threshold: <= 0.015%)
- Active Nicotine Load: ${Number(activeNicotineMg).toFixed(2)} mg (Safe sleep threshold: <= 0.50 mg)
- Combined Sleep Readiness Score: ${Number(sleepReadinessScore)} / 100
- Tonight's Predicted Sleep Score: ${Number(predictedScore)} / 100
- Target Bedtime: ${targetBedtime}
- Calculated Last-Call Cutoffs: Caffeine ${caffeineCutoffTime}, Alcohol ${alcoholCutoffTime}, Tobacco ${tobaccoCutoffTime}
- Logged Substance Entries Today (${Array.isArray(recentEntries) ? recentEntries.length : 0}): ${JSON.stringify(
        (Array.isArray(recentEntries) ? recentEntries : []).slice(0, 8)
      )}
- Recent Wearable Sleep Telemetry (${Array.isArray(recentSleepRecords) ? recentSleepRecords.length : 0} nights): ${JSON.stringify(
        (Array.isArray(recentSleepRecords) ? recentSleepRecords : []).slice(0, 4)
      )}

Return a structured JSON coaching plan with:
1. "headline": A concise, high-impact clinical summary of tonight's sleep outlook (1 sentence).
2. "readinessAssessment": Specific physiological explanation of how the current caffeine, alcohol, and nicotine levels interact with adenosine receptors, GABA rebound, and nocturnal heart rate variability (HRV).
3. "optimalWindDownTime": Recommended wind-down start time (HH:MM 24h format) before ${targetBedtime}.
4. "recommendations": Array of 3 to 4 concrete, prioritized interventions (each with "title", "category" one of ["Chronobiology", "Metabolic Clearance", "Autonomic Recovery", "Sleep Architecture"], "impact" e.g. "+6% REM Stability", and "action" 1-2 sentences).`;

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                readinessAssessment: { type: Type.STRING },
                optimalWindDownTime: { type: Type.STRING },
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      category: { type: Type.STRING },
                      impact: { type: Type.STRING },
                      action: { type: Type.STRING },
                    },
                    required: ['title', 'category', 'impact', 'action'],
                  },
                },
              },
              required: [
                'headline',
                'readinessAssessment',
                'optimalWindDownTime',
                'recommendations',
              ],
            },
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API request timed out')), 3500)
        ),
      ]);

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText);
      return res.json(parsed);
    } catch (error) {
      console.error('Error generating AI sleep recommendations:', error);
      return res.status(500).json({
        error: 'Failed to generate AI sleep recommendations.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Affected Zzs Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
