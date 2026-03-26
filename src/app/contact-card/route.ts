import { siteConfig } from "@/lib/site";

export function GET() {
  const card = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${siteConfig.owner}`,
    `ORG:${siteConfig.name}`,
    `TITLE:${siteConfig.title}`,
    `EMAIL;TYPE=INTERNET:${siteConfig.email}`,
    `ADR;TYPE=WORK:;;${siteConfig.location};;;;United States`,
    `NOTE:Agentic AI consulting, generative AI strategy, custom web apps, and operational systems.`,
    "END:VCARD"
  ].join("\n");

  return new Response(card, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="devcandoit-contact.vcf"'
    }
  });
}
