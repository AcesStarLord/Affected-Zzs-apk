import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateActiveCaffeineMg,
  calculateActiveNicotineMg,
  calculateAlcoholGrams,
  calculateDynamicCutoffTimes,
  calculateEstimatedBAC,
  calculateSafeSleepRatios,
  calculateSleepReadinessScore,
  calculateStandardDrinks,
  calculateTobaccoNicotineMg,
  deleteRecordsBeforeTimestamp,
  deleteRecordsByIds,
  deleteSleepRecordsByDate,
  formatVolume,
  generateSleepInsights,
  getNextUpcomingSleepReminder,
  mlToOz,
  ozToMl,
} from './pharmacokinetics';
import { encryptVaultData, decryptVaultData } from './cryptoBackup';
import {
  lookupBarcodeProduct,
  searchCigarsByNameAndSize,
  searchDrinksByName,
} from '../data/seedData';
import { IntakeEntry, SleepRecord } from '../types/health';

test('deleteRecordsByIds, deleteRecordsBeforeTimestamp, and deleteSleepRecordsByDate remove target records accurately', () => {
  const t0 = Date.parse('2026-11-05T12:00:00.000Z');
  const sampleEntries: IntakeEntry[] = [
    {
      id: 'rec-today',
      timestamp: new Date(t0).toISOString(),
      name: 'Today Coffee',
      category: 'caffeine',
      caffeineMg: 120,
      alcoholGrams: 0,
      standardDrinks: 0,
      nicotineMg: 0,
    },
    {
      id: 'rec-yesterday',
      timestamp: new Date(t0 - 26 * 3600 * 1000).toISOString(),
      name: 'Yesterday Stout',
      category: 'alcohol',
      caffeineMg: 0,
      alcoholGrams: 14,
      standardDrinks: 1,
      nicotineMg: 0,
    },
  ];

  const afterIdDelete = deleteRecordsByIds(sampleEntries, ['rec-yesterday']);
  assert.equal(afterIdDelete.length, 1);
  assert.equal(afterIdDelete[0].id, 'rec-today');

  const cutoffStartOfToday = Date.parse('2026-11-05T00:00:00.000Z');
  const { remaining, removed } = deleteRecordsBeforeTimestamp(sampleEntries, cutoffStartOfToday);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'rec-today');
  assert.equal(removed.length, 1);
  assert.equal(removed[0].id, 'rec-yesterday');

  const sleepList: SleepRecord[] = [
    {
      id: 's-1',
      date: '2026-11-03',
      source: 'Apple Health',
      totalSleepMinutes: 440,
      deepSleepMinutes: 80,
      remSleepMinutes: 90,
      sleepLatencyMinutes: 12,
      awakenings: 1,
      restingHeartRateBpm: 54,
      hrvMs: 62,
      sleepScore: 86,
      bedtimeIso: '2026-11-03T23:00:00.000Z',
      wakeTimeIso: '2026-11-04T06:20:00.000Z',
    },
    {
      id: 's-2',
      date: '2026-11-04',
      source: 'Google Fit',
      totalSleepMinutes: 460,
      deepSleepMinutes: 88,
      remSleepMinutes: 98,
      sleepLatencyMinutes: 10,
      awakenings: 1,
      restingHeartRateBpm: 52,
      hrvMs: 66,
      sleepScore: 90,
      bedtimeIso: '2026-11-04T23:00:00.000Z',
      wakeTimeIso: '2026-11-05T06:40:00.000Z',
    },
  ];

  const sleepDeleted = deleteSleepRecordsByDate(sleepList, '2026-11-03');
  assert.equal(sleepDeleted.remaining.length, 1);
  assert.equal(sleepDeleted.remaining[0].date, '2026-11-04');
  assert.equal(sleepDeleted.removed.length, 1);
});

test('calculateSafeSleepRatios and calculateSleepReadinessScore evaluate safe sleep levels and combined sleep readiness', () => {
  const zeroPoint = calculateSafeSleepRatios({
    activeCaffeineMg: 0,
    estimatedBac: 0,
    activeNicotineMg: 0,
  });
  assert.equal(zeroPoint.sleepReadinessScore, 100);

  const safePoint = calculateSafeSleepRatios({
    activeCaffeineMg: 22.5,
    estimatedBac: 0.0,
    activeNicotineMg: 0.25,
  });
  assert.equal(safePoint.caffeinePctOfSafeLimit, 50);
  assert.equal(safePoint.alcoholPctOfSafeLimit, 0);
  assert.equal(safePoint.tobaccoPctOfSafeLimit, 50);
  assert.equal(safePoint.isAllSafeForSleep, true);
  assert.ok(safePoint.sleepReadinessScore >= 80 && safePoint.sleepReadinessScore < 100);

  const elevatedPoint = calculateSafeSleepRatios({
    activeCaffeineMg: 90,
    estimatedBac: 0.03,
    activeNicotineMg: 1.0,
  });
  assert.equal(elevatedPoint.caffeinePctOfSafeLimit, 200);
  assert.equal(elevatedPoint.alcoholPctOfSafeLimit, 200);
  assert.equal(elevatedPoint.tobaccoPctOfSafeLimit, 200);
  assert.equal(elevatedPoint.isAllSafeForSleep, false);
  assert.ok(elevatedPoint.sleepReadinessScore < 50);
  assert.equal(
    calculateSleepReadinessScore({ activeCaffeineMg: 90, estimatedBac: 0.03, activeNicotineMg: 1.0 }),
    elevatedPoint.sleepReadinessScore
  );
});

test('calculateDynamicCutoffTimes and getNextUpcomingSleepReminder compute circadian schedule', () => {
  const cutoffs = calculateDynamicCutoffTimes('22:30');
  assert.equal(cutoffs.caffeineCutoff, '14:00');
  assert.equal(cutoffs.alcoholCutoff, '19:00');
  assert.equal(cutoffs.tobaccoCutoff, '20:00');
  assert.equal(cutoffs.windDownTime, '21:45');
  assert.equal(cutoffs.targetBedtime, '22:30');

  const upcoming = getNextUpcomingSleepReminder(
    [
      { enabled: true, time24h: '14:00', title: 'Caffeine Cutoff' },
      { enabled: true, time24h: '19:00', title: 'Alcohol Cutoff' },
    ],
    '15:30'
  );
  assert.ok(upcoming);
  assert.equal(upcoming.reminder.title, 'Alcohol Cutoff');
  assert.equal(upcoming.minutesUntil, 210);
});

test('mlToOz, ozToMl, and formatVolume convert between mL and US fl oz accurately', () => {
  assert.equal(mlToOz(355), 12.0);
  assert.equal(ozToMl(12), 355);
  assert.equal(formatVolume(355, 'ml'), '355 mL');
  assert.equal(formatVolume(355, 'oz'), '12 fl oz');
});

test('searchDrinksByName and lookupBarcodeProduct match Google Health Food Database drinks by barcode, ID, and text entry', () => {
  // Text entry for caffeine
  const coldBrews = searchDrinksByName('Cold Brew', 'caffeine');
  assert.ok(coldBrews.length >= 1);
  assert.equal(coldBrews[0].name, 'Starbucks Blonde Cold Brew');

  // Barcode search for caffeine (Celsius UPC 0889392014259)
  const byCaffeineBarcode = searchDrinksByName('0889392014259', 'caffeine');
  assert.equal(byCaffeineBarcode.length, 1);
  assert.equal(byCaffeineBarcode[0].name, 'Celsius Sparkling Orange Vibe');
  assert.equal(byCaffeineBarcode[0].googleHealthFoodId, 'GH-FS-2104892');

  // Google Health Food Database ID search for alcohol (GH-FS-2301845)
  const byAlcoholGhId = searchDrinksByName('GH-FS-2301845', 'alcohol');
  assert.equal(byAlcoholGhId.length, 1);
  assert.equal(byAlcoholGhId[0].name, 'Sierra Nevada Hazy Little Thing IPA');

  // Barcode search for alcohol (Guinness UPC 5000213000144)
  const stoutsByBarcode = searchDrinksByName('5000213000144', 'alcohol');
  assert.equal(stoutsByBarcode.length, 1);
  assert.equal(stoutsByBarcode[0].abvPercent, 4.2);

  // lookupBarcodeProduct supports both barcode and text entry
  const lookupByText = lookupBarcodeProduct('Napa Valley Cabernet');
  assert.ok(lookupByText);
  assert.equal(lookupByText.category, 'alcohol');
  assert.equal(lookupByText.barcode, '0088586001123');
});

test('searchCigarsByNameAndSize filters cigars by name, vitola size, and dimensions', () => {
  const robustos = searchCigarsByNameAndSize('', 'Robusto');
  assert.ok(robustos.length >= 2);
  assert.ok(robustos.every((c) => c.vitola === 'Robusto'));

  const padron = searchCigarsByNameAndSize('Padrón', 'Robusto');
  assert.equal(padron.length, 1);
  assert.equal(padron[0].dimensions, '5.5" x 50');

  const byRingGauge = searchCigarsByNameAndSize('7.0" x 48', 'all');
  assert.equal(byRingGauge.length, 1);
  assert.equal(byRingGauge[0].vitola, 'Churchill');
});

test('calculateAlcoholGrams and calculateStandardDrinks compute accurate ethanol mass', () => {
  // 355 mL of 5.0% ABV beer => 355 * 0.05 * 0.789 = 14.0 g ethanol = 1.0 standard drink
  const grams = calculateAlcoholGrams(355, 5.0);
  assert.equal(grams, 14.0);
  assert.equal(calculateStandardDrinks(grams), 1.0);
});

test('calculateTobaccoNicotineMg handles all 5 tobacco modalities accurately', () => {
  const cig = calculateTobaccoNicotineMg('cigarettes', 2);
  assert.equal(cig.nicotineMg, 3.0);
  assert.equal(cig.unitLabel, 'cigarettes');

  const cigar = calculateTobaccoNicotineMg('cigars', 1);
  assert.equal(cigar.nicotineMg, 6.5);

  const chew = calculateTobaccoNicotineMg('chew', 2);
  assert.equal(chew.nicotineMg, 7.2);

  const pipe = calculateTobaccoNicotineMg('pipes', 1);
  assert.equal(pipe.nicotineMg, 4.2);

  const vape = calculateTobaccoNicotineMg('vapes', 20);
  assert.equal(vape.nicotineMg, 3.0);
});

test('calculateActiveCaffeineMg decays exponentially by half-life', () => {
  const t0 = Date.parse('2026-11-05T08:00:00.000Z');
  const entries: IntakeEntry[] = [
    {
      id: '1',
      timestamp: new Date(t0).toISOString(),
      name: 'Espresso',
      category: 'caffeine',
      caffeineMg: 200,
      alcoholGrams: 0,
      standardDrinks: 0,
      nicotineMg: 0,
    },
  ];

  // After 1 half-life (5 hours), 200mg -> 100mg
  const after5h = calculateActiveCaffeineMg(entries, t0 + 5 * 3600 * 1000, 5.0);
  assert.equal(after5h, 100.0);

  // After 2 half-lives (10 hours), 200mg -> 50mg
  const after10h = calculateActiveCaffeineMg(entries, t0 + 10 * 3600 * 1000, 5.0);
  assert.equal(after10h, 50.0);
});

test('calculateEstimatedBAC computes Widmark peak and linear clearance', () => {
  const t0 = Date.parse('2026-11-05T19:00:00.000Z');
  const entries: IntakeEntry[] = [
    {
      id: 'a1',
      timestamp: new Date(t0).toISOString(),
      name: '2 IPAs',
      category: 'alcohol',
      caffeineMg: 0,
      alcoholGrams: 28,
      standardDrinks: 2,
      nicotineMg: 0,
    },
  ];

  const immediateBac = calculateEstimatedBAC(entries, t0, 75, 0.68);
  assert.ok(immediateBac > 0.05 && immediateBac < 0.06);

  const after4HoursBac = calculateEstimatedBAC(entries, t0 + 4 * 3600 * 1000, 75, 0.68);
  assert.equal(after4HoursBac, 0);
});

test('calculateActiveNicotineMg decays with 2h half-life', () => {
  const t0 = Date.parse('2026-11-05T18:00:00.000Z');
  const entries: IntakeEntry[] = [
    {
      id: 'n1',
      timestamp: new Date(t0).toISOString(),
      name: 'Vape',
      category: 'tobacco',
      tobaccoType: 'vapes',
      caffeineMg: 0,
      alcoholGrams: 0,
      standardDrinks: 0,
      nicotineMg: 4.0,
    },
  ];

  assert.equal(calculateActiveNicotineMg(entries, t0 + 2 * 3600 * 1000, 2.0), 2.0);
});

test('generateSleepInsights flags elevated bedtime caffeine, alcohol, and nicotine', () => {
  const bedtime = Date.parse('2026-11-05T23:00:00.000Z');
  const entries: IntakeEntry[] = [
    {
      id: 'c1',
      timestamp: new Date(bedtime - 2 * 3600 * 1000).toISOString(),
      name: 'Late Cold Brew',
      category: 'caffeine',
      caffeineMg: 180,
      alcoholGrams: 0,
      standardDrinks: 0,
      nicotineMg: 0,
    },
    {
      id: 'a1',
      timestamp: new Date(bedtime - 1 * 3600 * 1000).toISOString(),
      name: 'Bourbon',
      category: 'alcohol',
      caffeineMg: 0,
      alcoholGrams: 28,
      standardDrinks: 2,
      nicotineMg: 0,
    },
    {
      id: 't1',
      timestamp: new Date(bedtime - 1 * 3600 * 1000).toISOString(),
      name: 'Cigar',
      category: 'tobacco',
      tobaccoType: 'cigars',
      caffeineMg: 0,
      alcoholGrams: 0,
      standardDrinks: 0,
      nicotineMg: 6.5,
    },
  ];
  const sleepRecords: SleepRecord[] = [];
  const insights = generateSleepInsights(entries, sleepRecords, bedtime, 5.0);
  assert.equal(insights.length, 3);
  assert.equal(insights[0].severity, 'alert');
  assert.equal(insights[1].severity, 'alert');
  assert.equal(insights[2].severity, 'alert');
});

test('lookupBarcodeProduct resolves catalog barcodes accurately', () => {
  const monster = lookupBarcodeProduct('0070847811169');
  assert.ok(monster);
  assert.equal(monster.caffeineMg, 150);

  const cigar = lookupBarcodeProduct('0716106001425');
  assert.ok(cigar);
  assert.equal(cigar.tobaccoType, 'cigars');
});

test('encryptVaultData and decryptVaultData perform verified AES-GCM-256 roundtrip', async () => {
  const samplePayload = JSON.stringify({ entries: [{ id: 'test-1', caffeineMg: 120 }] });
  const envelope = await encryptVaultData(samplePayload, 'correct-horse-battery-staple', 1);

  assert.equal(envelope.algorithm, 'AES-GCM-256');
  assert.ok(envelope.ciphertextBase64.length > 10);

  const decrypted = await decryptVaultData(envelope, 'correct-horse-battery-staple');
  assert.equal(decrypted, samplePayload);

  await assert.rejects(async () => {
    await decryptVaultData(envelope, 'wrong-passphrase');
  });
});
