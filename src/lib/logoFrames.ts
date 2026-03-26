export const logoFrameCount = 62;

export const logoFrameSources = Array.from({ length: logoFrameCount }, (_, index) => {
  const frameNumber = String(index + 1).padStart(3, "0");
  return `/logo-frame-seq/frame-${frameNumber}.jpg`;
});
