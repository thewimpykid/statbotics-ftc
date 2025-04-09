import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const team = req.nextUrl.searchParams.get("team");
  const season = req.nextUrl.searchParams.get("season");

  if (!team || !season) {
    return NextResponse.json({ error: "Missing team or season" }, { status: 400 });
  }

  const username = process.env.FTC_USERNAME!;
  const apiKey = process.env.FTC_AUTH_KEY!;
  const authHeader = "Basic " + Buffer.from(`${username}:${apiKey}`).toString("base64");

  const url = `https://ftc-api.firstinspires.org/v2.0/${season}/events?teamNumber=${team}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    const data = await res.json();
    const simplified = data.events.map((e: any) => ({
      eventCode: e.eventCode,
      eventName: e.eventName,
    }));

    return NextResponse.json(simplified);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}