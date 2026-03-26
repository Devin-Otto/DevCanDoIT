import { createHash } from "crypto";

import {
  DEFAULT_ORIGIN,
  DEFAULT_SCAN_LIMIT,
  DEFAULT_SCAN_RADIUS_METERS,
  type BusinessLead,
  type LeadFieldEvidence,
  type LeadFieldStatus,
  type LeadRankReason,
  type LeadScanJob,
  type LeadContactStatus,
  type LeadOrigin,
  type LeadScanRequest,
  type LeadStore,
} from "@/lib/lead-types";
import {
  createLeadScanJob as createLeadScanJobRow,
  ensureLeadDatabase,
  getLeadScanJob as getLeadScanJobRow,
  listLeadScanJobs as listLeadScanJobsRows,
  loadLeadStoreSnapshot,
  replaceLeadSnapshot,
  setJobCandidates,
  updateLeadRecord,
  updateLeadScanJob,
  upsertLeadRows,
  upsertLeadActivityForBatch,
} from "@/lib/lead-db";

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type WebsitePageAnalysis = {
  html: string;
  text: string;
  title: string | null;
  description: string | null;
  viewport: boolean;
  schema: boolean;
  forms: number;
  contactLinks: string[];
  emails: string[];
  phones: string[];
  aiSignals: string[];
  websiteSignals: string[];
};

type WebsiteResolution = {
  websiteUrl: string | null;
  websiteStatus: LeadFieldStatus;
  websiteSource: string | null;
  websiteConfidence: number;
  websiteEvidence: LeadFieldEvidence | null;
  websiteAnalysis: WebsitePageAnalysis;
  aiSignals: string[];
  aiMention: boolean;
  aiSource: string | null;
};

type ContactResolution = {
  value: string | null;
  status: LeadFieldStatus;
  source: string | null;
  confidence: number;
  evidence: LeadFieldEvidence | null;
};

const JOB_SLICE_MS = 6_000;
const JOB_BATCH_SIZE = 8;
const OVERPASS_TIMEOUT_MS = 12_000;
const WEBSITE_FETCH_TIMEOUT_MS = 4_500;
const SEARCH_TIMEOUT_MS = 5_000;
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const DUCKDUCKGO_ENDPOINT = "https://html.duckduckgo.com/html/";

const AI_KEYWORDS = [
  "ai",
  "artificial intelligence",
  "machine learning",
  "llm",
  "chatgpt",
  "openai",
  "automation",
  "copilot",
  "assistant",
  "agent",
];

const BUSINESS_CATEGORY_RULES = [
  {
    category: "Retail",
    test: (tags: Record<string, string>) => Boolean(tags.shop),
    niche: "inventory, product catalog, and local SEO",
    recommendation: "A cleaner catalog, better inventory visibility, and stronger local search presence.",
  },
  {
    category: "Food & Beverage",
    test: (tags: Record<string, string>) =>
      ["restaurant", "cafe", "bar", "pub", "fast_food", "food_court"].includes(tags.amenity ?? ""),
    niche: "menu management, ordering, reservations, and local SEO",
    recommendation: "A faster mobile-friendly site with menu updates, ordering, and reservation flow.",
  },
  {
    category: "Professional Services",
    test: (tags: Record<string, string>) => ["office"].includes(tags.office ?? ""),
    niche: "client outreach, lead capture, and automation",
    recommendation: "A sharper website, better inquiry capture, and simple workflow automation.",
  },
  {
    category: "Health & Wellness",
    test: (tags: Record<string, string>) =>
      ["clinic", "doctors", "dentist", "pharmacy", "veterinary", "hospital"].includes(tags.amenity ?? "") ||
      Boolean(tags.healthcare),
    niche: "intake, scheduling, reminders, and local SEO",
    recommendation: "A better booking and intake flow with clearer service pages and reminders.",
  },
  {
    category: "Beauty / Personal Care",
    test: (tags: Record<string, string>) => ["hairdresser", "beauty", "spa", "massage"].includes(tags.amenity ?? ""),
    niche: "booking, reviews, and local SEO",
    recommendation: "A more polished booking experience and stronger discovery on search and maps.",
  },
  {
    category: "Trades / Contractors",
    test: (tags: Record<string, string>) =>
      ["construction", "plumber", "electrician", "carpenter", "roofing", "hvac"].includes(tags.office ?? "") ||
      ["construction", "plumber", "electrician", "carpenter"].includes(tags.craft ?? ""),
    niche: "quote capture, follow-up automation, and SEO",
    recommendation: "A lead-capture site that turns quote requests into a faster, clearer workflow.",
  },
  {
    category: "Automotive",
    test: (tags: Record<string, string>) =>
      ["car_wash", "car_repair", "fuel"].includes(tags.amenity ?? "") ||
      ["car_parts", "tyres", "tires", "automotive"].includes(tags.shop ?? ""),
    niche: "service booking, quote forms, and reminders",
    recommendation: "A better service booking and quote process with useful follow-up automation.",
  },
  {
    category: "Hospitality",
    test: (tags: Record<string, string>) => ["hotel", "motel", "guest_house", "hostel", "apartment"].includes(tags.tourism ?? ""),
    niche: "booking, inquiries, and property pages",
    recommendation: "A cleaner booking/inquiry experience and more persuasive property pages.",
  },
  {
    category: "Education",
    test: (tags: Record<string, string>) =>
      ["school", "college", "university", "kindergarten", "childcare"].includes(tags.amenity ?? ""),
    niche: "inquiry forms, scheduling, and admissions workflow",
    recommendation: "A better inquiry funnel and better structured program or admissions pages.",
  },
  {
    category: "Creative / Media",
    test: (tags: Record<string, string>) =>
      ["studio", "theatre", "cinema", "arts_centre"].includes(tags.amenity ?? "") ||
      ["gallery", "museum", "attraction"].includes(tags.tourism ?? ""),
    niche: "portfolio presentation, lead capture, and audience growth",
    recommendation: "A more compelling portfolio and a clearer path from interest to inquiry.",
  },
];

const CONTACT_HINTS = ["contact", "about", "visit", "locations", "reach", "book", "schedule", "quote", "estimate"];

export async function loadLeadStore(): Promise<LeadStore> {
  return loadLeadStoreSnapshot();
}

export async function saveLeadStore(store: LeadStore): Promise<void> {
  await replaceLeadSnapshot(store);
}

export async function scanBusinesses(request: LeadScanRequest): Promise<LeadStore> {
  const origin: LeadOrigin = {
    latitude: request.latitude ?? DEFAULT_ORIGIN.latitude,
    longitude: request.longitude ?? DEFAULT_ORIGIN.longitude,
  };
  const radiusMeters = request.radiusMeters ?? DEFAULT_SCAN_RADIUS_METERS;
  const limit = request.limit ?? DEFAULT_SCAN_LIMIT;
  const jobId = `scan-${Date.now()}`;

  await ensureLeadDatabase();
  await createLeadScanJobRow({
    id: jobId,
    origin,
    radiusMeters,
    limit,
    source: "open-data",
  });

  return loadLeadStoreSnapshot(jobId);
}

export async function updateLeadContactStatus(
  leadId: string,
  updates: Partial<LeadContactStatus>,
): Promise<LeadStore> {
  return updateLeadRecord(leadId, updates);
}

export async function createLeadScanJob(request: LeadScanRequest): Promise<LeadScanJob> {
  await ensureLeadDatabase();
  const origin: LeadOrigin = {
    latitude: request.latitude ?? DEFAULT_ORIGIN.latitude,
    longitude: request.longitude ?? DEFAULT_ORIGIN.longitude,
  };
  const radiusMeters = request.radiusMeters ?? DEFAULT_SCAN_RADIUS_METERS;
  const limit = request.limit ?? DEFAULT_SCAN_LIMIT;
  const jobId = `scan-${Date.now()}`;

  return createLeadScanJobRow({
    id: jobId,
    origin,
    radiusMeters,
    limit,
    source: "open-data",
  });
}

export async function getLeadScanJob(jobId: string): Promise<LeadScanJob | null> {
  return getLeadScanJobRow(jobId);
}

export async function listLeadScanJobs(limit = 10): Promise<LeadScanJob[]> {
  return listLeadScanJobsRows(limit);
}

export async function processLeadScanJob(
  jobId: string,
  options: {
    deadlineAt?: number;
    batchSize?: number;
    maxBatches?: number;
  } = {},
): Promise<{ job: LeadScanJob; store: LeadStore }> {
  await ensureLeadDatabase();
  const job = await getLeadScanJobRow(jobId);
  if (!job) {
    throw new Error("Lead scan job not found.");
  }

  const deadlineAt = options.deadlineAt ?? Date.now() + JOB_SLICE_MS;
  const batchSize = options.batchSize ?? JOB_BATCH_SIZE;
  const maxBatches = options.maxBatches ?? 1;

  let currentJob = job;
  let batchesProcessed = 0;

  if (currentJob.status === "completed" || currentJob.status === "failed") {
    return { job: currentJob, store: await loadLeadStoreSnapshot(jobId) };
  }

  if (currentJob.status === "queued") {
    currentJob = (await updateLeadScanJob(jobId, {
      status: "running",
      startedAt: new Date().toISOString(),
    })) as LeadScanJob;
  }

  while (Date.now() < deadlineAt && batchesProcessed < maxBatches) {
    const nextState = await processLeadScanJobBatch(currentJob, batchSize, deadlineAt);
    currentJob = nextState.job;
    batchesProcessed += 1;

    if (currentJob.status !== "running") {
      break;
    }

    if (nextState.finished) {
      break;
    }
  }

  return { job: currentJob, store: await loadLeadStoreSnapshot(jobId) };
}

async function processLeadScanJobBatch(
  job: LeadScanJob,
  batchSize: number,
  deadlineAt: number,
): Promise<{ job: LeadScanJob; finished: boolean }> {
  const latestJob = (await getLeadScanJobRow(job.id)) ?? job;
  const startedAt = latestJob.startedAt ?? latestJob.createdAt;
  let candidates = parseCandidatePayload(latestJob.candidatesJson);

  if (candidates.length === 0) {
    candidates = await collectCandidates(latestJob.origin, latestJob.radiusMeters, latestJob.limit, deadlineAt);
    await setJobCandidates(latestJob.id, candidates);
    await updateLeadScanJob(latestJob.id, {
      totalCandidates: candidates.length,
      processingCursor: 0,
      batchSize,
    });
  }

  const cursor = latestJob.processingCursor ?? 0;
  const nextBatch = candidates.slice(cursor, cursor + batchSize);

  if (nextBatch.length === 0) {
    const completedJob = (await updateLeadScanJob(latestJob.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      partial: false,
      scanDurationMs: Date.now() - new Date(startedAt).getTime(),
      resultCount: candidates.length,
      processingCursor: candidates.length,
      totalCandidates: candidates.length,
    })) as LeadScanJob;

    return { job: completedJob, finished: true };
  }

  const enriched = await enrichCandidates(nextBatch, [], deadlineAt);
  await upsertLeadRows(latestJob.id, enriched);
  await upsertLeadActivityForBatch(latestJob.id, enriched);

  const nextCursor = cursor + nextBatch.length;
  const finished = nextCursor >= candidates.length;
  const updatedJob = (await updateLeadScanJob(latestJob.id, {
    status: finished ? "completed" : "running",
    completedAt: finished ? new Date().toISOString() : null,
    partial: !finished,
    resultCount: nextCursor,
    processedCandidates: nextCursor,
    totalCandidates: candidates.length,
    processingCursor: nextCursor,
    batchSize,
    scanDurationMs: Date.now() - new Date(startedAt).getTime(),
  })) as LeadScanJob;

  return { job: updatedJob, finished };
}

export function exportLeadsCsv(leads: BusinessLead[]): string {
  const headers = [
    "rank",
    "name",
    "category",
    "businessType",
    "niche",
    "recommendation",
    "website",
    "websiteStatus",
    "websiteSource",
    "websiteConfidence",
    "websiteScore",
    "websiteOpportunityScore",
    "discoveryConfidence",
    "helpScore",
    "easeScore",
    "proximityScore",
    "overallScore",
    "aiMention",
    "aiSource",
    "email",
    "emailStatus",
    "emailSource",
    "phone",
    "phoneStatus",
    "phoneSource",
    "address",
    "latitude",
    "longitude",
    "distanceMiles",
    "rankReasons",
    "evidence",
    "contacted",
    "contactedAt",
    "notes",
  ];

  const rows = leads.map((lead, index) =>
    [
      index + 1,
      lead.name,
      lead.category,
      lead.businessType,
      lead.niche,
      lead.recommendation,
      lead.website ?? "",
      lead.websiteStatus,
      lead.websiteSource ?? "",
      lead.websiteConfidence,
      lead.websiteScore,
      lead.websiteOpportunityScore,
      lead.discoveryConfidence,
      lead.helpScore,
      lead.easeScore,
      lead.proximityScore,
      lead.overallScore,
      lead.aiMention ? "yes" : "no",
      lead.aiSource ?? "",
      lead.email ?? "",
      lead.emailStatus,
      lead.emailSource ?? "",
      lead.phone ?? "",
      lead.phoneStatus,
      lead.phoneSource ?? "",
      lead.address ?? "",
      lead.latitude,
      lead.longitude,
      lead.distanceMiles,
      JSON.stringify(lead.rankReasons ?? []),
      JSON.stringify(lead.evidence ?? null),
      lead.contacted ? "yes" : "no",
      lead.contactedAt ?? "",
      lead.notes ?? "",
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return [headers.map(escapeCsvCell).join(","), ...rows].join("\n");
}

function parseCandidatePayload(payload: string | null | undefined): BusinessCandidate[] {
  if (!payload) return [];

  try {
    const parsed = JSON.parse(payload) as BusinessCandidate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function collectCandidates(origin: LeadOrigin, radiusMeters: number, limit: number, deadlineAt: number) {
  const radii = Array.from(
    new Set([
      radiusMeters,
      Math.min(Math.round(radiusMeters * 1.5), 50000),
      Math.min(Math.round(radiusMeters * 2), 60000),
    ]),
  );

  const candidates = new Map<string, BusinessCandidate>();

  for (const radius of radii) {
    if (Date.now() > deadlineAt) {
      break;
    }

    const elements = await queryOverpass(origin, radius);
    for (const element of elements) {
      const candidate = elementToCandidate(element, origin);
      if (candidate) {
        candidates.set(candidate.id, candidate);
      }
    }

    if (candidates.size >= Math.max(limit * 2, 150)) {
      break;
    }
  }

  return Array.from(candidates.values())
    .sort((left, right) => left.distanceMiles - right.distanceMiles)
    .slice(0, Math.max(limit * 2, 150));
}

type BusinessCandidate = {
  id: string;
  osmType: "node" | "way" | "relation";
  osmId: number;
  name: string;
  tags: Record<string, string>;
  latitude: number;
  longitude: number;
  distanceMiles: number;
};

function elementToCandidate(element: OverpassElement, origin: LeadOrigin): BusinessCandidate | null {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  if (!name) return null;

  const coords = getElementCoordinates(element);
  if (!coords) return null;

  const id = `${element.type}-${element.id}`;
  return {
    id,
    osmType: element.type,
    osmId: element.id,
    name,
    tags,
    latitude: coords.latitude,
    longitude: coords.longitude,
    distanceMiles: haversineMiles(origin.latitude, origin.longitude, coords.latitude, coords.longitude),
  };
}

function getElementCoordinates(element: OverpassElement): LeadOrigin | null {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { latitude: element.lat, longitude: element.lon };
  }

  if (element.center && typeof element.center.lat === "number" && typeof element.center.lon === "number") {
    return { latitude: element.center.lat, longitude: element.center.lon };
  }

  return null;
}

async function queryOverpass(origin: LeadOrigin, radiusMeters: number): Promise<OverpassElement[]> {
  const query = `
[out:json][timeout:60];
(
  nwr(around:${radiusMeters},${origin.latitude},${origin.longitude})["name"]["shop"];
  nwr(around:${radiusMeters},${origin.latitude},${origin.longitude})["name"]["office"];
  nwr(around:${radiusMeters},${origin.latitude},${origin.longitude})["name"]["craft"];
  nwr(around:${radiusMeters},${origin.latitude},${origin.longitude})["name"]["healthcare"];
  nwr(around:${radiusMeters},${origin.latitude},${origin.longitude})["name"]["tourism"];
  nwr(around:${radiusMeters},${origin.latitude},${origin.longitude})["name"]["leisure"];
  nwr(around:${radiusMeters},${origin.latitude},${origin.longitude})["name"]["amenity"~"restaurant|cafe|bar|pub|fast_food|bank|clinic|dentist|doctors|pharmacy|veterinary|hairdresser|beauty|fuel|car_wash|car_repair|fitness_centre|gym|childcare|school|college|university|post_office|laundry|marketplace|theatre|cinema|community_centre|conference_centre|coworking_space|library|accountant|lawyer|real_estate_agent|insurance|travel_agency|estate_agent|mobile_phone|computer"];
);
out center tags;
`;

  const endpoints = [...OVERPASS_ENDPOINTS];
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(endpoint, OVERPASS_TIMEOUT_MS, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "DevCanDoIt Lead Finder",
        },
        body: query,
      });

      if (!response.ok) {
        throw new Error(`Overpass request failed: ${response.status}`);
      }

      const payload = (await response.json()) as { elements?: OverpassElement[] };
      return payload.elements ?? [];
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to query Overpass");
}

async function enrichCandidates(
  candidates: BusinessCandidate[],
  _existingLeads: BusinessLead[],
  deadlineAt: number,
): Promise<BusinessLead[]> {
  const concurrency = 8;
  const leads: BusinessLead[] = [];

  for (let index = 0; index < candidates.length; index += concurrency) {
    if (Date.now() > deadlineAt) {
      break;
    }

    const batch = candidates.slice(index, index + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (candidate) => {
        const classification = classifyBusiness(candidate.tags);
        const address = buildAddress(candidate.tags);
        const websiteResolution = await resolveWebsiteProfile(candidate);
        const emailResolution = await resolveContactProfile({
          field: "email",
          tags: candidate.tags,
          website: websiteResolution.websiteUrl,
          websiteAnalysis: websiteResolution.websiteAnalysis,
        });
        const phoneResolution = await resolveContactProfile({
          field: "phone",
          tags: candidate.tags,
          website: websiteResolution.websiteUrl,
          websiteAnalysis: websiteResolution.websiteAnalysis,
        });

        const lead = buildLead({
          candidate,
          classification,
          websiteResolution,
          emailResolution,
          phoneResolution,
          address,
        });

        return lead;
      }),
    );

    leads.push(...batchResults);
  }

  return leads;
}

function buildLead(args: {
  candidate: BusinessCandidate;
  classification: ReturnType<typeof classifyBusiness>;
  websiteResolution: WebsiteResolution;
  emailResolution: ContactResolution;
  phoneResolution: ContactResolution;
  address: string | null;
}): BusinessLead {
  const { candidate, classification, websiteResolution, emailResolution, phoneResolution, address } = args;
  const websiteAnalysis = websiteResolution.websiteAnalysis;
  const websiteScore = computeWebsiteScore(websiteAnalysis, Boolean(websiteResolution.websiteUrl));
  const websiteOpportunityScore = clamp(100 - websiteScore, 0, 100);
  const proximityScore = computeProximityScore(candidate.distanceMiles);
  const discoveryConfidence = computeDiscoveryConfidence({
    websiteConfidence: websiteResolution.websiteConfidence,
    emailConfidence: emailResolution.confidence,
    phoneConfidence: phoneResolution.confidence,
    websiteAnalysis,
    hasWebsite: Boolean(websiteResolution.websiteUrl),
    hasDirectWebsite: websiteResolution.websiteSource === "osm:website",
    hasContactPage: websiteAnalysis.contactLinks.length > 0,
  });
  const helpScore = computeHelpScore({
    websiteScore,
    websiteUrl: websiteResolution.websiteUrl,
    category: classification.category,
    aiMention: websiteResolution.aiMention,
    email: emailResolution.value,
    phone: phoneResolution.value,
  });
  const easeScore = computeEaseScore({
    websiteScore,
    websiteUrl: websiteResolution.websiteUrl,
    email: emailResolution.value,
    phone: phoneResolution.value,
  });
  const trustTier = deriveTrustTier({
    websiteStatus: websiteResolution.websiteStatus,
    emailStatus: emailResolution.status,
    phoneStatus: phoneResolution.status,
  });
  const overallScore = Math.round(
    helpScore * 0.42 + easeScore * 0.33 + proximityScore * 0.15 + discoveryConfidence * 0.1 + trustTier * 3,
  );
  const rankReasons = buildRankReasons({
    websiteScore,
    websiteResolution,
    emailResolution,
    phoneResolution,
    proximityScore,
    classification,
    distanceMiles: candidate.distanceMiles,
  });

  const summary =
    websiteResolution.websiteUrl && websiteScore > 45
      ? `${classification.category} business with an existing website and room for a sharper workflow story.`
      : websiteResolution.websiteUrl
        ? `${classification.category} business with a website that looks like it could be improved quickly.`
        : `${classification.category} business with no verified website found, which makes it a strong opportunity for a modern first pass.`;

  const tags = buildTagSummary(candidate.tags);

  return {
    id: candidate.id,
    osmType: candidate.osmType,
    osmId: candidate.osmId,
    name: candidate.name,
    category: classification.category,
    businessType: classification.businessType,
    niche: classification.niche,
    recommendation: classification.recommendation,
    summary,
    website: websiteResolution.websiteUrl,
    websiteHost: websiteResolution.websiteUrl ? new URL(websiteResolution.websiteUrl).hostname.replace(/^www\./, "") : null,
    websiteStatus: websiteResolution.websiteStatus,
    websiteSource: websiteResolution.websiteSource,
    websiteConfidence: websiteResolution.websiteConfidence,
    websiteScore,
    websiteQualityScore: websiteScore,
    websiteOpportunityScore,
    websiteSignals: websiteAnalysis.websiteSignals,
    aiMention: websiteResolution.aiMention,
    aiSignals: websiteResolution.aiSignals,
    aiSource: websiteResolution.aiSource,
    email: emailResolution.value,
    emailStatus: emailResolution.status,
    emailSource: emailResolution.source,
    phone: phoneResolution.value,
    phoneStatus: phoneResolution.status,
    phoneSource: phoneResolution.source,
    address,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    distanceMiles: round(candidate.distanceMiles, 1),
    helpScore,
    helpPotentialScore: helpScore,
    easeScore,
    easeOfHelpScore: easeScore,
    proximityScore,
    overallScore,
    discoveryConfidence,
    rankReasons,
    evidence: {
      website: websiteResolution.websiteEvidence,
      email: emailResolution.evidence,
      phone: phoneResolution.evidence,
      ai: websiteResolution.aiMention
        ? {
            source: websiteResolution.aiSource ?? "homepage",
            confidence: websiteResolution.websiteConfidence,
            verified: websiteResolution.websiteStatus === "verified",
            note: websiteResolution.aiSignals.join(", ") || "AI-related language found",
          }
        : null,
      discovery: websiteResolution.websiteEvidence,
    },
    tags,
    source: "osm",
    lastCheckedAt: new Date().toISOString(),
    contacted: false,
    contactedAt: null,
    notes: "",
  };
}

function classifyBusiness(tags: Record<string, string>) {
  for (const rule of BUSINESS_CATEGORY_RULES) {
    if (rule.test(tags)) {
      return {
        category: rule.category,
        businessType: humanizeBusinessType(tags),
        niche: rule.niche,
        recommendation: rule.recommendation,
      };
    }
  }

  return {
    category: "Local Business",
    businessType: humanizeBusinessType(tags),
    niche: "website refresh, lead capture, and automation",
    recommendation: "A clearer website, stronger contact flow, and a cleaner route for inquiries.",
  };
}

function humanizeBusinessType(tags: Record<string, string>): string {
  const parts = [
    tags.amenity,
    tags.shop,
    tags.office,
    tags.craft,
    tags.tourism,
    tags.leisure,
    tags.healthcare,
  ].filter(Boolean);

  if (parts.length === 0) {
    return "Independent business";
  }

  return parts
    .slice(0, 2)
    .map((part) => part!.replace(/_/g, " "))
    .join(" / ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildTagSummary(tags: Record<string, string>): string[] {
  const keys = [
    "amenity",
    "shop",
    "office",
    "craft",
    "tourism",
    "leisure",
    "healthcare",
    "brand",
    "operator",
    "wikidata",
    "wikipedia",
    "website",
    "contact:website",
    "phone",
    "contact:phone",
    "email",
    "contact:email",
  ];

  return keys
    .map((key) => {
      const value = tags[key];
      return value ? `${key}=${value}` : null;
    })
    .filter((value): value is string => Boolean(value));
}

function pickWebsite(tags: Record<string, string>): string | null {
  return normalizeWebsiteUrl(tags["contact:website"] ?? tags.website ?? tags.url ?? null);
}

function pickEmail(tags: Record<string, string>): string | null {
  const raw = tags["contact:email"] ?? tags.email ?? null;
  return raw?.trim() ? raw.trim() : null;
}

function pickPhone(tags: Record<string, string>): string | null {
  const raw = tags["contact:phone"] ?? tags.phone ?? null;
  return raw?.trim() ? raw.trim() : null;
}

function buildAddress(tags: Record<string, string>): string | null {
  if (tags["addr:full"]) return tags["addr:full"];

  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:unit"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : null;
}

async function analyzeWebsite(websiteUrl: string, businessName: string, tags: Record<string, string>) {
  const normalized = normalizeWebsiteUrl(websiteUrl);
  if (!normalized) return emptyWebsiteAnalysis();

  const homepage = await analyzeSinglePage(normalized, businessName);
  const contactPageUrl = homepage.contactLinks[0] ?? null;
  const contactPage = contactPageUrl ? await analyzeSinglePage(contactPageUrl, businessName) : null;
  const merged = mergeWebsiteAnalyses(homepage, contactPage);
  const websiteSignals = buildWebsiteSignals(merged, Boolean(contactPage));
  const aiSignals = findAiSignals(`${merged.text} ${merged.title ?? ""} ${merged.description ?? ""}`, tags);

  return {
    ...merged,
    aiSignals,
    websiteSignals,
  };
}

async function analyzeSinglePage(url: string, businessName: string): Promise<WebsitePageAnalysis> {
  try {
    const response = await fetchWithTimeout(url, WEBSITE_FETCH_TIMEOUT_MS);
    if (!response.ok) {
      return emptyWebsiteAnalysis();
    }

    const html = await response.text();
    const text = stripHtml(html);
    const title = matchTagContent(html, "title");
    const description = matchMetaContent(html, "description");
    const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    const schema = /application\/ld\+json/i.test(html);
    const forms = (html.match(/<form[\s>]/gi) ?? []).length;
    const contactLinks = extractContactLinks(html, url);
    const emails = extractEmails(`${html}\n${text}`);
    const phones = extractPhones(`${html}\n${text}`);

    return {
      html,
      text,
      title,
      description,
      viewport,
      schema,
      forms,
      contactLinks,
      emails,
      phones,
      aiSignals: findAiSignals(text, { name: businessName }),
      websiteSignals: [],
    };
  } catch {
    return emptyWebsiteAnalysis();
  }
}

function mergeWebsiteAnalyses(homepage: WebsitePageAnalysis, contactPage: WebsitePageAnalysis | null): WebsitePageAnalysis {
  if (!contactPage) return homepage;

  return {
    html: [homepage.html, contactPage.html].filter(Boolean).join("\n"),
    text: [homepage.text, contactPage.text].filter(Boolean).join(" "),
    title: homepage.title ?? contactPage.title,
    description: homepage.description ?? contactPage.description,
    viewport: homepage.viewport || contactPage.viewport,
    schema: homepage.schema || contactPage.schema,
    forms: Math.max(homepage.forms, contactPage.forms),
    contactLinks: Array.from(new Set([...homepage.contactLinks, ...contactPage.contactLinks])),
    emails: Array.from(new Set([...homepage.emails, ...contactPage.emails])),
    phones: Array.from(new Set([...homepage.phones, ...contactPage.phones])),
    aiSignals: Array.from(new Set([...homepage.aiSignals, ...contactPage.aiSignals])),
    websiteSignals: Array.from(new Set([...homepage.websiteSignals, ...contactPage.websiteSignals])),
  };
}

function buildWebsiteSignals(analysis: WebsitePageAnalysis, hasContactPage: boolean): string[] {
  const signals = [
    analysis.title ? "has title" : "missing title",
    analysis.description ? "has meta description" : "missing meta description",
    analysis.viewport ? "has viewport" : "missing viewport",
    analysis.schema ? "has schema" : "no schema found",
    analysis.forms > 0 ? "has form" : "no form",
    analysis.contactLinks.length > 0 ? "has contact links" : "no obvious contact links",
    hasContactPage ? "has contact page" : "no contact page found",
    analysis.emails.length > 0 ? "email found" : "no email found",
    analysis.phones.length > 0 ? "phone found" : "no phone found",
    analysis.text.length > 500 ? "substantial content" : "thin homepage content",
  ];

  if (analysis.text.length > 1200) {
    signals.push("rich content");
  }

  if (analysis.text.toLowerCase().includes("book")) {
    signals.push("booking flow mention");
  }

  return signals;
}

async function resolveWebsiteProfile(candidate: BusinessCandidate): Promise<WebsiteResolution> {
  const directWebsite = pickWebsite(candidate.tags);
  let websiteUrl = directWebsite;
  let websiteSource: string | null = directWebsite ? "osm:website" : null;
  let websiteStatus: LeadFieldStatus = directWebsite ? "verified" : "missing";
  let websiteConfidence = directWebsite ? 82 : 0;
  let websiteAnalysis = emptyWebsiteAnalysis();
  let websiteEvidence: LeadFieldEvidence | null = null;

  if (!websiteUrl) {
    const searchCandidate = await discoverWebsiteFromSearch(candidate);
    if (searchCandidate) {
      websiteUrl = searchCandidate.url;
      websiteSource = searchCandidate.source;
      websiteStatus = searchCandidate.status;
      websiteConfidence = searchCandidate.confidence;
      websiteEvidence = searchCandidate.evidence;
    }
  }

  if (websiteUrl) {
    websiteAnalysis = await analyzeWebsite(websiteUrl, candidate.name, candidate.tags);
    websiteConfidence = computeDiscoveryConfidence({
      websiteConfidence,
      emailConfidence: 0,
      phoneConfidence: 0,
      websiteAnalysis,
      hasWebsite: Boolean(websiteUrl),
      hasDirectWebsite: Boolean(directWebsite),
      hasContactPage: websiteAnalysis.contactLinks.length > 0,
    });
    websiteStatus =
      websiteConfidence >= 70 || Boolean(directWebsite)
        ? "verified"
        : websiteConfidence >= 40
          ? "inferred"
          : "missing";
    websiteEvidence = {
      source: websiteSource ?? "website",
      confidence: websiteConfidence,
      verified: websiteStatus === "verified",
      note: directWebsite ? "Website discovered from OSM tags" : "Website discovered from open-web search",
    };
  }

  const aiSignals = findAiSignals(`${websiteAnalysis.text} ${websiteAnalysis.title ?? ""} ${websiteAnalysis.description ?? ""}`, candidate.tags);
  const aiMention = aiSignals.length > 0;
  const aiSource = aiMention ? (websiteAnalysis.contactLinks[0] ? "homepage+contact-page" : "homepage") : null;

  return {
    websiteUrl,
    websiteStatus,
    websiteSource,
    websiteConfidence,
    websiteEvidence,
    websiteAnalysis,
    aiSignals,
    aiMention,
    aiSource,
  };
}

async function discoverWebsiteFromSearch(
  candidate: BusinessCandidate,
): Promise<
  | {
      url: string;
      source: string;
      status: LeadFieldStatus;
      confidence: number;
      evidence: LeadFieldEvidence;
    }
  | null
> {
  const query = buildDiscoveryQuery(candidate);
  const searchHtml = await fetchSearchResults(query);
  if (!searchHtml) return null;

  const urls = extractSearchResultUrls(searchHtml);
  for (const url of urls) {
    const normalized = normalizeWebsiteUrl(url);
    if (!normalized) continue;

    const confidence = await validateWebsiteCandidate(normalized, candidate);
    if (confidence < 40) continue;

    const status: LeadFieldStatus = confidence >= 70 ? "verified" : "inferred";
    return {
      url: normalized,
      source: "search:duckduckgo",
      status,
      confidence,
      evidence: {
        source: "duckduckgo search",
        confidence,
        verified: status === "verified",
        note: `Search result matched ${candidate.name}`,
      },
    };
  }

  return null;
}

async function fetchSearchResults(query: string): Promise<string | null> {
  try {
    const url = `${DUCKDUCKGO_ENDPOINT}?q=${encodeURIComponent(query)}`;
    const response = await fetchWithTimeout(url, SEARCH_TIMEOUT_MS, {
      headers: {
        "User-Agent": "DevCanDoIt Lead Finder",
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

function extractSearchResultUrls(html: string): string[] {
  const matches = [...html.matchAll(/result__a[^>]+href=["']([^"']+)["']/gi)];
  const urls = matches
    .map((match) => decodeSearchUrl(match[1]))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(urls));
}

function decodeSearchUrl(url: string): string | null {
  try {
    const parsed = new URL(url, "https://html.duckduckgo.com");
    const redirect = parsed.searchParams.get("uddg");
    if (redirect) {
      return decodeURIComponent(redirect);
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function buildDiscoveryQuery(candidate: BusinessCandidate): string {
  const parts = [candidate.name];
  const city = candidate.tags["addr:city"] ?? candidate.tags["addr:state"];
  if (city) parts.push(city);
  const brand = candidate.tags.brand;
  if (brand && brand !== candidate.name) parts.push(brand);
  const operator = candidate.tags.operator;
  if (operator && operator !== candidate.name) parts.push(operator);
  parts.push("official website");
  return parts.join(" ");
}

async function validateWebsiteCandidate(url: string, candidate: BusinessCandidate): Promise<number> {
  try {
    const response = await fetchWithTimeout(url, WEBSITE_FETCH_TIMEOUT_MS);
    if (!response.ok) {
      return 0;
    }

    const html = await response.text();
    const text = stripHtml(html).toLowerCase();
    const title = (matchTagContent(html, "title") ?? "").toLowerCase();
    const host = new URL(url).hostname.replace(/^www\./, "");
    const nameTokens = candidate.name
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((token) => token.length > 2);
    let score = 20;

    if (nameTokens.some((token) => title.includes(token))) {
      score += 20;
    }

    if (nameTokens.some((token) => host.includes(token))) {
      score += 20;
    }

    if (candidate.tags["addr:city"] && text.includes(candidate.tags["addr:city"].toLowerCase())) {
      score += 10;
    }

    if (candidate.tags["addr:postcode"] && text.includes(candidate.tags["addr:postcode"].toLowerCase())) {
      score += 10;
    }

    if (candidate.tags["contact:phone"] && text.includes(candidate.tags["contact:phone"].toLowerCase())) {
      score += 10;
    }

    if (candidate.tags["contact:email"] && text.includes(candidate.tags["contact:email"].toLowerCase())) {
      score += 10;
    }

    if (text.includes("contact") || text.includes("about")) {
      score += 5;
    }

    if (text.length > 800) {
      score += 5;
    }

    return clamp(score, 0, 100);
  } catch {
    return 0;
  }
}

async function resolveContactProfile(args: {
  field: "email" | "phone";
  tags: Record<string, string>;
  website: string | null;
  websiteAnalysis: WebsitePageAnalysis;
}): Promise<ContactResolution> {
  const directValue =
    args.field === "email"
      ? pickEmail(args.tags)
      : pickPhone(args.tags);

  if (directValue) {
    return {
      value: directValue,
      status: "verified",
      source: `osm:${args.field}`,
      confidence: 90,
      evidence: {
        source: `osm:${args.field}`,
        confidence: 90,
        verified: true,
        note: `Pulled from OSM ${args.field} tag`,
      },
    };
  }

  const extracted = args.field === "email" ? args.websiteAnalysis.emails[0] : args.websiteAnalysis.phones[0];
  if (extracted) {
    return {
      value: extracted,
      status: args.websiteAnalysis.contactLinks.length > 0 ? "verified" : "inferred",
      source: args.websiteAnalysis.contactLinks.length > 0 ? "contact-page" : "homepage",
      confidence: args.websiteAnalysis.contactLinks.length > 0 ? 82 : 68,
      evidence: {
        source: args.websiteAnalysis.contactLinks.length > 0 ? "contact page" : "homepage",
        confidence: args.websiteAnalysis.contactLinks.length > 0 ? 82 : 68,
        verified: args.websiteAnalysis.contactLinks.length > 0,
        note: `${args.field} extracted from website text`,
      },
    };
  }

  return {
    value: null,
    status: "missing",
    source: null,
    confidence: 0,
    evidence: null,
  };
}

function computeDiscoveryConfidence(args: {
  websiteConfidence: number;
  emailConfidence: number;
  phoneConfidence: number;
  websiteAnalysis: WebsitePageAnalysis;
  hasWebsite: boolean;
  hasDirectWebsite: boolean;
  hasContactPage: boolean;
}): number {
  let score = args.websiteConfidence;
  if (args.hasWebsite) score += 8;
  if (args.hasDirectWebsite) score += 12;
  if (args.hasContactPage) score += 8;
  if (args.emailConfidence > 0) score += Math.min(12, Math.round(args.emailConfidence * 0.12));
  if (args.phoneConfidence > 0) score += Math.min(12, Math.round(args.phoneConfidence * 0.12));
  if (args.websiteAnalysis.title) score += 8;
  if (args.websiteAnalysis.description) score += 6;
  if (args.websiteAnalysis.schema) score += 5;
  if (args.websiteAnalysis.emails.length > 0) score += 6;
  if (args.websiteAnalysis.phones.length > 0) score += 6;
  if (args.websiteAnalysis.contactLinks.length > 0) score += 4;

  return clamp(Math.round(score), 0, 100);
}

function deriveTrustTier(args: {
  websiteStatus: LeadFieldStatus;
  emailStatus: LeadFieldStatus;
  phoneStatus: LeadFieldStatus;
}): number {
  const scores = [args.websiteStatus, args.emailStatus, args.phoneStatus].map((status) => {
    if (status === "verified") return 2;
    if (status === "inferred") return 1;
    return 0;
  });

  return Math.max(...scores);
}

function buildRankReasons(args: {
  websiteScore: number;
  websiteResolution: WebsiteResolution;
  emailResolution: ContactResolution;
  phoneResolution: ContactResolution;
  proximityScore: number;
  classification: ReturnType<typeof classifyBusiness>;
  distanceMiles: number;
}): LeadRankReason[] {
  const reasons: LeadRankReason[] = [];
  const isServiceCategory = ["Food & Beverage", "Professional Services", "Health & Wellness", "Trades / Contractors", "Automotive", "Hospitality", "Education", "Creative / Media"].includes(args.classification.category);

  if (!args.websiteResolution.websiteUrl) {
    reasons.push({
      code: "no-verified-site",
      label: "No verified website found",
      detail: "The business does not expose a clearly verified site in open data or the open web search pass.",
    });
  }

  if (args.websiteResolution.websiteUrl && args.websiteScore < 45) {
    reasons.push({
      code: "weak-site",
      label: "Weak site",
      detail: "The website exists but is light on conversion signals and could be substantially improved.",
    });
  }

  if (isServiceCategory && args.websiteResolution.websiteAnalysis.forms === 0) {
    reasons.push({
      code: "missing-booking-flow",
      label: "Missing booking flow",
      detail: "The site does not expose a clear booking, quote, or intake path.",
    });
  }

  if (args.websiteResolution.websiteAnalysis.contactLinks.length === 0 && args.websiteResolution.websiteUrl) {
    reasons.push({
      code: "no-contact-form",
      label: "No contact form",
      detail: "The homepage does not expose a clear contact path or inquiry form.",
    });
  }

  if (!args.websiteResolution.aiMention) {
    reasons.push({
      code: "no-ai-mention",
      label: "No AI mention",
      detail: "The website copy does not mention AI, automation, or related positioning.",
    });
  }

  if (args.distanceMiles <= 3) {
    reasons.push({
      code: "close-proximity",
      label: "Close proximity",
      detail: "The business is near the scan origin, which makes in-person follow-up easier.",
    });
  }

  if (args.emailResolution.status === "verified" || args.phoneResolution.status === "verified") {
    reasons.push({
      code: "reachable",
      label: "Reachable",
      detail: "At least one contact channel is clearly visible and verified.",
    });
  }

  if (args.proximityScore >= 92) {
    reasons.push({
      code: "very-close",
      label: "Very close",
      detail: "This business is close enough to be a strong local outreach candidate.",
    });
  }

  return reasons.slice(0, 5);
}

function emptyWebsiteAnalysis(): WebsitePageAnalysis {
  return {
    html: "",
    text: "",
    title: null,
    description: null,
    viewport: false,
    schema: false,
    forms: 0,
    contactLinks: [],
    emails: [],
    phones: [],
    aiSignals: [],
    websiteSignals: [],
  };
}

function findAiSignals(text: string, tags: Record<string, string>): string[] {
  const haystack = `${text} ${Object.values(tags).join(" ")}`.toLowerCase();
  return AI_KEYWORDS.filter((keyword) => haystack.includes(keyword)).map((keyword) => keyword.toUpperCase());
}

function extractContactLinks(html: string, baseUrl: string): string[] {
  const links = extractLinks(html);
  const sameHost = links
    .filter((href) => CONTACT_HINTS.some((hint) => href.toLowerCase().includes(hint)))
    .map((href) => resolveSameHostUrl(baseUrl, href))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(sameHost));
}

function extractLinks(html: string): string[] {
  const matches = [...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)];
  return matches.map((match) => match[1]);
}

function extractEmails(text: string): string[] {
  const matches = [...text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)];
  return Array.from(new Set(matches.map((match) => match[0]))).slice(0, 5);
}

function extractPhones(text: string): string[] {
  const matches = [...text.matchAll(/(?:\+?1[-.\s]*)?(?:\(?\d{3}\)?[-.\s]*)\d{3}[-.\s]*\d{4}/g)];
  return Array.from(new Set(matches.map((match) => normalizePhone(match[0])))).filter(Boolean).slice(0, 5) as string[];
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, " ").trim();
}

function matchTagContent(html: string, tag: "title"): string | null {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "i");
  const match = html.match(regex);
  if (!match) return null;
  return stripHtml(match[1]).trim() || null;
}

function matchMetaContent(html: string, name: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+name=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const match = html.match(regex);
  if (match?.[1]) {
    return decodeHtml(match[1].trim());
  }

  const ogRegex = new RegExp(
    `<meta[^>]+property=["']og:${escapeRegExp(name)}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const ogMatch = html.match(ogRegex);
  return ogMatch?.[1] ? decodeHtml(ogMatch[1].trim()) : null;
}

function stripHtml(html: string): string {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeWebsiteUrl(input: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function resolveSameHostUrl(baseUrl: string, href: string): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    const baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");
    const resolvedHost = resolved.hostname.replace(/^www\./, "");

    if (resolvedHost !== baseHost) {
      return null;
    }

    return resolved.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function computeWebsiteScore(analysis: WebsitePageAnalysis, hasWebsite: boolean): number {
  if (!hasWebsite) return 0;

  let score = 10;
  if (analysis.title) score += 15;
  if (analysis.description) score += 12;
  if (analysis.viewport) score += 10;
  if (analysis.schema) score += 8;
  if (analysis.forms > 0) score += 8;
  if (analysis.contactLinks.length > 0) score += 10;
  if (analysis.emails.length > 0) score += 10;
  if (analysis.phones.length > 0) score += 10;
  if (analysis.text.length > 1200) score += 7;
  if (analysis.text.length < 300) score -= 10;
  if (analysis.title && analysis.title.length > 60) score -= 4;
  if (analysis.description && analysis.description.length > 170) score -= 2;

  return clamp(Math.round(score), 0, 100);
}

function computeHelpScore(args: {
  websiteScore: number;
  websiteUrl: string | null;
  category: string;
  aiMention: boolean;
  email: string | null;
  phone: string | null;
}): number {
  let score = 0;
  const gap = 100 - args.websiteScore;

  score += gap * 0.45;
  score += contactNeedScore(args.email, args.phone) * 0.3;
  score += businessCategoryOpportunity(args.category) * 0.25;
  if (!args.websiteUrl) score += 14;
  if (!args.aiMention) score += 4;

  return clamp(Math.round(score), 0, 100);
}

function computeEaseScore(args: {
  websiteScore: number;
  websiteUrl: string | null;
  email: string | null;
  phone: string | null;
}): number {
  let score = 0;
  score += (100 - args.websiteScore) * 0.55;
  score += contactNeedScore(args.email, args.phone) * 0.15;
  score += args.websiteUrl ? 10 : 20;
  if (args.websiteScore < 35) score += 10;

  return clamp(Math.round(score), 0, 100);
}

function contactNeedScore(email: string | null, phone: string | null): number {
  let score = 0;
  if (!email) score += 15;
  if (!phone) score += 15;
  return score;
}

function businessCategoryOpportunity(category: string): number {
  const highOpportunity = new Set([
    "Retail",
    "Food & Beverage",
    "Professional Services",
    "Health & Wellness",
    "Trades / Contractors",
    "Automotive",
    "Beauty / Personal Care",
    "Hospitality",
    "Education",
    "Creative / Media",
  ]);

  return highOpportunity.has(category) ? 20 : 12;
}

function computeProximityScore(distanceMiles: number): number {
  if (distanceMiles <= 1) return 100;
  if (distanceMiles <= 3) return 92;
  if (distanceMiles <= 5) return 84;
  if (distanceMiles <= 8) return 76;
  if (distanceMiles <= 12) return 68;
  if (distanceMiles <= 18) return 58;
  if (distanceMiles <= 25) return 48;
  if (distanceMiles <= 35) return 34;
  return 20;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? "");
  if (/[,"\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "DevCanDoIt Lead Finder",
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function summarizeLeadForPrompt(lead: BusinessLead): string {
  const parts = [lead.name, lead.category, lead.niche, lead.recommendation]
    .filter(Boolean)
    .join(" | ");
  return parts;
}

export function createLeadId(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 16);
}
