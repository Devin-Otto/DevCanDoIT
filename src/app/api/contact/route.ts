import { NextResponse, type NextRequest } from "next/server";
import nodemailer from "nodemailer";

import { assertAllowedOrigin, assertRateLimit } from "@/lib/request-security";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatText(label: string, value: string | undefined) {
  return `${label}: ${value?.trim() || "Not provided"}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!assertAllowedOrigin(request)) {
      return NextResponse.json({ message: "Unable to process your request." }, { status: 403 });
    }

    const rateLimit = await assertRateLimit(request, "contact-form", {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      const retryAfterSeconds = Math.max(1, Math.ceil(((rateLimit.retryAt ?? Date.now()) - Date.now()) / 1000));
      return NextResponse.json(
        { message: "Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfterSeconds.toString(),
          },
        },
      );
    }

    let body: Record<string, string | undefined>;

    try {
      body = (await request.json()) as Record<string, string | undefined>;
    } catch {
      return NextResponse.json({ message: "Unable to process your request." }, { status: 400 });
    }

    if (body.website) {
      return NextResponse.json({ message: "Thanks." });
    }

    const name = body.name?.trim();
    const email = body.email?.trim();
    const message = body.message?.trim();

    if (!name || !email || !message) {
      return NextResponse.json({ message: "Unable to process your request." }, { status: 400 });
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: "Unable to process your request." }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    const inbox = process.env.CONTACT_INBOX || "devin@devcandoit.com";
    const tag = process.env.CONTACT_TAG || "DEV_CANDO_IT_LEAD";

    if (!gmailUser || !gmailPassword) {
      return NextResponse.json({ message: "Message delivery is temporarily unavailable." }, { status: 503 });
    }

    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPassword
      }
    });

    const service = body.service?.trim() || "General inquiry";
    const company = body.company?.trim();
    const industry = body.industry?.trim();
    const context = body.context?.trim() || "General inquiry";

    const subject = `[${tag}] ${service} from ${name}${company ? ` at ${company}` : ""}`;
    const text = [
      `A new inquiry came in from DevCanDoIt.`,
      "",
      formatText("Context", context),
      formatText("Service", service),
      formatText("Name", name),
      formatText("Email", email),
      formatText("Company", company),
      formatText("Industry", industry),
      "",
      "Message:",
      message
    ].join("\n");

    await transport.sendMail({
      from: `"DevCanDoIt" <${gmailUser}>`,
      to: inbox,
      replyTo: email,
      subject,
      text,
      headers: {
        "X-DevCanDoIt-Lead-Tag": tag
      }
    });

    return NextResponse.json({
      message: "Thanks. Your note has been received."
    });
  } catch {
    return NextResponse.json({ message: "Unable to send your message right now." }, { status: 500 });
  }
}
