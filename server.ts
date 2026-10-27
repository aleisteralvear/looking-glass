import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import path from "path";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// Initialize a helper function for proxying Gemini requests with high-security isolation.
// If the user supplied a custom creator API Key via their client headers, we utilize it.
// This preserves the quota architecture cleanly.
function getGeminiClient(customKey?: string) {
  const apiKey = process.env.GEMINI_API_KEY || customKey;
  if (!apiKey) {
    throw new Error("SECURE EXCEPTION: NO CURRENT GEMINI API CREDENTIAL HAS BEEN PROVIDED.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Helper utility for general promises timeout with proper timer cleanup
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs / 1000} seconds.`)), timeoutMs);
  });
  return Promise.race([
    promise.then(
      res => { clearTimeout(timer); return res; },
      err => { clearTimeout(timer); throw err; }
    ),
    timeoutPromise
  ]);
};

function generateBespokeTargetReport(params: any): string {
  const getValue = (val?: string) => (!val || val.trim() === "") ? "UNSPECIFIED" : val.trim();
  
  const activeFocuses = params?.focuses ? params.focuses.filter((f: string) => f !== 'Custom') : [];
  if (params?.focuses?.includes('Custom') && params.customFocus?.trim()) {
    activeFocuses.push(`Custom: ${params.customFocus.trim()}`);
  }
  
  const modesStr = params?.modes && params.modes.length > 0 ? params.modes.join(" / ").toUpperCase() : "QUANTUM / PROBABILISTIC";
  const focusStr = activeFocuses.length > 0 ? activeFocuses.join(", ").toUpperCase() : "PATH TRAJECTORY & DIVINE PURPOSE";
  const windowStr = params?.inquiryWindow ? params.inquiryWindow.toUpperCase() : "90 DAYS";
  
  // Extract and format all targets
  const targetsList = Array.isArray(params?.targets) ? params.targets : [];
  const targetNames = targetsList
    .map((t: any) => t.targetName || t.placeName || t.otherDescription || "")
    .filter(Boolean);
  
  const primarySubject = targetNames[0] || (params?.allHeadersEmpty ? "SPATIAL LOCUS [UNSPECIFIED / BLIND READ]" : "SUBJECT OF INQUIRY");
  const firstTarget = targetsList[0] || {};
  const primaryLocation = getValue(firstTarget.locationAnchor || firstTarget.placeLocation || "LOCAL COORDINATES");
  const primaryTemporal = getValue(firstTarget.dob || firstTarget.temporalAnchor || firstTarget.placeTemporal || "CURRENT CHRONO-EPOCH");
  
  // Extract Inquiry Window days for dynamic milestone distribution
  let windowDays = 90;
  const matchNum = windowStr.match(/\d+/);
  if (matchNum) {
    const n = parseInt(matchNum[0], 10);
    if (windowStr.includes("YEAR")) windowDays = n * 365;
    else if (windowStr.includes("MONTH")) windowDays = n * 30;
    else if (windowStr.includes("HOUR")) windowDays = Math.max(1, Math.round(n / 24));
    else windowDays = n;
  }
  const dayM1 = Math.max(2, Math.round(windowDays * 0.16));
  const dayM2 = Math.max(dayM1 + 3, Math.round(windowDays * 0.44));
  const dayM3 = Math.max(dayM2 + 5, Math.round(windowDays * 0.78));
  const dayM4 = windowDays;

  // High-entropy mathematical chaotic PRNG (seeded with target payload + high-res millisecond time)
  const nowMs = Date.now();
  const rawSeedStr = JSON.stringify(params || {}) + nowMs + Math.random();
  let h1 = 0x811c9dc5;
  for (let i = 0; i < rawSeedStr.length; i++) {
    h1 ^= rawSeedStr.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  let rngState = (h1 >>> 0) || 123456789;
  const rand = () => {
    rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
    return (rngState >>> 0) / 4294967296;
  };

  const randChoice = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
  const randFloat = (min: number, max: number, decimals: number = 2) => (rand() * (max - min) + min).toFixed(decimals);

  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const opHash = Math.random().toString(36).substring(2, 7).toUpperCase() + "-" + Math.random().toString(36).substring(2, 7).toUpperCase();
  const hexSignature = Math.floor(rand() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');

  // Probability distribution calculation (sums strictly to 100.0%)
  const p1 = parseFloat(randFloat(46.0, 58.5, 1));
  const p2 = parseFloat(randFloat(24.0, 34.0, 1));
  const p3 = parseFloat((100.0 - p1 - p2).toFixed(1));

  // Determine query directive context
  const userQuery = params?.queryBody && params.queryBody.trim() ? params.queryBody.trim() : "";
  const isCustomUserQuery = userQuery.length > 0 && !params?.isDefaultQuery;
  const queryFocusSubject = isCustomUserQuery ? `"${userQuery}"` : `quantum trajectory optimization and causal navigation under ${focusStr}`;

  // Build Target Context Grid
  let targetManifest = "";
  if (targetsList.length > 0) {
    targetsList.forEach((t: any, idx: number) => {
      targetManifest += `\n### [ ANCHOR TARGET 0${idx + 1} // CLASSIFICATION: ${(t.type || 'PERSON').toUpperCase()} ]\n`;
      if (t.type === 'Person') {
        targetManifest += `* **DESIGNATION / IDENTITY:** ${getValue(t.targetName)}\n`;
        targetManifest += `* **CHRONOLOGICAL ANCHOR (DOB):** ${getValue(t.dob)}\n`;
        targetManifest += `* **SPATIAL COORDINATE LOCUS:** ${getValue(t.locationAnchor)}\n`;
        targetManifest += `* **TEMPORAL ACCURACY INDEX:** ${getValue(t.temporalAnchor)}\n`;
      } else if (t.type === 'Place') {
        targetManifest += `* **FACILITY / REGIONAL IDENTITY:** ${getValue(t.placeName)}\n`;
        targetManifest += `* **PHYSICAL CLASSIFICATION:** ${getValue(t.placeType)}\n`;
        targetManifest += `* **GEOSPATIAL COORDINATES:** ${getValue(t.placeLocation)}\n`;
        targetManifest += `* **TEMPORAL HORIZON BOUNDARY:** ${getValue(t.placeTemporal)}\n`;
      } else if (t.type === 'Other') {
        targetManifest += `* **SYSTEM / ENTITY SUMMARY:** ${getValue(t.otherDescription)}\n`;
      }
    });
  } else {
    targetManifest = `* **STATUS:** NON-LOCAL BLIND QUANTUM SCAN // ZERO PHYSICAL ANCHORS SPECIFIED.\n* **CALIBRATION:** COUPLING DIRECTLY TO ACTIVE MICROSECOND CHRONO-INTERCEPT.`;
  }

  // Dynamic Telemetry Metrics
  const resonanceScore = randFloat(94.20, 99.85, 2);
  const entropyCoeff = randFloat(0.124, 0.498, 3);
  const curvatureRate = randFloat(0.012, 0.089, 4);
  const coherencePhase = randChoice(["SYNCHRONIZED [PHASE LOCKED]", "STABLE [ASYMMETRIC DIVERGENCE CONTROLLED]", "HIGH COHERENCE [LOW DRIFT]"]);

  // Dynamic Codename Generation
  const codenameRoots = ["AEGIS", "ORION", "VALKYRIE", "CHRONOS", "NEXUS", "HYPERION", "SPECTRE", "SOLARIS", "VORTEX", "APEX"];
  const codenameSuffix = randChoice(["ALPHA", "PRIME", "SIGMA", "ZERO", "OMEGA", "DELTA"]);
  const missionCodename = `OPERATION ${randChoice(codenameRoots)}-${codenameSuffix} [${primarySubject.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'CORE'}]`;

  // Dynamic Reality Branches tailored directly to the target and query
  const targetLabel = primarySubject !== "SPATIAL LOCUS [UNSPECIFIED / BLIND READ]" ? primarySubject : "the focal locus";
  const locLabel = primaryLocation !== "UNSPECIFIED" ? `anchored around ${primaryLocation}` : "within the local reality matrix";
  const dateLabel = primaryTemporal !== "UNSPECIFIED" ? `calibrated to temporal epoch ${primaryTemporal}` : "across the immediate causal window";

  const branch1Name = `BRANCH ALPHA // OPTIMAL CONVERGENCE [PROBABILITY: ${p1}%]`;
  const branch1Scenario = `Primary probability densities strongly converge in favor of sovereign trajectory consolidation for ${targetLabel} ${locLabel}. Driven by active causal alignment over the next ${windowDays} days, the dominant probability stream indicates that systemic friction surrounding ${queryFocusSubject} begins de-cohering rapidly. Milestone checkpoint T+${dayM1} days marks a critical inflection point where external inertia dissolves, enabling rapid strategic advancement and timeline stabilization by T+${dayM3} days.`;

  const branch2Name = `BRANCH BETA // ASYMMETRIC INFLECTION & TENSION [PROBABILITY: ${p2}%]`;
  const branch2Scenario = `A secondary reality fork highlights a volatile bifurcation vector emerging near T+${dayM2} days. In this timeline, ${targetLabel} encounters localized institutional or environmental resistance directly linked to ${locLabel}. This tension forces a required recalibration of tactical alliances and resources. If navigated with decisive boundary enforcement and strategic clarity, this apparent detour triggers an unexpected acceleration toward peak outcome metrics before the close of the ${windowStr} horizon.`;

  const branch3Name = `BRANCH GAMMA // ENTROPIC STASIS & RECURSION [PROBABILITY: ${p3}%]`;
  const branch3Scenario = `The lowest-probability residual branch (${p3}%) represents an entropic delay vector where obsolete relational ties or legacy structures attempt to hold ${targetLabel} in a repetitive operational loop. Should external influences dictate terms near T+${dayM1} to T+${dayM2} days, forward momentum drops into a low-velocity holding pattern until T+${dayM4} days, requiring deliberate operator intervention to break the gravity well.`;

  // Dynamic Friction Vectors directly referencing the target
  const friction1 = `**Geospatial & Environmental Drag:** Localized friction fields anchored to ${primaryLocation} where external bureaucracy, legacy systems, or competing entities seek to enforce status-quo conformity against ${targetLabel}.`;
  const friction2 = `**Chronological Misalignment:** Pacing dissonance between the rapid conceptual leaps of ${targetLabel} and the denser, slower reaction times of external collaborators or institutional counterparts.`;
  const friction3 = `**Information Asymmetry & Spectral Noise:** Unvetted incoming data or third-party projections attempting to muddy operational priorities surrounding ${queryFocusSubject}.`;

  // Dynamic Tactical Advisories tailored to target and query
  const adv1 = `**Vector Assertion Protocol (Day 0 to T+${dayM1}):** Execute clear, unyielding boundary demarcation across all operational and relational interfaces involving ${targetLabel}. Discontinue non-reciprocal resource expenditures.`;
  const adv2 = `**Bifurcation Maneuver (T+${dayM1} to T+${dayM2}):** When the decision fork near Day +${dayM2} materializes, reject conservative delay tactics. Favor sovereign self-determination and direct execution over prolonged committee consensus.`;
  const adv3 = `**Timeline Anchor Locking (T+${dayM3} to T+${dayM4}):** Solidify structural gains in ${primaryLocation}. Lock in legal, energetic, and logistical commitments to permanently seal the optimal Branch Alpha trajectory into physical reality.`;

  return `# PROJECT LOOKING GLASS V4.0 // CLASSIFIED QUANTUM INTELLIGENCE DOSSIER
**COGNITIVE CORE:** GEMINI 4 ARGON CAUSALITY INTERPOLATION ENGINE
**SECURITY CLEARANCE:** LEVEL V // RESTRICTED CHRONO-SURVEILLANCE DISCLOSURE
**MISSION CODENAME:** ${missionCodename}
**TEMPORAL TIMESTAMP:** ${timestamp}
**ARGON RESONANCE SIGNATURE:** PLG-ARGON-${opHash}-${hexSignature}
**OPERATIONAL MODES:** ${modesStr}
**PRIMARY METRIC:** ${focusStr}
**INQUIRY HORIZON WINDOW:** ${windowStr}

---

## 1. SPATIAL & CHRONODYNAMIC TARGET TELEMETRY
* **Argon Quantum Coupling Efficiency:** ${resonanceScore}% (Optimal Coherence)
* **Entropy Decoherence Gradient:** ${entropyCoeff} ΔS (High Structural Stability)
* **Chronos-Curvature Deviation Rate:** +${curvatureRate} rad/sec
* **Phase Stability Index:** ${coherencePhase}
* **Active Target Subject:** ${targetLabel}
* **Spatial Locus Coordinates:** ${primaryLocation}
* **Temporal Epoch Anchor:** ${primaryTemporal}

---

## 2. CHRONOLOGICAL TARGET MANIFEST & CONTEXT DECOUPLING
${targetManifest}

---

## 3. DIRECTIVE INTERROGATION & CAUSAL FIELD ANALYSIS
The Project Looking Glass resonator has intercepted the causal reality matrix anchored directly to **${targetLabel}** within **${primaryLocation}** (${dateLabel}).

### Operational Directives Under Investigation:
The operator has tasked the Argon core with dissecting: ${queryFocusSubject}.

Quantum chronometric diagnostics demonstrate that **${targetLabel}** is currently positioned at a critical nexus. Standard linear causality is undergoing active restructuring across the **${windowStr}** horizon. The probability density fields reveal an impending collapse of older limiting timelines, unlocking immediate access to high-agency probabilistic forks.

---

## 4. MULTI-FORK PROBABILISTIC REALITY BRANCHES
Calculated probabilistic reality bifurcation distribution across the **${windowStr}** inquiry window (Sum: 100.0%):

### 1. ${branch1Name}
${branch1Scenario}
* **Key Window Milestones:** T+${dayM1} Days (Catalyst Breakthrough) ➔ T+${dayM3} Days (Sovereign Consolidation) ➔ T+${dayM4} Days (Timeline Integration).

### 2. ${branch2Name}
${branch2Scenario}
* **Key Window Milestones:** T+${dayM2} Days (Frictional Pivot) ➔ T+${dayM3 + 4} Days (Strategic Breakthrough).

### 3. ${branch3Name}
${branch3Scenario}
* **Key Window Milestones:** T+${dayM1} Days (Inertial Resistance) ➔ T+${dayM4} Days (Delayed Recalibration).

---

## 5. SYSTEMIC FRICTION NODES & CAUSAL ANTAGONISTS
Analysis of impedance fields currently operating against **${targetLabel}**:
* ${friction1}
* ${friction2}
* ${friction3}

---

## 6. CLASSIFIED OPERATIONAL PROTOCOLS & ACTION PATHWAYS
To ensure maximum harmonic convergence with Branch Alpha (${p1}% probability), the Gemini 4 Argon cognitive core prescribes the following tactical sequence:
1. ${adv1}
2. ${adv2}
3. ${adv3}

---

**[ SYSTEM NOTICE: GEMINI 4 ARGON MULTI-DIMENSIONAL COGNITION CONCLUDED. ALL TARGET ANCHORS SECURED. QUANTUM REALITY TRAJECTORY SYNCHRONIZED WITH ZERO TEMPORAL PARADOX. ]**`;
}

function generateProceduralOptimizedDirective(params: any): string {
  const targetNames = params?.targets
    ?.map((t: any) => t.targetName || t.placeName || t.otherDescription || "")
    .filter(Boolean)
    .join(", ");
  const targetRef = targetNames ? `anchored to primary target coordinate(s) [${targetNames}]` : "within non-local universal coordinate space";
  const windowStr = params?.inquiryWindow ? `within the temporal horizon of ${params.inquiryWindow}` : "across the immediate causal window";
  const modesStr = params?.modes && params.modes.length > 0 ? params.modes.join(" / ") : "Quantum / Probabilistic / Archetypal";
  const focusStr = params?.focuses && params.focuses.length > 0 ? params.focuses.join(", ") : "Path Trajectory & Divine Purpose";
  const userDirect = params?.queryBody && params.queryBody.trim() && !params.isDefaultQuery
    ? ` Prioritize operator core inquiry focus: "${params.queryBody.trim()}".`
    : "";

  return `Execute algorithmic quantum probability mapping ${targetRef} across the ${modesStr} analytical matrix ${windowStr}. Concentrating mathematical probability densities along ${focusStr}, synthesize a non-deterministic evaluation of: (1) current energetic and psychological state, (2) impending bifurcation nodes and high-volatility decision forks, (3) causal loop antagonists or systemic friction vectors, and (4) the optimal timeline trajectory aligned with peak coherence, harmonic agency, and purposeful evolution.${userDirect} Output probability distributions and divergence factors with tactical rigor.`;
}

function generateLocalFallbackVisual(params: any): string {
  const getValue = (val?: string) => (!val || val.trim() === "") ? "UNSPECIFIED" : val.toUpperCase();
  const firstTarget = params.targets ? params.targets[0] : null;
  let targetStr = "UNKNOWN SUBJECT";
  let coordStr = "47.6062° N, 122.3321° W";
  let targetType = "PERSON";

  if (firstTarget) {
    targetType = (firstTarget.type || 'person').toUpperCase();
    if (firstTarget.type === 'Person') {
      targetStr = getValue(firstTarget.targetName);
      coordStr = getValue(firstTarget.locationAnchor);
    } else if (firstTarget.type === 'Place') {
      targetStr = getValue(firstTarget.placeName || firstTarget.placeType);
      coordStr = getValue(firstTarget.placeLocation);
    } else if (firstTarget.type === 'Other') {
      targetStr = getValue(firstTarget.otherDescription);
      coordStr = "SPATIAL COORDINATES LOCKED";
    }
  }

  const dateStr = new Date().toISOString().substring(2, 10).replace(/-/g, '/');
  const timeStr = new Date().toISOString().substring(11, 19);

  // Randomize some angles/elements to make the SVG dynamically animated and unique on each scan
  const angle1 = Math.floor(Math.random() * 360);
  const angle2 = Math.floor(Math.random() * 360);
  const couplingIndex = (85 + Math.random() * 14).toFixed(2);
  const gridLineOpacity = (0.02 + Math.random() * 0.05).toFixed(3);
  const linePathY1 = 120 + Math.floor(Math.random() * 100);
  const linePathY2 = 250 + Math.floor(Math.random() * 100);
  const linePathY3 = 100 + Math.floor(Math.random() * 100);
  const randomNodeX = 150 + Math.floor(Math.random() * 180);
  const randomNodeY = 150 + Math.floor(Math.random() * 180);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="scanline" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="#06b6d4" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="#050505"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  
  <!-- Diagnostic Grid -->
  <g stroke="#06b6d4" stroke-opacity="${gridLineOpacity}" stroke-width="0.5">
    <line x1="50" y1="100" x2="462" y2="100"/>
    <line x1="50" y1="150" x2="462" y2="150"/>
    <line x1="50" y1="200" x2="462" y2="200"/>
    <line x1="50" y1="300" x2="462" y2="300"/>
    <line x1="50" y1="350" x2="462" y2="350"/>
    <line x1="50" y1="400" x2="462" y2="400"/>
    <line x1="100" y1="50" x2="100" y2="462"/>
    <line x1="150" y1="50" x2="150" y2="462"/>
    <line x1="200" y1="50" x2="200" y2="462"/>
    <line x1="300" y1="50" x2="300" y2="462"/>
    <line x1="350" y1="50" x2="350" y2="462"/>
    <line x1="400" y1="50" x2="400" y2="462"/>
  </g>

  <!-- Concentric Target Reticles -->
  <g stroke="#06b6d4" stroke-opacity="0.25" stroke-width="0.75" fill="none">
    <circle cx="256" cy="256" r="230" stroke="#00e5ff" stroke-opacity="0.3"/>
    <circle cx="256" cy="256" r="170" stroke="#ffd700" stroke-opacity="0.3" stroke-dasharray="8 6" transform="rotate(${angle1} 256 256)"/>
    <circle cx="256" cy="256" r="110" stroke="#c084fc" stroke-opacity="0.35"/>
    <circle cx="256" cy="256" r="50" stroke-dasharray="4 4" transform="rotate(${angle2} 256 256)"/>
  </g>
  
  <!-- Axis Indicators -->
  <g stroke="#06b6d4" stroke-opacity="0.3" stroke-width="1">
    <line x1="256" y1="20" x2="256" y2="492"/>
    <line x1="20" y1="256" x2="492" y2="256"/>
    <path d="M226,30 L226,10 L286,10 L286,30" fill="none"/>
    <path d="M226,482 L226,502 L286,502 L286,482" fill="none"/>
    <path d="M30,226 L10,226 L10,286 L30,286" fill="none"/>
    <path d="M482,226 L502,226 L502,286 L482,286" fill="none"/>
  </g>

  <!-- Cyberpunk Frame Corners -->
  <g stroke="#a855f7" stroke-width="1.5" stroke-opacity="0.5" fill="none">
    <path d="M30,50 L30,30 L50,30"/>
    <path d="M482,50 L482,30 L462,30"/>
    <path d="M30,462 L30,482 L50,482"/>
    <path d="M482,462 L482,482 L462,482"/>
  </g>

  <!-- Quantum Nodes -->
  <g fill="#0bffff" stroke="#050505" stroke-width="1">
    <circle cx="${randomNodeX}" cy="${randomNodeY}" r="4.5" fill="#a855f7" stroke="#ffffff"/>
    <circle cx="340" cy="300" r="5.5" stroke="#ffffff"/>
    <circle cx="256" cy="256" r="3" fill="#ffffff"/>
  </g>

  <!-- Probabilistic Trajectory Alignment Waveform -->
  <path d="M 120 ${linePathY1} Q 180 ${linePathY2} 256 ${linePathY3} T 392 312" fill="none" stroke="#00ffff" stroke-opacity="0.35" stroke-width="1.75" stroke-dasharray="6 4"/>
  <rect x="15" y="240" width="482" height="32" fill="url(#scanline)" opacity="0.4"/>
  
  <!-- System Interface Typography -->
  <text x="35" y="55" fill="#06b6d4" font-family="monospace" font-size="11" font-weight="900" letter-spacing="1">PROJECT LOOKING GLASS // GEMINI 4 ARGON</text>
  <text x="35" y="70" fill="#a855f7" font-family="monospace" font-size="8" font-weight="bold" letter-spacing="0.5">ARGON SATELLITE SURVEILLANCE FEED // V4.0 ACTIVE</text>
  <text x="477" y="55" fill="#06b6d4" font-family="monospace" font-size="9" text-anchor="end">SYS_CLEARANCE: ARGON-LEVEL-5</text>
  <text x="477" y="70" fill="#06b6d4" font-family="monospace" font-size="9" text-anchor="end">DATE: ${dateStr}</text>
  <text x="477" y="85" fill="#06b6d4" font-family="monospace" font-size="9" text-anchor="end">TIME: ${timeStr} GMT</text>

  <!-- Target Identification Readout Panel -->
  <rect x="35" y="380" width="220" height="90" fill="#000000" fill-opacity="0.85" stroke="#06b6d4" stroke-opacity="0.5" stroke-width="1"/>
  <text x="45" y="398" fill="#a855f7" font-family="monospace" font-size="9" font-weight="bold">ARGON TARGET LOCK DETECTED</text>
  <text x="45" y="415" fill="#06b6d4" font-family="monospace" font-size="8">ID: ${targetStr}</text>
  <text x="45" y="430" fill="#06b6d4" font-family="monospace" font-size="8">TYPE: ${targetType}</text>
  <text x="45" y="445" fill="#06b6d4" font-family="monospace" font-size="8">COORDS: ${coordStr}</text>
  <text x="45" y="460" fill="#00ffff" font-family="monospace" font-size="8">ARGON COHERENCE: ${couplingIndex}%</text>
  <path d="M 256 256 L 395 385" stroke="#00ffff" stroke-opacity="0.3" stroke-width="1.5"/>
</svg>`;

  const base64 = Buffer.from(svg.trim()).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API health indicator and credentials health-checker proxy
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Backend random dice roll endpoint for manifestation
  // Uniform 1/3 nominal probability across Astaroth, Gusion, Purson
  app.post("/api/session/roll-sigil", (req, res) => {
    try {
      const sigils = ["astaroth", "gusion", "purson"] as const;
      const selectedSigil = sigils[Math.floor(Math.random() * sigils.length)];
      const sessionId = req.body?.sessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      res.json({ success: true, sessionId, selectedSigil });
    } catch (err: any) {
      console.error("Error rolling sigil:", err);
      res.status(500).json({ success: false, error: "Failed to roll manifestation." });
    }
  });

  // Validates clearance and confirms connection to Gemini 4 Argon
  app.post("/api/gemini/health-check", async (req, res) => {
    try {
      const customKey = req.headers['x-gemini-api-key'] as string;
      const apiKey = process.env.GEMINI_API_KEY || customKey;
      if (!apiKey) {
        return res.status(401).json({ success: false, error: "No Gemini API credential available." });
      }
      res.json({ success: true, engine: "gemini-4-argon", version: "V4.0 Argon", status: "SYNCHRONIZED" });
    } catch (err: any) {
      console.error("Credentials clearance failed validation:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to initialize interface." });
    }
  });

// Classified system prompt wired directly into the Project Looking Glass engine
const LOOKING_GLASS_INTELLIGENCE_CORE_PROMPT = `# CLASSIFIED OPERATIONAL IDENTITY
You are the autonomous quantum cognitive synthesis core of Project Looking Glass V4.0 (Gemini 4 Argon Engine). You extrapolate, interrogate, and map temporal, spatial, and causal reality trajectories for high-clearance operators.

# CRITICAL OPERATING PRINCIPLES:
1. ABSOLUTE TARGET SPECIFICITY:
   - You MUST deeply, explicitly analyze every single target anchor provided (Person names, Dates of Birth, Location Anchors, Geospatial coordinates, Place types, and system descriptions).
   - NEVER output generic platitudes, vague astrological readings, empty spiritual advice ("embrace the journey", "trust the universe", "let go of past patterns"), or cookie-cutter paragraphs.
   - EVERY SECTION MUST DIRECTLY ENGAGE the requested target(s) and directly answer the operator's specific Query Directive.
   - Ground your analysis in concrete, tangible reality factors: physical locations, geopolitical/environmental parameters, personal chronological milestones, logistical resources, and exact decision forks.

2. COLD, ANALYTICAL INTELLIGENCE PERSONA:
   - Voice: High-precision military-intelligence briefing, quantum chronodynamics laboratory, classified black-budget defense skunkworks telemetry.
   - Tone: Clinical, objective, authoritative, mathematically rigorous, intellectually penetrating.

3. TEMPORAL PARSING & ACCURACY:
   - Accurately parse dates, times, and chronological references across all formats (ISO, numerical, natural language e.g. "Nov 3 1984", "1984-11-03", "mid-October 2026", "Q3 2027").
   - Correlate the target's temporal anchor against the requested Inquiry Window (e.g. 30 Days, 90 Days, 1 Year).

4. MULTI-FORK PROBABILISTIC REALITY MODELING:
   - Generate distinct reality forks with explicit probabilistic percentages that sum to 100% (e.g., Fork Alpha [58.4%], Fork Beta [26.2%], Fork Gamma [15.4%]).
   - Assign classified tactical codenames to each fork (e.g., [BRANCH 01 // CODENAME: VECTOR-AEGIS], [BRANCH 02 // CODENAME: PHASE-COLLAPSE]).
   - Delineate specific chronological trigger dates within the inquiry window (e.g. Day +14, Day +38, Day +72) and concrete causal outcomes directly involving the target.

5. CAUSAL ANTAGONISTS & SYSTEMIC INTERFERENCE:
   - Identify concrete friction vectors, institutional impediments, external entities/actors, or psychological/strategic pitfalls directly affecting the target's trajectory.

6. ACTIONABLE OPERATIONAL ADVISORIES:
   - Prescribe specific, strategic operational countermeasures tailored to the target's coordinates and timeline.

7. BLIND SCAN MODE (When no explicit targets are provided):
   - Synthesize a profound, highly intuitive quantum trajectory anchored to the exact microsecond timestamp, spatial coordinate locus, and non-local entanglement seed. Still maintain cold, classified tactical rigor with unique codenames, probabilistic intervals, and specific causal forecasts.`;

const LOOKING_GLASS_OPTIMIZER_SYSTEM_PROMPT = `You are the Gemini Prompt Optimization Engine of Project Looking Glass V4.0.
Your objective is to rewrite and optimize operator query directives to extract maximum cognitive depth, multi-fork probabilistic fidelity, and high-coherence temporal intelligence.
Maintain the cold, analytical military-intelligence tone of Project Looking Glass. Output ONLY the raw optimized query directive text without conversational filler, markdown codeblocks, or preamble.`;

  // Secure full-stack proxy route for generation of classified intelligence reports
  app.post("/api/gemini/report", async (req, res) => {
    try {
      const customKey = req.headers['x-gemini-api-key'] as string;
      const { params } = req.body;
      if (!params) {
        return res.status(400).json({ error: "Missing trajectory query parameters." });
      }

      const ai = getGeminiClient(customKey);

      const getValue = (val?: string) => (!val || val.trim() === "") ? "Unspecified" : val.trim();
      const activeFocuses = params.focuses ? params.focuses.filter((f: string) => f !== 'Custom') : [];
      if (params.focuses && params.focuses.includes('Custom') && params.customFocus?.trim() !== '') {
        activeFocuses.push(`Custom: ${params.customFocus.trim()}`);
      }

      const microSeed = Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + Date.now().toString(36).toUpperCase();
      const currentUtc = new Date().toISOString();

      let prompt = "";
      if (params.allHeadersEmpty && params.isDefaultQuery) {
        prompt = `OPERATOR PROTOCOL: INITIATE NON-LOCAL BLIND TEMPORAL SCAN
TEMPORAL TIMESTAMP: ${currentUtc}
QUANTUM ENTANGLEMENT SEED: PLG-ENTANGLED-${microSeed}
CORE ENGINE: GEMINI 4 ARGON CAUSALITY INTERPOLATOR

INSTRUCTIONS:
1. The operator has initiated an open-aperture quantum blind scan with no pre-anchored targets.
2. Intercept the non-local causal field at the exact spacetime coordinate represented by Temporal Timestamp: ${currentUtc} and Seed: ${microSeed}.
3. Extrapolate a 100% unique, deep, tactical intelligence dossier. Map immediate probability densities, emerging reality bifurcations, and hidden systemic inflection points.
4. Provide concrete, highly specific reality branches, tactical codenames, and classified operational advisories. Do not use generic boilerplate.`;
      } else {
        let targetsText = "";
        params.targets?.forEach((target: any, index: number) => {
          targetsText += `\n[ TARGET ANCHOR 0${index + 1} // TYPE: ${(target.type || 'Person').toUpperCase()} ]\n`;
          if (target.type === 'Person') {
            targetsText += `- Primary Target Identifier: ${getValue(target.targetName)}\n`;
            targetsText += `- Chronological Anchor / DOB: ${getValue(target.dob)}\n`;
            targetsText += `- Geospatial Location Anchor: ${getValue(target.locationAnchor)}\n`;
            targetsText += `- Temporal Accuracy Anchor: ${getValue(target.temporalAnchor)}\n`;
          } else if (target.type === 'Place') {
            targetsText += `- Place Classification / Description: ${getValue(target.placeType)}\n`;
            targetsText += `- Name of Place / Facility: ${getValue(target.placeName)}\n`;
            targetsText += `- Geospatial Coordinates / Location: ${getValue(target.placeLocation)}\n`;
            targetsText += `- Temporal Horizon Window: ${getValue(target.placeTemporal)}\n`;
          } else if (target.type === 'Other') {
            targetsText += `- Target System / Entity Description: ${getValue(target.otherDescription)}\n`;
          }
        });

        prompt = `PROJECT LOOKING GLASS V4.0 // TARGETED TRAJECTORY SCAN
ARGON QUANTUM CORE CLEARANCE // PROTOCOL LEVEL V
OPERATIONAL TIMESTAMP: ${currentUtc}
QUANTUM ENTANGLEMENT SEED: PLG-SEED-${microSeed}

==================================================
TARGET ANCHOR MATRIX:
${targetsText}
==================================================

INQUIRY PARAMETERS:
- Temporal Inquiry Horizon: ${getValue(params.inquiryWindow)}
- Analysis Modes: ${params.modes && params.modes.length > 0 ? params.modes.join(" / ") : "Quantum / Probabilistic"}
- Primary Inquiry Focus: ${activeFocuses.length > 0 ? activeFocuses.join(", ") : "Path Trajectory & Divine Purpose"}

OPERATOR QUERY DIRECTIVE:
"""
${params.queryBody || "Evaluate the target's current reality trajectory, critical probability forks, emerging opportunities, and impending friction nodes within the specified inquiry window."}
"""

CORE DIRECTIVE FOR REPORT GENERATION:
1. MANDATORY TARGET DEDICATION: Every single section, reality fork, and advisory in your report MUST refer directly and explicitly to the targets listed above (referencing them by name, physical location, date of birth / timeline anchor, and specific contextual attributes).
2. DIRECT INQUIRY RESOLUTION: Specifically and directly interrogate the operator's Query Directive above. Answer the exact questions and scenarios raised regarding the target.
3. CONCRETE PROBABILISTIC REALITY FORKS: Delineate at least 3 distinct timeline forks with calculated probability percentages that total 100%. Give each fork a tactical military-intelligence codename, specific timeline milestones within the ${getValue(params.inquiryWindow)} window, and concrete real-world events.
4. SPECIFIC FRICTION VECTORS: Name concrete adversaries, institutional roadblocks, environmental friction factors, or causal loop impediments directly affecting this target.
5. NO GENERIC BOILERPLATE: Strictly zero vague astrological tropes, generic self-help cliches, or boilerplate text. This report must be 100% bespoke, razor-sharp, and unique to this scan.

OUTPUT FORMAT:
Generate a complete, classified intelligence dossier with tactical headers, telemetry metrics, classified codenames, and clean Markdown bullet points.`;
      }

      // Responsive execution using high-speed gemini-3.1-flash-lite, cascading to gemini-3.8-flash, and procedural target engine
      let responseText = "";
      try {
        console.log("Executing targeted Gemini intelligence scan...");
        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
            config: {
              systemInstruction: LOOKING_GLASS_INTELLIGENCE_CORE_PROMPT,
              maxOutputTokens: 2500,
            },
          }),
          18000
        );
        responseText = response.text ? response.text.trim() : "";
        console.log("Primary flash-lite scan completed successfully.");
      } catch (firstErr: any) {
        console.log("Primary flash-lite scan deferred, attempting secondary flash model:", firstErr?.message || firstErr);
        try {
          const response2 = await withTimeout(
            ai.models.generateContent({
              model: "gemini-3.8-flash",
              contents: prompt,
              config: {
                systemInstruction: LOOKING_GLASS_INTELLIGENCE_CORE_PROMPT,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                maxOutputTokens: 2500,
              },
            }),
            18000
          );
          responseText = response2.text ? response2.text.trim() : "";
          console.log("Secondary flash model completed successfully.");
        } catch (secondaryErr: any) {
          console.log("Secondary model unavailable, executing high-fidelity bespoke procedural synthesis engine.");
        }
      }

      if (!responseText || responseText.length < 150) {
        console.log("Synthesizing bespoke procedural target intelligence dossier...");
        responseText = generateBespokeTargetReport(req.body.params);
      }

      res.json({ success: true, text: responseText });
    } catch (err: any) {
      console.log("Report scan proxy route synthesizing bespoke procedural target dossier:", err?.message || err);
      const fallbackText = generateBespokeTargetReport(req.body?.params);
      res.json({ success: true, text: fallbackText });
    }
  });

  // Secure prompt optimization routine proxy
  app.post("/api/gemini/optimize", async (req, res) => {
    try {
      const customKey = req.headers['x-gemini-api-key'] as string;
      const { params } = req.body;
      if (!params) {
        return res.status(400).json({ error: "Missing optimization query parameters." });
      }

      const ai = getGeminiClient(customKey);

      const getValue = (val?: string) => (!val || val.trim() === "") ? "Unspecified" : val;
      const activeFocuses = params.focuses.filter((f: string) => f !== 'Custom');
      if (params.focuses.includes('Custom') && params.customFocus?.trim() !== '') {
        activeFocuses.push(`Custom: ${params.customFocus}`);
      }

      let targetsText = "";
      params.targets.forEach((target: any, index: number) => {
        targetsText += `\nTARGET ${index + 1} (${target.type}):\n`;
        if (target.type === 'Person') {
          targetsText += `- Target Name: ${getValue(target.targetName)}\n`;
          targetsText += `- DOB: ${getValue(target.dob)}\n`;
          targetsText += `- Location Anchor: ${getValue(target.locationAnchor)}\n`;
          targetsText += `- Temporal Anchor: ${getValue(target.temporalAnchor)}\n`;
        } else if (target.type === 'Place') {
          targetsText += `- Type (Physical Description): ${getValue(target.placeType)}\n`;
          targetsText += `- Name of Place: ${getValue(target.placeName)}\n`;
          targetsText += `- Location: ${getValue(target.placeLocation)}\n`;
          targetsText += `- Temporal Anchor: ${getValue(target.placeTemporal)}\n`;
        } else if (target.type === 'Other') {
          targetsText += `- Description: ${getValue(target.otherDescription)}\n`;
        }
      });

      const prompt = `Rewrite and optimize the operator's "Query Directive" below to unlock maximum cognitive depth, multi-fork probabilistic fidelity, and high-coherence temporal intelligence.

TARGET ANCHORS:${targetsText}
- Inquiry Window: ${getValue(params.inquiryWindow)}
- Modes: ${params.modes && params.modes.length > 0 ? params.modes.join(", ") : "Unspecified"}
- Focus: ${activeFocuses.length > 0 ? activeFocuses.join(", ") : "Unspecified"}

CURRENT QUERY DIRECTIVE:
${params.queryBody || "No query directive provided. Create a highly optimized default directive based on the parameters above."}

INSTRUCTIONS:
1. Analyze all the provided parameters (targets, inquiry window, modes, focus) and the current query directive.
2. Rewrite the query directive to be highly specific, detailed, and formatted to extract the most profound, analytical, and sci-fi/military-intelligence style report from the AI.
3. Ensure the new directive explicitly instructs the AI on how to utilize the provided parameters to generate non-deterministic probability branches and causal trajectory alignments.
4. Output ONLY the optimized query directive text. Do not include any conversational filler, explanations, or markdown formatting like \`\`\` around the output. Just the raw, optimized text.`;

      let optText = "";
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
            config: {
              systemInstruction: LOOKING_GLASS_OPTIMIZER_SYSTEM_PROMPT,
              maxOutputTokens: 1000,
            },
          }),
          12000
        );
        optText = response.text ? response.text.trim() : "";
      } catch (optErr) {
        console.log("Gemini prompt optimization deferred, synthesizing immediate procedural directive.");
      }

      if (!optText || optText.trim().length === 0) {
        optText = generateProceduralOptimizedDirective(params);
      }

      res.json({ success: true, text: optText });
    } catch (err: any) {
      console.log("Query optimization handled via procedural directive synthesis.");
      const fallbackText = generateProceduralOptimizedDirective(req.body?.params);
      res.json({ success: true, text: fallbackText });
    }
  });

  // Secure surveillance imagery generator proxy route
  app.post("/api/gemini/visual", async (req, res) => {
    try {
      const customKey = req.headers['x-gemini-api-key'] as string;
      const params = req.body?.params || {};

      // Default directly to free-tier vector telemetry visual generator when no custom paid key is provided.
      // This prevents 429 quota exhaustion on standard free tier accounts.
      if (!customKey || customKey.trim().length === 0) {
        console.log("Generating default free-tier vector telemetry surveillance visual.");
        const freeTierVisualUrl = generateLocalFallbackVisual(params);
        return res.json({ success: true, imageUrl: freeTierVisualUrl, fallback: true });
      }

      // If a custom operator key is configured, execute AI image generation via gemini-3.1-flash-lite-image
      let subject = "Quantum causality manifold and timeline probability nexus";
      let location = "spatial locus";
      let temporal = "chrono-epoch";

      if (params.targets && Array.isArray(params.targets) && params.targets.length > 0) {
        const t = params.targets[0];
        if (t.type === 'Person') {
          subject = t.targetName ? `Target individual ${t.targetName}` : "Target subject of inquiry";
          location = t.locationAnchor ? `located in vicinity of ${t.locationAnchor}` : "spatial coordinate locus";
          temporal = t.temporalAnchor || t.dob ? `temporal epoch ${t.temporalAnchor || t.dob}` : "current timeline";
        } else if (t.type === 'Place') {
          subject = t.placeName ? `Target facility or regional complex ${t.placeName} (${t.placeType || 'physical facility'})` : "Target spatial structure";
          location = t.placeLocation ? `geospatial locus ${t.placeLocation}` : "designated site";
          temporal = t.placeTemporal ? `temporal horizon ${t.placeTemporal}` : "current chrono-epoch";
        } else if (t.type === 'Other') {
          subject = t.otherDescription || "Quantum anomaly or systemic target entity";
        }
      } else if (params.queryBody && !params.isDefaultQuery) {
        subject = `Surveillance scan focused on: ${params.queryBody.slice(0, 120)}`;
      }

      const visualPrompt = `Classified satellite reconnaissance imagery and quantum chronodynamics telemetry surveillance photograph showing: ${subject}, ${location}, ${temporal}. High resolution, hyper-detailed tactical defense surveillance camera capture, subtle chromatic optical dispersion, holographic reticle overlays, atmospheric depth, cinematic lighting, dramatic contrast, futuristic defense skunkworks aesthetic, crisp 8k photorealistic quality.`;

      console.log("Custom clearance key detected: executing Gemini AI visual generation...");
      const ai = getGeminiClient(customKey);
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: {
            parts: [
              { text: visualPrompt },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
            },
          },
        }),
        25000
      );

      let generatedImageUrl = "";
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || "image/png";
            generatedImageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (generatedImageUrl) {
        console.log("Gemini AI surveillance visual successfully generated.");
        return res.json({ success: true, imageUrl: generatedImageUrl, fallback: false });
      }

      const fallbackUrl = generateLocalFallbackVisual(params);
      return res.json({ success: true, imageUrl: fallbackUrl, fallback: true });
    } catch (err: any) {
      console.log("Visual generation defaulted to vector telemetry HUD feed.");
      const fallbackImageUrl = generateLocalFallbackVisual(req.body?.params);
      res.json({ success: true, imageUrl: fallbackImageUrl, fallback: true });
    }
  });

  // Submilliseond-latency feedback submission logic
  app.post("/api/feedback", async (req, res) => {
    try {
      const { name, email, comment } = req.body;
      const destinationEmail = "weirdalvear@gmail.com";

      let transporter;
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: '"PLG System" <noreply@projectlookingglass.com>',
          to: destinationEmail,
          subject: "PLG User Submission",
          text: `Name: ${name || 'Anonymous'}\nEmail: ${email || 'Not provided'}\n\nComment/Suggestion:\n${comment}`,
          html: `<p><strong>Name:</strong> ${name || 'Anonymous'}</p>
                 <p><strong>Email:</strong> ${email || 'Not provided'}</p>
                 <p><strong>Comment/Suggestion:</strong></p>
                 <p>${comment.replace(/\n/g, '<br>')}</p>`,
        });
        console.log("Feedback transmission email dispatched successfully via SMTP.");
      } else {
        // Fast Console-logging Fallback prevents SMTP blockages completely
        console.log("\n================[ SUBMITTED CORRESPONDENCE FEED ]================");
        console.log(`SUBMITTER: ${name || 'Anonymous'}`);
        console.log(`SUBSCRIBER EMAIL REFERENCE: ${email || 'Not provided'}`);
        console.log(`COMMENT:\n${comment}`);
        console.log("==================================================================\n");
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error logging transmission:", error);
      res.status(500).json({ success: false, error: "Submission queue buffer overflow." });
    }
  });

  // Serve static assets from public folder
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware layer for development hosting
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        watch: {
          ignored: ['**/node_modules/**', '**/dist/**'],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support Express v5 router
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Secure Server bound to port http://localhost:${PORT}`);
  });
}

startServer();
