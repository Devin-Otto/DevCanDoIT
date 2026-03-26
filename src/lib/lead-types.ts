export type LeadContactStatus = {
  contacted: boolean;
  contactedAt: string | null;
  notes?: string;
};

export type LeadFieldStatus = "verified" | "inferred" | "missing";

export type LeadFieldEvidence = {
  source: string;
  confidence: number;
  verified: boolean;
  note?: string;
};

export type LeadEvidenceBundle = {
  website: LeadFieldEvidence | null;
  email: LeadFieldEvidence | null;
  phone: LeadFieldEvidence | null;
  ai: LeadFieldEvidence | null;
  discovery: LeadFieldEvidence | null;
};

export type LeadActivity = {
  id: string;
  leadId: string;
  type: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

export type LeadDetail = {
  lead: BusinessLead;
  activities: LeadActivity[];
};

export type LeadRankReason = {
  code: string;
  label: string;
  detail: string;
};

export type LeadScanJobStatus = "queued" | "running" | "completed" | "failed";

export type LeadScanJob = {
  id: string;
  status: LeadScanJobStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  origin: LeadOrigin;
  radiusMeters: number;
  limit: number;
  source: string;
  totalCandidates: number;
  processedCandidates: number;
  resultCount: number;
  partial: boolean;
  scanDurationMs: number;
  failureReason: string | null;
  progress: number;
  candidatesJson?: string | null;
  processingCursor?: number;
  batchSize?: number;
};

export type LeadOrigin = {
  latitude: number;
  longitude: number;
};

export type LeadStoreMeta = {
  updatedAt: string;
  source: "overpass";
  radiusMeters: number;
  limit: number;
  resultCount: number;
  origin: LeadOrigin;
  partial?: boolean;
  scanDurationMs?: number;
  job?: LeadScanJob | null;
  recentJobs?: LeadScanJob[];
};

export type LeadStore = LeadStoreMeta & {
  leads: BusinessLead[];
};

export type BusinessLead = LeadContactStatus & {
  id: string;
  osmType: "node" | "way" | "relation";
  osmId: number;
  name: string;
  category: string;
  businessType: string;
  niche: string;
  recommendation: string;
  summary: string;
  website: string | null;
  websiteHost: string | null;
  websiteStatus: LeadFieldStatus;
  websiteSource: string | null;
  websiteConfidence: number;
  websiteScore: number;
  websiteQualityScore: number;
  websiteOpportunityScore: number;
  websiteSignals: string[];
  aiMention: boolean;
  aiSignals: string[];
  aiSource: string | null;
  email: string | null;
  emailStatus: LeadFieldStatus;
  emailSource: string | null;
  phone: string | null;
  phoneStatus: LeadFieldStatus;
  phoneSource: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  helpScore: number;
  helpPotentialScore: number;
  easeScore: number;
  easeOfHelpScore: number;
  proximityScore: number;
  overallScore: number;
  discoveryConfidence: number;
  rankReasons: LeadRankReason[];
  evidence: LeadEvidenceBundle;
  tags: string[];
  source: string;
  lastCheckedAt: string;
};

export type LeadScanRequest = {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  limit?: number;
};

export const DEFAULT_ORIGIN: LeadOrigin = {
  latitude: 33.84491412031453,
  longitude: -118.37508157486124,
};

export const DEFAULT_SCAN_LIMIT = 100;
export const DEFAULT_SCAN_RADIUS_METERS = 30000;
