/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Barcode,
  Bell,
  Clock,
  Coffee,
  Flame,
  Lock,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Wine,
  X,
} from 'lucide-react';
import {
  CustomDrinkTemplate,
  IntakeEntry,
  SleepRecord,
  SleepReminder,
  SubstanceCategory,
  TobaccoSubType,
  VolumeUnit,
  WearableSyncStatus,
} from './types/health';
import {
  INITIAL_CUSTOM_DRINKS,
  INITIAL_SLEEP_REMINDERS,
  INITIAL_WEARABLES,
  searchDrinksByName,
} from './data/seedData';
import {
  buildHourlyClearanceTimeline,
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
  SAFE_SLEEP_THRESHOLDS,
} from './utils/pharmacokinetics';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { SubstanceLogModal } from './components/SubstanceLogModal';
import { TrendsAndInsightsView } from './components/TrendsAndInsightsView';
import { WearablesAndSecurityView } from './components/WearablesAndSecurityView';
import { BiometricLockModal } from './components/BiometricLockModal';
import { SleepRemindersModal } from './components/SleepRemindersModal';

type ActiveView = 'overview' | 'trends' | 'custom_drinks' | 'wearables_vault';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  // Start with no example substance intake or sleep records logged
  const [entries, setEntries] = useState<IntakeEntry[]>([]);
  const [customDrinks, setCustomDrinks] = useState<CustomDrinkTemplate[]>(INITIAL_CUSTOM_DRINKS);
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([]);
  const [wearables, setWearables] = useState<WearableSyncStatus[]>(INITIAL_WEARABLES);

  // Pharmacokinetic & Measurement Unit settings
  const [caffeineHalfLife, setCaffeineHalfLife] = useState<number>(5.0);
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>('ml');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Sleep Reminders & Circadian Cutoff Schedule
  const [sleepReminders, setSleepReminders] = useState<SleepReminder[]>(INITIAL_SLEEP_REMINDERS);
  const [targetBedtime, setTargetBedtime] = useState<string>('22:30');
  const [isSleepRemindersModalOpen, setIsSleepRemindersModalOpen] = useState<boolean>(false);
  const [activeReminderBanner, setActiveReminderBanner] = useState<SleepReminder | null>(null);

  // Interactive Graph Series Visibility State (Alcohol, Caffeine, Tobacco, Sleep Readiness Score)
  const [visibleGraphSeries, setVisibleGraphSeries] = useState<{
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

  const handleToggleGraphSeries = (
    series: 'caffeine' | 'alcohol' | 'tobacco' | 'sleepReadiness'
  ) => {
    setVisibleGraphSeries((prev) => ({
      ...prev,
      [series]: !prev[series],
    }));
  };

  // AI Sleep Recommendations State
  const [aiRecommendations, setAiRecommendations] = useState<{
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
  const [isGeneratingAiSleep, setIsGeneratingAiSleep] = useState<boolean>(false);

  // Modals
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isSubstanceModalOpen, setIsSubstanceModalOpen] = useState(false);
  const [substanceModalInitialTab, setSubstanceModalInitialTab] = useState<SubstanceCategory>('caffeine');

  // Ledger filters & record deletion state
  const [categoryFilter, setCategoryFilter] = useState<'all' | SubstanceCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [lastDeletedEntries, setLastDeletedEntries] = useState<IntakeEntry[]>([]);
  const [lastDeletedSleepRecords, setLastDeletedSleepRecords] = useState<SleepRecord[]>([]);

  // Custom Drink inline creator & search on Custom Drinks tab
  const [inlineDrinkSearch, setInlineDrinkSearch] = useState('');
  const [newDrinkName, setNewDrinkName] = useState('');
  const [newDrinkCat, setNewDrinkCat] = useState<'caffeine' | 'alcohol'>('caffeine');
  const [newDrinkVol, setNewDrinkVol] = useState('250');
  const [newDrinkCaff, setNewDrinkCaff] = useState('110');
  const [newDrinkAbv, setNewDrinkAbv] = useState('5.5');
  const [newDrinkStartTime, setNewDrinkStartTime] = useState('08:30');
  const [newDrinkEndTime, setNewDrinkEndTime] = useState('09:00');
  const [customDrinkError, setCustomDrinkError] = useState<string | null>(null);

  // Biometric Security State
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(true);
  const [biometricCredentialId, setBiometricCredentialId] = useState<string | null>(
    'passkey-enclave-8f94a21c90e4'
  );
  const [isVaultLocked, setIsVaultLocked] = useState<boolean>(false);

  const nowMs = Date.now();

  // Target bedtime tonight synchronized with targetBedtime state
  const tonightBedtimeMs = useMemo(() => {
    const d = new Date(nowMs);
    const [bH, bM] = targetBedtime.split(':').map((n) => parseInt(n, 10));
    d.setHours(Number.isNaN(bH) ? 22 : bH, Number.isNaN(bM) ? 30 : bM, 0, 0);
    if (d.getTime() < nowMs) {
      d.setDate(d.getDate() + 1);
    }
    return d.getTime();
  }, [nowMs, targetBedtime]);

  const currentClock24h = useMemo(() => {
    const d = new Date(nowMs);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, [nowMs]);

  const nextUpcomingReminder = useMemo(
    () => getNextUpcomingSleepReminder(sleepReminders, currentClock24h),
    [sleepReminders, currentClock24h]
  );

  // Active metrics right now & at bedtime
  const activeCaffeineNow = useMemo(
    () => calculateActiveCaffeineMg(entries, nowMs, caffeineHalfLife),
    [entries, nowMs, caffeineHalfLife]
  );
  const bedtimeCaffeineForecast = useMemo(
    () => calculateActiveCaffeineMg(entries, tonightBedtimeMs, caffeineHalfLife),
    [entries, tonightBedtimeMs, caffeineHalfLife]
  );
  const activeNicotineNow = useMemo(
    () => calculateActiveNicotineMg(entries, nowMs),
    [entries, nowMs]
  );
  const currentEstimatedBac = useMemo(
    () => calculateEstimatedBAC(entries, nowMs),
    [entries, nowMs]
  );
  const currentSleepReadinessScore = useMemo(
    () =>
      calculateSleepReadinessScore({
        activeCaffeineMg: activeCaffeineNow,
        estimatedBac: currentEstimatedBac,
        activeNicotineMg: activeNicotineNow,
      }),
    [activeCaffeineNow, currentEstimatedBac, activeNicotineNow]
  );
  const bedtimeSleepReadinessScore = useMemo(
    () =>
      calculateSleepReadinessScore({
        activeCaffeineMg: bedtimeCaffeineForecast,
        estimatedBac: calculateEstimatedBAC(entries, tonightBedtimeMs),
        activeNicotineMg: calculateActiveNicotineMg(entries, tonightBedtimeMs),
      }),
    [bedtimeCaffeineForecast, entries, tonightBedtimeMs]
  );

  // Last 24h cumulative intake totals
  const last24hTotals = useMemo(() => {
    const cutoff = nowMs - 24 * 3600 * 1000;
    const recent = entries.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
    return {
      caffeineMg: Math.round(recent.reduce((s, e) => s + e.caffeineMg, 0)),
      alcoholGrams: Math.round(recent.reduce((s, e) => s + e.alcoholGrams, 0) * 10) / 10,
      standardDrinks: Math.round(recent.reduce((s, e) => s + e.standardDrinks, 0) * 100) / 100,
      nicotineMg: Math.round(recent.reduce((s, e) => s + e.nicotineMg, 0) * 100) / 100,
      tobaccoCount: recent.filter((e) => e.category === 'tobacco').length,
    };
  }, [entries, nowMs]);

  const latestSleep = sleepRecords[sleepRecords.length - 1];

  const sleepInsights = useMemo(
    () => generateSleepInsights(entries, sleepRecords, tonightBedtimeMs, caffeineHalfLife),
    [entries, sleepRecords, tonightBedtimeMs, caffeineHalfLife]
  );

  // 24-hour pharmacokinetic timeline starting 16 hours ago to +7 hours ahead
  const kineticTimeline = useMemo(() => {
    const startWindowMs = nowMs - 15 * 3600 * 1000;
    return buildHourlyClearanceTimeline(entries, startWindowMs, caffeineHalfLife);
  }, [entries, nowMs, caffeineHalfLife]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = entry.name.toLowerCase().includes(q);
        const matchBrand = (entry.brand || '').toLowerCase().includes(q);
        const matchBarcode = (entry.barcode || '').includes(q);
        const matchTobacco = (entry.tobaccoType || '').toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchBarcode && !matchTobacco) return false;
      }
      return true;
    });
  }, [entries, categoryFilter, searchQuery]);

  // Handlers
  const handleAddEntry = (newEntry: Omit<IntakeEntry, 'id'>) => {
    const created: IntakeEntry = {
      ...newEntry,
      id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setEntries((prev) => [created, ...prev]);
  };

  const handleDeleteEntry = (id: string) => {
    const target = entries.find((item) => item.id === id);
    if (target) {
      setLastDeletedEntries([target]);
    }
    setEntries((prev) => deleteRecordsByIds(prev, [id]));
    setSelectedEntryIds((prev) => prev.filter((selId) => selId !== id));
  };

  const handleToggleSelectEntry = (id: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllFiltered = () => {
    const filteredIds = filteredEntries.map((e) => e.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedEntryIds.includes(id));
    if (allSelected) {
      setSelectedEntryIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedEntryIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleDeleteSelectedEntries = () => {
    if (selectedEntryIds.length === 0) return;
    const toRemove = entries.filter((e) => selectedEntryIds.includes(e.id));
    setLastDeletedEntries(toRemove);
    setEntries((prev) => deleteRecordsByIds(prev, selectedEntryIds));
    setSelectedEntryIds([]);
  };

  const handleDeletePreviousDaysEntries = () => {
    const startOfToday = new Date(nowMs);
    startOfToday.setHours(0, 0, 0, 0);
    const { remaining, removed } = deleteRecordsBeforeTimestamp(entries, startOfToday.getTime());
    if (removed.length === 0) return;
    setLastDeletedEntries(removed);
    setEntries(remaining);
    const removedIds = new Set(removed.map((r) => r.id));
    setSelectedEntryIds((prev) => prev.filter((id) => !removedIds.has(id)));
  };

  const handleUndoDeleteEntries = () => {
    if (lastDeletedEntries.length === 0) return;
    setEntries((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const restored = lastDeletedEntries.filter((e) => !existingIds.has(e.id));
      return [...restored, ...prev].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    });
    setLastDeletedEntries([]);
  };

  const handleDeleteCustomDrink = (id: string) => {
    setCustomDrinks((prev) => deleteRecordsByIds(prev, [id]));
  };

  const handleDeleteSleepRecord = (id: string) => {
    const target = sleepRecords.find((r) => r.id === id);
    if (target) {
      setLastDeletedSleepRecords([target]);
    }
    setSleepRecords((prev) => deleteRecordsByIds(prev, [id]));
  };

  const handleDeleteSleepByDate = (dateStr: string) => {
    const { remaining, removed } = deleteSleepRecordsByDate(sleepRecords, dateStr);
    if (removed.length === 0) return;
    setLastDeletedSleepRecords(removed);
    setSleepRecords(remaining);
  };

  const handleUndoDeleteSleep = () => {
    if (lastDeletedSleepRecords.length === 0) return;
    setSleepRecords((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const restored = lastDeletedSleepRecords.filter((r) => !existingIds.has(r.id));
      return [...prev, ...restored].sort((a, b) => a.date.localeCompare(b.date));
    });
    setLastDeletedSleepRecords([]);
  };

  const handleSaveCustomDrink = (drink: Omit<CustomDrinkTemplate, 'id' | 'createdAt'>) => {
    setCustomDrinks((prev) => {
      const exists = prev.some((d) => d.name.toLowerCase() === drink.name.toLowerCase());
      if (exists) return prev;
      return [
        {
          ...drink,
          id: `cust-${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });
  };

  const handleQuickLogTobacco = (subType: TobaccoSubType, label: string, units: number) => {
    const { nicotineMg, unitLabel } = calculateTobaccoNicotineMg(subType, units);
    handleAddEntry({
      timestamp: new Date().toISOString(),
      name: label,
      brand: `Quick Log · ${subType}`,
      category: 'tobacco',
      caffeineMg: 0,
      alcoholGrams: 0,
      standardDrinks: 0,
      tobaccoType: subType,
      tobaccoUnits: units,
      tobaccoUnitLabel: unitLabel,
      nicotineMg,
    });
  };

  const handleQuickLogCustomDrink = (template: CustomDrinkTemplate) => {
    handleAddEntry({
      timestamp: new Date().toISOString(),
      name: template.name,
      brand: 'Custom Drink Library',
      category: template.category,
      isCustomDrink: true,
      volumeMl: template.volumeMl,
      caffeineMg: template.caffeineMg,
      abvPercent: template.abvPercent,
      alcoholGrams: template.alcoholGrams,
      standardDrinks: template.standardDrinks,
      nicotineMg: 0,
    });
  };

  const handleChangeVolumeUnit = (nextUnit: VolumeUnit) => {
    if (nextUnit === volumeUnit) return;
    const parsedVol = parseFloat(newDrinkVol);
    if (!Number.isNaN(parsedVol) && parsedVol > 0) {
      setNewDrinkVol(
        nextUnit === 'oz' ? String(mlToOz(parsedVol)) : String(ozToMl(parsedVol))
      );
    }
    setVolumeUnit(nextUnit);
  };

  const handleCreateCustomDrinkInline = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomDrinkError(null);
    const trimmed = newDrinkName.trim();
    const rawVol = parseFloat(newDrinkVol);
    if (!trimmed) {
      setCustomDrinkError('Enter a name for your custom drink.');
      return;
    }
    if (Number.isNaN(rawVol) || rawVol <= 0) {
      setCustomDrinkError(`Enter a valid volume in ${volumeUnit === 'oz' ? 'fl oz' : 'mL'}.`);
      return;
    }
    const volMl = volumeUnit === 'oz' ? ozToMl(rawVol) : Math.round(rawVol);

    if (newDrinkCat === 'caffeine') {
      const caff = parseFloat(newDrinkCaff);
      if (Number.isNaN(caff) || caff <= 0) {
        setCustomDrinkError('Enter a valid caffeine dose in mg.');
        return;
      }
      const created: Omit<CustomDrinkTemplate, 'id' | 'createdAt'> = {
        name: trimmed,
        category: 'caffeine',
        volumeMl: volMl,
        caffeineMg: Math.round(caff),
        abvPercent: 0,
        alcoholGrams: 0,
        standardDrinks: 0,
      };
      handleSaveCustomDrink(created);
      handleAddEntry({
        timestamp: new Date().toISOString(),
        name: trimmed,
        brand: 'Custom Drink Spec',
        category: 'caffeine',
        isCustomDrink: true,
        drinkStartTime: newDrinkStartTime || undefined,
        drinkEndTime: newDrinkEndTime || undefined,
        volumeMl: volMl,
        caffeineMg: Math.round(caff),
        alcoholGrams: 0,
        standardDrinks: 0,
        nicotineMg: 0,
      });
      setNewDrinkName('');
    } else {
      const abv = parseFloat(newDrinkAbv);
      if (Number.isNaN(abv) || abv <= 0) {
        setCustomDrinkError('Enter a valid ABV percentage.');
        return;
      }
      const grams = calculateAlcoholGrams(volMl, abv);
      const std = calculateStandardDrinks(grams);
      const created: Omit<CustomDrinkTemplate, 'id' | 'createdAt'> = {
        name: trimmed,
        category: 'alcohol',
        volumeMl: volMl,
        caffeineMg: 0,
        abvPercent: abv,
        alcoholGrams: grams,
        standardDrinks: std,
      };
      handleSaveCustomDrink(created);
      handleAddEntry({
        timestamp: new Date().toISOString(),
        name: trimmed,
        brand: 'Custom Pour Spec',
        category: 'alcohol',
        isCustomDrink: true,
        drinkStartTime: newDrinkStartTime || undefined,
        drinkEndTime: newDrinkEndTime || undefined,
        volumeMl: volMl,
        abvPercent: abv,
        caffeineMg: 0,
        alcoholGrams: grams,
        standardDrinks: std,
        nicotineMg: 0,
      });
      setNewDrinkName('');
    }
  };

  const handleSyncWearable = (provider: 'apple_health' | 'google_fit') => {
    const nowIso = new Date().toISOString();
    setWearables((prev) =>
      prev.map((w) =>
        w.provider === provider
          ? { ...w, lastSyncedAt: nowIso, syncedDaysCount: w.syncedDaysCount + 1 }
          : w
      )
    );

    // Append or update today's wearable sleep record
    const sourceLabel = provider === 'apple_health' ? 'Apple Health' : 'Google Fit';
    const syncedNight: SleepRecord = {
      id: `sleep-sync-${Date.now()}`,
      date: '2026-11-05',
      source: sourceLabel,
      totalSleepMinutes: 468,
      deepSleepMinutes: 91,
      remSleepMinutes: 106,
      sleepLatencyMinutes: 10,
      awakenings: 1,
      restingHeartRateBpm: 50,
      hrvMs: 71,
      sleepScore: 91,
      bedtimeIso: '2026-11-04T22:40:00.000Z',
      wakeTimeIso: '2026-11-05T06:28:00.000Z',
    };

    setSleepRecords((prev) => {
      const filtered = prev.filter((r) => r.date !== '2026-11-05');
      return [...filtered, syncedNight];
    });
  };

  const handleToggleWearableConnection = (provider: 'apple_health' | 'google_fit') => {
    setWearables((prev) =>
      prev.map((w) => (w.provider === provider ? { ...w, connected: !w.connected } : w))
    );
  };

  // Sleep Reminders Handlers
  const playGentleReminderChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch {
      // AudioContext blocked or unsupported
    }
  };

  const handleToggleSleepReminder = (id: string) => {
    setSleepReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleUpdateSleepReminderTime = (id: string, time24h: string) => {
    setSleepReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, time24h } : r))
    );
  };

  const handleDeleteSleepReminder = (id: string) => {
    setSleepReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddSleepReminder = (newRem: Omit<SleepReminder, 'id'>) => {
    setSleepReminders((prev) => [
      ...prev,
      { ...newRem, id: `rem-${Date.now()}` },
    ]);
  };

  const handleAutoCalibrateCutoffsFromBedtime = (bedtime24h: string) => {
    setTargetBedtime(bedtime24h);
    const cal = calculateDynamicCutoffTimes(bedtime24h);
    setSleepReminders((prev) =>
      prev.map((rem) => {
        if (rem.type === 'caffeine_cutoff') return { ...rem, time24h: cal.caffeineCutoff };
        if (rem.type === 'alcohol_cutoff') return { ...rem, time24h: cal.alcoholCutoff };
        if (rem.type === 'tobacco_cutoff') return { ...rem, time24h: cal.tobaccoCutoff };
        if (rem.type === 'wind_down') return { ...rem, time24h: cal.windDownTime };
        if (rem.type === 'target_bedtime') return { ...rem, time24h: cal.targetBedtime };
        return rem;
      })
    );
  };

  const handleTriggerTestReminderAlert = (rem: SleepReminder) => {
    setActiveReminderBanner(rem);
    if (rem.soundAlert) {
      playGentleReminderChime();
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`Affected Zzs · ${rem.title} (${rem.time24h})`, {
        body: rem.description,
      });
    }
  };

  const handleGenerateAiSleepRecommendations = async () => {
    setIsGeneratingAiSleep(true);
    const cutoffs = calculateDynamicCutoffTimes(targetBedtime);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const response = await fetch('/api/ai-sleep-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          activeCaffeineMg: activeCaffeineNow,
          activeBacPercent: currentEstimatedBac,
          activeNicotineMg: activeNicotineNow,
          sleepReadinessScore: bedtimeSleepReadinessScore,
          targetBedtime,
          caffeineCutoffTime: cutoffs.caffeineCutoff,
          alcoholCutoffTime: cutoffs.alcoholCutoff,
          tobaccoCutoffTime: cutoffs.tobaccoCutoff,
          recentEntries: entries.slice(0, 8),
          recentSleepRecords: sleepRecords.slice(-4),
          predictedScore: bedtimeSleepReadinessScore,
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.headline && Array.isArray(data.recommendations)) {
          setAiRecommendations(data);
          setIsGeneratingAiSleep(false);
          return;
        }
      }
    } catch {
      // Fallback to calibrated pharmacokinetic AI coaching synthesis below
    }

    // Calibrated physiological synthesis fallback if API key is not present or offline
    const caffStatus =
      bedtimeCaffeineForecast > SAFE_SLEEP_THRESHOLDS.caffeineMg
        ? `Projected bedtime caffeine (${bedtimeCaffeineForecast} mg) exceeds the 45 mg slow-wave threshold.`
        : `Bedtime caffeine (${bedtimeCaffeineForecast} mg) clears below the 45 mg adenosine threshold.`;
    const bacStatus =
      currentEstimatedBac > 0
        ? `Active ethanol (${currentEstimatedBac.toFixed(3)}% BAC) requires ${Math.ceil(
            currentEstimatedBac / 0.015
          )}h for full enzymatic clearance.`
        : 'Zero evening ethanol load preserves first-half REM architecture.';
    const nicStatus =
      activeNicotineNow > 0
        ? `Systemic nicotine (${activeNicotineNow} mg) elevates sympathetic cholinergic tone.`
        : 'Zero nicotinic arousal supports rapid sleep onset latency.';

    setAiRecommendations({
      headline:
        bedtimeSleepReadinessScore >= 85
          ? `High Sleep Readiness (${bedtimeSleepReadinessScore}/100) — Optimal Slow-Wave & REM Architecture Projected`
          : `Moderate Sleep Readiness (${bedtimeSleepReadinessScore}/100) — Active Metabolic Clearance Protocol Recommended`,
      readinessAssessment: `${caffStatus} ${bacStatus} ${nicStatus}`,
      optimalWindDownTime: cutoffs.windDownTime,
      recommendations: [
        {
          title:
            bedtimeCaffeineForecast > 45
              ? 'Accelerate Adenosine Receptor Unblocking'
              : 'Preserve Evening Adenosine Pressure',
          category: 'Chronobiology',
          impact: bedtimeCaffeineForecast > 45 ? '+18 min Deep Sleep' : '+14% Slow-Wave Depth',
          action:
            bedtimeCaffeineForecast > 45
              ? `Avoid any further caffeinated beverages after ${cutoffs.caffeineCutoff} and pair dinner with 250 mg magnesium glycinate to counter residual sympathetic arousal.`
              : `Maintain your ${cutoffs.caffeineCutoff} caffeine cutoff and dim overhead blue-spectrum lighting at ${cutoffs.windDownTime} to trigger endogenous melatonin onset.`,
        },
        {
          title:
            currentEstimatedBac > 0
              ? 'Buffer Acetaldehyde Rebound & Nocturnal HR'
              : 'Optimize Parasympathetic HRV Recovery',
          category: 'Metabolic Clearance',
          impact: currentEstimatedBac > 0 ? '+12% REM Continuity' : '+6 ms Nocturnal HRV',
          action:
            currentEstimatedBac > 0
              ? `Consume 450 mL electrolyte water before ${cutoffs.windDownTime} and cease alcohol by ${cutoffs.alcoholCutoff} to prevent second-half REM fragmentation.`
              : `Keep a 3-hour post-meal glycemic buffer before ${targetBedtime} to lower nocturnal resting heart rate by 3–5 bpm.`,
        },
        {
          title:
            activeNicotineNow > 0
              ? 'Downregulate Nicotinic Acetylcholine Arousal'
              : 'Thermal Core Drop & Vagal Wind-Down',
          category: 'Autonomic Recovery',
          impact: '-9 min Sleep Latency',
          action:
            activeNicotineNow > 0
              ? `Halt all tobacco/nicotine intake after ${cutoffs.tobaccoCutoff} and perform 5 minutes of 4-7-8 slow exhalation breathing at ${cutoffs.windDownTime}.`
              : `Set bedroom ambient temperature to 65–67°F (18.5°C) starting at ${cutoffs.windDownTime} to facilitate rapid NREM Stage 3 entry at ${targetBedtime}.`,
        },
      ],
    });
    setIsGeneratingAiSleep(false);
  };

  const enabledRemindersCount = sleepReminders.filter((r) => r.enabled).length;

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 border-b border-slate-200/80 bg-white/85 px-6 py-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/85">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('overview');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 dark:text-slate-100"
        >
          Affected Zzs
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="flex items-center gap-7 overflow-x-auto text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('overview');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'overview'
                ? 'font-semibold text-slate-900 underline decoration-teal-600 decoration-2 underline-offset-8 dark:text-slate-100'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Overview
          </a>
          <a
            href="#trends"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('trends');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'trends'
                ? 'font-semibold text-slate-900 underline decoration-teal-600 decoration-2 underline-offset-8 dark:text-slate-100'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Trends & Sleep
          </a>
          <a
            href="#custom-drinks"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('custom_drinks');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'custom_drinks'
                ? 'font-semibold text-slate-900 underline decoration-teal-600 decoration-2 underline-offset-8 dark:text-slate-100'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Custom Drinks
          </a>
          <a
            href="#wearables-vault"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('wearables_vault');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'wearables_vault'
                ? 'font-semibold text-slate-900 underline decoration-teal-600 decoration-2 underline-offset-8 dark:text-slate-100'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Wearables & Vault
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsBarcodeModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-teal-500 hover:to-emerald-500 transition-all whitespace-nowrap shrink-0"
          >
            <Barcode className="h-4 w-4" />
            Scan Barcode
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-[1360px] px-6 py-8">
        {/* Live Sleep Reminder Preview Banner (when triggered) */}
        {activeReminderBanner && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-500/40 bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 px-5 py-3.5 text-white shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-300">
                  <span>Circadian Sleep Reminder Active</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{activeReminderBanner.time24h}</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  {activeReminderBanner.title} —{' '}
                  <span className="font-normal text-slate-300">
                    {activeReminderBanner.description}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveReminderBanner(null)}
              aria-label="Dismiss sleep reminder alert"
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>
        )}

        {/* Workspace Action & Telemetry Context Bar */}
        <div className="biometric-card mb-8 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 p-6 dark:border-slate-800/80 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-teal-700 dark:text-teal-400">
              <span>Pharmacokinetic &amp; Biometric Studio</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 dark:text-slate-400">
                Apple HealthKit &amp; Google Fit Connected
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-600 dark:text-slate-300">
                Target Bedtime {targetBedtime}
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              {activeView === 'overview' && 'Substance Clearance & Sleep Impact Telemetry'}
              {activeView === 'trends' && 'Multi-Day Trends & Personalized Sleep Insights'}
              {activeView === 'custom_drinks' && 'Custom Drinks & Barista Formulation Library'}
              {activeView === 'wearables_vault' && 'Wearable Sync, Encrypted Cloud Backup & Biometrics'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Global mL / fl oz Drink Measurement Unit Switcher */}
            <div
              role="group"
              aria-label="Drink measurement unit"
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/90 p-1 dark:border-slate-800 dark:bg-slate-800"
            >
              <button
                type="button"
                onClick={() => handleChangeVolumeUnit('ml')}
                className={`rounded-lg px-2.5 py-1 font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  volumeUnit === 'ml'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                mL
              </button>
              <button
                type="button"
                onClick={() => handleChangeVolumeUnit('oz')}
                className={`rounded-lg px-2.5 py-1 font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  volumeUnit === 'oz'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                fl oz
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSubstanceModalInitialTab('caffeine');
                setIsSubstanceModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Search &amp; Log Drink
            </button>

            <button
              type="button"
              onClick={() => {
                setSubstanceModalInitialTab('tobacco');
                setIsSubstanceModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-amber-500/40 hover:bg-amber-50/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 whitespace-nowrap shrink-0"
            >
              <Flame className="h-3.5 w-3.5 text-amber-600" />
              Search Cigar &amp; Tobacco
            </button>

            <button
              type="button"
              onClick={() => setIsSleepRemindersModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-50/70 px-3.5 py-2 text-xs font-semibold text-teal-900 hover:bg-teal-100/70 dark:border-teal-500/30 dark:bg-teal-950/50 dark:text-teal-200 whitespace-nowrap shrink-0"
            >
              <Bell className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              Sleep Reminders ({enabledRemindersCount})
            </button>

            <button
              type="button"
              onClick={() => setIsVaultLocked(true)}
              aria-label="Lock Biometric Session"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 whitespace-nowrap shrink-0"
            >
              <Lock className="h-3.5 w-3.5 text-teal-600" />
              Biometric Lock
            </button>

            <button
              type="button"
              onClick={() => setIsDarkMode((d) => !d)}
              aria-label="Toggle Circadian Night or Daylight Theme"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              title={isDarkMode ? 'Switch to Daylight Mode' : 'Switch to Circadian Night Mode'}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-8">
            {/* 4-Column Primary Biometric & Pharmacokinetic Stat Strip */}
            <section
              aria-label="Real-time Pharmacokinetic and Sleep Summary"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {/* Metric 1: Active Caffeine Level */}
              <div className="biometric-card rounded-2xl border border-slate-200/80 border-t-2 border-t-amber-500 p-5 dark:border-slate-800 dark:border-t-amber-500">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>Active Caffeine Level</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
                    <Coffee className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span
                    data-testid="active-caffeine-value"
                    className="font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums"
                  >
                    {activeCaffeineNow} mg
                  </span>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    ({last24hTotals.caffeineMg} mg / 24h)
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((activeCaffeineNow / 200) * 100))}%`,
                    }}
                  />
                </div>
                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400">
                  {targetBedtime} Bedtime Forecast:{' '}
                  <strong className="font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                    {bedtimeCaffeineForecast} mg
                  </strong>{' '}
                  · {bedtimeCaffeineForecast < 45 ? 'Sleep Safe (<45mg)' : 'Adenosine Alert'}
                </p>
              </div>

              {/* Metric 2: Estimated BAC */}
              <div className="biometric-card rounded-2xl border border-slate-200/80 border-t-2 border-t-rose-500 p-5 dark:border-slate-800 dark:border-t-rose-500">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>Estimated BAC</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:bg-rose-400/10 dark:text-rose-400">
                    <Wine className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span
                    data-testid="estimated-bac-value"
                    className="font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums"
                  >
                    {currentEstimatedBac.toFixed(3)}%
                  </span>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    ({last24hTotals.alcoholGrams} g / 24h)
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((currentEstimatedBac / 0.08) * 100))}%`,
                    }}
                  />
                </div>
                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400">
                  24h Equivalent:{' '}
                  <strong className="font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                    {last24hTotals.standardDrinks} std drinks
                  </strong>{' '}
                  · Clearance 0.015%/hr
                </p>
              </div>

              {/* Metric 3: Nicotine & Tobacco Load */}
              <div className="biometric-card rounded-2xl border border-slate-200/80 border-t-2 border-t-violet-500 p-5 dark:border-slate-800 dark:border-t-violet-500">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>Systemic Nicotine Load</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400">
                    <Flame className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span
                    data-testid="active-nicotine-value"
                    className="font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums"
                  >
                    {activeNicotineNow} mg
                  </span>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    ({last24hTotals.nicotineMg} mg / 24h)
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((activeNicotineNow / 8) * 100))}%`,
                    }}
                  />
                </div>
                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400">
                  24h Sessions:{' '}
                  <strong className="font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                    {last24hTotals.tobaccoCount} logged
                  </strong>{' '}
                  · t½ 2.0h acute clearance
                </p>
              </div>

              {/* Metric 4: Wearable Sleep Architecture */}
              <div className="biometric-card rounded-2xl border border-slate-200/80 border-t-2 border-t-teal-500 p-5 dark:border-slate-800 dark:border-t-teal-500">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>Wearable Sleep Telemetry</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-400">
                    <Moon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                    {latestSleep ? `${latestSleep.sleepScore} / 100` : '— / 100'}
                  </span>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {latestSleep ? `HRV ${latestSleep.hrvMs} ms` : 'No sleep log yet'}
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                    style={{
                      width: `${latestSleep ? latestSleep.sleepScore : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400">
                  {latestSleep ? (
                    <>
                      Deep N3:{' '}
                      <strong className="font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                        {latestSleep.deepSleepMinutes}m
                      </strong>{' '}
                      · REM:{' '}
                      <strong className="font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                        {latestSleep.remSleepMinutes}m
                      </strong>{' '}
                      ({latestSleep.source})
                    </>
                  ) : (
                    <span>Sync Apple Health / Google Fit or log sleep in Trends &amp; Sleep</span>
                  )}
                </p>
              </div>
            </section>

            {/* Quick One-Tap Substance & Tobacco Modality Bar */}
            <section className="biometric-card rounded-2xl border border-slate-200/80 p-5 dark:border-slate-800">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Rapid Telemetry Entry — Custom Drinks &amp; All 5 Tobacco Modalities
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    One-tap logging for saved custom drinks and calibrated tobacco/nicotine delivery formats
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBarcodeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-600 dark:text-teal-400 whitespace-nowrap shrink-0"
                >
                  <Barcode className="h-3.5 w-3.5" />
                  Open UPC Barcode Scanner
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {customDrinks.slice(0, 3).map((cd) => (
                  <button
                    key={cd.id}
                    type="button"
                    onClick={() => handleQuickLogCustomDrink(cd)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-teal-600 hover:bg-teal-50/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 transition-all"
                  >
                    {cd.category === 'caffeine' ? (
                      <Coffee className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <Wine className="h-3.5 w-3.5 text-rose-600" />
                    )}
                    <span>+ {cd.name}</span>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      ({cd.category === 'caffeine' ? `${cd.caffeineMg}mg` : `${cd.alcoholGrams}g`})
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    handleQuickLogTobacco('cigarettes', 'King Size Filtered Cigarette', 1)
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-violet-500 hover:bg-violet-50/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap shrink-0 transition-all"
                >
                  <Flame className="h-3.5 w-3.5 text-violet-600" />
                  + Cigarette (1.5mg)
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogTobacco('cigars', 'Hand-Rolled Corona Cigar', 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-violet-500 hover:bg-violet-50/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap shrink-0 transition-all"
                >
                  <Flame className="h-3.5 w-3.5 text-violet-600" />
                  + Cigar (6.5mg)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickLogTobacco('chew', 'Wintergreen Smokeless Chew Pouch', 1)
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-violet-500 hover:bg-violet-50/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap shrink-0 transition-all"
                >
                  <Flame className="h-3.5 w-3.5 text-violet-600" />
                  + Chew Tobacco (3.6mg)
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogTobacco('pipes', 'Briar Pipe Cavendish Bowl', 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-violet-500 hover:bg-violet-50/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap shrink-0 transition-all"
                >
                  <Flame className="h-3.5 w-3.5 text-violet-600" />
                  + Pipe Bowl (4.2mg)
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogTobacco('vapes', '5% Nicotine Vape Pod (15 Puffs)', 15)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-violet-500 hover:bg-violet-50/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap shrink-0 transition-all"
                >
                  <Flame className="h-3.5 w-3.5 text-violet-600" />
                  + Vape Session (2.25mg)
                </button>
              </div>
            </section>

            {/* 2-Column Split: 24h Pharmacokinetic & Sleep Readiness Graph + AI Sleep Coach & Forecast */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
              {/* Left 7 Cols: Combined 24-Hour Safe Sleep Level & Combined Sleep Readiness Score Graph */}
              <section className="biometric-card flex flex-col justify-between rounded-2xl border border-slate-200/80 p-6 dark:border-slate-800 lg:col-span-7">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Combined Safe Sleep &amp; Sleep Readiness Graph
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        24h clearance vs. Combined Sleep Readiness Score (0–100) showing how intake affects tonight&apos;s sleep
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        data-testid="overview-sleep-readiness-badge"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50/80 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300 tabular-nums"
                      >
                        <Moon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        Sleep Readiness: {currentSleepReadinessScore}% (Bedtime {bedtimeSleepReadinessScore}%)
                      </span>
                    </div>
                  </div>

                  {/* Interactive Series Toggles: Turn On/Off Alcohol, Caffeine, Tobacco, and/or Sleep Readiness Score */}
                  <div
                    role="group"
                    aria-label="Toggle graph display of Alcohol, Caffeine, Tobacco, and Sleep Readiness Score"
                    className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Graph Layers (On/Off):
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        aria-pressed={visibleGraphSeries.sleepReadiness}
                        onClick={() => handleToggleGraphSeries('sleepReadiness')}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                          visibleGraphSeries.sleepReadiness
                            ? 'border-emerald-500/50 bg-emerald-50 text-emerald-900 shadow-2xs dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-200'
                            : 'border-slate-200 bg-white/60 text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            visibleGraphSeries.sleepReadiness ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        />
                        <span>Sleep Readiness Score</span>
                        <span className="font-mono text-[10px]">
                          {visibleGraphSeries.sleepReadiness ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-pressed={visibleGraphSeries.caffeine}
                        onClick={() => handleToggleGraphSeries('caffeine')}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                          visibleGraphSeries.caffeine
                            ? 'border-amber-500/50 bg-amber-50 text-amber-900 shadow-2xs dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200'
                            : 'border-slate-200 bg-white/60 text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            visibleGraphSeries.caffeine ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        />
                        <span>Caffeine</span>
                        <span className="font-mono text-[10px]">
                          {visibleGraphSeries.caffeine ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-pressed={visibleGraphSeries.alcohol}
                        onClick={() => handleToggleGraphSeries('alcohol')}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                          visibleGraphSeries.alcohol
                            ? 'border-rose-500/50 bg-rose-50 text-rose-900 shadow-2xs dark:border-rose-500/40 dark:bg-rose-950/60 dark:text-rose-200'
                            : 'border-slate-200 bg-white/60 text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            visibleGraphSeries.alcohol ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        />
                        <span>Alcohol</span>
                        <span className="font-mono text-[10px]">
                          {visibleGraphSeries.alcohol ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-pressed={visibleGraphSeries.tobacco}
                        onClick={() => handleToggleGraphSeries('tobacco')}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                          visibleGraphSeries.tobacco
                            ? 'border-violet-500/50 bg-violet-50 text-violet-900 shadow-2xs dark:border-violet-500/40 dark:bg-violet-950/60 dark:text-violet-200'
                            : 'border-slate-200 bg-white/60 text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            visibleGraphSeries.tobacco ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        />
                        <span>Tobacco</span>
                        <span className="font-mono text-[10px]">
                          {visibleGraphSeries.tobacco ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <svg
                      viewBox="0 0 640 210"
                      className="h-56 w-full min-w-[480px]"
                      role="img"
                      aria-label="Combined 24-hour safe sleep level and sleep readiness score graph"
                    >
                      <defs>
                        <linearGradient id="safeZoneGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.16" />
                          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.03" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal subtle reference grid lines */}
                      <line
                        x1="40"
                        y1="58"
                        x2="620"
                        y2="58"
                        stroke="currentColor"
                        strokeDasharray="2 4"
                        className="text-slate-200 dark:text-slate-800"
                      />

                      {/* Shaded Safe Sleep Zone (below 100% threshold, from Y=114 to Y=170) */}
                      <rect
                        x="40"
                        y="114"
                        width="580"
                        height="56"
                        fill="url(#safeZoneGrad)"
                      />

                      {/* 100% Safe Sleep Threshold / 100% Readiness Reference */}
                      <line
                        x1="40"
                        y1="114"
                        x2="620"
                        y2="114"
                        stroke="#0d9488"
                        strokeDasharray="4 4"
                        strokeWidth="1.5"
                      />
                      <text
                        x="46"
                        y="108"
                        textAnchor="start"
                        className="fill-teal-700 font-mono text-[9px] font-semibold dark:fill-teal-400"
                      >
                        Safe Sleep Limit (≤45mg Caffeine · ≤0.015% BAC · ≤0.5mg Nicotine)
                      </text>

                      {/* Top 100% Sleep Readiness Reference Line (Y=30) */}
                      {visibleGraphSeries.sleepReadiness && (
                        <text
                          x="616"
                          y="26"
                          textAnchor="end"
                          className="fill-emerald-600 font-mono text-[9px] font-semibold dark:fill-emerald-400"
                        >
                          100% Sleep Readiness Score ↑
                        </text>
                      )}

                      {/* Baseline Axis */}
                      <line
                        x1="40"
                        y1="170"
                        x2="620"
                        y2="170"
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800"
                      />

                      {/* Polyline for Combined Sleep Readiness Score (0-100% mapped from Y=170 to Y=30) */}
                      {visibleGraphSeries.sleepReadiness && (
                        <polyline
                          data-testid="graph-series-sleep-readiness"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={kineticTimeline
                            .map((pt, idx) => {
                              const x = 45 + (idx / 23) * 565;
                              const score = calculateSafeSleepRatios(pt).sleepReadinessScore;
                              const y = 170 - (Math.min(100, Math.max(0, score)) / 100) * 140;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}

                      {/* Polyline for Active Caffeine Level (Amber) */}
                      {visibleGraphSeries.caffeine && (
                        <polyline
                          data-testid="graph-series-caffeine"
                          fill="none"
                          stroke="#d97706"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={kineticTimeline
                            .map((pt, idx) => {
                              const x = 45 + (idx / 23) * 565;
                              const pct = calculateSafeSleepRatios(pt).caffeinePctOfSafeLimit;
                              const y = 170 - (Math.min(250, Math.max(0, pct)) / 250) * 140;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}

                      {/* Polyline for Estimated BAC / Alcohol (Rose) */}
                      {visibleGraphSeries.alcohol && (
                        <polyline
                          data-testid="graph-series-alcohol"
                          fill="none"
                          stroke="#e11d48"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={kineticTimeline
                            .map((pt, idx) => {
                              const x = 45 + (idx / 23) * 565;
                              const pct = calculateSafeSleepRatios(pt).alcoholPctOfSafeLimit;
                              const y = 170 - (Math.min(250, Math.max(0, pct)) / 250) * 140;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}

                      {/* Polyline for Systemic Nicotine / Tobacco (Violet) */}
                      {visibleGraphSeries.tobacco && (
                        <polyline
                          data-testid="graph-series-tobacco"
                          fill="none"
                          stroke="#7c3aed"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={kineticTimeline
                            .map((pt, idx) => {
                              const x = 45 + (idx / 23) * 565;
                              const pct = calculateSafeSleepRatios(pt).tobaccoPctOfSafeLimit;
                              const y = 170 - (Math.min(250, Math.max(0, pct)) / 250) * 140;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}

                      {/* Data points and time labels */}
                      {kineticTimeline.map((pt, idx) => {
                        if (idx % 3 !== 0 && idx !== 15 && idx !== 23) return null;
                        const x = 45 + (idx / 23) * 565;
                        const ratios = calculateSafeSleepRatios(pt);
                        const readinessY =
                          170 - (Math.min(100, Math.max(0, ratios.sleepReadinessScore)) / 100) * 140;
                        const caffY = 170 - (Math.min(250, ratios.caffeinePctOfSafeLimit) / 250) * 140;
                        const alcY = 170 - (Math.min(250, ratios.alcoholPctOfSafeLimit) / 250) * 140;
                        const nicY = 170 - (Math.min(250, ratios.tobaccoPctOfSafeLimit) / 250) * 140;
                        const isNow = idx === 15;
                        const dateObj = new Date(pt.timestampMs);
                        const label = `${String(dateObj.getHours()).padStart(2, '0')}:00`;

                        return (
                          <g key={idx}>
                            {visibleGraphSeries.sleepReadiness && (
                              <circle
                                cx={x}
                                cy={readinessY}
                                r={isNow ? 5 : 3.5}
                                className="fill-emerald-500 stroke-white stroke-1 dark:stroke-slate-900"
                              />
                            )}
                            {visibleGraphSeries.caffeine && (
                              <circle
                                cx={x}
                                cy={caffY}
                                r={isNow ? 4.5 : 3}
                                className="fill-amber-600 stroke-white stroke-1 dark:stroke-slate-900"
                              />
                            )}
                            {visibleGraphSeries.alcohol && (
                              <circle
                                cx={x}
                                cy={alcY}
                                r={isNow ? 4.5 : 3}
                                className="fill-rose-600 stroke-white stroke-1 dark:stroke-slate-900"
                              />
                            )}
                            {visibleGraphSeries.tobacco && (
                              <circle
                                cx={x}
                                cy={nicY}
                                r={isNow ? 4.5 : 3}
                                className="fill-violet-600 stroke-white stroke-1 dark:stroke-slate-900"
                              />
                            )}
                            <text
                              x={x}
                              y="188"
                              textAnchor="middle"
                              className={`font-mono text-[9px] ${
                                isNow
                                  ? 'fill-teal-700 font-bold dark:fill-teal-400'
                                  : 'fill-slate-400'
                              }`}
                            >
                              {isNow ? 'NOW' : label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Embedded Circadian Sleep Reminders Strip under Graph */}
                  <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                        <Bell className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Active Sleep Reminders &amp; Cutoff Schedule</span>
                        {nextUpcomingReminder && (
                          <span className="font-mono text-[11px] font-normal text-teal-700 dark:text-teal-400">
                            · Next: {nextUpcomingReminder.reminder.title} ({nextUpcomingReminder.reminder.time24h})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSleepRemindersModalOpen(true)}
                        className="font-mono text-[11px] font-semibold text-teal-700 hover:underline dark:text-teal-400"
                      >
                        Configure Sleep Reminders →
                      </button>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {sleepReminders.slice(0, 5).map((rem) => (
                        <button
                          key={rem.id}
                          type="button"
                          onClick={() => handleToggleSleepReminder(rem.id)}
                          className={`flex flex-col justify-between rounded-lg border px-2.5 py-2 text-left transition-all ${
                            rem.enabled
                              ? 'border-teal-500/30 bg-white shadow-2xs dark:border-teal-500/30 dark:bg-slate-900'
                              : 'border-slate-200/60 bg-slate-100/50 opacity-55 dark:border-slate-800 dark:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {rem.time24h}
                            </span>
                            <span
                              className={`h-2 w-2 rounded-full ${
                                rem.enabled ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            />
                          </div>
                          <span className="mt-1 truncate text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            {rem.title.replace(' Cutoff', '')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Sleep Readiness ({currentSleepReadinessScore}%)
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-600" />
                      Caffeine
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-rose-700 dark:text-rose-400">
                      <span className="h-2 w-2 rounded-full bg-rose-600" />
                      Alcohol
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-violet-700 dark:text-violet-400">
                      <span className="h-2 w-2 rounded-full bg-violet-600" />
                      Tobacco
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveView('trends')}
                    className="font-semibold text-teal-700 hover:underline dark:text-teal-400"
                  >
                    Full Safe Sleep Graph &amp; Sleep Telemetry by Day →
                  </button>
                </div>
              </section>

              {/* Right 5 Cols: Personalized Sleep Quality Insights + AI Sleep Recommendations */}
              <section className="biometric-card flex flex-col justify-between rounded-2xl border border-slate-200/80 p-6 dark:border-slate-800 lg:col-span-5">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-4 dark:border-slate-800">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Tonight&apos;s Sleep Forecast &amp; AI Sleep Coach
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        AI recommendations &amp; pharmacokinetic guidance for better quality sleep
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateAiSleepRecommendations}
                      disabled={isGeneratingAiSleep}
                      data-testid="generate-ai-sleep-btn"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-teal-500 hover:to-emerald-500 disabled:opacity-60 transition-all whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {isGeneratingAiSleep
                        ? 'Analyzing Biometrics...'
                        : aiRecommendations
                        ? 'Refresh AI Sleep Coach'
                        : 'Get AI Sleep Recommendations'}
                    </button>
                  </div>

                  {/* AI Sleep Recommendations Panel */}
                  {aiRecommendations ? (
                    <div
                      data-testid="ai-sleep-recommendations-panel"
                      className="mt-4 rounded-xl border border-teal-500/30 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/40 p-4 dark:border-teal-500/30 dark:from-teal-950/40 dark:via-slate-900 dark:to-emerald-950/30"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
                          <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                          AI Sleep Architecture Protocol
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Optimal Wind-Down: {aiRecommendations.optimalWindDownTime}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {aiRecommendations.headline}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {aiRecommendations.readinessAssessment}
                      </p>
                      <div className="mt-3 space-y-2">
                        {aiRecommendations.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-slate-200/80 bg-white/90 p-2.5 dark:border-slate-800 dark:bg-slate-900/80"
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {rec.title}
                              </span>
                              <span className="font-mono font-semibold text-teal-700 dark:text-teal-400 tabular-nums">
                                {rec.impact}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                              {rec.action}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-teal-500/30 bg-teal-50/30 p-3.5 dark:border-teal-500/20 dark:bg-teal-950/20">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Personalized AI Recommendations for Better Quality Sleep
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                            Synthesize your active caffeine, BAC, nicotine, and wearable HRV into a tailored tonight wind-down protocol.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateAiSleepRecommendations}
                          disabled={isGeneratingAiSleep}
                          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 whitespace-nowrap shrink-0"
                        >
                          Generate AI Plan
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-2.5">
                    {sleepInsights.map((item) => {
                      const borderAccent =
                        item.category === 'caffeine'
                          ? 'border-l-amber-500'
                          : item.category === 'alcohol'
                          ? 'border-l-rose-500'
                          : 'border-l-violet-500';
                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border border-slate-200/70 border-l-4 ${borderAccent} bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">
                              {item.category} · {item.severity}
                            </span>
                            <span className="font-mono text-[11px] font-medium text-teal-700 dark:text-teal-400 tabular-nums">
                              {item.metricDeltaLabel}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                            {item.recommendation}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveView('wearables_vault')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-teal-600 dark:text-slate-300"
                  >
                    <Activity className="h-3.5 w-3.5 text-teal-600" />
                    Sync Wearable Sleep or Backup Vault →
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSleepRemindersModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Edit Cutoffs
                  </button>
                </div>
              </section>
            </div>

            {/* Complete Intake Ledger with Search & Category Filtering */}
            <section className="biometric-card rounded-2xl border border-slate-200/80 p-6 dark:border-slate-800">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 md:flex-row md:items-center">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Chronological Substance Intake Ledger ({filteredEntries.length} records)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Complete log of scanned barcodes, custom drinks, alcoholic pours, and tobacco sessions
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Interactive Segmented Filter */}
                  <div
                    role="group"
                    aria-label="Filter entries by substance category"
                    className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
                  >
                    {(
                      [
                        ['all', 'All Entries'],
                        ['caffeine', 'Caffeine'],
                        ['alcohol', 'Alcohol'],
                        ['tobacco', 'Tobacco'],
                      ] as const
                    ).map(([cat, label]) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          categoryFilter === cat
                            ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      aria-label="Search intake records"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter name, brand, UPC..."
                      className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Delete Selected / Delete Previous Days Actions */}
                  {selectedEntryIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedEntries}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Selected ({selectedEntryIds.length})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDeletePreviousDaysEntries}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-300 whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    Delete Previous Days
                  </button>
                </div>
              </div>

              {lastDeletedEntries.length > 0 && (
                <div
                  role="status"
                  className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  <span>
                    Deleted {lastDeletedEntries.length} previous record
                    {lastDeletedEntries.length === 1 ? ` (${lastDeletedEntries[0].name})` : 's'}.
                  </span>
                  <button
                    type="button"
                    onClick={handleUndoDeleteEntries}
                    className="font-semibold text-teal-700 hover:underline dark:text-teal-400"
                  >
                    Undo Delete
                  </button>
                </div>
              )}

              {filteredEntries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    No substance intake entries match the active filter.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Scan a product barcode or log a custom drink / tobacco entry to populate the ledger.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('all');
                      setSearchQuery('');
                      setIsSubstanceModalOpen(true);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-medium text-white hover:bg-teal-500"
                  >
                    <Plus className="h-4 w-4" />
                    Log First Entry
                  </button>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        <th className="w-8 py-2.5 pr-2">
                          <input
                            type="checkbox"
                            aria-label="Select all visible records"
                            checked={
                              filteredEntries.length > 0 &&
                              filteredEntries.every((e) => selectedEntryIds.includes(e.id))
                            }
                            onChange={handleToggleSelectAllFiltered}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                        </th>
                        <th className="py-2.5 pr-4 font-medium">Timestamp</th>
                        <th className="px-4 py-2.5 font-medium">Substance / Product</th>
                        <th className="px-4 py-2.5 font-medium">Classification & Source</th>
                        <th className="px-4 py-2.5 text-right font-medium">Volume / Units</th>
                        <th className="px-4 py-2.5 text-right font-medium">Active Dose</th>
                        <th className="pl-4 py-2.5 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredEntries.map((entry) => {
                        const dt = new Date(entry.timestamp);
                        const timeFormatted = `${dt.toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })} · ${dt.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`;
                        const isSelected = selectedEntryIds.includes(entry.id);

                        return (
                          <tr
                            key={entry.id}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                              isSelected ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''
                            }`}
                          >
                            <td className="py-3 pr-2">
                              <input
                                type="checkbox"
                                aria-label={`Select ${entry.name}`}
                                checked={isSelected}
                                onChange={() => handleToggleSelectEntry(entry.id)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                            </td>
                            <td className="py-3 pr-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap tabular-nums">
                              <div>{timeFormatted}</div>
                              {(entry.drinkStartTime || entry.drinkEndTime) && (
                                <div className="text-[11px] text-teal-700 dark:text-teal-400">
                                  Drink: {entry.drinkStartTime || '—'} – {entry.drinkEndTime || '—'}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                {entry.name}
                              </div>
                              {entry.notes && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {entry.notes}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                              <span className="capitalize">{entry.category}</span>
                              {entry.tobaccoType && (
                                <>
                                  <span aria-hidden="true"> · </span>
                                  <span className="capitalize">{entry.tobaccoType}</span>
                                </>
                              )}
                              {entry.cigarSize && (
                                <>
                                  <span aria-hidden="true"> · </span>
                                  <span className="font-mono text-[11px]">{entry.cigarSize}</span>
                                </>
                              )}
                              {entry.brand && (
                                <>
                                  <span aria-hidden="true"> · </span>
                                  <span>{entry.brand}</span>
                                </>
                              )}
                              {entry.barcode && (
                                <>
                                  <span aria-hidden="true"> · </span>
                                  <span className="font-mono text-[11px]">UPC {entry.barcode}</span>
                                </>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums">
                              {entry.volumeMl
                                ? formatVolume(entry.volumeMl, volumeUnit)
                                : entry.tobaccoUnits
                                ? `${entry.tobaccoUnits} ${entry.tobaccoUnitLabel || 'units'}`
                                : '1 serving'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap tabular-nums">
                              {entry.category === 'caffeine' && `${entry.caffeineMg} mg caffeine`}
                              {entry.category === 'alcohol' &&
                                `${entry.alcoholGrams} g ethanol (${entry.standardDrinks} std)`}
                              {entry.category === 'tobacco' && `${entry.nicotineMg} mg nicotine`}
                            </td>
                            <td className="pl-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(entry.id)}
                                aria-label={`Delete ${entry.name}`}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
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
        )}

        {activeView === 'trends' && (
          <TrendsAndInsightsView
            entries={entries}
            sleepRecords={sleepRecords}
            caffeineHalfLife={caffeineHalfLife}
            onChangeHalfLife={setCaffeineHalfLife}
            onAddSleepRecord={(rec) =>
              setSleepRecords((prev) => [...prev, { ...rec, id: `sleep-${Date.now()}` }])
            }
            onDeleteSleepRecord={handleDeleteSleepRecord}
            onDeleteSleepByDate={handleDeleteSleepByDate}
            lastDeletedSleepRecords={lastDeletedSleepRecords}
            onUndoDeleteSleep={handleUndoDeleteSleep}
          />
        )}

        {activeView === 'custom_drinks' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Create & Log Custom Drink Form */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Formulate & Log Custom Beverage
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Define custom espresso pulls, tea infusions, or craft cocktails with exact volume and concentration
              </p>

              <form onSubmit={handleCreateCustomDrinkInline} className="mt-5 space-y-4">
                {customDrinkError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                  >
                    {customDrinkError}
                  </div>
                )}

                <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setNewDrinkCat('caffeine')}
                    className={`flex-1 rounded-md py-1.5 text-xs font-medium ${
                      newDrinkCat === 'caffeine'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                        : 'text-slate-600'
                    }`}
                  >
                    Caffeinated Beverage
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDrinkCat('alcohol')}
                    className={`flex-1 rounded-md py-1.5 text-xs font-medium ${
                      newDrinkCat === 'alcohol'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                        : 'text-slate-600'
                    }`}
                  >
                    Alcoholic Beverage
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="inline-drink-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Beverage Name
                  </label>
                  <input
                    id="inline-drink-name"
                    type="text"
                    value={newDrinkName}
                    onChange={(e) => setNewDrinkName(e.target.value)}
                    placeholder="e.g., Iced Hojicha Oat Latte or Old Fashioned"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="inline-drink-vol"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Liquid Volume ({volumeUnit === 'oz' ? 'fl oz' : 'mL'})
                      </label>
                      <button
                        type="button"
                        onClick={() => handleChangeVolumeUnit(volumeUnit === 'ml' ? 'oz' : 'ml')}
                        className="font-mono text-[11px] font-medium text-teal-700 hover:underline dark:text-teal-400"
                      >
                        Switch to {volumeUnit === 'ml' ? 'fl oz' : 'mL'}
                      </button>
                    </div>
                    <input
                      id="inline-drink-vol"
                      type="number"
                      step={volumeUnit === 'oz' ? '0.5' : '5'}
                      value={newDrinkVol}
                      onChange={(e) => setNewDrinkVol(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  {newDrinkCat === 'caffeine' ? (
                    <div>
                      <label
                        htmlFor="inline-drink-caff"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Caffeine Dose (mg)
                      </label>
                      <input
                        id="inline-drink-caff"
                        type="number"
                        value={newDrinkCaff}
                        onChange={(e) => setNewDrinkCaff(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="inline-drink-abv"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        ABV (%)
                      </label>
                      <input
                        id="inline-drink-abv"
                        type="number"
                        step="0.1"
                        value={newDrinkAbv}
                        onChange={(e) => setNewDrinkAbv(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="inline-drink-start-time"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Drink Start Time
                    </label>
                    <input
                      id="inline-drink-start-time"
                      type="time"
                      value={newDrinkStartTime}
                      onChange={(e) => setNewDrinkStartTime(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="inline-drink-end-time"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Drink End Time
                    </label>
                    <input
                      id="inline-drink-end-time"
                      type="time"
                      value={newDrinkEndTime}
                      onChange={(e) => setNewDrinkEndTime(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-teal-500"
                >
                  <Plus className="h-4 w-4" />
                  Save to Library &amp; Log Intake Now
                </button>
              </form>
            </section>

            {/* Saved Custom Drinks & Searchable Google Health Food Database Drink Catalog */}
            <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Google Health Food Database Search &amp; Custom Library
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Search caffeine &amp; alcohol in the Google Health / Fitbit Food Database by UPC barcode or text entry in {volumeUnit === 'oz' ? 'fl oz' : 'mL'}
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    aria-label="Search Google Health Food Database by barcode or text entry"
                    value={inlineDrinkSearch}
                    onChange={(e) => setInlineDrinkSearch(e.target.value)}
                    placeholder="Search barcode (0889392014259) or text..."
                    className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {customDrinks
                  .filter(
                    (d) =>
                      !inlineDrinkSearch.trim() ||
                      d.name.toLowerCase().includes(inlineDrinkSearch.toLowerCase())
                  )
                  .map((drink) => (
                    <div
                      key={drink.id}
                      className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="capitalize">{drink.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>Custom Library</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {formatVolume(drink.volumeMl, volumeUnit)}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {drink.name}
                        </h3>
                        <p className="font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          {drink.category === 'caffeine'
                            ? `${drink.caffeineMg} mg caffeine`
                            : `${drink.abvPercent}% ABV · ${drink.alcoholGrams} g ethanol (${drink.standardDrinks} std drinks)`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuickLogCustomDrink(drink)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 whitespace-nowrap shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Log Serving
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomDrink(drink.id)}
                          aria-label={`Delete custom drink ${drink.name}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/50 dark:hover:text-red-400 whitespace-nowrap shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                {searchDrinksByName(inlineDrinkSearch).map((catalogDrink) => {
                  const alcGrams =
                    catalogDrink.category === 'alcohol'
                      ? calculateAlcoholGrams(catalogDrink.volumeMl, catalogDrink.abvPercent)
                      : 0;
                  const stdDrinks = calculateStandardDrinks(alcGrams);
                  return (
                    <div
                      key={catalogDrink.id}
                      className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="capitalize">{catalogDrink.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{catalogDrink.brand}</span>
                          {catalogDrink.googleHealthFoodId && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-[11px]">Google Health {catalogDrink.googleHealthFoodId}</span>
                            </>
                          )}
                          {catalogDrink.barcode && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-[11px]">UPC {catalogDrink.barcode}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {formatVolume(catalogDrink.volumeMl, volumeUnit)}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {catalogDrink.name}
                        </h3>
                        <p className="font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          {catalogDrink.category === 'caffeine'
                            ? `${catalogDrink.caffeineMg} mg caffeine`
                            : `${catalogDrink.abvPercent}% ABV · ${alcGrams} g ethanol (${stdDrinks} std drinks)`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleAddEntry({
                            timestamp: new Date().toISOString(),
                            name: catalogDrink.name,
                            brand: catalogDrink.brand,
                            barcode: catalogDrink.barcode,
                            category: catalogDrink.category,
                            volumeMl: catalogDrink.volumeMl,
                            caffeineMg: catalogDrink.caffeineMg,
                            abvPercent: catalogDrink.abvPercent,
                            alcoholGrams: alcGrams,
                            standardDrinks: stdDrinks,
                            nicotineMg: 0,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Log Serving
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeView === 'wearables_vault' && (
          <WearablesAndSecurityView
            wearables={wearables}
            entries={entries}
            sleepRecords={sleepRecords}
            biometricEnabled={biometricEnabled}
            biometricCredentialId={biometricCredentialId}
            onSyncWearable={handleSyncWearable}
            onToggleWearableConnection={handleToggleWearableConnection}
            onRestoreVaultPayload={(restoredEntries, restoredSleep) => {
              setEntries(restoredEntries);
              setSleepRecords(restoredSleep);
            }}
            onRegisterBiometric={(credId) => setBiometricCredentialId(credId)}
            onToggleBiometricLock={(enabled) => setBiometricEnabled(enabled)}
            onTriggerLockNow={() => setIsVaultLocked(true)}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white px-6 py-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-[1360px] flex-col items-center justify-between gap-4 text-xs text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Affected Zzs - Substance &amp; Sleep Biometrics</span>
            <span aria-hidden="true">·</span>
            <a
              href="https://github.com/AcesStarLord/Affected-Zzs-apk"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-slate-600 hover:text-teal-600 dark:text-slate-400"
            >
              AcesStarLord/Affected-Zzs-apk
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://github.com/AcesStarLord/Affected-Zzs-apk/releases/latest/download/app-debug.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-teal-700 hover:underline dark:text-teal-400"
            >
              Download Android Debug APK (app-debug.apk)
            </a>
            <span aria-hidden="true">·</span>
            <span>Apple HealthKit &amp; Google Fit Compatible</span>
            <span aria-hidden="true">·</span>
            <span>Client-Side AES-GCM-256 Vault</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        volumeUnit={volumeUnit}
        onChangeVolumeUnit={handleChangeVolumeUnit}
        onClose={() => setIsBarcodeModalOpen(false)}
        onLogProduct={handleAddEntry}
      />

      <SubstanceLogModal
        isOpen={isSubstanceModalOpen}
        initialTab={substanceModalInitialTab}
        volumeUnit={volumeUnit}
        onChangeVolumeUnit={handleChangeVolumeUnit}
        customDrinks={customDrinks}
        onClose={() => setIsSubstanceModalOpen(false)}
        onLogEntry={handleAddEntry}
        onSaveCustomDrink={handleSaveCustomDrink}
      />

      <SleepRemindersModal
        isOpen={isSleepRemindersModalOpen}
        reminders={sleepReminders}
        targetBedtime={targetBedtime}
        onChangeTargetBedtime={setTargetBedtime}
        onAutoCalibrateFromBedtime={handleAutoCalibrateCutoffsFromBedtime}
        onToggleReminder={handleToggleSleepReminder}
        onUpdateReminderTime={handleUpdateSleepReminderTime}
        onDeleteReminder={handleDeleteSleepReminder}
        onAddReminder={handleAddSleepReminder}
        onTriggerTestAlert={handleTriggerTestReminderAlert}
        onClose={() => setIsSleepRemindersModalOpen(false)}
      />

      <BiometricLockModal
        isLocked={isVaultLocked}
        credentialId={biometricCredentialId}
        onUnlock={() => setIsVaultLocked(false)}
      />
    </div>
  );
}
