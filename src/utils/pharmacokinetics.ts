import { IntakeEntry, SleepInsight, SleepRecord, TobaccoSubType, VolumeUnit } from '../types/health';

export const ML_PER_US_FL_OZ = 29.5735;

/**
 * Converts milliliters (mL) to US fluid ounces (fl oz), rounded to 1 decimal place.
 */
export function mlToOz(ml: number): number {
  if (ml <= 0) return 0;
  return Math.round((ml / ML_PER_US_FL_OZ) * 10) / 10;
}

/**
 * Converts US fluid ounces (fl oz) to milliliters (mL), rounded to nearest integer.
 */
export function ozToMl(oz: number): number {
  if (oz <= 0) return 0;
  return Math.round(oz * ML_PER_US_FL_OZ);
}

/**
 * Formats a volume stored in mL into the user's active VolumeUnit ('ml' or 'oz').
 */
export function formatVolume(volumeMl: number, unit: VolumeUnit): string {
  if (unit === 'oz') {
    return `${mlToOz(volumeMl)} fl oz`;
  }
  return `${Math.round(volumeMl)} mL`;
}

/**
 * Calculates pure ethanol weight in grams from liquid volume (mL) and ABV (%).
 * Ethanol density at 20°C is 0.789 g/mL.
 */
export function calculateAlcoholGrams(volumeMl: number, abvPercent: number): number {
  if (volumeMl <= 0 || abvPercent <= 0) return 0;
  const grams = volumeMl * (abvPercent / 100) * 0.789;
  return Math.round(grams * 10) / 10;
}

/**
 * Converts ethanol grams to US standard drinks (14g pure ethanol = 1 standard drink).
 */
export function calculateStandardDrinks(alcoholGrams: number): number {
  if (alcoholGrams <= 0) return 0;
  return Math.round((alcoholGrams / 14) * 100) / 100;
}

/**
 * Estimates systemic absorbed nicotine (mg) across the 5 tobacco modalities.
 */
export function calculateTobaccoNicotineMg(
  subType: TobaccoSubType,
  units: number,
  customMgPerUnit?: number
): { nicotineMg: number; unitLabel: string } {
  const safeUnits = Math.max(0, units);
  const defaults: Record<TobaccoSubType, { mgPerUnit: number; unitLabel: string }> = {
    cigarettes: { mgPerUnit: 1.5, unitLabel: 'cigarettes' }, // ~1.5mg absorbed per cigarette
    cigars: { mgPerUnit: 6.5, unitLabel: 'cigars' }, // ~6.5mg absorbed per cigar
    chew: { mgPerUnit: 3.6, unitLabel: 'pouches / dips' }, // ~3.6mg absorbed per dip/pouch
    pipes: { mgPerUnit: 4.2, unitLabel: 'bowls' }, // ~4.2mg absorbed per pipe bowl
    vapes: { mgPerUnit: 0.15, unitLabel: 'puffs' }, // ~0.15mg absorbed per puff (5% salt nic ~ 2.25mg per 15 puffs)
  };

  const spec = defaults[subType];
  const rate = customMgPerUnit !== undefined && customMgPerUnit > 0 ? customMgPerUnit : spec.mgPerUnit;
  return {
    nicotineMg: Math.round(safeUnits * rate * 100) / 100,
    unitLabel: spec.unitLabel,
  };
}

/**
 * Calculates remaining active systemic caffeine (mg) at targetTimeMs using first-order exponential decay.
 * Default biological half-life is 5.0 hours (absorption peak ~30 mins).
 */
export function calculateActiveCaffeineMg(
  entries: IntakeEntry[],
  targetTimeMs: number,
  halfLifeHours = 5.0
): number {
  if (halfLifeHours <= 0) return 0;
  let totalRemaining = 0;

  for (const entry of entries) {
    if (entry.caffeineMg <= 0) continue;
    const entryTimeMs = new Date(entry.timestamp).getTime();
    if (Number.isNaN(entryTimeMs) || entryTimeMs > targetTimeMs) continue;

    const elapsedHours = (targetTimeMs - entryTimeMs) / (1000 * 60 * 60);
    // Ignore entries older than 48 hours (virtually 0 remaining)
    if (elapsedHours > 48) continue;

    const remaining = entry.caffeineMg * Math.pow(0.5, elapsedHours / halfLifeHours);
    totalRemaining += remaining;
  }

  return Math.round(totalRemaining * 10) / 10;
}

/**
 * Calculates active systemic nicotine (mg) at targetTimeMs.
 * Nicotine has an acute half-life of ~2.0 hours (while its metabolite cotinine is ~16 hours).
 */
export function calculateActiveNicotineMg(
  entries: IntakeEntry[],
  targetTimeMs: number,
  halfLifeHours = 2.0
): number {
  let totalRemaining = 0;
  for (const entry of entries) {
    if (entry.nicotineMg <= 0) continue;
    const entryTimeMs = new Date(entry.timestamp).getTime();
    if (Number.isNaN(entryTimeMs) || entryTimeMs > targetTimeMs) continue;

    const elapsedHours = (targetTimeMs - entryTimeMs) / (1000 * 60 * 60);
    if (elapsedHours > 24) continue;

    totalRemaining += entry.nicotineMg * Math.pow(0.5, elapsedHours / halfLifeHours);
  }
  return Math.round(totalRemaining * 100) / 100;
}

/**
 * Estimates Blood Alcohol Concentration (BAC %) at targetTimeMs using Widmark formula.
 */
export function calculateEstimatedBAC(
  entries: IntakeEntry[],
  targetTimeMs: number,
  weightKg = 75,
  rFactor = 0.68
): number {
  const alcoholEntries = entries
    .filter((e) => e.alcoholGrams > 0)
    .map((e) => ({ time: new Date(e.timestamp).getTime(), grams: e.alcoholGrams }))
    .filter((e) => !Number.isNaN(e.time) && e.time <= targetTimeMs && targetTimeMs - e.time <= 24 * 3600 * 1000)
    .sort((a, b) => a.time - b.time);

  if (alcoholEntries.length === 0) return 0;

  const firstDrinkTime = alcoholEntries[0].time;
  const totalGrams = alcoholEntries.reduce((sum, item) => sum + item.grams, 0);
  const elapsedHours = Math.max(0, (targetTimeMs - firstDrinkTime) / (1000 * 60 * 60));

  // Widmark formula: BAC % = [Alcohol consumed in g / (Body weight in g x r)] x 100 - (beta x elapsedHours)
  const rawBac = (totalGrams / (weightKg * 1000 * rFactor)) * 100;
  const metabolized = 0.015 * elapsedHours;
  const netBac = Math.max(0, rawBac - metabolized);

  return Math.round(netBac * 1000) / 1000;
}

export interface HourlyKineticPoint {
  hourLabel: string;
  timestampMs: number;
  activeCaffeineMg: number;
  activeNicotineMg: number;
  estimatedBac: number;
}

/**
 * Builds a 24-hour pharmacokinetic curve for a given date.
 */
export function buildHourlyClearanceTimeline(
  entries: IntakeEntry[],
  dayStartMs: number,
  caffeineHalfLife = 5.0,
  weightKg = 75
): HourlyKineticPoint[] {
  const points: HourlyKineticPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const timestampMs = dayStartMs + h * 3600 * 1000;
    const hourLabel = `${String(h).padStart(2, '0')}:00`;
    points.push({
      hourLabel,
      timestampMs,
      activeCaffeineMg: calculateActiveCaffeineMg(entries, timestampMs, caffeineHalfLife),
      activeNicotineMg: calculateActiveNicotineMg(entries, timestampMs),
      estimatedBac: calculateEstimatedBAC(entries, timestampMs, weightKg),
    });
  }
  return points;
}

/**
 * Generates personalized, deterministic physiological insights correlating substance intake with wearable sleep data.
 */
export function generateSleepInsights(
  entries: IntakeEntry[],
  sleepRecords: SleepRecord[],
  targetBedtimeMs: number,
  caffeineHalfLife = 5.0
): SleepInsight[] {
  const insights: SleepInsight[] = [];

  // 1. Evaluate bedtime active caffeine load
  const bedtimeCaffeine = calculateActiveCaffeineMg(entries, targetBedtimeMs, caffeineHalfLife);
  if (bedtimeCaffeine >= 45) {
    insights.push({
      id: 'caffeine-bedtime-load',
      severity: bedtimeCaffeine >= 80 ? 'alert' : 'caution',
      category: 'caffeine',
      title: `Elevated Bedtime Adenosine Blockade (${bedtimeCaffeine} mg projected)`,
      mechanism:
        'Circulating caffeine above 45 mg at sleep onset competitively binds A1/A2A adenosine receptors, suppressing slow-wave (deep) sleep depth by 14–22% and delaying sleep onset.',
      recommendation:
        'Shift your final caffeinated beverage at least 8.5 hours before sleep or switch afternoon intake to decaf / L-theanine herbal infusions.',
      metricDeltaLabel: `-${Math.min(28, Math.round(bedtimeCaffeine * 0.25))} min Deep Sleep forecast`,
    });
  } else {
    insights.push({
      id: 'caffeine-bedtime-clear',
      severity: 'optimal',
      category: 'caffeine',
      title: `Optimal Bedtime Caffeine Clearance (${bedtimeCaffeine} mg projected)`,
      mechanism:
        'Projected plasma caffeine is well below the 45 mg slow-wave interference threshold, preserving natural adenosine pressure for deep NREM Stage 3 architecture.',
      recommendation: 'Maintain your pre-14:00 caffeine cutoff window to protect deep sleep recovery.',
      metricDeltaLabel: '+18% Slow-Wave preservation',
    });
  }

  // 2. Analyze multi-day alcohol vs REM & HRV from wearable sleep records
  const recentAlcoholGrams = entries
    .filter((e) => targetBedtimeMs - new Date(e.timestamp).getTime() <= 24 * 3600 * 1000 && new Date(e.timestamp).getTime() <= targetBedtimeMs)
    .reduce((sum, e) => sum + e.alcoholGrams, 0);

  const avgHrv =
    sleepRecords.length > 0
      ? Math.round(sleepRecords.reduce((s, r) => s + r.hrvMs, 0) / sleepRecords.length)
      : 58;
  const avgRem =
    sleepRecords.length > 0
      ? Math.round(sleepRecords.reduce((s, r) => s + r.remSleepMinutes, 0) / sleepRecords.length)
      : 92;

  if (recentAlcoholGrams >= 14) {
    const standardDrinks = calculateStandardDrinks(recentAlcoholGrams);
    insights.push({
      id: 'alcohol-rem-suppression',
      severity: standardDrinks >= 2 ? 'alert' : 'caution',
      category: 'alcohol',
      title: `Aldehyde Dehydrogenase Load & REM Fragmentation (${standardDrinks} std drinks)`,
      mechanism: `Metabolizing ${recentAlcoholGrams.toFixed(1)}g of ethanol elevates sympathetic tone (+4–7 bpm resting HR) and suppresses acetylcholine-driven REM sleep cycles during the first half of the night.`,
      recommendation:
        'Allow 3.5+ hours between your last alcoholic drink and sleep onset, and pair with 400 mL electrolyte hydration.',
      metricDeltaLabel: `Baseline HRV ${avgHrv} ms · Est. -${Math.round(standardDrinks * 11)}% REM`,
    });
  } else {
    insights.push({
      id: 'alcohol-rem-optimal',
      severity: 'optimal',
      category: 'alcohol',
      title: 'Uncompromised Parasympathetic HRV & REM Recovery',
      mechanism: `Zero significant evening ethanol load detected. Wearable baseline shows ${avgRem} min average REM duration and ${avgHrv} ms autonomic HRV recovery.`,
      recommendation: 'Continue zero-alcohol evenings on high cognitive or athletic training days.',
      metricDeltaLabel: `${avgRem} min avg REM · ${avgHrv} ms HRV`,
    });
  }

  // 3. Analyze tobacco/nicotine intake proximity to sleep latency & resting HR
  const recentTobaccoEntries = entries.filter(
    (e) =>
      e.category === 'tobacco' &&
      targetBedtimeMs - new Date(e.timestamp).getTime() <= 18 * 3600 * 1000 &&
      new Date(e.timestamp).getTime() <= targetBedtimeMs
  );
  const totalNicotineMg = recentTobaccoEntries.reduce((sum, e) => sum + e.nicotineMg, 0);
  const bedtimeNicotine = calculateActiveNicotineMg(entries, targetBedtimeMs);

  if (totalNicotineMg > 0) {
    const modalitiesUsed = Array.from(
      new Set(recentTobaccoEntries.map((e) => e.tobaccoType || 'tobacco'))
    ).join(', ');
    insights.push({
      id: 'tobacco-sympathetic-arousal',
      severity: bedtimeNicotine >= 0.8 ? 'alert' : 'caution',
      category: 'tobacco',
      title: `Nicotinic Cholinergic Arousal (${totalNicotineMg.toFixed(1)} mg absorbed via ${modalitiesUsed})`,
      mechanism:
        'Nicotine stimulates nicotinic acetylcholine receptors, triggering catecholamine release that increases sleep onset latency by 12–25 minutes and induces early-morning withdrawal micro-arousals.',
      recommendation:
        'Avoid cigarettes, cigars, chew, pipes, or vapes within 3 hours of bedtime to allow acute plasma nicotine to clear by 75%.',
      metricDeltaLabel: `+${Math.max(8, Math.round(bedtimeNicotine * 12))} min Sleep Latency`,
    });
  } else {
    insights.push({
      id: 'tobacco-clear',
      severity: 'optimal',
      category: 'tobacco',
      title: 'Zero Nicotinic Sleep Latency Interference',
      mechanism:
        'No systemic nicotine or cotinine elevation detected in the current window, supporting rapid sleep onset latency (<14 mins) and lower nocturnal resting heart rate.',
      recommendation: 'Keep evening hours nicotine-free to maintain low nocturnal resting heart rate.',
      metricDeltaLabel: '12 min avg Sleep Latency',
    });
  }

  return insights;
}

export const SAFE_SLEEP_THRESHOLDS = {
  caffeineMg: 45,
  alcoholBacPercent: 0.015,
  nicotineMg: 0.5,
} as const;

export interface SafeSleepRatioSummary {
  caffeinePctOfSafeLimit: number;
  alcoholPctOfSafeLimit: number;
  tobaccoPctOfSafeLimit: number;
  sleepReadinessScore: number;
  isCaffeineSafe: boolean;
  isAlcoholSafe: boolean;
  isTobaccoSafe: boolean;
  isAllSafeForSleep: boolean;
}

/**
 * Computes a combined Sleep Readiness Score (0–100) showing how current or projected
 * caffeine, alcohol (BAC), and tobacco/nicotine intake affect sleep architecture readiness.
 * - 100 = Zero substance interference (optimal adenosine pressure, REM & HRV readiness)
 * - >= 75 = Safe Sleep Readiness Zone
 * - < 75 = Elevated physiological interference with sleep architecture
 */
export function calculateSleepReadinessScore(point: {
  activeCaffeineMg: number;
  estimatedBac: number;
  activeNicotineMg: number;
}): number {
  const caffRatio = Math.max(0, point.activeCaffeineMg) / SAFE_SLEEP_THRESHOLDS.caffeineMg;
  const bacRatio = Math.max(0, point.estimatedBac) / SAFE_SLEEP_THRESHOLDS.alcoholBacPercent;
  const nicRatio = Math.max(0, point.activeNicotineMg) / SAFE_SLEEP_THRESHOLDS.nicotineMg;

  const caffPenalty = Math.min(48, caffRatio * 15);
  const bacPenalty = Math.min(42, bacRatio * 15);
  const nicPenalty = Math.min(30, nicRatio * 12);

  const rawScore = 100 - (caffPenalty + bacPenalty + nicPenalty);
  return Math.round(Math.max(5, Math.min(100, rawScore)));
}

export function calculateSafeSleepRatios(point: {
  activeCaffeineMg: number;
  estimatedBac: number;
  activeNicotineMg: number;
}): SafeSleepRatioSummary {
  const caffeinePct = Math.round((point.activeCaffeineMg / SAFE_SLEEP_THRESHOLDS.caffeineMg) * 100);
  const alcoholPct = Math.round(
    (point.estimatedBac / SAFE_SLEEP_THRESHOLDS.alcoholBacPercent) * 100
  );
  const tobaccoPct = Math.round((point.activeNicotineMg / SAFE_SLEEP_THRESHOLDS.nicotineMg) * 100);
  const sleepReadinessScore = calculateSleepReadinessScore(point);

  return {
    caffeinePctOfSafeLimit: caffeinePct,
    alcoholPctOfSafeLimit: alcoholPct,
    tobaccoPctOfSafeLimit: tobaccoPct,
    sleepReadinessScore,
    isCaffeineSafe: point.activeCaffeineMg <= SAFE_SLEEP_THRESHOLDS.caffeineMg,
    isAlcoholSafe: point.estimatedBac <= SAFE_SLEEP_THRESHOLDS.alcoholBacPercent,
    isTobaccoSafe: point.activeNicotineMg <= SAFE_SLEEP_THRESHOLDS.nicotineMg,
    isAllSafeForSleep:
      point.activeCaffeineMg <= SAFE_SLEEP_THRESHOLDS.caffeineMg &&
      point.estimatedBac <= SAFE_SLEEP_THRESHOLDS.alcoholBacPercent &&
      point.activeNicotineMg <= SAFE_SLEEP_THRESHOLDS.nicotineMg,
  };
}

export function deleteRecordsByIds<T extends { id: string }>(
  records: T[],
  idsToRemove: string[]
): T[] {
  const removeSet = new Set(idsToRemove);
  return records.filter((record) => !removeSet.has(record.id));
}

export function deleteRecordsBeforeTimestamp(
  entries: IntakeEntry[],
  cutoffMs: number
): { remaining: IntakeEntry[]; removed: IntakeEntry[] } {
  const remaining: IntakeEntry[] = [];
  const removed: IntakeEntry[] = [];
  for (const entry of entries) {
    if (new Date(entry.timestamp).getTime() < cutoffMs) {
      removed.push(entry);
    } else {
      remaining.push(entry);
    }
  }
  return { remaining, removed };
}

export function deleteSleepRecordsByDate(
  records: SleepRecord[],
  dateStr: string
): { remaining: SleepRecord[]; removed: SleepRecord[] } {
  const remaining: SleepRecord[] = [];
  const removed: SleepRecord[] = [];
  for (const rec of records) {
    if (rec.date === dateStr) {
      removed.push(rec);
    } else {
      remaining.push(rec);
    }
  }
  return { remaining, removed };
}

/**
 * Given a target bedtime in 24h format (e.g. "22:30"), computes calibrated
 * pharmacokinetic cutoff times for Caffeine (-8.5h), Alcohol (-3.5h),
 * Tobacco/Nicotine (-2.5h), and Melatonin Wind-Down (-45m).
 */
export function calculateDynamicCutoffTimes(targetBedtime24h: string): {
  caffeineCutoff: string;
  alcoholCutoff: string;
  tobaccoCutoff: string;
  windDownTime: string;
  targetBedtime: string;
} {
  const [rawH, rawM] = targetBedtime24h.split(':').map((n) => parseInt(n, 10));
  const bedHours = Number.isNaN(rawH) ? 22 : rawH;
  const bedMinutes = Number.isNaN(rawM) ? 30 : rawM;
  const totalBedMinutes = bedHours * 60 + bedMinutes;

  const shiftMinutes = (offsetMins: number): string => {
    const wrapped = (((totalBedMinutes + offsetMins) % 1440) + 1440) % 1440;
    const h = Math.floor(wrapped / 60);
    const m = wrapped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return {
    caffeineCutoff: shiftMinutes(-510), // -8.5 hours
    alcoholCutoff: shiftMinutes(-210), // -3.5 hours
    tobaccoCutoff: shiftMinutes(-150), // -2.5 hours
    windDownTime: shiftMinutes(-45), // -45 minutes
    targetBedtime: shiftMinutes(0),
  };
}

export function getNextUpcomingSleepReminder<
  T extends { enabled: boolean; time24h: string; title: string }
>(reminders: T[], currentTime24h: string): { reminder: T; minutesUntil: number } | null {
  const enabledList = reminders.filter((r) => r.enabled);
  if (enabledList.length === 0) return null;

  const [curH, curM] = currentTime24h.split(':').map((n) => parseInt(n, 10));
  const curTotal = (Number.isNaN(curH) ? 0 : curH) * 60 + (Number.isNaN(curM) ? 0 : curM);

  let best: { reminder: T; minutesUntil: number } | null = null;
  for (const rem of enabledList) {
    const [rH, rM] = rem.time24h.split(':').map((n) => parseInt(n, 10));
    const remTotal = (Number.isNaN(rH) ? 0 : rH) * 60 + (Number.isNaN(rM) ? 0 : rM);
    let diff = remTotal - curTotal;
    if (diff < 0) diff += 1440;
    if (!best || diff < best.minutesUntil) {
      best = { reminder: rem, minutesUntil: diff };
    }
  }
  return best;
}


