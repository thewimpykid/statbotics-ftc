// app/api/ftc/team/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const team = req.nextUrl.searchParams.get("team");
  const season = req.nextUrl.searchParams.get("season");

  if (!team || !season) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const FTC_API_BASE = "https://ftc-api.firstinspires.org/v2.0";
  const username = process.env.FTC_USERNAME!;
  const apiKey = process.env.FTC_AUTH_KEY!;
  const authHeader = "Basic " + Buffer.from(`${username}:${apiKey}`).toString("base64");

  try {
    const response = await fetch(`${FTC_API_BASE}/${season}/teams/${team}`, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `FTC API failed: ${text}` }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      state: data.stateProv || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
