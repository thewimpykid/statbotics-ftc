"use client";

import React, { useState } from "react";
import {
  fetchAllMatchesForEvent,
  fetchMatchResults,
  calculateCategoryOPR,
  calculateDPR,
  calculateCCWM,
  computeWinRate,
  computeAutoReliability,
  computePlayoffElevation,
  computeTeamMomentum,
  categoryOverall,
  categoryAuto,
  getMostRecentPlayedEvent
} from "@/lib/analytics";

// Stat Card Component
const StatCard = ({
  title,
  value,
  tooltip,
  suffix = "",
}: {
  title: string;
  value: number;
  tooltip: string;
  suffix?: string;
}) => (
  <div className="relative group bg-gradient-to-br from-[#1a1a1a] to-[#101010] rounded-2xl p-6 shadow-md transition hover:scale-[1.01] font-sans">
    <h3 className="text-sm text-gray-400 mb-1">{title}</h3>
    <p className="text-3xl font-bold text-gray-100">{value.toFixed(2)}{suffix}</p>
    {/* Tooltip shown below the card */}
    <div className="absolute hidden group-hover:block left-1/2 transform -translate-x-1/2 top-full mt-3 w-64">
      <div className="bg-black/80 text-white text-xs p-3 rounded-md shadow-xl text-center">
        {tooltip}
      </div>
    </div>
  </div>
);

export default function TeamCardPage() {
  const [teamNumber, setTeamNumber] = useState("23786");
  const [eventCode] = useState("USNJCMPTRPK");
  const [season] = useState("2024");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [stats, setStats] = useState<null | Record<string, number>>(null);
  const [displayedTeamName, setDisplayedTeamName] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setErrorMsg("");
    setStats(null);

    try {
      const num = parseInt(teamNumber, 10);

      const allMatches = await fetchAllMatchesForEvent(eventCode, season);
      const overallOPR = calculateCategoryOPR(allMatches, categoryOverall);
      const autoOPR = calculateCategoryOPR(allMatches, categoryAuto);

      const teleopOPR: Record<number, number> = {};
      for (const t of Object.keys(overallOPR)) {
        const id = Number(t);
        teleopOPR[id] = (overallOPR[id] || 0) - (autoOPR[id] || 0);
      }

      const dpr = calculateDPR(allMatches);
      const teamMatches = await fetchMatchResults(num, eventCode, season);

      setStats({
        overallOPR: overallOPR[num] || 0,
        autoOPR: autoOPR[num] || 0,
        teleopOPR: teleopOPR[num] || 0,
        dpr: dpr[num] || 0,
        ccwm: calculateCCWM(overallOPR, dpr, num),
        winRate: computeWinRate(teamMatches, num),
        autoReliability: computeAutoReliability(teamMatches, num),
        playoffElevation: computePlayoffElevation(teamMatches, num),
        momentum: computeTeamMomentum(teamMatches, num),
      });

      // Update team name display only after successful search
      setDisplayedTeamName(`Team ${num}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center p-6 font-sans">
      <div className="w-full max-w-4xl space-y-8">

        {/* Display team name only after search */}
        {displayedTeamName && (
          <section className="bg-gradient-to-br from-[#1c1c1c] to-[#0f0f0f] rounded-3xl p-8 text-center shadow-lg">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {displayedTeamName}
            </h1>
          </section>
        )}

        {/* Input Section */}
        <section className="flex gap-4 items-center">
          <input
            type="text"
            value={teamNumber}
            onChange={(e) => setTeamNumber(e.target.value)}
            placeholder="Enter team number"
            className="flex-1 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:ring-2 focus:ring-lime-500 outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 transition text-black font-bold disabled:opacity-50"
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </section>

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-700/80 text-white p-3 rounded-xl shadow">
            {errorMsg}
          </div>
        )}

        {/* Stat Cards */}
        {stats && (
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <StatCard
              title="Overall OPR"
              value={stats.overallOPR}
              tooltip="Offensive Power Rating: Least-squares contribution to alliance points."
            />
            <StatCard
              title="Auto OPR"
              value={stats.autoOPR}
              tooltip="Autonomous phase offensive power rating."
            />
            <StatCard
              title="Teleop OPR"
              value={stats.teleopOPR}
              tooltip="Teleop = Overall - Auto OPR."
            />
            <StatCard
              title="DPR"
              value={stats.dpr}
              tooltip="Defensive Power Rating: opponent score impact."
            />
            <StatCard
              title="CCWM"
              value={stats.ccwm}
              tooltip="Calculated Contribution to Winning Margin = OPR - DPR."
            />
            <StatCard
              title="Win Rate"
              value={stats.winRate}
              suffix="%"
              tooltip="Match wins as a percent of total played."
            />
            <StatCard
              title="Auto Reliability"
              value={stats.autoReliability}
              suffix="%"
              tooltip="Matches where auto score was consistent."
            />
            <StatCard
              title="Playoff Elevation"
              value={stats.playoffElevation}
              tooltip="Avg playoff score - avg qualification score."
            />
            <StatCard
              title="Momentum"
              value={stats.momentum}
              tooltip="Average score in recent matches."
            />
          </section>
        )}
      </div>
    </main>
  );
}
