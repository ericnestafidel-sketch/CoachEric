/**
 * Lesson and contact form mail for the static CoachEric site.
 * POST JSON to /api/send. No framework and no build step.
 *
 * Env:
 *   RESEND_API_KEY  required to deliver mail (otherwise 503, and the page uses mailto)
 *   FROM_EMAIL      optional sender; defaults to onboarding@resend.dev
 */

const TO = "ericnestafidel@gmail.com";
const DEFAULT_FROM = "onboarding@resend.dev";

const FOCUS = new Set([
  "Hitting",
  "Fielding",
  "Throwing",
  "Pitching",
  "Catching",
  "General skills",
]);

const LENGTHS = new Set(["30 minutes", "60 minutes"]);

function sendJson(response, status, body) {
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(body);
}

function cleanLine(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanText(value, max) {
  return String(value == null ? "" : value)
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

function validEmail(value) {
  if (!value || value.length > 200) return false;
  if (/[<>"(),;:\\]/.test(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readBody(request) {
  let body = request.body;
  if (Buffer.isBuffer(body)) body = body.toString("utf8");
  if (typeof body === "string") {
    if (!body.trim()) return {};
    body = JSON.parse(body);
  }
  return body;
}

async function deliver(response, mail) {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  if (!key) {
    return sendJson(response, 503, {
      ok: false,
      error: "Email is not configured",
    });
  }

  const from =
    String(process.env.FROM_EMAIL || "")
      .replace(/[\r\n]/g, "")
      .trim() || DEFAULT_FROM;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from,
        to: [TO],
        reply_to: mail.replyTo,
        subject: mail.subject.slice(0, 180),
        text: mail.text,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const detail = await res.text();
    if (!res.ok) {
      console.error("Resend error", res.status, detail.slice(0, 400));
      return sendJson(response, 502, {
        ok: false,
        error: "Email could not be sent",
      });
    }

    return sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error("Resend request failed", error && error.message);
    return sendJson(response, 502, {
      ok: false,
      error: "Email could not be sent",
    });
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { ok: false, error: "Method not allowed" });
  }

  let body;
  try {
    body = readBody(request);
  } catch (error) {
    return sendJson(response, 400, { ok: false, error: "Invalid JSON" });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return sendJson(response, 400, { ok: false, error: "Invalid request" });
  }

  // Bots that fill the hidden field get a quiet success and no email.
  if (cleanLine(body.leave_blank, 200)) {
    return sendJson(response, 200, { ok: true });
  }

  const form = cleanLine(body.form, 20);

  if (form === "lesson") {
    const parent = cleanLine(body.parent, 100);
    const email = cleanLine(body.email, 200);
    const phone = cleanLine(body.phone, 40);
    const player = cleanLine(body.player, 100);
    const age = cleanLine(body.age, 20);
    const focus = cleanLine(body.focus, 40);
    const length = cleanLine(body.length, 20);
    const times = cleanLine(body.times, 200);
    const notes = cleanText(body.notes, 2000);

    if (
      !parent ||
      !player ||
      !age ||
      !times ||
      !validEmail(email) ||
      !FOCUS.has(focus) ||
      !LENGTHS.has(length)
    ) {
      return sendJson(response, 400, {
        ok: false,
        error: "Check the lesson form and try again.",
      });
    }

    return deliver(response, {
      replyTo: email,
      subject: "Lesson Request: " + player,
      text: [
        "Parent/guardian: " + parent,
        "Email: " + email,
        "Phone: " + phone,
        "Player: " + player,
        "Age: " + age,
        "Focus: " + focus,
        "Session length: " + length,
        "Preferred days/times: " + times,
        "Notes: " + notes,
      ].join("\n"),
    });
  }

  if (form === "contact") {
    const name = cleanLine(body.name, 100);
    const email = cleanLine(body.email, 200);
    const message = cleanText(body.message, 2000);

    if (!name || !message || !validEmail(email)) {
      return sendJson(response, 400, {
        ok: false,
        error: "Check the contact form and try again.",
      });
    }

    return deliver(response, {
      replyTo: email,
      subject: "CoachEric contact from " + name,
      text: ["Name: " + name, "Email: " + email, "Message: " + message].join(
        "\n"
      ),
    });
  }

  return sendJson(response, 400, { ok: false, error: "Unknown form" });
};
