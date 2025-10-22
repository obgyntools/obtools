import React, { useState, useMemo, useEffect } from 'react';

// --- Mock Doppler Data ---
// This is illustrative data. Replace with your actual percentile data.
// Format: { [week]: { [vessel_pi]: { 5: value, 50: value, 95: value } } }
const dopplerData = {
  20: { mca_pi: { 5: 1.12, 50: 1.55, 95: 2.01 }, ua_pi: { 5: 0.88, 50: 1.15, 95: 1.42 } },
  21: { mca_pi: { 5: 1.09, 50: 1.51, 95: 1.98 }, ua_pi: { 5: 0.85, 50: 1.12, 95: 1.39 } },
  22: { mca_pi: { 5: 1.06, 50: 1.47, 95: 1.94 }, ua_pi: { 5: 0.82, 50: 1.08, 95: 1.35 } },
  23: { mca_pi: { 5: 1.03, 50: 1.43, 95: 1.90 }, ua_pi: { 5: 0.79, 50: 1.04, 95: 1.31 } },
  24: { mca_pi: { 5: 1.00, 50: 1.39, 95: 1.85 }, ua_pi: { 5: 0.76, 50: 1.00, 95: 1.27 } },
  25: { mca_pi: { 5: 0.97, 50: 1.35, 95: 1.81 }, ua_pi: { 5: 0.73, 50: 0.96, 95: 1.23 } },
  26: { mca_pi: { 5: 0.94, 50: 1.31, 95: 1.77 }, ua_pi: { 5: 0.70, 50: 0.92, 95: 1.19 } },
  27: { mca_pi: { 5: 0.91, 50: 1.27, 95: 1.73 }, ua_pi: { 5: 0.68, 50: 0.89, 95: 1.15 } },
  28: { mca_pi: { 5: 0.88, 50: 1.23, 95: 1.69 }, ua_pi: { 5: 0.65, 50: 0.85, 95: 1.11 } },
  29: { mca_pi: { 5: 0.85, 50: 1.19, 95: 1.65 }, ua_pi: { 5: 0.63, 50: 0.82, 95: 1.07 } },
  30: { mca_pi: { 5: 0.82, 50: 1.15, 95: 1.61 }, ua_pi: { 5: 0.60, 50: 0.78, 95: 1.03 } },
  31: { mca_pi: { 5: 0.79, 50: 1.11, 95: 1.57 }, ua_pi: { 5: 0.58, 50: 0.75, 95: 0.99 } },
  32: { mca_pi: { 5: 0.77, 50: 1.08, 95: 1.53 }, ua_pi: { 5: 0.56, 50: 0.72, 95: 0.95 } },
  33: { mca_pi: { 5: 0.74, 50: 1.04, 95: 1.49 }, ua_pi: { 5: 0.54, 50: 0.69, 95: 0.91 } },
  34: { mca_pi: { 5: 0.71, 50: 1.00, 95: 1.45 }, ua_pi: { 5: 0.52, 50: 0.66, 95: 0.88 } },
  35: { mca_pi: { 5: 0.69, 50: 0.97, 95: 1.41 }, ua_pi: { 5: 0.50, 50: 0.63, 95: 0.84 } },
  36: { mca_pi: { 5: 0.66, 50: 0.93, 95: 1.37 }, ua_pi: { 5: 0.48, 50: 0.60, 95: 0.81 } },
  37: { mca_pi: { 5: 0.64, 50: 0.90, 95: 1.33 }, ua_pi: { 5: 0.46, 50: 0.58, 95: 0.78 } },
  38: { mca_pi: { 5: 0.61, 50: 0.86, 95: 1.29 }, ua_pi: { 5: 0.44, 50: 0.55, 95: 0.75 } },
  39: { mca_pi: { 5: 0.59, 50: 0.83, 95: 1.25 }, ua_pi: { 5: 0.42, 50: 0.53, 95: 0.72 } },
  40: { mca_pi: { 5: 0.56, 50: 0.79, 95: 1.21 }, ua_pi: { 5: 0.40, 50: 0.50, 95: 0.69 } },
};

const minAge = 20;
const maxAge = 40;
const today = new Date();
today.setUTCHours(0, 0, 0, 0); // Use UTC midnight

// --- Date Helper Functions ---

/**
 * Formats a Date object into "YYYY-MM-DD" string based on UTC.
 */
const formatDate = (dateObj) => {
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates the LMP date from a given gestational age in weeks, using UTC.
 */
const getLmpFromGa = (gaWeeks, fromDate) => {
  const totalDaysAgo = gaWeeks * 7;
  const lmpDate = new Date(fromDate.getTime());
  lmpDate.setUTCDate(fromDate.getUTCDate() - totalDaysAgo); // Use setUTCDate
  return lmpDate;
};

/**
 * Calculates the Estimated Due Date (EDD) from an LMP date string, using UTC.
 */
const getEddFromLmp = (lmpDateString) => {
  if (!lmpDateString) return null;
  const lmp = new Date(lmpDateString + 'T00:00:00Z'); // Treat string as UTC midnight
  const eddDate = new Date(lmp.getTime());
  eddDate.setUTCDate(lmp.getUTCDate() + 280); // Use setUTCDate
  const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }; // Specify UTC for display
  return eddDate.toLocaleDateString('en-US', options);
};

/**
 * Calculates gestational age info (weeks, days) from an LMP date string, using UTC.
 */
const getGaInfoFromLmp = (lmpDateString, fromDate) => {
  if (!lmpDateString) return { weeks: 0, days: 0, totalDays: 0, string: "0 weeks" };
  const lmp = new Date(lmpDateString + 'T00:00:00Z'); // Treat string as UTC midnight
  const diffTime = fromDate.getTime() - lmp.getTime(); // This is now a clean diff of UTC timestamps

  if (diffTime < 0) {
    // LMP is in the future
    return { weeks: 0, days: 0, totalDays: 0, string: "0 weeks" };
  }

  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  return {
    weeks: weeks,
    days: days,
    totalDays: totalDays,
    string: `${weeks} weeks, ${days} days`
  };
};

// --- Child Components ---

/**
 * A card component to display percentile data for a specific vessel.
 */
function PercentileCard({ title, data }) {
  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
        <p className="text-gray-500">No data available for this week.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-blue-600 bg-blue-100 rounded-full px-3 py-1">5th Percentile</span>
          <span className="text-lg font-bold text-gray-700">{data['5'].toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-green-600 bg-green-100 rounded-full px-3 py-1">50th Percentile</span>
          <span className="text-lg font-bold text-gray-900">{data['50'].toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-red-600 bg-red-100 rounded-full px-3 py-1">95th Percentile</span>
          <span className="text-lg font-bold text-gray-700">{data['95'].toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Displays controls for EDD and LMP.
 * This is now a "dumb" component that receives state and handlers from App.
 */
function EstimatedDueDate({ lmpDate, edd, currentGaString, onLmpChange }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Pregnancy Dating</h2>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <label htmlFor="lmp-date" className="text-lg font-medium text-gray-700">
          First Day of Last Period:
        </label>
        <input
          type="date"
          id="lmp-date"
          value={lmpDate}
          onChange={onLmpChange}
          className="w-full sm:w-auto text-lg font-medium text-blue-700 border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:ring-blue-500 transition"
        />
      </div>

      {/* Display EDD and Current GA */}
      <div className="mt-6 space-y-3">
        {edd && (
          <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
            <p className="text-lg font-semibold text-blue-800">
              Estimated Due Date: <span className="font-bold">{edd}</span>
            </p>
          </div>
        )}
        {currentGaString && (
          <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <p className="text-lg font-semibold text-green-800">
              Current Gestational Age: <span className="font-bold">{currentGaString}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Displays controls for selecting Gestational Age for Doppler.
 * This is also a "dumb" component.
 */
function DopplerCalculator({ gestationalAge, onGaNumberChange, onGaSliderChange, minAge, maxAge }) {
  // The slider value needs to be a valid number in the range,
  // even if the input field is temporarily empty or invalid (e.g., "2").
  const sliderValue = parseInt(gestationalAge, 10);
  const clampedSliderValue = isNaN(sliderValue)
    ? minAge
    : Math.max(minAge, Math.min(maxAge, sliderValue));

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Doppler Percentile Calculator</h2>
      <p className="text-gray-600 mb-4">Adjusting this slider will update the LMP/EDD above, assuming "today" as the reference point.</p>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <label htmlFor="gestational-age" className="text-lg font-semibold text-gray-800">
          Gestational Age:
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="number"
            id="gestational-age"
            value={gestationalAge}
            onChange={onGaNumberChange}
            min={minAge}
            max={maxAge}
            className="w-24 text-center text-2xl font-bold text-blue-700 border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:ring-blue-500 transition"
          />
          <span className="text-xl text-gray-600">weeks</span>
        </div>
      </div>

      <div className="mt-6">
        <input
          type="range"
          min={minAge}
          max={maxAge}
          value={clampedSliderValue} // Use the clamped value for the slider
          onChange={onGaSliderChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-2">
          <span>{minAge} wks</span>
          <span>{maxAge} wks</span>
        </div>
      </div>
    </div>
  );
}


/**
 * Main application component.
 * This component now holds all state and logic.
 */
export default function App() {

  // Set initial state to be 20 weeks ago
  const [lmpDate, setLmpDate] = useState(() => {
    const defaultLmp = getLmpFromGa(minAge, today);
    return formatDate(defaultLmp);
  });

  // NEW state for the number input to allow partial/invalid typing
  const [gaInputValue, setGaInputValue] = useState(minAge);

  // --- Event Handlers ---

  const handleLmpChange = (e) => {
    setLmpDate(e.target.value);
  };

  // UPDATED handler for the number input
  const handleGaNumberChange = (e) => {
    const value = e.target.value;
    setGaInputValue(value); // Update the input field immediately

    const newWeeks = parseInt(value, 10);
    if (!isNaN(newWeeks) && newWeeks >= minAge && newWeeks <= maxAge) {
      // If valid, sync the main state
      const newLmpDate = getLmpFromGa(newWeeks, today);
      setLmpDate(formatDate(newLmpDate));
    }
  };

  // NEW handler for the slider
  const handleGaSliderChange = (e) => {
    const newWeeks = parseInt(e.target.value, 10);
    // Slider is always valid, so just update
    setGaInputValue(newWeeks); // Keep input field in sync
    const newLmpDate = getLmpFromGa(newWeeks, today);
    setLmpDate(formatDate(newLmpDate));
  };


  // --- Derived Values (Calculated on every render) ---

  // useMemo ensures these complex calculations only re-run when lmpDate changes.
  const { edd, gaInfo, currentData } = useMemo(() => {
    if (!lmpDate) {
      return { edd: null, gaInfo: { weeks: minAge, days: 0, string: "N/A" }, currentData: dopplerData[minAge] };
    }

    const calculatedEdd = getEddFromLmp(lmpDate);
    const calculatedGaInfo = getGaInfoFromLmp(lmpDate, today);

    // Ensure GA for doppler lookup is within bounds
    let dopplerWeek = calculatedGaInfo.weeks;
    if (dopplerWeek < minAge) dopplerWeek = minAge;
    if (dopplerWeek > maxAge) dopplerWeek = maxAge;

    const calculatedData = dopplerData[dopplerWeek];

    return { edd: calculatedEdd, gaInfo: calculatedGaInfo, currentData: calculatedData };
  }, [lmpDate]);

  // --- Side Effect to sync input when LMP changes ---
  // This updates the number input when the LMP date changes (e.g., from date picker or slider)
  useEffect(() => {
    let weekForInput = gaInfo.weeks;
    if (weekForInput < minAge) weekForInput = minAge;
    if (weekForInput > maxAge) weekForInput = maxAge;

    // Only update if the input value is different, to avoid clobbering partial input
    if (parseInt(gaInputValue, 10) !== weekForInput || gaInputValue === "") {
      setGaInputValue(weekForInput);
    }
  }, [gaInfo.weeks, lmpDate]); // Also run when lmpDate changes directly


  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-blue-700">OBTools</h1>
          <p className="text-lg text-gray-600 mt-2">Tools for pregnancy dating and doppler values.</p>
        </header>

        {/* EDD Calculator */}
        <EstimatedDueDate
          lmpDate={lmpDate}
          edd={edd}
          currentGaString={gaInfo.string}
          onLmpChange={handleLmpChange}
        />

        {/* Doppler Percentile Calculator */}
        <DopplerCalculator
          gestationalAge={gaInputValue}
          onGaNumberChange={handleGaNumberChange}
          onGaSliderChange={handleGaSliderChange}
          minAge={minAge}
          maxAge={maxAge}
        />

        {/* Results Display */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 px-1">
          Doppler Values for Week {gaInfo.weeks < minAge ? minAge : gaInfo.weeks > maxAge ? maxAge : gaInfo.weeks}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PercentileCard
            title="MCA PI"
            data={currentData?.mca_pi}
          />
          <PercentileCard
            title="Umbilical Artery PI"
            data={currentData?.ua_pi}
          />
        </div>

        {/* Disclaimer */}
        <footer className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            <strong>Disclaimer:</strong> The data in this application is for illustrative purposes only and should not be used for medical decisions.
            Always consult with a qualified healthcare professional.
          </p>
        </footer>
      </div>
    </div>
  );
}
