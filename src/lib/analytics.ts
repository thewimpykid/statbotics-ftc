// /lib/analytics.ts
import { create, all } from "mathjs";

// Create a math instance with all functions, including pinv
const math = create(all, {});

// ---------------------------------------------------------------------
// API Fetchers (calls your Next.js App Router endpoints)
// ---------------------------------------------------------------------
export async function fetchTeamEvents(teamNumber: number, season: string) {
  // This calls /api/team-events with ?teamNumber & season
  const res = await fetch(`/api/team-events?teamNumber=${teamNumber}&season=${season}`);
  if (!res.ok) throw new Error("Failed to fetch team events");
  return await res.json();
}

export async function getTeamEvents(team: string, season: string) {
  const res = await fetch(`/api/team-events?team=${team}&season=${season}`);
  if (!res.ok) throw new Error("Failed to fetch events");

  const data = await res.json();

  console.log("🔍 Raw getTeamEvents data:", data);

  // Patch here based on structure:
  return data.events
}



export async function getMostRecentPlayedEvent(
  teamNumber: number,
  season: string
): Promise<{ eventCode: string; eventName: string } | null> {
  const raw = await getTeamEvents(teamNumber.toString(), season);
  const events = raw

  console.log("Fetched events:", events);

  let mostRecentEvent: { eventCode: string; eventName: string } | null = null;
  let latestMatchTime = 0;

  for (const event of events) {
    console.log("Raw event object:", event);

    // 🔍 Confirm keys are named correctly
    const code = event.eventCode || event.code || event.event_key || event.key;
    const name = event.eventName || event.name || "Unknown Event";

    if (!code) {
      console.warn("⚠️ Skipping event because eventCode is missing:", event);
      continue;
    }

    try {
      console.log("Checking event:", code);
      const matches = await fetchMatchResults(teamNumber, code, season);
      console.log(`Matches for ${code}:`, matches?.length);

      if (!matches?.length) continue;

      const latestMatch = matches.reduce((latest, match) => {
        const t = getMatchTimestamp(match).getTime();
        return t > getMatchTimestamp(latest).getTime() ? match : latest;
      });

      const matchTime = getMatchTimestamp(latestMatch).getTime();
      if (matchTime > latestMatchTime) {
        latestMatchTime = matchTime;
        mostRecentEvent = { eventCode: code, eventName: name };
      }
    } catch (err) {
      console.warn(`❌ Failed to process event ${code}:`, err);
    }
  }

  console.log("✅ Most recent event selected:", mostRecentEvent);
  return mostRecentEvent?.eventCode;
}


// lib/ftcClient.ts
export async function getTeamInfo(teamNumber: number, season: string) {
  const res = await fetch(`/api/info?team=${teamNumber}&season=${season}`);
  if (!res.ok) throw new Error("Failed to fetch team info");

  return res.json();
}

/**
 * For completeness, an endpoint that fetches all matches for a single event
 * (but in practice, you won't use this for OPR – you'll use fetchAllMatchesForEvent).
 */
export async function fetchEventMatches(eventCode: string, season: string) {
  const res = await fetch(`/api/event-matches?eventCode=${eventCode}&season=${season}`);
  if (!res.ok) throw new Error("Failed to fetch event matches");
  return await res.json();
}

/**
 * Fetch *all* matches for the specified event & season, *without* specifying a teamNumber.
 * This ensures you have the full dataset needed for OPR calculations.
 */
export async function fetchAllMatchesForEvent(eventCode: string, season: string) {
  if (!eventCode || !season) {
    throw new Error("Missing required parameters (eventCode, season)");
  }

  // Make a match-results call without teamNumber
  const query = new URLSearchParams({ eventCode, season });
  const url = `/api/match-results?${query.toString()}`;
  
  console.log("fetchAllMatchesForEvent calling:", url);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error("Failed to fetch all matches for OPR:", text);
    throw new Error("Failed to fetch all matches for OPR");
  }
  const data = await res.json();
  return data.matches; // The array of all matches in the event
}

/**
 * Fetch matches for a *specific* team in an event (filtered).
 * 
 * Note: These are used for the team's own stats (win rate, performance trend, etc.),
 * but NOT for OPR. OPR requires the full event data from fetchAllMatchesForEvent.
 */
export async function fetchMatchResults(
  teamNumber: number,
  eventCode: string,
  season: string,
  level: string = "all"
) {
  if (!teamNumber || !eventCode || !season) {
    throw new Error("Missing one or more required parameters in fetchMatchResults");
  }

  const query = new URLSearchParams({
    teamNumber: String(teamNumber),
    eventCode,
    season,
  });
  if (level !== "all") {
    query.append("tournamentLevel", level);
  }

  console.log("Calling match-results with:", {
    teamNumber,
    eventCode,
    season,
    level,
  });

  try {
    const res = await fetch(`/api/match-results?${query.toString()}`);
    if (!res.ok) {
      const text = await res.text();
      console.error("Match results fetch failed:", text);
      throw new Error("Failed to fetch match results");
    }
    const data = await res.json();
    return data.matches;
  } catch (err) {
    console.error("Request threw:", err);
    throw err;
  }
}

// ---------------------------------------------------------------------
// Matrix & Utility Helpers
// ---------------------------------------------------------------------
function solveLeastSquares(A: number[][], y: number[], lambda = 0.0001): number[] {
  // Return an empty array if no data
  if (A.length === 0 || A[0].length === 0) {
    return [];
  }

  // Convert arrays to math.js Matrix
  const A_mat = math.matrix(A);
  const y_vec = math.matrix(y);

  // Compute A^T, then A^T*A, A^T*y
  const A_T = math.transpose(A_mat);
  const ATA = math.multiply(A_T, A_mat);
  const ATy = math.multiply(A_T, y_vec);

  // Add small ridge λ to the diagonal => (A^T A + λI)
  const [rows, cols] = ATA.size();
  for (let i = 0; i < Math.min(rows, cols); i++) {
    const diagVal = ATA.get([i, i]);
    ATA.set([i, i], diagVal + lambda);
  }

  // Now invert (A^T*A + λI)
  const invATA = math.inv(ATA);

  // Multiply => x = (A^T*A + λI)^(-1) * A^T * y
  const x = math.multiply(invATA, ATy);

  // Convert back to array
  return x.valueOf() as number[];
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdDev(arr: number[]): number {
  const mean = avg(arr);
  const variance = arr.reduce((sum, x) => sum + (x - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

export function filterMatchesByTournament(matches: any[], level: string): any[] {
  return matches.filter((m) => m.tournamentLevel?.toLowerCase() === level.toLowerCase());
}

export function getTeamAlliance(match: any, team: number): string | null {
  for (const t of match.teams || []) {
    if (t.teamNumber === team) {
      const station = t.station.toLowerCase();
      if (station.startsWith("red")) return "red";
      if (station.startsWith("blue")) return "blue";
    }
  }
  return null;
}

export function getMatchTimestamp(match: any): Date {
  const time = match.postResultTime || match.actualStartTime || null;
  return time ? new Date(time) : new Date(0);
}

export function averageTeamScore(matches: any[], team: number): number {
  const scores = matches
    .map((m) => {
      const alliance = getTeamAlliance(m, team);
      return alliance ? categoryOverall(m, alliance) : null;
    })
    .filter((s) => s !== null) as number[];

  return scores.length ? avg(scores) : 0;
}

// ---------------------------------------------------------------------
// Scoring Category Functions
// ---------------------------------------------------------------------
export function categoryOverall(match: any, alliance: string): number {
  // Uses the final alliance score as the API returns it (including penalties).
  return match[`score${capitalize(alliance)}Final`] ?? 0;
}

export function categoryAuto(match: any, alliance: string): number {
  return match[`score${capitalize(alliance)}Auto`] ?? 0;
}

export function categoryTeleop(match: any, alliance: string): number {
  return match[`score${capitalize(alliance)}Teleop`] ?? 0;
}

export function categoryDPR(match: any, alliance: string): number {
  // DPR = Opponent's final score
  return categoryOverall(match, alliance === "red" ? "blue" : "red");
}

// ---------------------------------------------------------------------
// OPR (alliance-based), DPR, CCWM
// ---------------------------------------------------------------------
/**
 * Calculate OPR for a given scoring category, using the full event matches.
 * This should be called with fetchAllMatchesForEvent(...) – the entire event.
 */
export function calculateCategoryOPR(
  matches: any[],
  categoryFn: (m: any, alliance: string) => number
): Record<number, number> {
  const allianceRows: number[][] = [];
  const allianceScores: number[] = [];
  const teamsCollected = new Set<number>();

  for (const match of matches) {
    const allTeams = match.teams || [];
    const redTeams = allTeams
      .filter((t: any) => t.station?.toLowerCase().startsWith("red"))
      .map((t: any) => t.teamNumber);
    const blueTeams = allTeams
      .filter((t: any) => t.station?.toLowerCase().startsWith("blue"))
      .map((t: any) => t.teamNumber);

    // Red alliance row
    if (redTeams.length > 0) {
      allianceRows.push(redTeams);
      allianceScores.push(categoryFn(match, "red"));
      redTeams.forEach((teamNum) => teamsCollected.add(teamNum));
    }

    // Blue alliance row
    if (blueTeams.length > 0) {
      allianceRows.push(blueTeams);
      allianceScores.push(categoryFn(match, "blue"));
      blueTeams.forEach((teamNum) => teamsCollected.add(teamNum));
    }
  }

  if (!allianceRows.length) {
    return {};
  }

  // Build sorted team list for consistent column ordering
  const teamList = Array.from(teamsCollected).sort((a, b) => a - b);

  // Construct design matrix A
  const A = allianceRows.map((rowTeams) => {
    const row = new Array(teamList.length).fill(0);
    for (const tm of rowTeams) {
      const colIndex = teamList.indexOf(tm);
      if (colIndex >= 0) row[colIndex] = 1;
    }
    return row;
  });

  // Solve A*x ~ y with a small ridge param
  const x = solveLeastSquares(A, allianceScores, 0.0001);

  // Map each coefficient back to its team
  const result: Record<number, number> = {};
  teamList.forEach((t, i) => {
    result[t] = x[i];
  });
  return result;
}

export function calculateDPR(matches: any[]): Record<number, number> {
  return calculateCategoryOPR(matches, categoryDPR);
}

export function calculateCCWM(
  opr: Record<number, number>,
  dpr: Record<number, number>,
  team: number
): number {
  return (opr[team] || 0) - (dpr[team] || 0);
}

// ---------------------------------------------------------------------
// Additional Metrics (Team-Specific)
// ---------------------------------------------------------------------
export function computePlayoffElevation(matches: any[], team: number): number {
  const qual = filterMatchesByTournament(matches, "qualification");
  const playoff = filterMatchesByTournament(matches, "playoff");
  const qualAvg = averageTeamScore(qual, team);
  const playoffAvg = averageTeamScore(playoff, team);
  return qualAvg ? playoffAvg - qualAvg : 0;
}

export function computeAutoReliability(matches: any[], team: number, threshold = 50): number {
  let total = 0;
  let success = 0;
  matches.forEach((m) => {
    const alliance = getTeamAlliance(m, team);
    if (alliance) {
      total++;
      const score = categoryAuto(m, alliance);
      if (score >= threshold) success++;
    }
  });
  return total ? (success / total) * 100 : 0;
}

export function computeFoulRate(matches: any[], team: number): number {
  let fouls = 0;
  let count = 0;
  matches.forEach((m) => {
    const alliance = getTeamAlliance(m, team);
    if (alliance) {
      count++;
      const totalFoul = m[`score${capitalize(alliance)}Foul`] || 0;
      const allyCount = m.teams.filter((t: any) =>
        t.station.toLowerCase().startsWith(alliance)
      ).length;
      fouls += totalFoul / (allyCount || 1);
    }
  });
  return count ? fouls / count : 0;
}

export function computeScoringStd(matches: any[], team: number): number {
  const scores = matches
    .map((m) => {
      const alliance = getTeamAlliance(m, team);
      return alliance ? categoryOverall(m, alliance) : null;
    })
    .filter((s) => s !== null) as number[];
  return stdDev(scores);
}

export function computePerformanceTrend(matches: any[], team: number): number {
  const sorted = [...matches].sort(
    (a, b) => getMatchTimestamp(a).getTime() - getMatchTimestamp(b).getTime()
  );
  if (sorted.length < 2) return 0;

  const mid = Math.floor(sorted.length / 2);
  const firstAvg = averageTeamScore(sorted.slice(0, mid), team);
  const secondAvg = averageTeamScore(sorted.slice(mid), team);
  return firstAvg ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
}

export function computeClutchIndex(matches: any[], team: number): number {
  const qualAvg = averageTeamScore(filterMatchesByTournament(matches, "qualification"), team);
  const playoffAvg = averageTeamScore(filterMatchesByTournament(matches, "playoff"), team);
  return qualAvg ? ((playoffAvg - qualAvg) / qualAvg) * 100 : 0;
}

export function computeChokeIndex(matches: any[], team: number): number {
  const qualAvg = averageTeamScore(filterMatchesByTournament(matches, "qualification"), team);
  const playoffAvg = averageTeamScore(filterMatchesByTournament(matches, "playoff"), team);
  return qualAvg && playoffAvg < qualAvg ? ((qualAvg - playoffAvg) / qualAvg) * 100 : 0;
}

export function computeTeamMomentum(matches: any[], team: number, window = 3): number {
  const sorted = [...matches].sort(
    (a, b) => getMatchTimestamp(a).getTime() - getMatchTimestamp(b).getTime()
  );
  const recent = sorted.slice(-window);
  const scores = recent
    .map((m) => {
      const alliance = getTeamAlliance(m, team);
      return alliance ? categoryOverall(m, alliance) : null;
    })
    .filter((s) => s !== null) as number[];
  return scores.length ? avg(scores) : 0;
}

export function computeElimPerformance(matches: any[], team: number): number {
  const playoff = filterMatchesByTournament(matches, "playoff");
  return averageTeamScore(playoff, team);
}

export function computeSeasonHighLow(matches: any[], team: number): [number, number] {
  const scores = matches
    .map((m) => {
      const alliance = getTeamAlliance(m, team);
      return alliance ? categoryOverall(m, alliance) : null;
    })
    .filter((s) => s !== null) as number[];
  return scores.length ? [Math.max(...scores), Math.min(...scores)] : [0, 0];
}

export function computeWinRate(matches: any[], team: number): number {
  let wins = 0;
  let total = 0;
  matches.forEach((m) => {
    const alliance = getTeamAlliance(m, team);
    if (!alliance) return;
    const own = categoryOverall(m, alliance);
    const opp = categoryOverall(m, alliance === "red" ? "blue" : "red");
    if (own > opp) wins++;
    total++;
  });
  return total ? (wins / total) * 100 : 0;
}

export function computeWinShares(
  matches: any[],
  team: number,
  opr: Record<number, number>,
  dpr: Record<number, number>
): number {
  let wins = 0;
  let marginSum = 0;
  matches.forEach((m) => {
    const alliance = getTeamAlliance(m, team);
    if (!alliance) return;
    const own = categoryOverall(m, alliance);
    const opp = categoryOverall(m, alliance === "red" ? "blue" : "red");
    const margin = own - opp;
    if (margin > 0) {
      wins++;
      marginSum += margin;
    }
  });
  const ccwm = (opr[team] || 0) - (dpr[team] || 0);
  const avgMargin = wins ? marginSum / wins : 0;
  return avgMargin ? (ccwm / avgMargin) * wins : 0;
}

export function computeUpsetFactor(
  matches: any[],
  team: number,
  opr: Record<number, number>
): number {
  let totalWins = 0;
  let upsetWins = 0;
  matches.forEach((m) => {
    const teams = m.teams || [];
    const red = teams
      .filter((t: any) => t.station?.toLowerCase().startsWith("red"))
      .map((t: any) => t.teamNumber);
    const blue = teams
      .filter((t: any) => t.station?.toLowerCase().startsWith("blue"))
      .map((t: any) => t.teamNumber);

    let alliance: string | null = null;
    if (red.includes(team)) alliance = "red";
    else if (blue.includes(team)) alliance = "blue";
    if (!alliance) return;

    const ownScore = categoryOverall(m, alliance);
    const oppScore = categoryOverall(m, alliance === "red" ? "blue" : "red");
    if (ownScore > oppScore) {
      totalWins++;
      // Sum OPR for each alliance
      const ownOPR = (alliance === "red" ? red : blue).reduce(
        (sum, t) => sum + (opr[t] || 0),
        0
      );
      const oppOPR = (alliance === "red" ? blue : red).reduce(
        (sum, t) => sum + (opr[t] || 0),
        0
      );
      if (ownOPR < oppOPR) {
        upsetWins++;
      }
    }
  });
  return totalWins ? (upsetWins / totalWins) * 100 : 0;
}
