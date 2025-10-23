'use client';

import { useState, useEffect, useRef } from 'react';

export interface DurationSliderProps {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

// Key duration marks in seconds
const MARKS = [
  { value: 0, label: '0' },
  { value: 300, label: '5min' },
  { value: 900, label: '15min' },
  { value: 1800, label: '30min' },
  { value: 3600, label: '60min' },
  { value: 7200, label: '120min' },
];

const MIN_VALUE = 0;
const MAX_VALUE = 7200;

export function DurationSlider({ min, max, onChange }: DurationSliderProps) {
  // Convert null to boundary values for slider
  const [minValue, setMinValue] = useState(min ?? MIN_VALUE);
  const [maxValue, setMaxValue] = useState(max ?? MAX_VALUE);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMinValue(min ?? MIN_VALUE);
    setMaxValue(max ?? MAX_VALUE);
  }, [min, max]);

  const handleMinChange = (value: number) => {
    const newMin = Math.min(value, maxValue);
    setMinValue(newMin);
    onChange(
      newMin === MIN_VALUE ? null : newMin,
      maxValue === MAX_VALUE ? null : maxValue
    );
  };

  const handleMaxChange = (value: number) => {
    const newMax = Math.max(value, minValue);
    setMaxValue(newMax);
    onChange(
      minValue === MIN_VALUE ? null : minValue,
      newMax === MAX_VALUE ? null : newMax
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return 'Any';
    if (seconds === 0) return '0';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) {
      return `${mins}min`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
  };

  const formatCurrentRange = () => {
    const minStr = minValue === MIN_VALUE ? 'No minimum' : formatDuration(minValue);
    const maxStr = maxValue === MAX_VALUE ? 'No maximum' : formatDuration(maxValue);

    if (minValue === MIN_VALUE && maxValue === MAX_VALUE) {
      return 'Any duration';
    }
    if (minValue === MIN_VALUE) {
      return `Up to ${maxStr}`;
    }
    if (maxValue === MAX_VALUE) {
      return `${minStr} and above`;
    }
    return `${minStr} to ${maxStr}`;
  };

  // Calculate percentage positions
  const minPercent = ((minValue - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100;
  const maxPercent = ((maxValue - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100;

  return (
    <div className="space-y-6">
      {/* Current Selection Display */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Current Selection
        </p>
        <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-1">
          {formatCurrentRange()}
        </p>
      </div>

      {/* Dual Range Slider */}
      <div className="relative pt-8 pb-4" ref={sliderRef}>
        {/* Track Background */}
        <div className="absolute h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full top-8" />

        {/* Active Range Track */}
        <div
          className="absolute h-2 bg-blue-600 dark:bg-blue-500 rounded-full top-8"
          style={{
            left: `${minPercent}%`,
            right: `${100 - maxPercent}%`,
          }}
        />

        {/* Min Thumb */}
        <input
          type="range"
          min={MIN_VALUE}
          max={MAX_VALUE}
          step={60} // 1 minute steps
          value={minValue}
          onChange={(e) => handleMinChange(parseInt(e.target.value))}
          className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-10 top-8 range-thumb"
          aria-label="Minimum duration"
          style={{ pointerEvents: 'all' }}
        />

        {/* Max Thumb */}
        <input
          type="range"
          min={MIN_VALUE}
          max={MAX_VALUE}
          step={60} // 1 minute steps
          value={maxValue}
          onChange={(e) => handleMaxChange(parseInt(e.target.value))}
          className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-10 top-8 range-thumb"
          aria-label="Maximum duration"
          style={{ pointerEvents: 'all' }}
        />

        {/* Value Labels Above Thumbs */}
        <div
          className="absolute -top-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded whitespace-nowrap transform -translate-x-1/2"
          style={{ left: `${minPercent}%` }}
        >
          {formatDuration(minValue === MIN_VALUE ? null : minValue)}
        </div>
        <div
          className="absolute -top-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded whitespace-nowrap transform -translate-x-1/2"
          style={{ left: `${maxPercent}%` }}
        >
          {formatDuration(maxValue === MAX_VALUE ? null : maxValue)}
        </div>

        {/* Marks */}
        <div className="relative mt-6">
          {MARKS.map((mark) => {
            const percent = ((mark.value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100;
            return (
              <div
                key={mark.value}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${percent}%` }}
              >
                <div className="h-2 w-0.5 bg-gray-400 dark:bg-gray-500 mb-1" />
                <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {mark.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Precise Number Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Min (seconds)
          </label>
          <input
            type="number"
            min={MIN_VALUE}
            max={maxValue}
            step={60}
            value={minValue === MIN_VALUE ? '' : minValue}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : MIN_VALUE;
              handleMinChange(value);
            }}
            placeholder="No minimum"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max (seconds)
          </label>
          <input
            type="number"
            min={minValue}
            max={MAX_VALUE}
            step={60}
            value={maxValue === MAX_VALUE ? '' : maxValue}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : MAX_VALUE;
              handleMaxChange(value);
            }}
            placeholder="No maximum"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Quick Reset */}
      <button
        onClick={() => {
          setMinValue(MIN_VALUE);
          setMaxValue(MAX_VALUE);
          onChange(null, null);
        }}
        className="w-full text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 underline"
      >
        Reset to any duration
      </button>

      <style jsx>{`
        .range-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #2563eb;
          border: 3px solid white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.15s ease;
        }
        .range-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        .range-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #2563eb;
          border: 3px solid white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.15s ease;
        }
        .range-thumb::-moz-range-thumb:hover {
          transform: scale(1.1);
        }
        .range-thumb::-webkit-slider-runnable-track {
          background: transparent;
        }
        .range-thumb::-moz-range-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
}
