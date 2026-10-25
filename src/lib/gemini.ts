export type TargetType = 'Person' | 'Place' | 'Other';

export interface TargetData {
  id: string;
  type: TargetType;
  // Person
  targetName?: string;
  dob?: string;
  locationAnchor?: string;
  temporalAnchor?: string;
  // Place
  placeType?: string;
  placeName?: string;
  placeLocation?: string;
  placeTemporal?: string;
  // Other
  otherDescription?: string;
}

export interface LookingGlassQuery {
  targets: TargetData[];
  inquiryWindow: string;
  modes: string[];
  focuses: string[];
  customFocus: string;
  queryBody: string;
  isDefaultQuery: boolean;
  allHeadersEmpty: boolean;
  useThinkingMode: boolean;
}

// Retrieves clearance headers (optionally passing local key if configured by operator)
function getClearanceHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const key = localStorage.getItem('plg_gemini_api_key');
  if (key) {
    headers['x-gemini-api-key'] = key;
  }
  return headers;
}

export type SigilId = 'astaroth' | 'belial' | 'lucifer';

export interface RollSigilResponse {
  success: boolean;
  sessionId: string;
  selectedSigil: SigilId;
}

/**
 * Invokes backend dice roll to select exactly one of the three manifestation sigils for the session.
 */
export async function rollBackendSigil(sessionId: string): Promise<SigilId> {
  try {
    const response = await fetch('/api/session/roll-sigil', {
      method: 'POST',
      headers: getClearanceHeaders(),
      body: JSON.stringify({ sessionId })
    });
    if (response.ok) {
      const data: RollSigilResponse = await response.json();
      if (['astaroth', 'belial', 'lucifer'].includes(data.selectedSigil)) {
        return data.selectedSigil;
      }
    }
  } catch (err) {
    console.warn("Backend sigil roll failed, safe fallback:", err);
  }
  // Safe uniform 1/3 fallback if network error occurs
  const sigils: SigilId[] = ['astaroth', 'belial', 'lucifer'];
  return sigils[Math.floor(Math.random() * sigils.length)];
}

export async function checkArgonHealth(): Promise<{ success: boolean; engine?: string; version?: string }> {
  const response = await fetch('/api/gemini/health-check', {
    method: 'POST',
    headers: getClearanceHeaders(),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Gemini 4 Argon Core offline or uncalibrated.');
  }
  return await response.json();
}

/**
 * Generates classified temporal intelligence dossiers powered by the Gemini 4 Argon engine.
 */
export async function generateIntelReport(params: LookingGlassQuery): Promise<string> {
  const response = await fetch('/api/gemini/report', {
    method: 'POST',
    headers: getClearanceHeaders(),
    body: JSON.stringify({ params })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Gemini 4 Argon intelligence scan failed.');
  }
  return data.text || '';
}

/**
 * Optimizes the user's inquiry query directive using Gemini 4 Argon prompt engineering.
 */
export async function optimizeDirective(params: LookingGlassQuery): Promise<string> {
  const response = await fetch('/api/gemini/optimize', {
    method: 'POST',
    headers: getClearanceHeaders(),
    body: JSON.stringify({ params })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Gemini 4 Argon prompt optimization failed.');
  }
  return data.text || '';
}

/**
 * Generates surveillance rasterization telemetry using the modern multimodal image generation model.
 */
export async function generateVisualIntel(params: LookingGlassQuery): Promise<string> {
  const response = await fetch('/api/gemini/visual', {
    method: 'POST',
    headers: getClearanceHeaders(),
    body: JSON.stringify({ params })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Gemini 4 Argon visual telemetry rasterisation failed.');
  }
  return data.imageUrl || '';
}
