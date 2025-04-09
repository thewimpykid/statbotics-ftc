export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const eventCode = searchParams.get("eventCode")
    const season = searchParams.get("season")
  
    const creds = Buffer.from(`${process.env.FTC_USERNAME}:${process.env.FTC_AUTH_KEY}`).toString("base64")
  
    const res = await fetch(`https://ftc-api.firstinspires.org/v2.0/${season}/matches/${eventCode}`, {
      headers: {
        Authorization: `Basic ${creds}`,
      },
    })
  
    if (!res.ok) {
      return new Response("Failed to fetch event matches", { status: res.status })
    }
  
    const data = await res.json()
    return Response.json(data.matches || [])
  }
  