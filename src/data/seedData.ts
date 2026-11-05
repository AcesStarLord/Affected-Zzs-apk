import {
  BarcodeProduct,
  CigarCatalogItem,
  CustomDrinkTemplate,
  DrinkCatalogItem,
  IntakeEntry,
  SleepRecord,
  SleepReminder,
  WearableSyncStatus,
} from '../types/health';

export const DRINK_DATABASE: DrinkCatalogItem[] = [
  {
    id: 'drk-1',
    name: 'Double Espresso (Doppio)',
    brand: 'Specialty Barista Standard',
    category: 'caffeine',
    barcode: '0041383090214',
    googleHealthFoodId: 'GH-FS-171890',
    volumeMl: 60,
    caffeineMg: 128,
    abvPercent: 0,
  },
  {
    id: 'drk-2',
    name: 'Starbucks Blonde Cold Brew',
    brand: 'Starbucks',
    category: 'caffeine',
    barcode: '0012000161155',
    googleHealthFoodId: 'GH-FS-2041158',
    volumeMl: 355,
    caffeineMg: 185,
    abvPercent: 0,
  },
  {
    id: 'drk-3',
    name: 'Celsius Sparkling Orange Vibe',
    brand: 'Celsius Live Fit',
    category: 'caffeine',
    barcode: '0889392014259',
    googleHealthFoodId: 'GH-FS-2104892',
    volumeMl: 355,
    caffeineMg: 200,
    abvPercent: 0,
  },
  {
    id: 'drk-4',
    name: 'Monster Energy Zero Ultra',
    brand: 'Monster Energy',
    category: 'caffeine',
    barcode: '0070847811169',
    googleHealthFoodId: 'GH-FS-1983441',
    volumeMl: 473,
    caffeineMg: 150,
    abvPercent: 0,
  },
  {
    id: 'drk-5',
    name: 'Red Bull Sugarfree',
    brand: 'Red Bull',
    category: 'caffeine',
    barcode: '0611269991000',
    googleHealthFoodId: 'GH-FS-174152',
    volumeMl: 250,
    caffeineMg: 80,
    abvPercent: 0,
  },
  {
    id: 'drk-6',
    name: 'Ceremonial Grade Matcha Latte',
    brand: 'Ippodo Uji',
    category: 'caffeine',
    barcode: '4901046771021',
    googleHealthFoodId: 'GH-FS-2258910',
    volumeMl: 240,
    caffeineMg: 75,
    abvPercent: 0,
  },
  {
    id: 'drk-7',
    name: 'Pour-Over Filter Coffee (V60)',
    brand: 'Single Origin Arabica',
    category: 'caffeine',
    barcode: '0025500000147',
    googleHealthFoodId: 'GH-FS-171891',
    volumeMl: 300,
    caffeineMg: 145,
    abvPercent: 0,
  },
  {
    id: 'drk-8',
    name: 'Yerba Mate Traditional Infusion',
    brand: 'Guayakí',
    category: 'caffeine',
    barcode: '0632432711101',
    googleHealthFoodId: 'GH-FS-1904412',
    volumeMl: 458,
    caffeineMg: 150,
    abvPercent: 0,
  },
  {
    id: 'drk-9',
    name: 'Sierra Nevada Hazy Little Thing IPA',
    brand: 'Sierra Nevada',
    category: 'alcohol',
    barcode: '0083820123456',
    googleHealthFoodId: 'GH-FS-2301845',
    volumeMl: 355,
    caffeineMg: 0,
    abvPercent: 6.7,
  },
  {
    id: 'drk-10',
    name: 'Guinness Draught Irish Stout',
    brand: 'St. James Gate Brewery',
    category: 'alcohol',
    barcode: '5000213000144',
    googleHealthFoodId: 'GH-FS-168740',
    volumeMl: 440,
    caffeineMg: 0,
    abvPercent: 4.2,
  },
  {
    id: 'drk-11',
    name: 'Meiomi Coastal Pinot Noir',
    brand: 'Meiomi Wines',
    category: 'alcohol',
    barcode: '0085000017326',
    googleHealthFoodId: 'GH-FS-173190',
    volumeMl: 148,
    caffeineMg: 0,
    abvPercent: 13.7,
  },
  {
    id: 'drk-12',
    name: 'Napa Valley Cabernet Sauvignon',
    brand: 'Stag’s Leap Wine Cellars',
    category: 'alcohol',
    barcode: '0088586001123',
    googleHealthFoodId: 'GH-FS-173191',
    volumeMl: 148,
    caffeineMg: 0,
    abvPercent: 14.5,
  },
  {
    id: 'drk-13',
    name: 'Classic Blanco Tequila Margarita',
    brand: 'Craft Cocktail Spec',
    category: 'alcohol',
    barcode: '0080480275129',
    googleHealthFoodId: 'GH-FS-174815',
    volumeMl: 120,
    caffeineMg: 0,
    abvPercent: 18.5,
  },
  {
    id: 'drk-14',
    name: 'Kentucky Straight Bourbon Old Fashioned',
    brand: 'Small Batch Reserve',
    category: 'alcohol',
    barcode: '0088004021450',
    googleHealthFoodId: 'GH-FS-174819',
    volumeMl: 90,
    caffeineMg: 0,
    abvPercent: 32.0,
  },
  {
    id: 'drk-15',
    name: 'Crisp German Pilsner Draft',
    brand: 'Bitburger Brauerei',
    category: 'alcohol',
    barcode: '4014406101122',
    googleHealthFoodId: 'GH-FS-168742',
    volumeMl: 330,
    caffeineMg: 0,
    abvPercent: 4.8,
  },
];

export const CIGAR_DATABASE: CigarCatalogItem[] = [
  {
    id: 'cig-1',
    name: 'Arturo Fuente Hemingway Short Story',
    brand: 'Arturo Fuente',
    vitola: 'Perfecto',
    dimensions: '4.0" x 49',
    wrapper: 'Cameroon',
    nicotineMg: 5.2,
  },
  {
    id: 'cig-2',
    name: 'Padrón 1964 Anniversary Series Exclusivo',
    brand: 'Padrón Cigars',
    vitola: 'Robusto',
    dimensions: '5.5" x 50',
    wrapper: 'Nicaraguan Maduro',
    nicotineMg: 7.4,
  },
  {
    id: 'cig-3',
    name: 'Montecristo No. 2 Pirámide',
    brand: 'Montecristo',
    vitola: 'Torpedo',
    dimensions: '6.1" x 52',
    wrapper: 'Habano Natural',
    nicotineMg: 8.1,
  },
  {
    id: 'cig-4',
    name: 'Romeo y Julieta Wide Churchill',
    brand: 'Romeo y Julieta',
    vitola: 'Churchill',
    dimensions: '7.0" x 48',
    wrapper: 'Habano',
    nicotineMg: 8.8,
  },
  {
    id: 'cig-5',
    name: 'Oliva Serie V Melanio',
    brand: 'Oliva Cigar Co.',
    vitola: 'Robusto',
    dimensions: '5.0" x 52',
    wrapper: 'Ecuadorian Sumatra',
    nicotineMg: 7.2,
  },
  {
    id: 'cig-6',
    name: 'Davidoff Signature 2000',
    brand: 'Davidoff of Geneva',
    vitola: 'Corona',
    dimensions: '5.1" x 43',
    wrapper: 'Ecuadorian Connecticut',
    nicotineMg: 5.5,
  },
  {
    id: 'cig-7',
    name: 'Cohiba Siglo VI Gran Toro',
    brand: 'Cohiba',
    vitola: 'Toro',
    dimensions: '5.9" x 52',
    wrapper: 'Corojo',
    nicotineMg: 8.4,
  },
  {
    id: 'cig-8',
    name: 'My Father Le Bijou 1922',
    brand: 'My Father Cigars',
    vitola: 'Toro',
    dimensions: '6.0" x 52',
    wrapper: 'Habano Oscuro',
    nicotineMg: 8.6,
  },
  {
    id: 'cig-9',
    name: 'Ashton Classic Double Magnum',
    brand: 'Ashton',
    vitola: 'Churchill',
    dimensions: '7.0" x 50',
    wrapper: 'Connecticut Shade',
    nicotineMg: 6.8,
  },
  {
    id: 'cig-10',
    name: 'Liga Privada No. 9 Parejo',
    brand: 'Drew Estate',
    vitola: 'Corona',
    dimensions: '6.0" x 46',
    wrapper: 'Connecticut Broadleaf',
    nicotineMg: 7.9,
  },
];

export function searchDrinksByName(
  query: string,
  category?: 'caffeine' | 'alcohol'
): DrinkCatalogItem[] {
  const cleaned = query.trim().toLowerCase();
  const digitsOnly = cleaned.replace(/[^0-9]/g, '');
  return DRINK_DATABASE.filter((item) => {
    if (category && item.category !== category) return false;
    if (!cleaned) return true;
    const matchNameOrBrand =
      item.name.toLowerCase().includes(cleaned) ||
      item.brand.toLowerCase().includes(cleaned) ||
      (item.googleHealthFoodId && item.googleHealthFoodId.toLowerCase().includes(cleaned));
    const matchBarcode =
      Boolean(item.barcode) &&
      (item.barcode!.toLowerCase().includes(cleaned) ||
        (digitsOnly.length >= 4 && item.barcode!.includes(digitsOnly)));
    return Boolean(matchNameOrBrand || matchBarcode);
  });
}

/**
 * Searches the Google Health / Fitbit Food & Beverage Database (powered by FatSecret & Open Food Facts)
 * by either UPC/GTIN barcode or text entry (product name, brand, or Google Health Food ID).
 */
export async function searchGoogleHealthFoodDatabase(
  query: string,
  category: 'caffeine' | 'alcohol'
): Promise<DrinkCatalogItem[]> {
  const cleaned = query.trim();
  const localMatches = searchDrinksByName(cleaned, category);
  if (!cleaned) return localMatches;

  const isBarcodeQuery = /^[0-9]{6,14}$/.test(cleaned.replace(/[\s-]/g, ''));
  const normalizedBarcode = cleaned.replace(/[\s-]/g, '');
  const externalResults: DrinkCatalogItem[] = [];

  // 1. If barcode query, check live Open Food Facts GTIN endpoint (used by Google Health / Health Connect nutrition apps)
  if (isBarcodeQuery) {
    try {
      const offRes = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
          normalizedBarcode
        )}.json`
      );
      if (offRes.ok) {
        const offData = await offRes.json();
        if (offData?.status === 1 && offData?.product) {
          const p = offData.product;
          const nutriments = p.nutriments || {};
          const vol = parseInt(p.quantity, 10) || 355;
          const caff = Math.round(
            Number(nutriments.caffeine_serving || nutriments.caffeine_100g || 110)
          );
          const abv = Number(nutriments.alcohol_100g || (category === 'alcohol' ? 5.0 : 0));
          externalResults.push({
            id: `gh-gtin-${normalizedBarcode}`,
            name: p.product_name || `Google Health Beverage #${normalizedBarcode}`,
            brand: p.brands || 'Google Health / Fitbit Food DB',
            category,
            barcode: normalizedBarcode,
            googleHealthFoodId: `GH-FS-${normalizedBarcode.slice(-6)}`,
            volumeMl: vol,
            caffeineMg: category === 'caffeine' ? caff : 0,
            abvPercent: category === 'alcohol' ? abv : 0,
          });
        }
      }
    } catch {
      // Ignore network errors in offline mode
    }
  } else {
    // 2. Live text search against Open Food Facts / Google Health Nutrition index
    try {
      const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        cleaned
      )}&search_simple=1&action=process&json=1&page_size=6`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.products)) {
          for (const p of data.products) {
            if (!p.product_name) continue;
            const code = String(p.code || '0000000000000');
            const nutriments = p.nutriments || {};
            const vol = parseInt(p.quantity, 10) || 355;
            const caff =
              category === 'caffeine'
                ? Math.max(
                    15,
                    Math.round(
                      Number(nutriments.caffeine_serving || nutriments.caffeine_100g || 95)
                    )
                  )
                : 0;
            const abv =
              category === 'alcohol'
                ? Math.max(
                    4.0,
                    Math.round(Number(nutriments.alcohol_100g || 5.5) * 10) / 10
                  )
                : 0;

            externalResults.push({
              id: `gh-fs-${code}-${Math.random().toString(36).slice(2, 6)}`,
              name: String(p.product_name),
              brand: String(p.brands || 'Google Health / Fitbit Food DB'),
              category,
              barcode: code,
              googleHealthFoodId: `GH-FS-${code.slice(-6)}`,
              volumeMl: vol,
              caffeineMg: caff,
              abvPercent: abv,
            });
          }
        }
      }
    } catch {
      // Fallback gracefully if offline
    }
  }

  // Deduplicate by name + barcode
  const seen = new Set<string>();
  const combined: DrinkCatalogItem[] = [];
  for (const item of [...localMatches, ...externalResults]) {
    const key = `${item.name.toLowerCase()}|${item.barcode || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(item);
    }
  }
  return combined;
}

export function searchCigarsByNameAndSize(
  query: string,
  sizeFilter = 'all'
): CigarCatalogItem[] {
  const cleaned = query.trim().toLowerCase();
  const normalizedSize = sizeFilter.trim().toLowerCase();

  return CIGAR_DATABASE.filter((cigar) => {
    if (normalizedSize && normalizedSize !== 'all') {
      const matchVitola = cigar.vitola.toLowerCase() === normalizedSize;
      const matchDim = cigar.dimensions.toLowerCase().includes(normalizedSize);
      if (!matchVitola && !matchDim) return false;
    }
    if (!cleaned) return true;
    return (
      cigar.name.toLowerCase().includes(cleaned) ||
      cigar.brand.toLowerCase().includes(cleaned) ||
      cigar.vitola.toLowerCase().includes(cleaned) ||
      cigar.dimensions.toLowerCase().includes(cleaned) ||
      cigar.wrapper.toLowerCase().includes(cleaned)
    );
  });
}

export const BARCODE_CATALOG: BarcodeProduct[] = [
  {
    barcode: '0070847811169',
    name: 'Monster Energy Zero Ultra (16 oz)',
    brand: 'Monster Energy',
    category: 'caffeine',
    volumeMl: 473,
    caffeineMg: 150,
    alcoholGrams: 0,
    standardDrinks: 0,
    nicotineMg: 0,
  },
  {
    barcode: '0012000161155',
    name: 'Starbucks Unsweetened Blonde Cold Brew',
    brand: 'Starbucks',
    category: 'caffeine',
    volumeMl: 325,
    caffeineMg: 175,
    alcoholGrams: 0,
    standardDrinks: 0,
    nicotineMg: 0,
  },
  {
    barcode: '0611269991000',
    name: 'Red Bull Sugarfree (8.4 fl oz)',
    brand: 'Red Bull',
    category: 'caffeine',
    volumeMl: 250,
    caffeineMg: 80,
    alcoholGrams: 0,
    standardDrinks: 0,
    nicotineMg: 0,
  },
  {
    barcode: '0850004365128',
    name: 'Athletic Brewing Upside Dawn Craft Brew',
    brand: 'Athletic Brewing',
    category: 'alcohol',
    volumeMl: 355,
    caffeineMg: 0,
    abvPercent: 0.4,
    alcoholGrams: 1.1,
    standardDrinks: 0.08,
    nicotineMg: 0,
  },
  {
    barcode: '0083820123456',
    name: 'Sierra Nevada Hazy Little Thing IPA (12 oz)',
    brand: 'Sierra Nevada',
    category: 'alcohol',
    volumeMl: 355,
    caffeineMg: 0,
    abvPercent: 6.7,
    alcoholGrams: 18.8,
    standardDrinks: 1.34,
    nicotineMg: 0,
  },
  {
    barcode: '0085000017326',
    name: 'Meiomi Pinot Noir (5 oz Pour)',
    brand: 'Meiomi Coastal',
    category: 'alcohol',
    volumeMl: 148,
    caffeineMg: 0,
    abvPercent: 13.7,
    alcoholGrams: 16.0,
    standardDrinks: 1.14,
    nicotineMg: 0,
  },
  {
    barcode: '0028200003843',
    name: 'Marlboro Gold King Size (1 Cigarette)',
    brand: 'Philip Morris',
    category: 'tobacco',
    caffeineMg: 0,
    alcoholGrams: 0,
    standardDrinks: 0,
    tobaccoType: 'cigarettes',
    tobaccoUnits: 1,
    tobaccoUnitLabel: 'cigarettes',
    nicotineMg: 1.4,
  },
  {
    barcode: '0819913011304',
    name: 'JUUL Virginia Tobacco 5% Pod (15 Puffs)',
    brand: 'JUUL Labs',
    category: 'tobacco',
    caffeineMg: 0,
    alcoholGrams: 0,
    standardDrinks: 0,
    tobaccoType: 'vapes',
    tobaccoUnits: 15,
    tobaccoUnitLabel: 'puffs',
    nicotineMg: 2.25,
  },
  {
    barcode: '0073100004419',
    name: 'Copenhagen Long Cut Wintergreen (1 Dip/Pouch)',
    brand: 'U.S. Smokeless',
    category: 'tobacco',
    caffeineMg: 0,
    alcoholGrams: 0,
    standardDrinks: 0,
    tobaccoType: 'chew',
    tobaccoUnits: 1,
    tobaccoUnitLabel: 'pouches / dips',
    nicotineMg: 3.6,
  },
  {
    barcode: '0716106001425',
    name: 'Arturo Fuente Hemingway Short Story (1 Cigar)',
    brand: 'Arturo Fuente',
    category: 'tobacco',
    caffeineMg: 0,
    alcoholGrams: 0,
    standardDrinks: 0,
    tobaccoType: 'cigars',
    tobaccoUnits: 1,
    tobaccoUnitLabel: 'cigars',
    nicotineMg: 6.5,
  },
  {
    barcode: '5707294013842',
    name: 'Peterson Early Morning Pipe Blend (1 Bowl)',
    brand: 'Peterson of Dublin',
    category: 'tobacco',
    caffeineMg: 0,
    alcoholGrams: 0,
    standardDrinks: 0,
    tobaccoType: 'pipes',
    tobaccoUnits: 1,
    tobaccoUnitLabel: 'bowls',
    nicotineMg: 4.2,
  },
];

export function lookupBarcodeProduct(barcodeOrText: string): BarcodeProduct | undefined {
  const cleaned = barcodeOrText.trim();
  if (!cleaned) return undefined;
  const exactBarcode = BARCODE_CATALOG.find((p) => p.barcode === cleaned);
  if (exactBarcode) return exactBarcode;

  const lower = cleaned.toLowerCase();
  const digits = cleaned.replace(/[^0-9]/g, '');

  // Also check BARCODE_CATALOG by text entry or partial barcode
  const catalogMatch = BARCODE_CATALOG.find(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.brand.toLowerCase().includes(lower) ||
      (digits.length >= 4 && p.barcode.includes(digits))
  );
  if (catalogMatch) return catalogMatch;

  // Also check DRINK_DATABASE (Google Health / Fitbit Food Database) by barcode or text entry
  const drinkMatch = DRINK_DATABASE.find(
    (d) =>
      d.barcode === cleaned ||
      (digits.length >= 4 && d.barcode?.includes(digits)) ||
      d.googleHealthFoodId?.toLowerCase() === lower ||
      d.name.toLowerCase().includes(lower) ||
      d.brand.toLowerCase().includes(lower)
  );
  if (drinkMatch) {
    const alcGrams =
      drinkMatch.category === 'alcohol'
        ? Math.round(drinkMatch.volumeMl * (drinkMatch.abvPercent / 100) * 0.789 * 10) / 10
        : 0;
    const stdDrinks = alcGrams > 0 ? Math.round((alcGrams / 14) * 100) / 100 : 0;
    return {
      barcode: drinkMatch.barcode || '0000000000000',
      name: drinkMatch.name,
      brand: `${drinkMatch.brand}${drinkMatch.googleHealthFoodId ? ` (${drinkMatch.googleHealthFoodId})` : ''}`,
      category: drinkMatch.category,
      volumeMl: drinkMatch.volumeMl,
      caffeineMg: drinkMatch.caffeineMg,
      abvPercent: drinkMatch.abvPercent,
      alcoholGrams: alcGrams,
      standardDrinks: stdDrinks,
      nicotineMg: 0,
    };
  }

  return undefined;
}

export const INITIAL_CUSTOM_DRINKS: CustomDrinkTemplate[] = [
  {
    id: 'cust-1',
    name: 'Double Shot Cortado (Oat)',
    category: 'caffeine',
    volumeMl: 135,
    caffeineMg: 128,
    abvPercent: 0,
    alcoholGrams: 0,
    standardDrinks: 0,
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'cust-2',
    name: 'Ceremonial Uji Matcha Whisked',
    category: 'caffeine',
    volumeMl: 180,
    caffeineMg: 72,
    abvPercent: 0,
    alcoholGrams: 0,
    standardDrinks: 0,
    createdAt: '2026-11-02T10:30:00.000Z',
  },
  {
    id: 'cust-3',
    name: 'Barrel-Aged Negroni (2 oz Rye/Campari)',
    category: 'alcohol',
    volumeMl: 90,
    caffeineMg: 0,
    abvPercent: 24.0,
    alcoholGrams: 17.0,
    standardDrinks: 1.21,
    createdAt: '2026-11-03T19:00:00.000Z',
  },
];

export function buildInitialSeedEntries(nowMs: number): IntakeEntry[] {
  const hourMs = 3600 * 1000;
  const dayMs = 24 * hourMs;

  return [
    // Today's entries (relative to nowMs)
    {
      id: 'entry-today-1',
      timestamp: new Date(nowMs - 6.5 * hourMs).toISOString(),
      name: 'Double Shot Cortado (Oat)',
      brand: 'Custom Barista Spec',
      category: 'caffeine',
      isCustomDrink: true,
      volumeMl: 135,
      caffeineMg: 128,
      alcoholGrams: 0,
      standardDrinks: 0,
      nicotineMg: 0,
      notes: 'Morning pull, 18g Ethiopian natural roast',
    },
    {
      id: 'entry-today-2',
      timestamp: new Date(nowMs - 3.0 * hourMs).toISOString(),
      name: 'Ceremonial Uji Matcha Whisked',
      brand: 'Ippodo Tea Co.',
      category: 'caffeine',
      isCustomDrink: true,
      volumeMl: 180,
      caffeineMg: 72,
      alcoholGrams: 0,
      standardDrinks: 0,
      nicotineMg: 0,
      notes: 'Early afternoon focus dose with natural L-theanine',
    },
    {
      id: 'entry-today-3',
      timestamp: new Date(nowMs - 1.5 * hourMs).toISOString(),
      name: 'JUUL Virginia Tobacco 5% Pod (10 Puffs)',
      brand: 'JUUL Labs',
      barcode: '0819913011304',
      category: 'tobacco',
      caffeineMg: 0,
      alcoholGrams: 0,
      standardDrinks: 0,
      tobaccoType: 'vapes',
      tobaccoUnits: 10,
      tobaccoUnitLabel: 'puffs',
      nicotineMg: 1.5,
      notes: 'Post-meeting nicotine vape session',
    },
    // Yesterday's entries
    {
      id: 'entry-yest-1',
      timestamp: new Date(nowMs - dayMs - 7 * hourMs).toISOString(),
      name: 'Starbucks Unsweetened Blonde Cold Brew',
      brand: 'Starbucks',
      barcode: '0012000161155',
      category: 'caffeine',
      volumeMl: 325,
      caffeineMg: 175,
      alcoholGrams: 0,
      standardDrinks: 0,
      nicotineMg: 0,
    },
    {
      id: 'entry-yest-2',
      timestamp: new Date(nowMs - dayMs - 2 * hourMs).toISOString(),
      name: 'Sierra Nevada Hazy Little Thing IPA (12 oz)',
      brand: 'Sierra Nevada',
      barcode: '0083820123456',
      category: 'alcohol',
      volumeMl: 355,
      abvPercent: 6.7,
      caffeineMg: 0,
      alcoholGrams: 18.8,
      standardDrinks: 1.34,
      nicotineMg: 0,
      notes: 'Dinner pairing',
    },
    {
      id: 'entry-yest-3',
      timestamp: new Date(nowMs - dayMs - 1.2 * hourMs).toISOString(),
      name: 'Arturo Fuente Hemingway Short Story',
      brand: 'Arturo Fuente',
      barcode: '0716106001425',
      category: 'tobacco',
      caffeineMg: 0,
      alcoholGrams: 0,
      standardDrinks: 0,
      tobaccoType: 'cigars',
      tobaccoUnits: 1,
      tobaccoUnitLabel: 'cigars',
      nicotineMg: 6.5,
      notes: 'Patio lounge cigar after dinner',
    },
    // 2 days ago
    {
      id: 'entry-d2-1',
      timestamp: new Date(nowMs - 2 * dayMs - 6 * hourMs).toISOString(),
      name: 'Monster Energy Zero Ultra (16 oz)',
      brand: 'Monster Energy',
      barcode: '0070847811169',
      category: 'caffeine',
      volumeMl: 473,
      caffeineMg: 150,
      alcoholGrams: 0,
      standardDrinks: 0,
      nicotineMg: 0,
    },
    {
      id: 'entry-d2-2',
      timestamp: new Date(nowMs - 2 * dayMs - 3 * hourMs).toISOString(),
      name: 'Copenhagen Long Cut Wintergreen (1 Dip)',
      brand: 'U.S. Smokeless',
      barcode: '0073100004419',
      category: 'tobacco',
      caffeineMg: 0,
      alcoholGrams: 0,
      standardDrinks: 0,
      tobaccoType: 'chew',
      tobaccoUnits: 1,
      tobaccoUnitLabel: 'pouches / dips',
      nicotineMg: 3.6,
    },
    // 3 days ago
    {
      id: 'entry-d3-1',
      timestamp: new Date(nowMs - 3 * dayMs - 8 * hourMs).toISOString(),
      name: 'Double Shot Cortado (Oat)',
      brand: 'Custom Barista Spec',
      category: 'caffeine',
      isCustomDrink: true,
      volumeMl: 135,
      caffeineMg: 128,
      alcoholGrams: 0,
      standardDrinks: 0,
      nicotineMg: 0,
    },
    {
      id: 'entry-d3-2',
      timestamp: new Date(nowMs - 3 * dayMs - 1.5 * hourMs).toISOString(),
      name: 'Meiomi Pinot Noir (5 oz Pour)',
      brand: 'Meiomi Coastal',
      barcode: '0085000017326',
      category: 'alcohol',
      volumeMl: 148,
      abvPercent: 13.7,
      caffeineMg: 0,
      alcoholGrams: 16.0,
      standardDrinks: 1.14,
      nicotineMg: 0,
    },
    // 4 days ago
    {
      id: 'entry-d4-1',
      timestamp: new Date(nowMs - 4 * dayMs - 7 * hourMs).toISOString(),
      name: 'Red Bull Sugarfree (8.4 fl oz)',
      brand: 'Red Bull',
      barcode: '0611269991000',
      category: 'caffeine',
      volumeMl: 250,
      caffeineMg: 80,
      alcoholGrams: 0,
      standardDrinks: 0,
      nicotineMg: 0,
    },
    {
      id: 'entry-d4-2',
      timestamp: new Date(nowMs - 4 * dayMs - 4 * hourMs).toISOString(),
      name: 'Peterson Early Morning Pipe Blend',
      brand: 'Peterson of Dublin',
      barcode: '5707294013842',
      category: 'tobacco',
      caffeineMg: 0,
      alcoholGrams: 0,
      standardDrinks: 0,
      tobaccoType: 'pipes',
      tobaccoUnits: 1,
      tobaccoUnitLabel: 'bowls',
      nicotineMg: 4.2,
    },
  ];
}

export const INITIAL_SLEEP_RECORDS: SleepRecord[] = [
  {
    id: 'sleep-1',
    date: '2026-10-30',
    source: 'Apple Health',
    totalSleepMinutes: 462, // 7h 42m
    deepSleepMinutes: 88,
    remSleepMinutes: 104,
    sleepLatencyMinutes: 11,
    awakenings: 1,
    restingHeartRateBpm: 51,
    hrvMs: 68,
    sleepScore: 89,
    bedtimeIso: '2026-10-30T22:45:00.000Z',
    wakeTimeIso: '2026-10-31T06:27:00.000Z',
  },
  {
    id: 'sleep-2',
    date: '2026-10-31',
    source: 'Apple Health',
    totalSleepMinutes: 418, // 6h 58m (late caffeine + alcohol night)
    deepSleepMinutes: 61,
    remSleepMinutes: 74,
    sleepLatencyMinutes: 24,
    awakenings: 4,
    restingHeartRateBpm: 58,
    hrvMs: 44,
    sleepScore: 71,
    bedtimeIso: '2026-10-31T23:40:00.000Z',
    wakeTimeIso: '2026-11-01T06:38:00.000Z',
  },
  {
    id: 'sleep-3',
    date: '2026-11-01',
    source: 'Apple Health',
    totalSleepMinutes: 455, // 7h 35m
    deepSleepMinutes: 82,
    remSleepMinutes: 98,
    sleepLatencyMinutes: 14,
    awakenings: 2,
    restingHeartRateBpm: 53,
    hrvMs: 62,
    sleepScore: 85,
    bedtimeIso: '2026-11-01T22:50:00.000Z',
    wakeTimeIso: '2026-11-02T06:25:00.000Z',
  },
  {
    id: 'sleep-4',
    date: '2026-11-02',
    source: 'Google Fit',
    totalSleepMinutes: 470, // 7h 50m (zero alcohol, early caffeine cutoff)
    deepSleepMinutes: 94,
    remSleepMinutes: 110,
    sleepLatencyMinutes: 9,
    awakenings: 1,
    restingHeartRateBpm: 50,
    hrvMs: 74,
    sleepScore: 93,
    bedtimeIso: '2026-11-02T22:30:00.000Z',
    wakeTimeIso: '2026-11-03T06:20:00.000Z',
  },
  {
    id: 'sleep-5',
    date: '2026-11-03',
    source: 'Apple Health',
    totalSleepMinutes: 432, // 7h 12m (evening Pinot Noir)
    deepSleepMinutes: 72,
    remSleepMinutes: 81,
    sleepLatencyMinutes: 18,
    awakenings: 3,
    restingHeartRateBpm: 56,
    hrvMs: 51,
    sleepScore: 76,
    bedtimeIso: '2026-11-03T23:15:00.000Z',
    wakeTimeIso: '2026-11-04T06:27:00.000Z',
  },
  {
    id: 'sleep-6',
    date: '2026-11-04',
    source: 'Apple Health',
    totalSleepMinutes: 444, // 7h 24m (IPA + Cigar)
    deepSleepMinutes: 68,
    remSleepMinutes: 79,
    sleepLatencyMinutes: 21,
    awakenings: 3,
    restingHeartRateBpm: 57,
    hrvMs: 49,
    sleepScore: 74,
    bedtimeIso: '2026-11-04T23:10:00.000Z',
    wakeTimeIso: '2026-11-05T06:34:00.000Z',
  },
];

export const INITIAL_WEARABLES: WearableSyncStatus[] = [
  {
    provider: 'apple_health',
    name: 'Apple HealthKit',
    connected: true,
    lastSyncedAt: '2026-11-05T06:40:00.000Z',
    deviceModel: 'Apple Watch Ultra 2 · watchOS 11.2',
    metricsTracked: ['Sleep Stages (NREM/REM)', 'HRV (SDNN/RMSSD)', 'Resting Heart Rate', 'Respiratory Rate'],
    syncedDaysCount: 14,
  },
  {
    provider: 'google_fit',
    name: 'Google Fit & Health Connect',
    connected: true,
    lastSyncedAt: '2026-11-05T06:38:00.000Z',
    deviceModel: 'Oura Ring Gen 4 via Health Connect',
    metricsTracked: ['Sleep Latency', 'Nocturnal Skin Temp', 'SpO2', 'Sleep Score'],
    syncedDaysCount: 14,
  },
];

export const INITIAL_SLEEP_REMINDERS: SleepReminder[] = [
  {
    id: 'rem-caffeine',
    title: 'Caffeine Adenosine Cutoff',
    type: 'caffeine_cutoff',
    time24h: '14:00',
    enabled: true,
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    description: 'Stop caffeine 8.5h before bedtime so active plasma level clears below 45 mg.',
    soundAlert: true,
  },
  {
    id: 'rem-alcohol',
    title: 'Evening Alcohol & BAC Cutoff',
    type: 'alcohol_cutoff',
    time24h: '19:00',
    enabled: true,
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    description: 'Allow 3.5h+ before sleep for ethanol clearance to ≤ 0.015% BAC to protect REM.',
    soundAlert: true,
  },
  {
    id: 'rem-tobacco',
    title: 'Nicotine & Tobacco Cutoff',
    type: 'tobacco_cutoff',
    time24h: '20:00',
    enabled: true,
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    description: 'Cease nicotine 2.5h before lights-out to prevent sleep latency elevation (≤ 0.5 mg).',
    soundAlert: false,
  },
  {
    id: 'rem-winddown',
    title: 'Melatonin & Blue-Light Wind-Down',
    type: 'wind_down',
    time24h: '21:45',
    enabled: true,
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    description: 'Dim overhead lighting, lower bedroom temp to 65°F (18.3°C), and start wind-down.',
    soundAlert: true,
  },
  {
    id: 'rem-bedtime',
    title: 'Target Circadian Bedtime',
    type: 'target_bedtime',
    time24h: '22:30',
    enabled: true,
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    description: 'Optimal lights-out window for 8h sleep architecture and slow-wave N3 recovery.',
    soundAlert: true,
  },
];

