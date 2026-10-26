// Authentic 3D cast-metal sigil assets with transparent backgrounds
export type ManifestationSigilId = "astaroth" | "gusion" | "purson";

export const SIGIL_PUBLIC_URLS: Record<ManifestationSigilId, string> = {
  astaroth: "/assets/aistudio/1792311890893_d6028c3b.png",
  gusion: "/assets/aistudio/1792312081216_6ef53542.png",
  purson: "/assets/aistudio/1792311961545_c9ef67fa.png",
};

// Plane geometry dimensions matching the exact aspect ratio of each PNG
export const SIGIL_DIMENSIONS: Record<ManifestationSigilId, [number, number]> = {
  astaroth: [1.60, 1.63],
  gusion: [1.90, 1.16],
  purson: [1.70, 1.47],
};
