import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatText(label: string, value: string | undefined) {
  return `${label}: ${value?.trim() || "Not provided"}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, string | undefined>;

    if (body.website) {
      return NextResponse.json({ message: "Thanks." });
    }

    const name = body.name?.trim();
    const email = body.email?.trim();
    const message = body.message?.trim();

    if (!name || !email || !message) {
      return NextResponse.json({ message: "Name, email, and message are required." }, { status: 400 });
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: "Please use a valid email address." }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    const inbox = process.env.CONTACT_INBOX || "devinotto26@gmail.com";
    const tag = process.env.CONTACT_TAG || "DEV_CANDO_IT_LEAD";

    if (!gmailUser || !gmailPassword) {
      return NextResponse.json(
        {
          message:
            "Email delivery is not configured yet. Add GMAIL_USER and GMAIL_APP_PASSWORD to enable form routing."
        },
        { status: 503 }
      );
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
      message: "Thanks. Your note is tagged and on its way to Devin's inbox."
    });
  } catch {
    return NextResponse.json(
      {
        message: "Something went wrong while sending the message. Please try again or email Devin directly."
      },
      { status: 500 }
    );
  }
}
