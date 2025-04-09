// src/app/api/match-results/route.ts
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventCode = searchParams.get("eventCode");
  const season = searchParams.get("season");
  const tournamentLevel = searchParams.get("tournamentLevel");
  const username = process.env.FTC_USERNAME;
  const authKey = process.env.FTC_AUTH_KEY;

  // Basic validation: only eventCode + season are required
  if (!eventCode || !season) {
    return new Response("Missing query parameters", { status: 400 });
  }

  if (!username || !authKey) {
    return new Response("Missing FTC credentials in environment variables", { status: 500 });
  }

  // Build Basic Auth
  const creds = Buffer.from(`${username}:${authKey}`).toString("base64");

  // The correct path for match results per the docs:
  // GET /v2.0/{season}/matches/{eventCode}
  const url = new URL(`https://ftc-api.firstinspires.org/v2.0/${season}/matches/${eventCode}`);

  // If teamNumber is provided, add it. Otherwise we omit it to get all matches.
  const teamNumber = searchParams.get("teamNumber");
  if (teamNumber) {
    url.searchParams.set("teamNumber", teamNumber);
  }

  // If tournamentLevel is provided and not "all", we filter by it
  if (tournamentLevel && tournamentLevel.toLowerCase() !== "all") {
    url.searchParams.set("tournamentLevel", tournamentLevel);
  }

  // Fetch from the FTC API
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${creds}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "FTCAnalyticsApp (your-email@example.com)",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    return new Response(`FTC API error: ${res.status} - ${errorText}`, { status: res.status });
  }

  const data = await res.json();
  return Response.json({ matches: data.matches || [] });
}
