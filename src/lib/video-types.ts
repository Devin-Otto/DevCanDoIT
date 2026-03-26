export type ManagedVideoFile = {
  slug: string;
  title: string;
  summary: string;
  fileName: string;
  src: string;
  exists: boolean;
  sizeBytes: number | null;
  updatedAt: string | null;
};

