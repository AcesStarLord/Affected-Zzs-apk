import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Coffee, Flame, Plus, Search, Wine, X } from 'lucide-react';
import {
  CigarCatalogItem,
  CustomDrinkTemplate,
  DrinkCatalogItem,
  IntakeEntry,
  SubstanceCategory,
  TobaccoSubType,
  VolumeUnit,
} from '../types/health';
import {
  calculateAlcoholGrams,
  calculateStandardDrinks,
  calculateTobaccoNicotineMg,
  formatVolume,
  mlToOz,
  ozToMl,
} from '../utils/pharmacokinetics';
import {
  searchCigarsByNameAndSize,
  searchDrinksByName,
  searchGoogleHealthFoodDatabase,
} from '../data/seedData';

interface SubstanceLogModalProps {
  isOpen: boolean;
  initialTab?: SubstanceCategory;
  volumeUnit: VolumeUnit;
  onChangeVolumeUnit: (unit: VolumeUnit) => void;
  customDrinks: CustomDrinkTemplate[];
  onClose: () => void;
  onLogEntry: (entry: Omit<IntakeEntry, 'id'>) => void;
  onSaveCustomDrink: (drink: Omit<CustomDrinkTemplate, 'id' | 'createdAt'>) => void;
}

const TOBACCO_MODALITIES: {
  id: TobaccoSubType;
  label: string;
  defaultName: string;
  defaultUnits: number;
  unitName: string;
  mgPerUnit: number;
}[] = [
  {
    id: 'cigarettes',
    label: 'Cigarettes',
    defaultName: 'Filtered King Size Cigarette',
    defaultUnits: 1,
    unitName: 'cigarettes',
    mgPerUnit: 1.5,
  },
  {
    id: 'cigars',
    label: 'Cigars',
    defaultName: 'Padrón 1964 Anniversary Series Exclusivo',
    defaultUnits: 1,
    unitName: 'cigars',
    mgPerUnit: 7.4,
  },
  {
    id: 'chew',
    label: 'Chew Tobacco',
    defaultName: 'Smokeless Wintergreen Pouch / Dip',
    defaultUnits: 1,
    unitName: 'pouches / dips',
    mgPerUnit: 3.6,
  },
  {
    id: 'pipes',
    label: 'Pipes',
    defaultName: 'Briar Pipe Cavendish Bowl',
    defaultUnits: 1,
    unitName: 'bowls',
    mgPerUnit: 4.2,
  },
  {
    id: 'vapes',
    label: 'Vapes',
    defaultName: '5% Salt Nicotine Vape Pod Session',
    defaultUnits: 15,
    unitName: 'puffs',
    mgPerUnit: 0.15,
  },
];

const CIGAR_SIZE_FILTERS = [
  'all',
  'Robusto',
  'Toro',
  'Churchill',
  'Corona',
  'Torpedo',
  'Perfecto',
] as const;

export const COMMON_CIGAR_SIZES = [
  'Robusto (5.0" x 50)',
  'Robusto (5.5" x 50)',
  'Toro (6.0" x 52)',
  'Toro (6.0" x 54)',
  'Churchill (7.0" x 48)',
  'Corona (5.5" x 42)',
  'Petit Corona (4.5" x 42)',
  'Torpedo (6.1" x 52)',
  'Perfecto (4.5" x 48)',
  'Double Corona (7.5" x 49)',
  'Gordo (6.0" x 60)',
  'Lancero (7.5" x 38)',
] as const;

export const SubstanceLogModal: React.FC<SubstanceLogModalProps> = ({
  isOpen,
  initialTab = 'caffeine',
  volumeUnit,
  onChangeVolumeUnit,
  customDrinks,
  onClose,
  onLogEntry,
  onSaveCustomDrink,
}) => {
  const [activeTab, setActiveTab] = useState<SubstanceCategory>(initialTab);

  // Sync activeTab when modal opens with a specific initialTab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Drink Search & Custom Drink state (Google Health Food Database by Barcode or Text Entry)
  const [drinkSearchQuery, setDrinkSearchQuery] = useState('');
  const [googleHealthLiveResults, setGoogleHealthLiveResults] = useState<DrinkCatalogItem[]>([]);
  const [isSearchingGoogleHealth, setIsSearchingGoogleHealth] = useState(false);
  const [googleHealthSearchStatus, setGoogleHealthSearchStatus] = useState<string | null>(null);
  const [selectedDrinkBarcode, setSelectedDrinkBarcode] = useState<string | undefined>(undefined);
  const [drinkName, setDrinkName] = useState('Double Matcha Oat Latte');
  const [drinkBrand, setDrinkBrand] = useState('Custom Barista Spec');
  const [volumeInput, setVolumeInput] = useState(() =>
    volumeUnit === 'oz' ? String(mlToOz(240)) : '240'
  );
  const prevUnitRef = useRef<VolumeUnit>(volumeUnit);

  useEffect(() => {
    if (prevUnitRef.current !== volumeUnit) {
      const currentVal = parseFloat(volumeInput);
      if (!Number.isNaN(currentVal) && currentVal > 0) {
        setVolumeInput(
          volumeUnit === 'oz' ? String(mlToOz(currentVal)) : String(ozToMl(currentVal))
        );
      }
      prevUnitRef.current = volumeUnit;
    }
  }, [volumeUnit, volumeInput]);

  const [caffeineMg, setCaffeineMg] = useState('135');
  const [abvPercent, setAbvPercent] = useState('6.5');
  const [drinkStartTime, setDrinkStartTime] = useState('08:30');
  const [drinkEndTime, setDrinkEndTime] = useState('09:00');
  const [saveToCustomLibrary, setSaveToCustomLibrary] = useState(true);

  // Tobacco & Cigar Search state
  const [tobaccoSubType, setTobaccoSubType] = useState<TobaccoSubType>('cigars');
  const [tobaccoProductName, setTobaccoProductName] = useState(
    'Padrón 1964 Anniversary Series Exclusivo'
  );
  const [cigarSizeSpec, setCigarSizeSpec] = useState('Robusto (5.5" x 50)');
  const [isCustomCigarSize, setIsCustomCigarSize] = useState(false);
  const [customCigarSizeInput, setCustomCigarSizeInput] = useState('');
  const [savedCustomCigarSizes, setSavedCustomCigarSizes] = useState<string[]>([]);
  const [cigarSearchQuery, setCigarSearchQuery] = useState('');
  const [cigarVitolaFilter, setCigarVitolaFilter] = useState<string>('all');
  const [tobaccoUnits, setTobaccoUnits] = useState('1');
  const [customNicotinePerUnit, setCustomNicotinePerUnit] = useState('7.4');

  // Shared state
  const [hoursAgo, setHoursAgo] = useState('0');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const matchingCatalogDrinks = useMemo(() => {
    if (activeTab !== 'caffeine' && activeTab !== 'alcohol') return [];
    const local = searchDrinksByName(drinkSearchQuery, activeTab);
    const seen = new Set(local.map((d) => `${d.name.toLowerCase()}|${d.barcode || ''}`));
    const merged = [...local];
    for (const item of googleHealthLiveResults) {
      if (item.category === activeTab) {
        const key = `${item.name.toLowerCase()}|${item.barcode || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      }
    }
    return merged;
  }, [drinkSearchQuery, activeTab, googleHealthLiveResults]);

  const matchingCustomDrinks = useMemo(() => {
    if (activeTab !== 'caffeine' && activeTab !== 'alcohol') return [];
    const q = drinkSearchQuery.trim().toLowerCase();
    return customDrinks.filter(
      (d) => d.category === activeTab && (!q || d.name.toLowerCase().includes(q))
    );
  }, [customDrinks, drinkSearchQuery, activeTab]);

  const matchingCigars = useMemo(() => {
    return searchCigarsByNameAndSize(cigarSearchQuery, cigarVitolaFilter);
  }, [cigarSearchQuery, cigarVitolaFilter]);

  if (!isOpen) return null;

  const handleTriggerGoogleHealthSearch = async () => {
    if (activeTab !== 'caffeine' && activeTab !== 'alcohol') return;
    const trimmed = drinkSearchQuery.trim();
    if (!trimmed) {
      setGoogleHealthSearchStatus('Enter a UPC/GTIN barcode or beverage text query to search the Google Health Food Database.');
      return;
    }
    setIsSearchingGoogleHealth(true);
    setGoogleHealthSearchStatus(null);
    try {
      const results = await searchGoogleHealthFoodDatabase(trimmed, activeTab);
      setGoogleHealthLiveResults(results);
      if (results.length > 0) {
        handleSelectCatalogDrink(results[0]);
        setGoogleHealthSearchStatus(
          `Google Health Food Database matched ${results.length} beverage${results.length === 1 ? '' : 's'} for "${trimmed}".`
        );
      } else {
        setGoogleHealthSearchStatus(
          `No Google Health Food Database match for "${trimmed}". You can still log custom parameters below.`
        );
      }
    } finally {
      setIsSearchingGoogleHealth(false);
    }
  };

  const handleSwitchVolumeUnit = (nextUnit: VolumeUnit) => {
    if (nextUnit === volumeUnit) return;
    onChangeVolumeUnit(nextUnit);
  };

  const getEffectiveVolumeMl = (): number => {
    const val = parseFloat(volumeInput);
    if (Number.isNaN(val) || val <= 0) return 0;
    return volumeUnit === 'oz' ? ozToMl(val) : Math.round(val);
  };

  const handleSelectCatalogDrink = (item: DrinkCatalogItem) => {
    setDrinkName(item.name);
    setDrinkBrand(
      item.googleHealthFoodId ? `${item.brand} (${item.googleHealthFoodId})` : item.brand
    );
    setSelectedDrinkBarcode(item.barcode);
    setVolumeInput(
      volumeUnit === 'oz' ? String(mlToOz(item.volumeMl)) : String(item.volumeMl)
    );
    if (item.category === 'caffeine') {
      setCaffeineMg(String(item.caffeineMg));
    } else {
      setAbvPercent(String(item.abvPercent));
    }
    setSaveToCustomLibrary(false);
    setValidationError(null);
  };

  const handleApplySavedCustomDrink = (drink: CustomDrinkTemplate) => {
    setActiveTab(drink.category);
    setDrinkName(drink.name);
    setDrinkBrand('Custom Drink Library');
    setSelectedDrinkBarcode(undefined);
    setVolumeInput(
      volumeUnit === 'oz' ? String(mlToOz(drink.volumeMl)) : String(drink.volumeMl)
    );
    setCaffeineMg(String(drink.caffeineMg));
    setAbvPercent(String(drink.abvPercent));
    setSaveToCustomLibrary(false);
    setValidationError(null);
  };

  const handleSelectTobaccoType = (mod: (typeof TOBACCO_MODALITIES)[number]) => {
    setTobaccoSubType(mod.id);
    setTobaccoProductName(mod.defaultName);
    setTobaccoUnits(String(mod.defaultUnits));
    setCustomNicotinePerUnit(String(mod.mgPerUnit));
    if (mod.id === 'cigars') {
      setCigarSizeSpec('Robusto (5.5" x 50)');
      setIsCustomCigarSize(false);
    }
    setValidationError(null);
  };

  const allCigarSizeOptions = [
    ...COMMON_CIGAR_SIZES,
    ...savedCustomCigarSizes.filter(
      (s) => !(COMMON_CIGAR_SIZES as readonly string[]).includes(s)
    ),
  ];

  const handleSelectCigarFromCatalog = (cigar: CigarCatalogItem) => {
    const formattedSize = `${cigar.vitola} (${cigar.dimensions})`;
    setTobaccoSubType('cigars');
    setTobaccoProductName(cigar.name);
    setCigarSizeSpec(formattedSize);
    setIsCustomCigarSize(false);
    if (
      !(COMMON_CIGAR_SIZES as readonly string[]).includes(formattedSize) &&
      !savedCustomCigarSizes.includes(formattedSize)
    ) {
      setSavedCustomCigarSizes((prev) => [...prev, formattedSize]);
    }
    setCustomNicotinePerUnit(String(cigar.nicotineMg));
    setTobaccoUnits('1');
    setValidationError(null);
  };

  const handleAddCustomCigarSizeOption = () => {
    const trimmed = customCigarSizeInput.trim();
    if (!trimmed) return;
    if (!allCigarSizeOptions.includes(trimmed)) {
      setSavedCustomCigarSizes((prev) => [...prev, trimmed]);
    }
    setCigarSizeSpec(trimmed);
    setIsCustomCigarSize(false);
    setCustomCigarSizeInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const offsetHours = Math.max(0, parseFloat(hoursAgo) || 0);
    const entryTimestamp = new Date(Date.now() - offsetHours * 3600 * 1000).toISOString();

    if (activeTab === 'caffeine') {
      const trimmedName = drinkName.trim();
      const finalVolMl = getEffectiveVolumeMl();
      const parsedCaff = parseFloat(caffeineMg);

      if (!trimmedName) {
        setValidationError('Please enter a beverage name.');
        return;
      }
      if (finalVolMl <= 0) {
        setValidationError(`Please enter a valid liquid volume in ${volumeUnit === 'oz' ? 'fl oz' : 'mL'}.`);
        return;
      }
      if (Number.isNaN(parsedCaff) || parsedCaff <= 0) {
        setValidationError('Please enter a valid caffeine amount greater than 0 mg.');
        return;
      }

      if (saveToCustomLibrary) {
        onSaveCustomDrink({
          name: trimmedName,
          category: 'caffeine',
          volumeMl: finalVolMl,
          caffeineMg: Math.round(parsedCaff),
          abvPercent: 0,
          alcoholGrams: 0,
          standardDrinks: 0,
        });
      }

      onLogEntry({
        timestamp: entryTimestamp,
        name: trimmedName,
        brand: drinkBrand.trim() || 'Custom Drink',
        barcode: selectedDrinkBarcode,
        category: 'caffeine',
        isCustomDrink: true,
        drinkStartTime: drinkStartTime || undefined,
        drinkEndTime: drinkEndTime || undefined,
        volumeMl: finalVolMl,
        caffeineMg: Math.round(parsedCaff * 10) / 10,
        alcoholGrams: 0,
        standardDrinks: 0,
        nicotineMg: 0,
        notes: notes.trim() || undefined,
      });
      onClose();
      return;
    }

    if (activeTab === 'alcohol') {
      const trimmedName = drinkName.trim();
      const finalVolMl = getEffectiveVolumeMl();
      const parsedAbv = parseFloat(abvPercent);

      if (!trimmedName) {
        setValidationError('Please enter an alcoholic beverage name.');
        return;
      }
      if (finalVolMl <= 0 || Number.isNaN(parsedAbv) || parsedAbv <= 0) {
        setValidationError(`Please enter valid liquid volume (${volumeUnit === 'oz' ? 'fl oz' : 'mL'}) and ABV (%).`);
        return;
      }

      const alcGrams = calculateAlcoholGrams(finalVolMl, parsedAbv);
      const stdDrinks = calculateStandardDrinks(alcGrams);

      if (saveToCustomLibrary) {
        onSaveCustomDrink({
          name: trimmedName,
          category: 'alcohol',
          volumeMl: finalVolMl,
          caffeineMg: 0,
          abvPercent: parsedAbv,
          alcoholGrams: alcGrams,
          standardDrinks: stdDrinks,
        });
      }

      onLogEntry({
        timestamp: entryTimestamp,
        name: trimmedName,
        brand: drinkBrand.trim() || 'Custom Pour',
        barcode: selectedDrinkBarcode,
        category: 'alcohol',
        isCustomDrink: true,
        drinkStartTime: drinkStartTime || undefined,
        drinkEndTime: drinkEndTime || undefined,
        volumeMl: finalVolMl,
        abvPercent: parsedAbv,
        caffeineMg: 0,
        alcoholGrams: alcGrams,
        standardDrinks: stdDrinks,
        nicotineMg: 0,
        notes: notes.trim() || undefined,
      });
      onClose();
      return;
    }

    if (activeTab === 'tobacco') {
      const trimmedName = tobaccoProductName.trim();
      const parsedUnits = parseFloat(tobaccoUnits);
      const parsedRate = parseFloat(customNicotinePerUnit);

      if (!trimmedName) {
        setValidationError('Please enter a tobacco or vape product description.');
        return;
      }
      if (Number.isNaN(parsedUnits) || parsedUnits <= 0) {
        setValidationError('Please enter a valid quantity greater than 0.');
        return;
      }

      const { nicotineMg, unitLabel } = calculateTobaccoNicotineMg(
        tobaccoSubType,
        parsedUnits,
        !Number.isNaN(parsedRate) && parsedRate > 0 ? parsedRate : undefined
      );

      onLogEntry({
        timestamp: entryTimestamp,
        name: trimmedName,
        brand:
          tobaccoSubType === 'cigars' && cigarSizeSpec.trim()
            ? `Cigar · ${cigarSizeSpec.trim()}`
            : `Tobacco · ${tobaccoSubType}`,
        category: 'tobacco',
        caffeineMg: 0,
        alcoholGrams: 0,
        standardDrinks: 0,
        tobaccoType: tobaccoSubType,
        tobaccoUnits: parsedUnits,
        tobaccoUnitLabel: unitLabel,
        cigarSize: tobaccoSubType === 'cigars' ? cigarSizeSpec.trim() : undefined,
        nicotineMg,
        notes: notes.trim() || undefined,
      });
      onClose();
    }
  };

  const effectiveVolMl = getEffectiveVolumeMl();
  const previewAlcoholGrams = calculateAlcoholGrams(
    effectiveVolMl,
    parseFloat(abvPercent) || 0
  );
  const previewStdDrinks = calculateStandardDrinks(previewAlcoholGrams);
  const previewTobacco = calculateTobaccoNicotineMg(
    tobaccoSubType,
    parseFloat(tobaccoUnits) || 0,
    parseFloat(customNicotinePerUnit) || undefined
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="substance-logger-title"
    >
      <div className="my-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 id="substance-logger-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Search &amp; Log Drink or Tobacco Intake
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Search beverages by name, switch volume between mL and fl oz, or search cigars by name and vitola size
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Substance Logger"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Segmented Controls */}
        <div className="mt-4 flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('caffeine');
              setDrinkName('Double Matcha Oat Latte');
              setVolumeInput(volumeUnit === 'oz' ? String(mlToOz(240)) : '240');
              setCaffeineMg('135');
              setValidationError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'caffeine'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Coffee className="h-3.5 w-3.5" />
            Caffeine &amp; Custom Drinks
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('alcohol');
              setDrinkName('Sierra Nevada Hazy Little Thing IPA');
              setVolumeInput(volumeUnit === 'oz' ? String(mlToOz(355)) : '355');
              setAbvPercent('6.7');
              setValidationError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'alcohol'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Wine className="h-3.5 w-3.5" />
            Alcohol &amp; Custom Pours
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('tobacco');
              setValidationError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'tobacco'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            Tobacco &amp; Cigars
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {validationError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              {validationError}
            </div>
          )}

          {(activeTab === 'caffeine' || activeTab === 'alcohol') && (
            <>
              {/* Google Health Food Database Search by Barcode or Text Entry */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="search-drink-by-name-input"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Google Health Food Database Search — Barcode (UPC/GTIN) or Text Entry ({activeTab === 'caffeine' ? 'Caffeine' : 'Alcohol'})
                  </label>
                  <span className="font-mono text-[11px] text-slate-500">
                    {matchingCatalogDrinks.length + matchingCustomDrinks.length} matches
                  </span>
                </div>

                <div className="mt-1.5 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="search-drink-by-name-input"
                      type="search"
                      value={drinkSearchQuery}
                      onChange={(e) => {
                        setDrinkSearchQuery(e.target.value);
                        setGoogleHealthSearchStatus(null);
                      }}
                      placeholder={
                        activeTab === 'caffeine'
                          ? 'Enter UPC barcode (e.g. 0889392014259) or text (Cold Brew, Celsius, GH-FS-2104892)...'
                          : 'Enter UPC barcode (e.g. 0083820123456) or text (Guinness, Pinot Noir, GH-FS-2301845)...'
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerGoogleHealthSearch}
                    disabled={isSearchingGoogleHealth}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 whitespace-nowrap shrink-0"
                  >
                    <Search className="h-3.5 w-3.5" />
                    {isSearchingGoogleHealth ? 'Searching Google Health...' : 'Search Google Health DB'}
                  </button>
                </div>

                {googleHealthSearchStatus && (
                  <p className="mt-1.5 font-mono text-[11px] text-teal-700 dark:text-teal-400">
                    {googleHealthSearchStatus}
                  </p>
                )}

                <div className="mt-2.5 max-h-36 space-y-1 overflow-y-auto pr-1">
                  {matchingCustomDrinks.map((cd) => (
                    <button
                      key={cd.id}
                      type="button"
                      onClick={() => handleApplySavedCustomDrink(cd)}
                      className="flex w-full items-center justify-between rounded-md border border-transparent bg-white px-2.5 py-1.5 text-left text-xs hover:border-teal-600 hover:bg-teal-50/40 dark:bg-slate-900 dark:hover:bg-teal-950/40"
                    >
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {cd.name}{' '}
                        <span className="font-normal text-slate-500">· Custom Library</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums shrink-0">
                        {formatVolume(cd.volumeMl, volumeUnit)} ·{' '}
                        {cd.category === 'caffeine' ? `${cd.caffeineMg} mg` : `${cd.abvPercent}% ABV`}
                      </span>
                    </button>
                  ))}

                  {matchingCatalogDrinks.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectCatalogDrink(item)}
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-transparent bg-white px-2.5 py-1.5 text-left text-xs hover:border-teal-600 hover:bg-teal-50/40 dark:bg-slate-900 dark:hover:bg-teal-950/40"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {item.name}{' '}
                          <span className="font-normal text-slate-500">· {item.brand}</span>
                        </span>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-slate-500">
                          {item.googleHealthFoodId && <span>Google Health {item.googleHealthFoodId}</span>}
                          {item.barcode && <span>UPC {item.barcode}</span>}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums shrink-0">
                        {formatVolume(item.volumeMl, volumeUnit)} ·{' '}
                        {item.category === 'caffeine'
                          ? `${item.caffeineMg} mg`
                          : `${item.abvPercent}% ABV`}
                      </span>
                    </button>
                  ))}

                  {matchingCatalogDrinks.length === 0 && matchingCustomDrinks.length === 0 && (
                    <p className="py-2 text-center text-xs text-slate-500">
                      No local catalog match for &ldquo;{drinkSearchQuery}&rdquo;. Click &ldquo;Search Google Health DB&rdquo; or enter custom specs below.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="custom-drink-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Selected or Custom Drink Name
                  </label>
                  <input
                    id="custom-drink-name"
                    type="text"
                    value={drinkName}
                    onChange={(e) => setDrinkName(e.target.value)}
                    placeholder="e.g., Nitro Cold Brew or Mezcal Negroni"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="custom-drink-brand"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Brand / Preparation
                  </label>
                  <input
                    id="custom-drink-brand"
                    type="text"
                    value={drinkBrand}
                    onChange={(e) => setDrinkBrand(e.target.value)}
                    placeholder="e.g., Home Espresso Bar"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="drink-volume-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Volume ({volumeUnit === 'oz' ? 'fl oz' : 'mL'})
                    </label>
                    <div
                      role="group"
                      aria-label="Drink measurement unit toggle"
                      className="flex items-center gap-0.5 rounded bg-slate-100 p-0.5 dark:bg-slate-800"
                    >
                      <button
                        type="button"
                        onClick={() => handleSwitchVolumeUnit('ml')}
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                          volumeUnit === 'ml'
                            ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-slate-100'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        mL
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchVolumeUnit('oz')}
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                          volumeUnit === 'oz'
                            ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-slate-100'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        oz
                      </button>
                    </div>
                  </div>
                  <input
                    id="drink-volume-input"
                    type="number"
                    step={volumeUnit === 'oz' ? '0.5' : '5'}
                    min="0.5"
                    max="3000"
                    value={volumeInput}
                    onChange={(e) => setVolumeInput(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {activeTab === 'caffeine' ? (
                  <div>
                    <label
                      htmlFor="drink-caffeine-mg"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Caffeine Dose (mg)
                    </label>
                    <input
                      id="drink-caffeine-mg"
                      type="number"
                      min="1"
                      max="1000"
                      value={caffeineMg}
                      onChange={(e) => setCaffeineMg(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="drink-abv-percent"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Alcohol by Volume (ABV %)
                    </label>
                    <input
                      id="drink-abv-percent"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="95"
                      value={abvPercent}
                      onChange={(e) => setAbvPercent(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="intake-hours-ago"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Consumed Hours Ago
                  </label>
                  <input
                    id="intake-hours-ago"
                    type="number"
                    step="0.5"
                    min="0"
                    max="48"
                    value={hoursAgo}
                    onChange={(e) => setHoursAgo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Drink Start Time & End Time Window */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="drink-start-time"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Drink Start Time
                  </label>
                  <input
                    id="drink-start-time"
                    type="time"
                    aria-label="Drink Start Time"
                    value={drinkStartTime}
                    onChange={(e) => setDrinkStartTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="drink-end-time"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Drink End Time
                  </label>
                  <input
                    id="drink-end-time"
                    type="time"
                    aria-label="Drink End Time"
                    value={drinkEndTime}
                    onChange={(e) => setDrinkEndTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {activeTab === 'alcohol' && (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/50">
                  <span className="text-slate-600 dark:text-slate-400">
                    Calculated Ethanol Mass ({effectiveVolMl} mL / {mlToOz(effectiveVolMl)} fl oz):
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {previewAlcoholGrams} g pure ethanol · {previewStdDrinks} US std drinks
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="save-custom-drink-checkbox"
                  type="checkbox"
                  checked={saveToCustomLibrary}
                  onChange={(e) => setSaveToCustomLibrary(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label
                  htmlFor="save-custom-drink-checkbox"
                  className="text-xs text-slate-700 dark:text-slate-300"
                >
                  Save beverage to my reusable Custom Drinks Library
                </label>
              </div>
            </>
          )}

          {activeTab === 'tobacco' && (
            <>
              <div>
                <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Select Tobacco Delivery Modality
                </span>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {TOBACCO_MODALITIES.map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => handleSelectTobaccoType(mod)}
                      className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        tobaccoSubType === mod.id
                          ? 'border-teal-600 bg-teal-50/70 text-teal-950 dark:border-teal-500 dark:bg-teal-950/60 dark:text-teal-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {mod.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dedicated Cigar Search by Name & Size (Vitola / Ring Gauge) */}
              {tobaccoSubType === 'cigars' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="cigar-search-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Search Cigar by Name, Brand, or Size (Vitola / Dimensions)
                    </label>
                    <span className="font-mono text-[11px] text-slate-500">
                      {matchingCigars.length} cigars matched
                    </span>
                  </div>

                  <div className="relative mt-1.5">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="cigar-search-input"
                      type="search"
                      value={cigarSearchQuery}
                      onChange={(e) => setCigarSearchQuery(e.target.value)}
                      placeholder='Search cigar name or size (e.g., Padrón, Montecristo, Robusto, Churchill, 5.5" x 50)...'
                      className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Vitola Size Filter Buttons */}
                  <div
                    role="group"
                    aria-label="Filter cigars by vitola size"
                    className="mt-2 flex flex-wrap items-center gap-1"
                  >
                    {CIGAR_SIZE_FILTERS.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setCigarVitolaFilter(size)}
                        className={`rounded px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                          cigarVitolaFilter === size
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400'
                        }`}
                      >
                        {size === 'all' ? 'All Sizes' : size}
                      </button>
                    ))}
                  </div>

                  {/* Cigar Search Results */}
                  <div className="mt-2.5 max-h-36 space-y-1 overflow-y-auto pr-1">
                    {matchingCigars.map((cigar) => (
                      <button
                        key={cigar.id}
                        type="button"
                        onClick={() => handleSelectCigarFromCatalog(cigar)}
                        className="flex w-full items-center justify-between rounded-md border border-transparent bg-white px-2.5 py-1.5 text-left text-xs hover:border-teal-600 hover:bg-teal-50/40 dark:bg-slate-900 dark:hover:bg-teal-950/40"
                      >
                        <div className="truncate pr-2">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {cigar.name}
                          </span>
                          <span className="text-slate-500">
                            {' '}
                            · {cigar.vitola} ({cigar.dimensions}) · {cigar.wrapper}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-400 tabular-nums shrink-0">
                          {cigar.nicotineMg} mg
                        </span>
                      </button>
                    ))}
                    {matchingCigars.length === 0 && (
                      <p className="py-2 text-center text-xs text-slate-500">
                        No cigars found matching &ldquo;{cigarSearchQuery}&rdquo; ({cigarVitolaFilter}). Enter custom cigar details below.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className={tobaccoSubType === 'cigars' ? 'sm:col-span-5' : 'sm:col-span-8'}>
                  <label
                    htmlFor="tobacco-product-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    {tobaccoSubType === 'cigars' ? 'Cigar Name / Blend' : 'Product / Blend Description'}
                  </label>
                  <input
                    id="tobacco-product-name"
                    type="text"
                    value={tobaccoProductName}
                    onChange={(e) => setTobaccoProductName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {tobaccoSubType === 'cigars' && (
                  <div className="sm:col-span-4">
                    <label
                      htmlFor="cigar-size-spec-select"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Cigar Size &amp; Vitola
                    </label>
                    <select
                      id="cigar-size-spec-select"
                      aria-label="Cigar Size & Vitola"
                      value={isCustomCigarSize ? '__custom__' : cigarSizeSpec}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomCigarSize(true);
                          setCustomCigarSizeInput('');
                        } else {
                          setIsCustomCigarSize(false);
                          setCigarSizeSpec(e.target.value);
                        }
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {allCigarSizeOptions.map((sizeOption) => (
                        <option key={sizeOption} value={sizeOption}>
                          {sizeOption}
                        </option>
                      ))}
                      <option value="__custom__">+ Add Custom Size / Vitola...</option>
                    </select>

                    {isCustomCigarSize && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <input
                          id="cigar-size-custom-input"
                          type="text"
                          aria-label="Custom Cigar Size & Vitola"
                          value={customCigarSizeInput}
                          onChange={(e) => {
                            setCustomCigarSizeInput(e.target.value);
                            if (e.target.value.trim()) {
                              setCigarSizeSpec(e.target.value.trim());
                            }
                          }}
                          placeholder='e.g., Salomon (7.2" x 57)'
                          className="w-full rounded-lg border border-teal-600 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomCigarSizeOption}
                          className="rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-500 whitespace-nowrap shrink-0"
                        >
                          Add Size
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className={tobaccoSubType === 'cigars' ? 'sm:col-span-3' : 'sm:col-span-4'}>
                  <label
                    htmlFor="tobacco-hours-ago"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Used Hours Ago
                  </label>
                  <input
                    id="tobacco-hours-ago"
                    type="number"
                    step="0.5"
                    min="0"
                    max="48"
                    value={hoursAgo}
                    onChange={(e) => setHoursAgo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="tobacco-units-input"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Quantity ({previewTobacco.unitLabel})
                  </label>
                  <input
                    id="tobacco-units-input"
                    type="number"
                    step="1"
                    min="1"
                    max="500"
                    value={tobaccoUnits}
                    onChange={(e) => setTobaccoUnits(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tobacco-nic-rate"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Absorbed Nicotine per Unit (mg)
                  </label>
                  <input
                    id="tobacco-nic-rate"
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="50"
                    value={customNicotinePerUnit}
                    onChange={(e) => setCustomNicotinePerUnit(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-slate-600 dark:text-slate-400">
                  Estimated Bioavailable Nicotine Dose ({tobaccoSubType}
                  {tobaccoSubType === 'cigars' && cigarSizeSpec ? ` · ${cigarSizeSpec}` : ''}):
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {previewTobacco.nicotineMg} mg absorbed nicotine
                </span>
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="entry-notes-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Contextual Notes (Optional)
            </label>
            <input
              id="entry-notes-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Consumed with meal, pre-workout, or social lounge"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-medium text-white hover:bg-teal-500 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              Save Intake Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
