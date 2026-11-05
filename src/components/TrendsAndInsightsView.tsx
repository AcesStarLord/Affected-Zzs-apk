import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Moon,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { IntakeEntry, SleepInsight, SleepRecord } from '../types/health';
import {
  buildHourlyClearanceTimeline,
  calculateActiveCaffeineMg,
  calculateActiveNicotineMg,
  calculateDynamicCutoffTimes,
  calculateEstimatedBAC,
  calculateSafeSleepRatios,
  generateSleepInsights,
  SAFE_SLEEP_THRESHOLDS,
} from '../utils/pharmacokinetics';

interface TrendsAndInsightsViewProps {
  entries: IntakeEntry[];
  sleepRecords: SleepRecord[];
  caffeineHalfLife: number;
  onChangeHalfLife: (val: number) => void;
  onAddSleepRecord: (record: Omit<SleepRecord, 'id'>) => void;
  onDeleteSleepRecord: (id: string) => void;
  onDeleteSleepByDate: (date: string) => void;
  lastDeletedSleepRecords: SleepRecord[];
  onUndoDeleteSleep: () => void;
}

export const TrendsAndInsightsView: React.FC<TrendsAndInsightsViewProps> = ({
  entries,
  sleepRecords,
  caffeineHalfLife,
  onChangeHalfLife,
  onAddSleepRecord,
  onDeleteSleepByDate,
  lastDeletedSleepRecords,
  onUndoDeleteSleep,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<
    'sleepScore' | 'deepSleepMinutes' | 'remSleepMinutes' | 'hrvMs'
  >('sleepScore');
  const [bedtimeHour, setBedtimeHour] = useState(23); // 11:00 PM
  const [showAddSleepForm, setShowAddSleepForm] = useState(false);
  const [dayToDelete, setDayToDelete] = useState<string>(
    sleepRecords[sleepRecords.length - 1]?.date || ''
  );

  // Interactive toggles for Alcohol, Caffeine, Tobacco, and Sleep Readiness Score
  const [visibleSeries, setVisibleSeries] = useState<{
    caffeine: boolean;
    alcohol: boolean;
    tobacco: boolean;
    sleepReadiness: boolean;
  }>({
    caffeine: true,
    alcohol: true,
    tobacco: true,
    sleepReadiness: true,
  });

  const handleToggleSeries = (
    key: 'caffeine' | 'alcohol' | 'tobacco' | 'sleepReadiness'
  ) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // AI Sleep Recommendations State
  const [aiSleepPlan, setAiSleepPlan] = useState<{
    headline: string;
    readinessAssessment: string;
    optimalWindDownTime: string;
    recommendations: Array<{
      title: string;
      category: string;
      impact: string;
      action: string;
    }>;
  } | null>(null);
  const [isLoadingAiPlan, setIsLoadingAiPlan] = useState(false);

  useEffect(() => {
    if (sleepRecords.length > 0 && !sleepRecords.some((r) => r.date === dayToDelete)) {
      setDayToDelete(sleepRecords[sleepRecords.length - 1].date);
    } else if (sleepRecords.length === 0) {
      setDayToDelete('');
    }
  }, [sleepRecords, dayToDelete]);

  // Manual sleep entry form state
  const [newSleepDate, setNewSleepDate] = useState('2026-11-05');
  const [newTotalMin, setNewTotalMin] = useState('460');
  const [newDeepMin, setNewDeepMin] = useState('86');
  const [newRemMin, setNewRemMin] = useState('102');
  const [newHrv, setNewHrv] = useState('66');
  const [newRhr, setNewRhr] = useState('52');
  const [newScore, setNewScore] = useState('88');

  const targetBedtimeMs = useMemo(() => {
    const d = new Date();
    d.setHours(bedtimeHour, 0, 0, 0);
    if (d.getTime() < Date.now() - 12 * 3600 * 1000) {
      d.setDate(d.getDate() + 1);
    }
    return d.getTime();
  }, [bedtimeHour]);

  const insights: SleepInsight[] = useMemo(() => {
    return generateSleepInsights(entries, sleepRecords, targetBedtimeMs, caffeineHalfLife);
  }, [entries, sleepRecords, targetBedtimeMs, caffeineHalfLife]);

  // Combined 24-hour clearance timeline for Safe Sleep Level Graph
  const combinedTimeline = useMemo(() => {
    const startWindowMs = Date.now() - 15 * 3600 * 1000;
    return buildHourlyClearanceTimeline(entries, startWindowMs, caffeineHalfLife);
  }, [entries, caffeineHalfLife]);

  // Bedtime forecast values for the 3 substances + Combined Sleep Readiness Score
  const bedtimeLevels = useMemo(() => {
    const caff = calculateActiveCaffeineMg(entries, targetBedtimeMs, caffeineHalfLife);
    const bac = calculateEstimatedBAC(entries, targetBedtimeMs);
    const nic = calculateActiveNicotineMg(entries, targetBedtimeMs);
    const ratios = calculateSafeSleepRatios({
      activeCaffeineMg: caff,
      estimatedBac: bac,
      activeNicotineMg: nic,
    });
    return { caff, bac, nic, ratios };
  }, [entries, targetBedtimeMs, caffeineHalfLife]);

  const handleGenerateAiRecommendations = async () => {
    setIsLoadingAiPlan(true);
    const bedStr = `${String(bedtimeHour % 24).padStart(2, '0')}:00`;
    const cutoffs = calculateDynamicCutoffTimes(bedStr);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('/api/ai-sleep-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          activeCaffeineMg: bedtimeLevels.caff,
          activeBacPercent: bedtimeLevels.bac,
          activeNicotineMg: bedtimeLevels.nic,
          sleepReadinessScore: bedtimeLevels.ratios.sleepReadinessScore,
          targetBedtime: bedStr,
          caffeineCutoffTime: cutoffs.caffeineCutoff,
          alcoholCutoffTime: cutoffs.alcoholCutoff,
          tobaccoCutoffTime: cutoffs.tobaccoCutoff,
          recentEntries: entries.slice(0, 8),
          recentSleepRecords: sleepRecords.slice(-4),
          predictedScore: bedtimeLevels.ratios.sleepReadinessScore,
        }),
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.headline && Array.isArray(data.recommendations)) {
          setAiSleepPlan(data);
          setIsLoadingAiPlan(false);
          return;
        }
      }
    } catch {
      // Fallback below
    }

    setAiSleepPlan({
      headline: `Projected Bedtime Sleep Readiness: ${bedtimeLevels.ratios.sleepReadinessScore}/100 for ${bedStr} Sleep Onset`,
      readinessAssessment: `At ${bedStr}, projected plasma caffeine is ${bedtimeLevels.caff} mg, estimated BAC is ${bedtimeLevels.bac.toFixed(
        3
      )}%, and active nicotine is ${bedtimeLevels.nic} mg.`,
      optimalWindDownTime: cutoffs.windDownTime,
      recommendations: [
        {
          title: 'Adenosine & Slow-Wave N3 Optimization',
          category: 'Chronobiology',
          impact: '+16% Deep Sleep',
          action: `Enforce a strict ${cutoffs.caffeineCutoff} caffeine cutoff so bedtime plasma caffeine remains below ${SAFE_SLEEP_THRESHOLDS.caffeineMg} mg.`,
        },
        {
          title: 'REM Consolidation & Autonomic HRV',
          category: 'Metabolic Clearance',
          impact: '+8 ms Nocturnal HRV',
          action: `Complete any alcoholic beverage before ${cutoffs.alcoholCutoff} and hydrate with 400 mL water + electrolytes.`,
        },
        {
          title: 'Parasympathetic Thermal Wind-Down',
          category: 'Autonomic Recovery',
          impact: '-10 min Sleep Latency',
          action: `Begin low-lux wind-down at ${cutoffs.windDownTime} and cease nicotine intake by ${cutoffs.tobaccoCutoff}.`,
        },
      ],
    });
    setIsLoadingAiPlan(false);
  };

  // Correlate daily intake with each sleep record date
  const correlatedDays = useMemo(() => {
    return sleepRecords.map((sr) => {
      const dayEntries = entries.filter((e) => e.timestamp.startsWith(sr.date));
      const caff = dayEntries.reduce((s, e) => s + e.caffeineMg, 0);
      const alc = dayEntries.reduce((s, e) => s + e.alcoholGrams, 0);
      const nic = dayEntries.reduce((s, e) => s + e.nicotineMg, 0);
      return {
        ...sr,
        dailyCaffeineMg: Math.round(caff),
        dailyAlcoholGrams: Math.round(alc * 10) / 10,
        dailyNicotineMg: Math.round(nic * 10) / 10,
      };
    });
  }, [sleepRecords, entries]);

  const uniqueSleepDates = useMemo(
    () => Array.from(new Set(sleepRecords.map((r) => r.date))),
    [sleepRecords]
  );

  const handleCreateSleepRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Math.max(60, parseInt(newTotalMin, 10) || 450);
    const deep = Math.max(10, parseInt(newDeepMin, 10) || 80);
    const rem = Math.max(10, parseInt(newRemMin, 10) || 95);
    const hrv = Math.max(15, parseInt(newHrv, 10) || 60);
    const rhr = Math.max(38, parseInt(newRhr, 10) || 54);
    const score = Math.min(100, Math.max(10, parseInt(newScore, 10) || 85));

    onAddSleepRecord({
      date: newSleepDate,
      source: 'Manual',
      totalSleepMinutes: total,
      deepSleepMinutes: deep,
      remSleepMinutes: rem,
      sleepLatencyMinutes: 13,
      awakenings: 1,
      restingHeartRateBpm: rhr,
      hrvMs: hrv,
      sleepScore: score,
      bedtimeIso: `${newSleepDate}T22:45:00.000Z`,
      wakeTimeIso: `${newSleepDate}T06:25:00.000Z`,
    });
    setShowAddSleepForm(false);
  };

  const metricLabelMap: Record<
    typeof selectedMetric,
    { label: string; unit: string; max: number }
  > = {
    sleepScore: { label: 'Sleep Quality Score', unit: 'pts', max: 100 },
    deepSleepMinutes: { label: 'Slow-Wave Deep Sleep', unit: 'min', max: 120 },
    remSleepMinutes: { label: 'REM Sleep Duration', unit: 'min', max: 130 },
    hrvMs: { label: 'Nocturnal HRV (RMSSD)', unit: 'ms', max: 90 },
  };

  // Helper to convert % of safe sleep threshold (0..250%) to SVG Y (175..25)
  // 100% Safe Sleep Threshold sits at Y = 115
  const pctToSafeSvgY = (pct: number) => {
    const clamped = Math.min(250, Math.max(0, pct));
    return 175 - (clamped / 250) * 150;
  };
  const readinessToSvgY = (score: number) => {
    const clamped = Math.min(100, Math.max(0, score));
    return 175 - (clamped / 100) * 150;
  };
  const safeThresholdY = pctToSafeSvgY(100); // Y = 115

  return (
    <div className="space-y-8">
      {/* Section 1: Combined Safe Sleep Level & Sleep Readiness Graph (Alcohol, Caffeine, Tobacco & Sleep Readiness Score) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Combined Safe Sleep Level &amp; Sleep Readiness Graph
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Simultaneous 24-hour substance clearance and Combined Sleep Readiness Score (0–100%) showing how intake affects sleep
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 py-1 font-mono text-xs font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Moon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Bedtime Sleep Readiness: {bedtimeLevels.ratios.sleepReadinessScore} / 100
            </span>
          </div>
        </div>

        {/* Interactive Graph Series Toggles: Turn On/Off Alcohol, Caffeine, Tobacco, and/or Sleep Readiness Score */}
        <div
          role="group"
          aria-label="Toggle display of Alcohol, Caffeine, Tobacco, and Sleep Readiness Score"
          className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40"
        >
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Toggle Graph Display Layers:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={visibleSeries.sleepReadiness}
              onClick={() => handleToggleSeries('sleepReadiness')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                visibleSeries.sleepReadiness
                  ? 'border-emerald-500/50 bg-emerald-50 text-emerald-900 shadow-2xs dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-200'
                  : 'border-slate-200 bg-white/60 text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-900/40'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  visibleSeries.sleepReadiness ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <span>Sleep Readiness Score</span>
              <span className="font-mono text-[10px]">
                {visibleSeries.sleepReadiness ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={visibleSeries.caffeine}
              onClick={() => handleToggleSeries('caffeine')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                visibleSeries.caffeine
                  ? 'border-amber-500/50 bg-amber-50 text-amber-900 shadow-2xs dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200'
                  : 'border-slate-200 bg-white/60 text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-900/40'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  visibleSeries.caffeine ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <span>Caffeine (≤ {SAFE_SLEEP_THRESHOLDS.caffeineMg} mg)</span>
              <span className="font-mono text-[10px]">{visibleSeries.caffeine ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              aria-pressed={visibleSeries.alcohol}
              onClick={() => handleToggleSeries('alcohol')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                visibleSeries.alcohol
                  ? 'border-rose-500/50 bg-rose-50 text-rose-900 shadow-2xs dark:border-rose-500/40 dark:bg-rose-950/60 dark:text-rose-200'
                  : 'border-slate-200 bg-white/60 text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-900/40'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  visibleSeries.alcohol ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <span>Alcohol (≤ {SAFE_SLEEP_THRESHOLDS.alcoholBacPercent}%)</span>
              <span className="font-mono text-[10px]">{visibleSeries.alcohol ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              aria-pressed={visibleSeries.tobacco}
              onClick={() => handleToggleSeries('tobacco')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                visibleSeries.tobacco
                  ? 'border-violet-500/50 bg-violet-50 text-violet-900 shadow-2xs dark:border-violet-500/40 dark:bg-violet-950/60 dark:text-violet-200'
                  : 'border-slate-200 bg-white/60 text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-900/40'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  visibleSeries.tobacco ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <span>Tobacco (≤ {SAFE_SLEEP_THRESHOLDS.nicotineMg} mg)</span>
              <span className="font-mono text-[10px]">{visibleSeries.tobacco ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <svg
            viewBox="0 0 760 215"
            className="h-56 w-full min-w-[580px]"
            role="img"
            aria-label="Combined safe sleep level and sleep readiness score graph for alcohol, caffeine, and tobacco use"
          >
            {/* Shaded Safe Sleep Zone (below 100% threshold, from Y=115 to Y=175) */}
            <rect
              x="52"
              y={safeThresholdY}
              width="688"
              height={175 - safeThresholdY}
              className="fill-teal-500/10 dark:fill-teal-400/10"
            />

            {/* 100% Safe Sleep Threshold Horizontal Line */}
            <line
              x1="52"
              y1={safeThresholdY}
              x2="740"
              y2={safeThresholdY}
              stroke="#0d9488"
              strokeDasharray="5 4"
              strokeWidth="1.75"
            />
            <text
              x="58"
              y={safeThresholdY - 6}
              textAnchor="start"
              className="fill-teal-700 font-mono text-[10px] font-semibold dark:fill-teal-300"
            >
              100% SAFE SLEEP THRESHOLD (45 mg Caffeine · 0.015% BAC · 0.5 mg Nicotine)
            </text>
            <text
              x="734"
              y={safeThresholdY + 14}
              textAnchor="end"
              className="fill-teal-700 font-mono text-[9px] dark:fill-teal-400"
            >
              SAFE SLEEP ZONE ↓
            </text>

            {/* Y-Axis Reference Grid Lines */}
            {[0, 100, 200].map((pct) => {
              const y = pctToSafeSvgY(pct);
              return (
                <g key={pct}>
                  <line
                    x1="52"
                    y1={y}
                    x2="740"
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeWidth="1"
                  />
                  <text
                    x="46"
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 font-mono text-[9px]"
                  >
                    {pct}%
                  </text>
                </g>
              );
            })}

            {/* Combined Sleep Readiness Score Curve (Emerald) */}
            {visibleSeries.sleepReadiness && (
              <polyline
                data-testid="trends-series-sleep-readiness"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                points={combinedTimeline
                  .map((pt, idx) => {
                    const x = 58 + (idx / 23) * 674;
                    const ratios = calculateSafeSleepRatios(pt);
                    const y = readinessToSvgY(ratios.sleepReadinessScore);
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}

            {/* Caffeine Curve (Amber) */}
            {visibleSeries.caffeine && (
              <polyline
                data-testid="trends-series-caffeine"
                fill="none"
                stroke="#d97706"
                strokeWidth="2.5"
                points={combinedTimeline
                  .map((pt, idx) => {
                    const x = 58 + (idx / 23) * 674;
                    const ratios = calculateSafeSleepRatios(pt);
                    const y = pctToSafeSvgY(ratios.caffeinePctOfSafeLimit);
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}

            {/* Alcohol BAC Curve (Rose) */}
            {visibleSeries.alcohol && (
              <polyline
                data-testid="trends-series-alcohol"
                fill="none"
                stroke="#e11d48"
                strokeWidth="2.5"
                points={combinedTimeline
                  .map((pt, idx) => {
                    const x = 58 + (idx / 23) * 674;
                    const ratios = calculateSafeSleepRatios(pt);
                    const y = pctToSafeSvgY(ratios.alcoholPctOfSafeLimit);
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}

            {/* Tobacco / Nicotine Curve (Violet) */}
            {visibleSeries.tobacco && (
              <polyline
                data-testid="trends-series-tobacco"
                fill="none"
                stroke="#7c3aed"
                strokeWidth="2.5"
                points={combinedTimeline
                  .map((pt, idx) => {
                    const x = 58 + (idx / 23) * 674;
                    const ratios = calculateSafeSleepRatios(pt);
                    const y = pctToSafeSvgY(ratios.tobaccoPctOfSafeLimit);
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}

            {/* Hourly markers & time labels */}
            {combinedTimeline.map((pt, idx) => {
              if (idx % 3 !== 0 && idx !== 15 && idx !== 23) return null;
              const x = 58 + (idx / 23) * 674;
              const ratios = calculateSafeSleepRatios(pt);
              const readinessY = readinessToSvgY(ratios.sleepReadinessScore);
              const caffY = pctToSafeSvgY(ratios.caffeinePctOfSafeLimit);
              const alcY = pctToSafeSvgY(ratios.alcoholPctOfSafeLimit);
              const nicY = pctToSafeSvgY(ratios.tobaccoPctOfSafeLimit);
              const isNow = idx === 15;
              const dt = new Date(pt.timestampMs);
              const label = `${String(dt.getHours()).padStart(2, '0')}:00`;

              return (
                <g key={idx}>
                  {visibleSeries.sleepReadiness && (
                    <circle
                      cx={x}
                      cy={readinessY}
                      r={isNow ? 5 : 3.5}
                      className="fill-emerald-500"
                    />
                  )}
                  {visibleSeries.caffeine && (
                    <circle cx={x} cy={caffY} r={isNow ? 4.5 : 3} className="fill-amber-600" />
                  )}
                  {visibleSeries.alcohol && (
                    <circle cx={x} cy={alcY} r={isNow ? 4.5 : 3} className="fill-rose-600" />
                  )}
                  {visibleSeries.tobacco && (
                    <circle cx={x} cy={nicY} r={isNow ? 4.5 : 3} className="fill-violet-600" />
                  )}
                  <text
                    x={x}
                    y="194"
                    textAnchor="middle"
                    className={`font-mono text-[9px] ${
                      isNow ? 'fill-teal-700 font-bold dark:fill-teal-400' : 'fill-slate-400'
                    }`}
                  >
                    {isNow ? 'NOW' : label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* 4-Column Safe Sleep & Readiness Verification Strip */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Sleep Readiness Score
              </span>
              <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                {bedtimeLevels.ratios.sleepReadinessScore >= 75 ? 'OPTIMAL READINESS' : 'IMPACTED'}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums">
              Bedtime Forecast: <strong>{bedtimeLevels.ratios.sleepReadinessScore} / 100</strong> combined score
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Caffeine Safe Sleep Level
              </span>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  bedtimeLevels.ratios.isCaffeineSafe
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {bedtimeLevels.ratios.isCaffeineSafe ? 'SAFE AT BEDTIME' : 'ABOVE SAFE LIMIT'}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
              Bedtime Forecast: <strong>{bedtimeLevels.caff} mg</strong> / {SAFE_SLEEP_THRESHOLDS.caffeineMg} mg limit ({bedtimeLevels.ratios.caffeinePctOfSafeLimit}%)
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Alcohol Safe Sleep Level
              </span>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  bedtimeLevels.ratios.isAlcoholSafe
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {bedtimeLevels.ratios.isAlcoholSafe ? 'SAFE AT BEDTIME' : 'ABOVE SAFE LIMIT'}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
              Bedtime Forecast: <strong>{bedtimeLevels.bac.toFixed(3)}%</strong> / {SAFE_SLEEP_THRESHOLDS.alcoholBacPercent}% limit ({bedtimeLevels.ratios.alcoholPctOfSafeLimit}%)
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Tobacco Safe Sleep Level
              </span>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  bedtimeLevels.ratios.isTobaccoSafe
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-violet-700 dark:text-violet-400'
                }`}
              >
                {bedtimeLevels.ratios.isTobaccoSafe ? 'SAFE AT BEDTIME' : 'ABOVE SAFE LIMIT'}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
              Bedtime Forecast: <strong>{bedtimeLevels.nic} mg</strong> / {SAFE_SLEEP_THRESHOLDS.nicotineMg} mg limit ({bedtimeLevels.ratios.tobaccoPctOfSafeLimit}%)
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Personalized Sleep Quality Insights, AI Sleep Recommendations & Metabolic Sensitivity */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              AI Sleep Recommendations &amp; Pharmacokinetic Insights
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Correlating active adenosine blockade, ethanol metabolism, and nicotinic arousal with AI sleep coaching
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateAiRecommendations}
              disabled={isLoadingAiPlan}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-teal-500 hover:to-emerald-500 disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isLoadingAiPlan ? 'Generating AI Coaching...' : 'Generate AI Sleep Recommendations'}
            </button>
            <div className="flex items-center gap-2">
              <Sliders className="h-3.5 w-3.5 text-slate-500" />
              <label
                htmlFor="cyp1a2-halflife-slider"
                className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap"
              >
                CYP1A2 Caffeine Half-Life:
              </label>
              <input
                id="cyp1a2-halflife-slider"
                type="range"
                min="3.0"
                max="8.0"
                step="0.5"
                value={caffeineHalfLife}
                onChange={(e) => onChangeHalfLife(parseFloat(e.target.value))}
                className="w-24 accent-teal-600"
              />
              <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {caffeineHalfLife.toFixed(1)}h
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="target-bedtime-select"
                className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap"
              >
                Target Bedtime:
              </label>
              <select
                id="target-bedtime-select"
                value={bedtimeHour}
                onChange={(e) => setBedtimeHour(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value={21}>21:00 (9:00 PM)</option>
                <option value={22}>22:00 (10:00 PM)</option>
                <option value={23}>23:00 (11:00 PM)</option>
                <option value={24}>00:00 (Midnight)</option>
              </select>
            </div>
          </div>
        </div>

        {aiSleepPlan && (
          <div
            data-testid="trends-ai-sleep-panel"
            className="mt-5 rounded-xl border border-teal-500/30 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/40 p-5 dark:border-teal-500/30 dark:from-teal-950/40 dark:via-slate-900 dark:to-emerald-950/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
                <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                AI Sleep Coaching Synthesis
              </span>
              <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Optimal Wind-Down Start: {aiSleepPlan.optimalWindDownTime}
              </span>
            </div>
            <h3 className="mt-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              {aiSleepPlan.headline}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {aiSleepPlan.readinessAssessment}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {aiSleepPlan.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200/80 bg-white/95 p-3.5 dark:border-slate-800 dark:bg-slate-900/90"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-teal-700 dark:text-teal-400">
                      {rec.category}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {rec.impact}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {rec.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {rec.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {insights.map((insight) => {
            const Icon =
              insight.severity === 'optimal'
                ? CheckCircle2
                : insight.severity === 'caution'
                ? Info
                : AlertTriangle;
            const iconColor =
              insight.severity === 'optimal'
                ? 'text-emerald-600 dark:text-emerald-400'
                : insight.severity === 'caution'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400';

            return (
              <div
                key={insight.id}
                className="flex flex-col justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5 font-medium capitalize text-slate-700 dark:text-slate-300">
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                      {insight.category} · {insight.severity}
                    </span>
                    <span className="font-mono text-[11px] font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                      {insight.metricDeltaLabel}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {insight.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {insight.mechanism}
                  </p>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800/80">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Protocol:{' '}
                    <span className="font-normal text-slate-600 dark:text-slate-400">
                      {insight.recommendation}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3: Multi-Day Trends & Correlation Visualization */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Multi-Day Substance vs. Sleep Architecture Trends
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compare daily caffeine, alcohol, and nicotine loads against nocturnal recovery telemetry
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(
              [
                ['sleepScore', 'Sleep Score'],
                ['deepSleepMinutes', 'Deep Sleep'],
                ['remSleepMinutes', 'REM Sleep'],
                ['hrvMs', 'HRV (ms)'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedMetric(key)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedMetric === key
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Comparative Bar + Trend Chart */}
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Primary Metric:{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {metricLabelMap[selectedMetric].label} ({metricLabelMap[selectedMetric].unit})
              </strong>
            </span>
            <div className="flex items-center gap-4">
              <span>Teal Bar: {metricLabelMap[selectedMetric].label}</span>
              <span>·</span>
              <span>Amber Marker: Daily Caffeine (mg)</span>
              <span>·</span>
              <span>Rose Marker: Ethanol (g) + Nicotine (mg)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {correlatedDays.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  No sleep telemetry nights logged yet.
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Log a nightly sleep record below or sync Apple Health / Google Fit to view multi-day correlations.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddSleepForm(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-teal-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Log First Sleep Night
                </button>
              </div>
            ) : (
              <svg
                viewBox="0 0 760 220"
                className="h-56 w-full min-w-[600px]"
                role="img"
                aria-label="Multi-day substance intake and sleep quality comparison chart"
              >
                {/* Horizontal reference lines */}
                {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = 180 - ratio * 150;
                  const val = Math.round(ratio * metricLabelMap[selectedMetric].max);
                  return (
                    <g key={i}>
                      <line
                        x1="48"
                        y1={y}
                        x2="730"
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-100 dark:text-slate-800"
                        strokeWidth="1"
                      />
                      <text
                        x="40"
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-400 font-mono text-[10px]"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {correlatedDays.map((day, idx) => {
                  const colWidth = 660 / Math.max(1, correlatedDays.length);
                  const xCenter = 80 + idx * colWidth + colWidth * 0.35;
                  const metricVal = day[selectedMetric];
                  const maxVal = metricLabelMap[selectedMetric].max;
                  const barHeight = Math.min(155, Math.max(8, (metricVal / maxVal) * 150));
                  const barY = 180 - barHeight;

                  const caffHeight = Math.min(150, (day.dailyCaffeineMg / 250) * 150);
                  const caffY = 180 - caffHeight;

                  return (
                    <g key={day.id}>
                      {/* Sleep Metric Bar */}
                      <rect
                        x={xCenter - 18}
                        y={barY}
                        width="36"
                        height={barHeight}
                        rx="4"
                        className="fill-teal-600/85 dark:fill-teal-500/80"
                      />
                      {/* Metric Value on top of bar */}
                      <text
                        x={xCenter}
                        y={barY - 6}
                        textAnchor="middle"
                        className="fill-slate-800 font-mono text-[11px] font-semibold dark:fill-slate-200"
                      >
                        {metricVal}
                        {metricLabelMap[selectedMetric].unit === 'pts'
                          ? ''
                          : ` ${metricLabelMap[selectedMetric].unit}`}
                      </text>

                      {/* Caffeine indicator dot */}
                      {day.dailyCaffeineMg > 0 && (
                        <circle
                          cx={xCenter - 8}
                          cy={caffY}
                          r="4.5"
                          className="fill-amber-500 stroke-white stroke-2 dark:stroke-slate-900"
                        />
                      )}

                      {/* Alcohol/Nicotine indicator dot */}
                      {(day.dailyAlcoholGrams > 0 || day.dailyNicotineMg > 0) && (
                        <circle
                          cx={xCenter + 8}
                          cy={
                            180 -
                            Math.min(145, day.dailyAlcoholGrams * 4 + day.dailyNicotineMg * 8)
                          }
                          r="4.5"
                          className="fill-rose-500 stroke-white stroke-2 dark:stroke-slate-900"
                        />
                      )}

                      {/* Date Label */}
                      <text
                        x={xCenter}
                        y="198"
                        textAnchor="middle"
                        className="fill-slate-600 font-mono text-[10px] dark:fill-slate-400"
                      >
                        {day.date.slice(5)}
                      </text>
                      <text
                        x={xCenter}
                        y="212"
                        textAnchor="middle"
                        className="fill-slate-400 font-mono text-[9px]"
                      >
                        {day.dailyCaffeineMg}mg · {day.dailyAlcoholGrams}g · {day.dailyNicotineMg}mg
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </section>

      {/* Section 4: Sleep Telemetry Ledger Table with Delete Sleep Telemetry by Day */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Nocturnal Biometrics &amp; Sleep Architecture Ledger ({correlatedDays.length} days)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nightly sleep stage durations, resting heart rate, and HRV synced from Apple Health &amp; Google Fit
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Delete Sleep Telemetry by Day Selector */}
            {uniqueSleepDates.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800/60">
                <label htmlFor="delete-sleep-day-select" className="sr-only">
                  Select sleep telemetry day to delete
                </label>
                <select
                  id="delete-sleep-day-select"
                  aria-label="Select sleep telemetry day to delete"
                  value={dayToDelete}
                  onChange={(e) => setDayToDelete(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {uniqueSleepDates.map((dateStr) => (
                    <option key={dateStr} value={dateStr}>
                      Day: {dateStr}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (dayToDelete) {
                      onDeleteSleepByDate(dayToDelete);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 whitespace-nowrap shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Sleep Day
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAddSleepForm(!showAddSleepForm)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              {showAddSleepForm ? 'Hide Manual Entry' : 'Log Nightly Sleep Record'}
            </button>
          </div>
        </div>

        {lastDeletedSleepRecords.length > 0 && (
          <div
            role="status"
            className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <span>
              Deleted sleep telemetry for day{' '}
              <strong className="font-mono">{lastDeletedSleepRecords[0].date}</strong> (
              {lastDeletedSleepRecords.length} record
              {lastDeletedSleepRecords.length === 1 ? '' : 's'}).
            </span>
            <button
              type="button"
              onClick={onUndoDeleteSleep}
              className="font-semibold text-teal-700 hover:underline dark:text-teal-400"
            >
              Undo Delete Sleep Day
            </button>
          </div>
        )}

        {showAddSleepForm && (
          <form
            onSubmit={handleCreateSleepRecord}
            className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 sm:grid-cols-4 lg:grid-cols-8"
          >
            <div>
              <label
                htmlFor="sleep-date"
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400"
              >
                Date
              </label>
              <input
                id="sleep-date"
                type="date"
                value={newSleepDate}
                onChange={(e) => setNewSleepDate(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor="sleep-total"
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400"
              >
                Total (min)
              </label>
              <input
                id="sleep-total"
                type="number"
                value={newTotalMin}
                onChange={(e) => setNewTotalMin(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor="sleep-deep"
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400"
              >
                Deep (min)
              </label>
              <input
                id="sleep-deep"
                type="number"
                value={newDeepMin}
                onChange={(e) => setNewDeepMin(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor="sleep-rem"
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400"
              >
                REM (min)
              </label>
              <input
                id="sleep-rem"
                type="number"
                value={newRemMin}
                onChange={(e) => setNewRemMin(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor="sleep-hrv"
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400"
              >
                HRV (ms)
              </label>
              <input
                id="sleep-hrv"
                type="number"
                value={newHrv}
                onChange={(e) => setNewHrv(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor="sleep-rhr"
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400"
              >
                RHR (bpm)
              </label>
              <input
                id="sleep-rhr"
                type="number"
                value={newRhr}
                onChange={(e) => setNewRhr(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label
                htmlFor="sleep-score"
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400"
              >
                Score (0-100)
              </label>
              <input
                id="sleep-score"
                type="number"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500 whitespace-nowrap shrink-0"
              >
                Save Night
              </button>
            </div>
          </form>
        )}

        {correlatedDays.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              No sleep telemetry records in the ledger.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Click &ldquo;Log Nightly Sleep Record&rdquo; above or sync your wearable device to start tracking sleep architecture by day.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Night Of</th>
                  <th className="px-4 py-2.5 font-medium">Telemetry Source</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total Sleep</th>
                  <th className="px-4 py-2.5 text-right font-medium">Deep (N3)</th>
                  <th className="px-4 py-2.5 text-right font-medium">REM</th>
                  <th className="px-4 py-2.5 text-right font-medium">Latency</th>
                  <th className="px-4 py-2.5 text-right font-medium">RHR</th>
                  <th className="px-4 py-2.5 text-right font-medium">HRV (RMSSD)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Sleep Score</th>
                  <th className="pl-4 py-2.5 text-right font-medium">Delete by Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {correlatedDays.map((row) => {
                  const hrs = Math.floor(row.totalSleepMinutes / 60);
                  const mins = row.totalSleepMinutes % 60;
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 pr-4 font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                        {row.date}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Moon className="h-3.5 w-3.5 text-slate-400" />
                          {row.source}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                        {hrs}h {String(mins).padStart(2, '0')}m
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                        {row.deepSleepMinutes} min
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                        {row.remSleepMinutes} min
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                        {row.sleepLatencyMinutes} min
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                        {row.restingHeartRateBpm} bpm
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                        {row.hrvMs} ms
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {row.sleepScore} / 100
                      </td>
                      <td className="pl-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteSleepByDate(row.date)}
                          aria-label={`Delete sleep telemetry for ${row.date}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/50 dark:hover:text-red-400 whitespace-nowrap"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete {row.date.slice(5)}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
