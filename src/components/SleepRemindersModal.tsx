import React, { useState } from 'react';
import {
  Bell,
  Clock,
  Coffee,
  Flame,
  Moon,
  Plus,
  Sparkles,
  Trash2,
  Volume2,
  Wine,
  X,
} from 'lucide-react';
import { SleepReminder, SleepReminderType } from '../types/health';
import { calculateDynamicCutoffTimes } from '../utils/pharmacokinetics';

interface SleepRemindersModalProps {
  isOpen: boolean;
  reminders: SleepReminder[];
  targetBedtime: string;
  onChangeTargetBedtime: (bedtime24h: string) => void;
  onAutoCalibrateFromBedtime: (bedtime24h: string) => void;
  onToggleReminder: (id: string) => void;
  onUpdateReminderTime: (id: string, time24h: string) => void;
  onDeleteReminder: (id: string) => void;
  onAddReminder: (reminder: Omit<SleepReminder, 'id'>) => void;
  onTriggerTestAlert: (reminder: SleepReminder) => void;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const SleepRemindersModal: React.FC<SleepRemindersModalProps> = ({
  isOpen,
  reminders,
  targetBedtime,
  onChangeTargetBedtime,
  onAutoCalibrateFromBedtime,
  onToggleReminder,
  onUpdateReminderTime,
  onDeleteReminder,
  onAddReminder,
  onTriggerTestAlert,
  onClose,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<SleepReminderType>('wind_down');
  const [newTime, setNewTime] = useState('21:30');
  const [newDescription, setNewDescription] = useState('');
  const [newSoundAlert, setNewSoundAlert] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const recommendedCutoffs = calculateDynamicCutoffTimes(targetBedtime);

  const handleToggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setFormError('Please enter a title for the sleep reminder.');
      return;
    }
    if (selectedDays.length === 0) {
      setFormError('Select at least one active day of the week.');
      return;
    }
    onAddReminder({
      title: trimmed,
      type: newType,
      time24h: newTime || '22:00',
      enabled: true,
      daysOfWeek: selectedDays,
      description:
        newDescription.trim() ||
        'Custom circadian sleep hygiene & substance clearance reminder.',
      soundAlert: newSoundAlert,
    });
    setNewTitle('');
    setNewDescription('');
    setFormError(null);
  };

  const getReminderIcon = (type: SleepReminderType) => {
    switch (type) {
      case 'caffeine_cutoff':
        return <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'alcohol_cutoff':
        return <Wine className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'tobacco_cutoff':
        return <Flame className="h-4 w-4 text-violet-600 dark:text-violet-400" />;
      case 'wind_down':
        return <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case 'target_bedtime':
      default:
        return <Moon className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sleep-reminders-modal-title"
    >
      <div className="my-auto w-full max-w-3xl rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="sleep-reminders-modal-title"
                className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
              >
                Circadian Sleep Reminders &amp; Substance Cutoff Schedule
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automate caffeine, alcohol, and nicotine cutoff alerts synchronized to your target bedtime
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Sleep Reminders"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Target Bedtime Auto-Calibrator */}
        <div className="mt-5 rounded-xl border border-teal-500/25 bg-gradient-to-r from-teal-50/70 via-white to-indigo-50/40 p-4 dark:border-teal-500/20 dark:from-teal-950/30 dark:via-slate-900 dark:to-indigo-950/20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-300">
                <Clock className="h-3.5 w-3.5" />
                <span>Target Bedtime Pharmacokinetic Synchronizer</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Calibrates Caffeine (-8.5h →{' '}
                <strong className="font-mono text-slate-900 dark:text-slate-200">
                  {recommendedCutoffs.caffeineCutoff}
                </strong>
                ), Alcohol (-3.5h →{' '}
                <strong className="font-mono text-slate-900 dark:text-slate-200">
                  {recommendedCutoffs.alcoholCutoff}
                </strong>
                ), Nicotine (-2.5h →{' '}
                <strong className="font-mono text-slate-900 dark:text-slate-200">
                  {recommendedCutoffs.tobaccoCutoff}
                </strong>
                ), &amp; Wind-Down (
                <strong className="font-mono text-slate-900 dark:text-slate-200">
                  {recommendedCutoffs.windDownTime}
                </strong>
                )
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="target-bedtime-picker" className="sr-only">
                Target Bedtime
              </label>
              <input
                id="target-bedtime-picker"
                type="time"
                value={targetBedtime}
                onChange={(e) => onChangeTargetBedtime(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => onAutoCalibrateFromBedtime(targetBedtime)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-medium text-white shadow-xs hover:bg-teal-500 whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Sync Cutoffs to Bedtime
              </button>
            </div>
          </div>
        </div>

        {/* Active Reminders List */}
        <div className="mt-5 max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {reminders.map((rem) => (
            <div
              key={rem.id}
              className={`flex flex-col justify-between gap-3 rounded-xl border p-3.5 transition-all sm:flex-row sm:items-center ${
                rem.enabled
                  ? 'border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-800/60'
                  : 'border-slate-200/60 bg-slate-50/60 opacity-65 dark:border-slate-800/50 dark:bg-slate-900/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                  {getReminderIcon(rem.type)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {rem.title}
                    </h3>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      · {rem.daysOfWeek.join(', ')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    {rem.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0">
                <input
                  type="time"
                  aria-label={`Time for ${rem.title}`}
                  value={rem.time24h}
                  onChange={(e) => onUpdateReminderTime(rem.id, e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-semibold text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />

                <button
                  type="button"
                  onClick={() => onTriggerTestAlert(rem)}
                  aria-label={`Test alert for ${rem.title}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-teal-500 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Volume2 className="h-3 w-3 text-teal-600" />
                  Test
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={rem.enabled}
                  aria-label={`Toggle ${rem.title}`}
                  onClick={() => onToggleReminder(rem.id)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    rem.enabled ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      rem.enabled ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteReminder(rem.id)}
                  aria-label={`Delete reminder ${rem.title}`}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Custom Sleep Reminder Form */}
        <form
          onSubmit={handleCreateReminder}
          className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
        >
          <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Add Custom Sleep or Substance Cutoff Reminder
          </h3>

          {formError && (
            <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <label
                htmlFor="new-reminder-title"
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400"
              >
                Reminder Label
              </label>
              <input
                id="new-reminder-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Magnesium Glycinate & Herbal Tea"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor="new-reminder-type"
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400"
              >
                Category
              </label>
              <select
                id="new-reminder-type"
                value={newType}
                onChange={(e) => setNewType(e.target.value as SleepReminderType)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="wind_down">Melatonin &amp; Wind-Down</option>
                <option value="target_bedtime">Target Bedtime</option>
                <option value="caffeine_cutoff">Caffeine Cutoff</option>
                <option value="alcohol_cutoff">Alcohol Cutoff</option>
                <option value="tobacco_cutoff">Nicotine / Tobacco Cutoff</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="new-reminder-time"
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400"
              >
                Time (24h)
              </label>
              <input
                id="new-reminder-time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {DAYS_OF_WEEK.map((day) => {
                const active = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleToggleDay(day)}
                    className={`rounded-md px-2 py-1 font-mono text-[11px] font-medium transition-colors ${
                      active
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={newSoundAlert}
                  onChange={(e) => setNewSoundAlert(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600"
                />
                <span>Chime Alert</span>
              </label>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Sleep Reminder
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
