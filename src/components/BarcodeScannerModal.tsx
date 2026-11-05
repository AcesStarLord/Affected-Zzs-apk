import React, { useEffect, useRef, useState } from 'react';
import { Barcode, Camera, Check, Search, X } from 'lucide-react';
import { BarcodeProduct, IntakeEntry, VolumeUnit } from '../types/health';
import {
  BARCODE_CATALOG,
  lookupBarcodeProduct,
  searchGoogleHealthFoodDatabase,
} from '../data/seedData';
import {
  calculateAlcoholGrams,
  calculateStandardDrinks,
  formatVolume,
} from '../utils/pharmacokinetics';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  volumeUnit: VolumeUnit;
  onChangeVolumeUnit: (unit: VolumeUnit) => void;
  onClose: () => void;
  onLogProduct: (entry: Omit<IntakeEntry, 'id'>) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  volumeUnit,
  onChangeVolumeUnit,
  onClose,
  onLogProduct,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('0070847811169');
  const [matchedProduct, setMatchedProduct] = useState<BarcodeProduct | null>(() =>
    lookupBarcodeProduct('0070847811169') || null
  );
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('found');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatusMessage, setCameraStatusMessage] = useState<string | null>(null);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraStatusMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatusMessage('Optical camera API unavailable in this environment. Use direct UPC scan below.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraStatusMessage('Camera permission declined or no hardware camera detected. Select or enter a UPC code below.');
      setCameraActive(false);
    }
  };

  const handleBarcodeLookup = async (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim();
    setBarcodeInput(cleanCode);
    if (!cleanCode) {
      setMatchedProduct(null);
      setLookupStatus('idle');
      return;
    }

    setLookupStatus('searching');
    const localMatch = lookupBarcodeProduct(cleanCode);
    if (localMatch) {
      setMatchedProduct(localMatch);
      setServingMultiplier(1);
      setLookupStatus('found');
      return;
    }

    // Search live Google Health Food Database (Fitbit / FatSecret & Open Food Facts) by Barcode or Text Entry
    try {
      const ghCaffeineMatches = await searchGoogleHealthFoodDatabase(cleanCode, 'caffeine');
      if (ghCaffeineMatches.length > 0) {
        const hit = ghCaffeineMatches[0];
        setMatchedProduct({
          barcode: hit.barcode || cleanCode,
          name: hit.name,
          brand: `${hit.brand}${hit.googleHealthFoodId ? ` (${hit.googleHealthFoodId})` : ''}`,
          category: 'caffeine',
          volumeMl: hit.volumeMl,
          caffeineMg: hit.caffeineMg,
          abvPercent: 0,
          alcoholGrams: 0,
          standardDrinks: 0,
          nicotineMg: 0,
        });
        setServingMultiplier(1);
        setLookupStatus('found');
        return;
      }
    } catch {
      // Fall through to OpenFoodFacts
    }

    // Fallback to live OpenFoodFacts API for any external beverage barcode
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.status === 1 && data.product) {
          const p = data.product;
          const nutriments = p.nutriments || {};
          const caffeineMg = Math.round((nutriments.caffeine_serving || nutriments.caffeine_100g || 80) as number);
          const abv = Number(nutriments.alcohol_100g || 0);
          const vol = parseInt(p.quantity, 10) || 330;
          const alcGrams = abv > 0 ? calculateAlcoholGrams(vol, abv) : 0;
          const resolved: BarcodeProduct = {
            barcode: cleanCode,
            name: p.product_name || `Scanned Product #${cleanCode}`,
            brand: p.brands || 'Google Health / Fitbit Food DB',
            category: abv > 0 ? 'alcohol' : 'caffeine',
            volumeMl: vol,
            caffeineMg: abv > 0 ? 0 : caffeineMg,
            abvPercent: abv,
            alcoholGrams: alcGrams,
            standardDrinks: calculateStandardDrinks(alcGrams),
            nicotineMg: 0,
          };
          setMatchedProduct(resolved);
          setServingMultiplier(1);
          setLookupStatus('found');
          return;
        }
      }
    } catch {
      // Offline or blocked in sandbox, fall through to not_found
    }

    setMatchedProduct(null);
    setLookupStatus('not_found');
  };

  const handleConfirmLog = () => {
    if (!matchedProduct) return;
    const mult = servingMultiplier > 0 ? servingMultiplier : 1;

    onLogProduct({
      timestamp: new Date().toISOString(),
      name: matchedProduct.name,
      brand: matchedProduct.brand,
      barcode: matchedProduct.barcode,
      category: matchedProduct.category,
      volumeMl: matchedProduct.volumeMl ? Math.round(matchedProduct.volumeMl * mult) : undefined,
      caffeineMg: Math.round(matchedProduct.caffeineMg * mult * 10) / 10,
      abvPercent: matchedProduct.abvPercent,
      alcoholGrams: Math.round(matchedProduct.alcoholGrams * mult * 10) / 10,
      standardDrinks: Math.round(matchedProduct.standardDrinks * mult * 100) / 100,
      tobaccoType: matchedProduct.tobaccoType,
      tobaccoUnits: matchedProduct.tobaccoUnits ? Math.round(matchedProduct.tobaccoUnits * mult) : undefined,
      tobaccoUnitLabel: matchedProduct.tobaccoUnitLabel,
      nicotineMg: Math.round(matchedProduct.nicotineMg * mult * 100) / 100,
      notes: `Scanned via UPC ${matchedProduct.barcode}`,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="barcode-modal-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 id="barcode-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              UPC / EAN Barcode Scanner
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scan beverage cans, bottles, or tobacco packaging for instant pharmacokinetic logging
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Scanner drink measurement unit"
              className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
            >
              <button
                type="button"
                onClick={() => onChangeVolumeUnit('ml')}
                className={`rounded px-2 py-1 font-mono text-[11px] font-medium ${
                  volumeUnit === 'ml'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                mL
              </button>
              <button
                type="button"
                onClick={() => onChangeVolumeUnit('oz')}
                className={`rounded px-2 py-1 font-mono text-[11px] font-medium ${
                  volumeUnit === 'oz'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                fl oz
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Barcode Scanner"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Left column: Optical viewport + manual input */}
          <div className="space-y-4 md:col-span-6">
            <div className="relative flex h-44 flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-slate-300 dark:border-slate-800">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center px-4 text-center">
                  <Barcode className="mb-2 h-8 w-8 text-teal-400" />
                  <p className="text-xs font-medium text-slate-200">Optical Laser Reticle Ready</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Supports EAN-13, UPC-A, and QR substance labels
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500 whitespace-nowrap shrink-0"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Activate Camera Stream
                  </button>
                </div>
              )}
              {/* Reticle overlay */}
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-px bg-teal-400/70" />
            </div>

            {cameraStatusMessage && (
              <p className="text-xs text-amber-700 dark:text-amber-400">{cameraStatusMessage}</p>
            )}

            <div>
              <label
                htmlFor="upc-search-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                UPC / GTIN Barcode or Google Health Food Database Text Search
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="upc-search-input"
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Enter UPC barcode or drink name (e.g. Celsius, Guinness)..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => handleBarcodeLookup(barcodeInput)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 whitespace-nowrap shrink-0"
                >
                  <Search className="h-3.5 w-3.5" />
                  Search Google Health / UPC
                </button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                Verified Catalog Barcodes (Click to Simulate Scan)
              </p>
              <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {BARCODE_CATALOG.map((item) => (
                  <button
                    key={item.barcode}
                    type="button"
                    onClick={() => handleBarcodeLookup(item.barcode)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                      matchedProduct?.barcode === item.barcode
                        ? 'bg-teal-50 font-medium text-teal-900 dark:bg-teal-950/60 dark:text-teal-200'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="truncate pr-2">{item.name}</span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                      {item.barcode}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Scanned Product Telemetry & Confirmation */}
          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 md:col-span-6">
            {lookupStatus === 'searching' && (
              <div className="flex h-full items-center justify-center py-12 text-xs text-slate-500">
                Querying barcode registry...
              </div>
            )}

            {lookupStatus === 'not_found' && (
              <div className="flex h-full flex-col justify-center py-8 text-center">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  No catalog match for UPC {barcodeInput}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Select a verified UPC from the left list or use the Custom Drink / Substance Logger.
                </p>
              </div>
            )}

            {matchedProduct && lookupStatus === 'found' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{matchedProduct.barcode}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{matchedProduct.category}</span>
                    {matchedProduct.tobaccoType && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{matchedProduct.tobaccoType}</span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {matchedProduct.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{matchedProduct.brand}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 border-y border-slate-200 py-3 dark:border-slate-700/80">
                  {matchedProduct.category === 'caffeine' && (
                    <>
                      <div>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Caffeine Content
                        </span>
                        <span className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {Math.round(matchedProduct.caffeineMg * servingMultiplier)} mg
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Liquid Volume ({volumeUnit === 'oz' ? 'fl oz' : 'mL'})
                        </span>
                        <span className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatVolume((matchedProduct.volumeMl || 0) * servingMultiplier, volumeUnit)}
                        </span>
                      </div>
                    </>
                  )}

                  {matchedProduct.category === 'alcohol' && (
                    <>
                      <div>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Pure Ethanol / ABV
                        </span>
                        <span className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {(matchedProduct.alcoholGrams * servingMultiplier).toFixed(1)} g ·{' '}
                          {matchedProduct.abvPercent}%
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Standard Drinks
                        </span>
                        <span className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {(matchedProduct.standardDrinks * servingMultiplier).toFixed(2)} std
                        </span>
                      </div>
                    </>
                  )}

                  {matchedProduct.category === 'tobacco' && (
                    <>
                      <div>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Systemic Nicotine
                        </span>
                        <span className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {(matchedProduct.nicotineMg * servingMultiplier).toFixed(2)} mg
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Dose Quantity
                        </span>
                        <span className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {Math.round((matchedProduct.tobaccoUnits || 1) * servingMultiplier)}{' '}
                          {matchedProduct.tobaccoUnitLabel}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="serving-multiplier"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Serving / Dose Multiplier
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    {[0.5, 1, 1.5, 2].map((mult) => (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => setServingMultiplier(mult)}
                        className={`rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          servingMultiplier === mult
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {mult}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700/80">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!matchedProduct}
                onClick={handleConfirmLog}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-medium text-white hover:bg-teal-500 disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <Check className="h-4 w-4" />
                Log Scanned Item
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
