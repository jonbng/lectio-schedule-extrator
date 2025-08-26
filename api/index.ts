/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "edge";

type Period = {
  id: string;
  title: string;
  room: string;
  startEpochMs: number;
  endEpochMs: number;
};

type ScheduleResponse = {
  periods: Period[];
  nextHash: string;
  updatedAt: number;
};

const LECTIO_BASE = "https://www.lectio.dk";

/**
 * Expect the Lectio session cookie via:
 *  - Authorization: Bearer <base64(cookieHeader)>
 *  - or header x-lectio-cookie: <raw cookie header>
 */
function readCookie(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    console.log("Bearer cookie found");
    try {
      const b64 = auth.slice("Bearer ".length).trim();
      console.log("b64", b64);
      const decoded = atob(b64);
      // Validate that the decoded cookie contains only valid header characters
      if (!/^[\x20-\x7E]*$/.test(decoded)) {
        throw new Error("Invalid characters in decoded cookie");
      }
      console.log("decoded", decoded);
      return decoded;
    } catch {
      console.log("Bearer cookie failed");
      // fall through
    }
  }
  const raw = req.headers.get("x-lectio-cookie");
  console.log("x-lectio-cookie", raw);
  if (raw && !/^[\x20-\x7E]*$/.test(raw)) {
    return null; // Invalid characters in raw cookie
  }
  return raw ?? null;
}

/** Simple stable hash (FNV-1a) for small payloads */
function hash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // return as 8-hex, good enough for ETag
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

/**
 * Build the Lectio URL. If you already know gym/student, you can hit the
 * explicit Skema URL. If not, rely on the cookie’s default landing.
 *
 * Example explicit path (if you know them):
 *   /lectio/{gymId}/SkemaNy.aspx?type=elev&elevid={studentId}&week={week}
 */
function buildLectioUrl(week: string | null, gymId: string): string {
  const params = new URLSearchParams();
  if (week) params.set("week", week);
  // Conservative default: user’s schedule landing (cookie-based session).
  // Replace with explicit SkemaNy.aspx if you have gymId/elevid on the client.
  const basePath = `/lectio/${gymId}/SkemaNy.aspx`;
  const q = params.toString();
  return `${LECTIO_BASE}${basePath}${q ? `?${q}` : ""}`;
}

/**
 * TODO: Implement real parsing for Lectio HTML.
 * Keep it FAST and resilient. Return minimal period info only.
 */
function parseLectioSchedule(html: string, tz: string): Period[] {
  // --- PLACEHOLDER EXAMPLE ---
  // Replace with your own logic (regexes or a minimal HTML walker)
  // and map to Period[]. Keep only safe fields.
  // Throw on empty/unauthorized page patterns (e.g., login redirect).
  //
  // Example fake extraction to show structure:
  const sample: Period[] = [];
  // If you use regex, guard against catastrophic backtracking and check lengths.
  // e.g., find blocks that look like a class cell and pull start/end, title, room.
  // Then convert local times to epoch ms using tz if needed (edge has Intl).
  //
  // if (!sample.length) throw new Error('PARSE_ERROR');
  return sample;
}

/** Minimal sanitizer (ensure required fields, drop anything else) */
function sanitizePeriods(periods: Period[]): Period[] {
  return periods.map((p) => ({
    id: String(p.id),
    title: String(p.title).slice(0, 120),
    room: String(p.room).slice(0, 40),
    startEpochMs: Number(p.startEpochMs),
    endEpochMs: Number(p.endEpochMs),
  }));
}

/** Main handler */
export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const week = url.searchParams.get("week"); // optional ISO week number
    const gymId = url.searchParams.get("gymId");
    const cookie = readCookie(req);
    if (!cookie) {
      return json(
        {
          error:
            "Missing or invalid access token (cookie). Ensure cookie contains only printable ASCII characters.",
        },
        401
      );
    }

    if (!gymId) {
      return json({ error: "Missing gymId." }, 400);
    }

    // Build target URL and fetch
    const target = buildLectioUrl(week, gymId);
    const resp = await fetch(target, {
      method: "GET",
      headers: {
        // Be a polite client
        Cookie: `autologinkeyV2=${cookie};`,
        cookies: `autologinkeyV2=${cookie};`,
        "x-lectio-cookie": cookie,
        "x-lectio-cookie-header": cookie,
        "user-agent":
          "Mozilla/5.0 (compatible; LectioEdge/1.0; +https://example.com)",
        accept: "text/html,application/xhtml+xml",
      },
      // Tight timeouts via fetch options are limited in edge; rely on platform limits.
      redirect: "follow",
    });

    // Handle auth redirect or errors
    if (resp.status === 302 || resp.status === 301) {
      return json({ error: "Not authorized or session redirect." }, 401);
    }
    if (!resp.ok) {
      return json({ error: `Upstream error ${resp.status}` }, 502);
    }

    const html = await resp.text();

    console.log("html", html);

    // Quick auth check: Lectio login marker (adjust to real marker you see)
    if (/unilogin|MitID|log\s*ind/i.test(html)) {
      return json({ error: "Session expired." }, 401);
    }

    const tz = "Europe/Copenhagen";
    const periodsRaw = parseLectioSchedule(html, tz);
    const periods = sanitizePeriods(periodsRaw).sort(
      (a, b) => a.startEpochMs - b.startEpochMs
    );

    // Build response + ETag
    const body: ScheduleResponse = {
      periods,
      nextHash: hash(JSON.stringify(periods.slice(0, 6))), // small stable hash
      updatedAt: Date.now(),
    };

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch.replace(/"/g, "") === body.nextHash) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: `"${body.nextHash}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        ETag: `"${body.nextHash}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    // Don't leak internals, but provide helpful info for common issues
    const message = String(err?.message ?? "");
    if (
      message.includes("invalid header") ||
      message.includes("Headers.append")
    ) {
      return json(
        {
          error: "EDGE_FAILURE",
          detail:
            "Invalid header value. Check that your cookie contains only valid ASCII characters.",
        },
        500
      );
    }
    return json({ error: "EDGE_FAILURE", detail: message }, 500);
  }
}

/** Helper to send JSON */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
