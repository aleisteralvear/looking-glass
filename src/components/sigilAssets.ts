// Authentic 3D cast-metal sigil assets with transparent backgrounds
export type ManifestationSigilId = "astaroth" | "belial" | "lucifer";

export const SIGIL_PUBLIC_URLS: Record<ManifestationSigilId, string> = {
  astaroth: "/sigils/astaroth.png",
  belial: "/sigils/belial.png",
  lucifer: "/sigils/lucifer.png",
};

// Plane geometry dimensions matching the exact aspect ratio of each PNG
export const SIGIL_DIMENSIONS: Record<ManifestationSigilId, [number, number]> = {
  lucifer: [1.60, 1.63],   // 1024 x 1044
  astaroth: [1.70, 1.47],  // 1110 x 960
  belial: [1.90, 1.16],    // 1314 x 800
};
