export type SubstanceCategory = 'caffeine' | 'alcohol' | 'tobacco';

export type TobaccoSubType = 'cigarettes' | 'cigars' | 'chew' | 'pipes' | 'vapes';

export type VolumeUnit = 'ml' | 'oz';

export interface DrinkCatalogItem {
  id: string;
  name: string;
  brand: string;
  category: 'caffeine' | 'alcohol';
  volumeMl: number;
  caffeineMg: number;
  abvPercent: number;
  barcode?: string;
  googleHealthFoodId?: string;
}

export interface CigarCatalogItem {
  id: string;
  name: string;
  brand: string;
  vitola: string; // e.g. 'Robusto', 'Churchill', 'Toro', 'Corona', 'Torpedo', 'Perfecto', 'Lancero'
  dimensions: string; // e.g. '5.0" x 50'
  wrapper: string;
  nicotineMg: number;
}

export interface IntakeEntry {
  id: string;
  timestamp: string; // ISO string
  name: string;
  category: SubstanceCategory;
  brand?: string;
  barcode?: string;
  isCustomDrink?: boolean;
  // Caffeine & Alcohol drink window
  drinkStartTime?: string; // e.g. '08:30'
  drinkEndTime?: string; // e.g. '09:00'
  // Caffeine metrics
  caffeineMg: number;
  volumeMl?: number;
  // Alcohol metrics
  abvPercent?: number;
  alcoholGrams: number;
  standardDrinks: number;
  // Tobacco metrics
  tobaccoType?: TobaccoSubType;
  tobaccoUnits?: number; // e.g. 1 cigarette, 15 puffs, 1 pouch, 1 bowl
  tobaccoUnitLabel?: string; // 'cigarettes' | 'cigars' | 'pouches/dips' | 'bowls' | 'puffs'
  cigarSize?: string; // e.g. 'Robusto (5.0" x 50)'
  nicotineMg: number; // absorbed systemic nicotine in mg
  notes?: string;
}

export interface CustomDrinkTemplate {
  id: string;
  name: string;
  category: 'caffeine' | 'alcohol';
  volumeMl: number;
  caffeineMg: number;
  abvPercent: number;
  alcoholGrams: number;
  standardDrinks: number;
  createdAt: string;
}

export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand: string;
  category: SubstanceCategory;
  volumeMl?: number;
  caffeineMg: number;
  abvPercent?: number;
  alcoholGrams: number;
  standardDrinks: number;
  tobaccoType?: TobaccoSubType;
  tobaccoUnits?: number;
  tobaccoUnitLabel?: string;
  nicotineMg: number;
}

export interface SleepRecord {
  id: string;
  date: string; // YYYY-MM-DD (night of)
  source: 'Apple Health' | 'Google Fit' | 'Manual';
  totalSleepMinutes: number;
  deepSleepMinutes: number;
  remSleepMinutes: number;
  sleepLatencyMinutes: number; // time to fall asleep
  awakenings: number;
  restingHeartRateBpm: number;
  hrvMs: number; // Heart rate variability RMSSD
  sleepScore: number; // 0 - 100
  bedtimeIso: string;
  wakeTimeIso: string;
}

export interface SleepInsight {
  id: string;
  severity: 'optimal' | 'caution' | 'alert';
  category: SubstanceCategory | 'combined';
  title: string;
  mechanism: string;
  recommendation: string;
  metricDeltaLabel: string;
}

export interface WearableSyncStatus {
  provider: 'apple_health' | 'google_fit';
  name: string;
  connected: boolean;
  lastSyncedAt: string | null;
  deviceModel: string;
  metricsTracked: string[];
  syncedDaysCount: number;
}

export interface EncryptedBackupEnvelope {
  version: number;
  algorithm: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  createdAt: string;
  saltBase64: string;
  ivBase64: string;
  ciphertextBase64: string;
  recordCount: number;
  checksumHex: string;
}

export type SleepReminderType =
  | 'caffeine_cutoff'
  | 'alcohol_cutoff'
  | 'tobacco_cutoff'
  | 'wind_down'
  | 'target_bedtime';

export interface SleepReminder {
  id: string;
  title: string;
  type: SleepReminderType;
  time24h: string; // e.g. '14:00', '19:00', '21:45', '22:30'
  enabled: boolean;
  daysOfWeek: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  description: string;
  soundAlert: boolean;
}

