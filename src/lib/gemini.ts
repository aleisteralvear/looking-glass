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

export interface KeyProtocolStatus {
  hasServerKey: boolean;
  activeModel: string;
  protocolVersion: string;
  engineStatus: string;
}

export async function fetchKeyProtocolStatus(): Promise<KeyProtocolStatus> {
  try {
    const res = await fetch('/api/gemini/key-status');
    if (!res.ok) {
      return { hasServerKey: false, activeModel: 'gemini-3.7-flash', protocolVersion: '3.7-PRO', engineStatus: 'LIMITED' };
    }
    return await res.json();
  } catch {
    return { hasServerKey: false, activeModel: 'gemini-3.7-flash', protocolVersion: '3.7-PRO', engineStatus: 'UNKNOWN' };
  }
}

// Retrieves the sandboxed local user key to authorize requested reactor operations
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

export async function generateIntelReport(params: LookingGlassQuery): Promise<string> {
  const response = await fetch('/api/gemini/report', {
    method: 'POST',
    headers: getClearanceHeaders(),
    body: JSON.stringify({ params })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Server-side intelligence scan failed.');
  }
  return data.text || '';
}

export async function optimizeDirective(params: LookingGlassQuery): Promise<string> {
  const response = await fetch('/api/gemini/optimize', {
    method: 'POST',
    headers: getClearanceHeaders(),
    body: JSON.stringify({ params })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Server-side prompt optimization failed.');
  }
  return data.text || '';
}

export async function generateVisualIntel(params: LookingGlassQuery): Promise<string> {
  const response = await fetch('/api/gemini/visual', {
    method: 'POST',
    headers: getClearanceHeaders(),
    body: JSON.stringify({ params })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Server-side surveillance rasterisation failed.');
  }
  return data.imageUrl || '';
}
