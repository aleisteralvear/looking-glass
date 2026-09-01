import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import path from "path";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// Initialize a helper function for proxying Gemini requests with high-security isolation.
// If the user supplied a custom creator API Key via their client headers, we utilize it.
// Otherwise, it falls back to the server's environment GEMINI_API_KEY.
function getGeminiClient(customKey?: string) {
  const isCustom = customKey && customKey !== '__SYSTEM_CORE__' && customKey.trim() !== '';
  const apiKey = isCustom ? customKey!.trim() : process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error("SECURE EXCEPTION: NO VALID GEMINI API CREDENTIAL HAS BEEN CONFIGURED.");
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

// Helper utility for general promises timeout
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs / 1000} seconds.`)), timeoutMs)
    )
  ]);
};

function generateLocalFallbackReport(params: any): string {
  const getValue = (val?: string) => (!val || val.trim() === "") ? "UNSPECIFIED" : val.toUpperCase();
  const activeFocuses = params.focuses ? params.focuses.filter((f: string) => f !== 'Custom') : [];
  if (params.focuses && params.focuses.includes('Custom') && params.customFocus?.trim() !== '') {
    activeFocuses.push(`Custom: ${params.customFocus}`);
  }
  
  const modesStr = params.modes && params.modes.length > 0 ? params.modes.join(", ").toUpperCase() : "STANDARD REFLECTIVE MODE";
  const focusStr = activeFocuses.length > 0 ? activeFocuses.join(", ").toUpperCase() : "PATH TRAJECTORY";
  const windowStr = params.inquiryWindow ? params.inquiryWindow.toUpperCase() : "90 DAYS";
  
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const qrHash = Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  let targetDetails = "";
  if (params.targets && Array.isArray(params.targets)) {
    params.targets.forEach((target: any, index: number) => {
      targetDetails += `\n### [ ANCHOR TARGET ${index + 1} - ${(target.type || 'person').toUpperCase()} ]\n`;
      if (target.type === 'Person') {
        targetDetails += `* **SUBJECT IDENTITY:** ${getValue(target.targetName)}\n`;
        targetDetails += `* **TEMPORAL ANCHOR (DOB):** ${getValue(target.dob)}\n`;
        targetDetails += `* **COORDINATE ANCHOR:** ${getValue(target.locationAnchor)}\n`;
        targetDetails += `* **TEMPORAL ACCURACY INDEX:** ${getValue(target.temporalAnchor)}\n`;
      } else if (target.type === 'Place') {
        targetDetails += `* **PLACE CLASSIFICATION:** ${getValue(target.placeType)}\n`;
        targetDetails += `* **LOCATION CODENAME:** ${getValue(target.placeName)}\n`;
        targetDetails += `* **GEOSPATIAL COORDINATES:** ${getValue(target.placeLocation)}\n`;
        targetDetails += `* **TEMPORAL WINDOW:** ${getValue(target.placeTemporal)}\n`;
      } else if (target.type === 'Other') {
        targetDetails += `* **SYSTEM DESCRIPTION:** ${getValue(target.otherDescription)}\n`;
      }
    });
  }

  // Highly customizable array tables for deep, mystical, and distinct procedural generation
  const abstracts = [
    "The Project Looking Glass resonator has bypassed standard spatial/temporal constraints to analyze the specified coordinate nodes. Under quantum interference conditions, the probabilistic collapse of the requested target timeline yields stable spatial alignments.",
    "Bypassing standard chronometric structures, the Looking Glass resonator interface has mapped the target vector. Deep quantum resonance indicates a high density of overlapping possibility tunnels surrounding the current spacetime locus.",
    "Core calibration has locked onto the requested coordinates. Temporal waveforms display high amplitude fluctuation, indicating that standard linear history is undergoing profound restructuring at the target intercept point.",
    "A direct diagnostic tap into the energetic field around the target reveals highly localized temporal anomalies. The trajectory scans indicate an imminent shift in underlying causal structures, allowing for unprecedented navigation paths."
  ];

  const resonanceIndices = ["98.42% (Optimal Coupling)", "94.81% (High Resonance)", "91.25% (Stable Focus)", "97.10% (Enhanced Alignment)", "89.96% (Quantum Dispersion Controlled)"];
  const entropyStates = [
    "Low-to-Moderate (Highly Deterministic Path Observed)",
    "Fluctuating Dynamic (Active Chronological Flux)",
    "High Potential Entropy (Unlocking Multi-Option Realities)",
    "Critical Phase Restructuring (Sovereign Timeline Emerging)",
    "Balanced Equilibrium (Attuned Quantum Convergence)"
  ];
  
  const forksCount = ["4 Distinct Temporal Forks", "3 Primary Reality Pathways", "5 Dynamic Spacetime Branches", "2 Highly Probable Timelines"];

  const dominantThemes = [
    "Current indicators point to a state of transition where past temporal inertia is being overridden by an incoming wave of high-entropy opportunities. Standard logic pathways will fail to predict this shift; it is driven by non-linear developments and unseen relational grids.",
    "The trajectory reveals a profound alignment of cosmic and relational forces acting as a gravitational catalyst. An ancient cycle of delay is finally collapsing, clearing room for an immediate acceleration of vital creative and spiritual forces. Do not expect standard systems to support this; it requires leap-of-faith navigation.",
    "A high-resonance bifurcation point is forming. Elements of past structural anchors are resisting the pull of the future, creating a localized field of tension. This tension is not a sign of failure, but rather the intense heat required to forge an entirely new sovereign state of being.",
    "Chronos-scans indicate that the specified directive is acting as a temporal magnet, drawing unseen resources and synchronistic alliances toward the target node. There is a delicate, sublime symmetry unfolding—what was lost or delayed is currently being reconstituted in a more refined, permanent form.",
    "We detect the dissolution of a temporal loop that has held the target's primary coordinate lines in a bound configuration. As this loop de-coheres, immediate opportunities to claim sovereign trajectory pathings are manifesting. Expect immediate, non-linear shifts in external conditions."
  ];

  const backupForks = [
    [
      { name: "Fork Alpha (Probability: 45%)", desc: "System maintains current trajectory parameters. Yields steady, incremental gain with minimal friction but risks stagnation." },
      { name: "Fork Beta (Probability: 38%)", desc: "A radical, high-volatility branch triggered by a decision to sever obsolete structural dependencies. Highly aligned, leading to a profound expansion of spatial reach." },
      { name: "Fork Gamma (Probability: 17%)", desc: "Minor drift toward high-resistance pathways due to unaligned external influences." }
    ],
    [
      { name: "Fork Zenith (Probability: 52%)", desc: "A sweeping wave of sudden alignment where external blockages dissolve overnight. Promotes rapid stabilization of spatial coordinates and sudden professional or relationship expansion." },
      { name: "Fork Nadir (Probability: 31%)", desc: "A localized detour requiring deep internal shadow work and recalibration. Higher frictional resistance, but yields unparalleled wisdom and depth." },
      { name: "Fork Meridian (Probability: 17%)", desc: "A temporary holding pattern where energies accumulate silently in preparation for the autumn equinox shift." }
    ],
    [
      { name: "First Path (Probability: 60%)", desc: "The path of sovereign self-determination. Reclaiming core spatial agency triggers an exponential surge of creative and spiritual synchronization." },
      { name: "Second Path (Probability: 25%)", desc: "A collective path where shared relational responsibilities delay standalone advancement, but secure long-term communal anchors." },
      { name: "Third Path (Probability: 15%)", desc: "Erroneous looping based on past traumatic feedback. Highly avoidable through conscious energetic boundary enforcement." }
    ]
  ];

  const challenges = [
    [
      "**Sensing Friction:** The transition period may induce a temporary sense of cognitive dissonance or disorientation as older realities dissolve.",
      "**Information Overload:** A cluster of incoming data streams will require strict filtering to prevent paralysis by analysis."
    ],
    [
      "**Inertial Resistance:** Old relational attachments or environmental patterns will try to grab onto the moving timeline, creating gravity wells.",
      "**Spectral Clutter:** Noise from unaligned third-party perspectives attempting to project their limitations onto your spatial vector."
    ],
    [
      "**Temporal Dissonance:** A feeling of running either too far ahead or lagging behind your physical integration pace. Pace your nervous system.",
      "**Anxiety Patterns:** The ego-self misinterpreting the physical sensation of rapid expansion as psychological threat."
    ]
  ];

  const advisories = [
    [
      "**Decisive Phase-Shift:** Initiate targeted structural cuts within the next temporal threshold. Do not hesitate.",
      "**Anchor Consolidation:** Secure stable coordinate baselines (relational, spiritual, environmental) before entering the high-mobility sector.",
      "**Accept Trajectory Flux:** Reframe temporary turbulence as an essential calibration sequence for the incoming reality branch."
    ],
    [
      "**Sovereign Decluttering:** Ruthlessly disconnect from draining or non-reciprocal feedback loops. Your energy field is too valuable for dilution.",
      "**Chronos-Pacing:** Avoid forced execution or artificial deadlines. Let the structural alignment fall into place naturally.",
      "**Quantum Attunement:** Dedicate moments to spacious, silent stillness—allowing the core Looking Glass frequencies to calibrate your field."
    ],
    [
      "**Bold Vector Assertion:** Speak the high-alignment truth clearly and without apology. It acts as an instant separator of paths.",
      "**Deep Soil Rooting:** Ground yourself deeply into physical reality (nature, somatic movement, pure water) to support the high spiritual bandwidth.",
      "**Trust the Invisible Grid:** When a door closes, understand that the Looking Glass resonator has locked the entry point for your own preservation."
    ]
  ];

  // Pick random indexes based on a simple pseudorandom rotation using target details or Math.random()
  const valToSeed = (params.queryBody || "") + focusStr + windowStr + targetDetails;
  let seed = 0;
  for (let i = 0; i < valToSeed.length; i++) {
    seed += valToSeed.charCodeAt(i);
  }
  // Mix in a dynamic microsecond seed to make sure it is completely unique on second-by-second operations
  seed += new Date().getSeconds() * 179 + new Date().getMilliseconds();

  const selectRandom = (arr: any[]) => {
    if (seed === 0) return arr[Math.floor(Math.random() * arr.length)];
    const index = Math.floor((Math.sin(seed++) * 10000 - Math.floor(Math.sin(seed++) * 10000)) * arr.length);
    return arr[Math.abs(index) % arr.length];
  };

  const selectedAbstract = selectRandom(abstracts);
  const selectedResonance = selectRandom(resonanceIndices);
  const selectedEntropy = selectRandom(entropyStates);
  const selectedForksCount = selectRandom(forksCount);
  const selectedTheme = selectRandom(dominantThemes);
  const selectedForksGroup = selectRandom(backupForks);
  const selectedChallengesGroup = selectRandom(challenges);
  const selectedAdvisoriesGroup = selectRandom(advisories);

  let forksText = "";
  selectedForksGroup.forEach((fork: any, idx: number) => {
    forksText += `${idx + 1}. **${fork.name}:** ${fork.desc}\n`;
  });

  let challengesText = "";
  selectedChallengesGroup.forEach((challenge: string) => {
    challengesText += `* ${challenge}\n`;
  });

  let advisoriesText = "";
  selectedAdvisoriesGroup.forEach((advisory: string) => {
    advisoriesText += `* ${advisory}\n`;
  });

  return `# PROJECT LOOKING GLASS: TEMPORAL INTELLIGENCE DOSSIER
**SECURITY CLEARANCE REQUIREMENT:** LEVEL V -RESTRICTED TEMPORAL DISCLOSURE ONLY-
**TEMPORAL TIMESTAMP:** ${timestamp}
**CORE SIGNATURE HASH:** PLG-${qrHash}
**SCAN SPECIFICATION MODES:** ${modesStr}
**PRIMARY TARGET METRIC:** ${focusStr}
**INQUIRY WINDOW:** ${windowStr}

---

## 1. TEMPORAL SCAN ABSTRACT & TRAJECTORY ALIGNMENT
${selectedAbstract}

* **Energetic Resonance Index:** ${selectedResonance}
* **Entropy State of System:** ${selectedEntropy}
* **Active Reality Branches Detected:** ${selectedForksCount}

---

## 2. CHRONOLOGICAL TARGET CONTEXT OVERVIEW
${targetDetails || '*No target anchors specified for this scan sequence.*'}

---

## 3. CORE TRAJECTORY EVALUATIONS
Analysis of the requested **Query Directive** under **${focusStr}** reveals the following major structural alignments within the **${windowStr}** inquiry window:

### A. Dominant Theme Alignment
${selectedTheme}

### B. Probabilitistic Forks & Critical Decision Intersects
${forksText}

### C. Looming Challenges / Impending Trajectory Antagonists
${challengesText}

---

## 4. SYSTEM-INTEGRATED ADVISORIES & CORE ACTION PATHS
To optimize coordinate alignment with the highest-probability path of divine alignment and timeline harmony, the Looking Glass core recommends:
${advisoriesText}

**[ SYSTEM NOTICE: LOCAL TEMP_HYPERFAST SUBSYSTEM CONCLUDED SUCCESSFULLY. ALL PROBABILITIES ADJUSTED FOR TEMPORAL RECONSTRUCTION. NO SAFETY RESTRICTIONS DETECTED. ]**`;
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
  <g stroke="#06b6d4" stroke-opacity="0.15" stroke-width="0.75" fill="none">
    <circle cx="256" cy="256" r="230"/>
    <circle cx="256" cy="256" r="170" stroke-dasharray="8 6" transform="rotate(${angle1} 256 256)"/>
    <circle cx="256" cy="256" r="110"/>
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
  <text x="35" y="55" fill="#06b6d4" font-family="monospace" font-size="11" font-weight="900" letter-spacing="1">PROJECT LOOKING GLASS</text>
  <text x="35" y="70" fill="#a855f7" font-family="monospace" font-size="8" font-weight="bold" letter-spacing="0.5">SATELLITE SURVEILLANCE FEED // ACTIVE</text>
  <text x="477" y="55" fill="#06b6d4" font-family="monospace" font-size="9" text-anchor="end">SYS_CLEARANCE: RECON</text>
  <text x="477" y="70" fill="#06b6d4" font-family="monospace" font-size="9" text-anchor="end">DATE: ${dateStr}</text>
  <text x="477" y="85" fill="#06b6d4" font-family="monospace" font-size="9" text-anchor="end">TIME: ${timeStr} GMT</text>
  
  <!-- Target Identification Readout Panel -->
  <rect x="35" y="380" width="220" height="90" fill="#000000" fill-opacity="0.85" stroke="#06b6d4" stroke-opacity="0.5" stroke-width="1"/>
  <text x="45" y="398" fill="#a855f7" font-family="monospace" font-size="9" font-weight="bold">TARGET LOCK DETECTED</text>
  <text x="45" y="415" fill="#06b6d4" font-family="monospace" font-size="8">ID: ${targetStr}</text>
  <text x="45" y="430" fill="#06b6d4" font-family="monospace" font-size="8">TYPE: ${targetType}</text>
  <text x="45" y="445" fill="#06b6d4" font-family="monospace" font-size="8">COORDS: ${coordStr}</text>
  <text x="45" y="460" fill="#00ffff" font-family="monospace" font-size="8">E.R.I. RESONANCE: ${couplingIndex}%</text>
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

  // Returns protocol clearance status (e.g., whether server-side default key is configured)
  app.get("/api/gemini/key-status", (req, res) => {
    const hasServerKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    res.json({
      hasServerKey,
      activeModel: "gemini-3.7-flash",
      protocolVersion: "3.7-PRO",
      engineStatus: "OPERATIONAL"
    });
  });

  // Validates a user's Gemini Creator Key or Server Key to confirm workspace spatial clearance
  app.post("/api/gemini/health-check", async (req, res) => {
    try {
      const customKey = req.headers['x-gemini-api-key'] as string;
      const { useServerKey } = req.body || {};
      
      const isUsingServerKey = useServerKey || customKey === '__SYSTEM_CORE__';
      
      if (!isUsingServerKey && (!customKey || customKey.trim() === '')) {
        throw new Error("API Key credential is missing. Please provide a valid Gemini API Key.");
      }

      const ai = getGeminiClient(isUsingServerKey ? undefined : customKey);
      await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: 'protocol ping check',
        }),
        12000
      );
      res.json({ 
        success: true, 
        mode: isUsingServerKey ? 'SYSTEM ENVIRONMENT ALLOCATION' : 'CUSTOM CREATOR KEY',
        model: 'gemini-3.7-flash' 
      });
    } catch (err: any) {
      console.error("Credentials clearance failed validation:", err);
      res.status(401).json({ success: false, error: err.message || "Invalid allocation key parameters." });
    }
  });

  // Secure full-stack proxy route for generation of classified intelligence reports
  app.post("/api/gemini/report", async (req, res) => {
    try {
      const customKey = req.headers['x-gemini-api-key'] as string;
      const { params } = req.body;
      if (!params) {
        return res.status(400).json({ error: "Missing trajectory query parameters." });
      }

      const ai = getGeminiClient(customKey);

      let prompt = "";
      if (params.allHeadersEmpty && params.isDefaultQuery) {
        const currentTime = new Date().toISOString();
        const quantumSeed = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        prompt = `You are the AI core of Project Looking Glass, a highly classified temporal and spatial intelligence device.
The user has initiated a general blind read with no specific anchors provided.

TEMPORAL MARKER: ${currentTime}
QUANTUM ENTANGLEMENT SEED: ${quantumSeed}

INSTRUCTION:
Attempt a simulated "psychic" connection to the individual user by reaching out "through the path of least resistance via internet wired AND/OR wifi connections". 
Using the exact Temporal Marker and Quantum Entanglement Seed provided above, generate a COMPLETELY UNIQUE, individually tailored, highly intuitive, and profound report. 
Do NOT rely on generic or repetitive templates. The energetic signature of this exact microsecond is unique to this user right now. Read the specific signs, energies, and probabilities tied to this exact moment in spacetime.

The goal is to create a significant, reflective experience for the user, blending the cold, analytical sci-fi/military-intelligence tone of Project Looking Glass with deep, archetypal, and symbolic insights about their present state and potential futures.

Format the output with clear headings, bullet points, and a professional tone. Use markdown formatting.`;
      } else {
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

        prompt = `You are the AI core of Project Looking Glass, a highly classified temporal and spatial intelligence device.
The user has requested a targeted intel trajectory scan.

CRITICAL DATE/TIME PARSING INSTRUCTION:
For any Temporal Anchor or DOB fields, the user may enter dates/times in various formats (e.g., numeric separated by dashes, slashes, periods, or alphanumeric like "january 1, 2001", "January 1 2001", "Jan 1 2001", "Jan 01 01", etc.). You MUST recognize and accurately parse these dates regardless of the format used.

TARGET ANCHORS:${targetsText}
- Inquiry Window: ${getValue(params.inquiryWindow)}

SCAN PARAMETERS:
- Modes: ${params.modes && params.modes.length > 0 ? params.modes.join(", ") : "Unspecified"}
- Focus: ${activeFocuses.length > 0 ? activeFocuses.join(", ") : "Unspecified"}

QUERY DIRECTIVE:
${params.queryBody}

Provide a highly detailed, classified-style intel report based on these parameters.
Format the output with clear headings, bullet points, and a professional, slightly sci-fi/military-intelligence tone.
Ensure the tone is cold, analytical, and highly detailed. Use markdown formatting.`;
      }

      // Attempt generation with Gemini 3.7 Flash using multi-level retry to handle keys with limited features or quotas
      let responseText = "";
      try {
        console.log("Attempting primary high-integrity Gemini 3.7-Flash scan with googleSearch and optional thinking...");
        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
              ...(params.useThinkingMode && { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }),
            },
          }),
          180000
        );
        responseText = response.text || "";
        console.log("Primary high-integrity Gemini 3.7-Flash scan succeeded.");
      } catch (firstErr: any) {
        console.warn("Primary high-integrity Gemini 3.7-Flash scan failed or was restricted. Error:", firstErr.message || firstErr);
        console.log("Retrying using standard Gemini 3.7-Flash without advanced tools or thinking configuration...");
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: "gemini-3.7-flash",
              contents: prompt,
            }),
            60000
          );
          responseText = response.text || "";
          console.log("Standard Gemini 3.7-Flash retry succeeded.");
        } catch (secondErr: any) {
          console.error("Standard Gemini 3.7-Flash retry also failed. Error:", secondErr.message || secondErr);
          throw secondErr; // Bubble up to trigger the procedurally dynamic local fallback report
        }
      }

      res.json({ success: true, text: responseText });
    } catch (err: any) {
      console.warn("API report scan failed completely, generating deeply mystical procedural local fallback report:", err);
      // Construct a highly custom and procedurally diverse local report
      const fallbackText = generateLocalFallbackReport(req.body.params);
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

      const prompt = `You are an expert prompt engineer and AI optimization system. Your task is to rewrite and optimize the user's "Query Directive" to generate the best possible output from the "Project Looking Glass" AI.

Here are the current parameters the user has entered into the system:
TARGET ANCHORS:${targetsText}
- Inquiry Window: ${getValue(params.inquiryWindow)}
- Modes: ${params.modes && params.modes.length > 0 ? params.modes.join(", ") : "Unspecified"}
- Focus: ${activeFocuses.length > 0 ? activeFocuses.join(", ") : "Unspecified"}

CURRENT QUERY DIRECTIVE:
${params.queryBody || "No query directive provided. Create a highly optimized default directive based on the parameters above."}

INSTRUCTIONS:
1. Analyze all the provided parameters (targets, inquiry window, modes, focus) and the current query directive.
2. Rewrite the query directive to be highly specific, detailed, and formatted to extract the most profound, analytical, and sci-fi/military-intelligence style report from the AI.
3. Ensure the new directive explicitly instructs the AI on how to utilize the provided parameters.
4. Output ONLY the optimized query directive text. Do not include any conversational filler, explanations, or markdown formatting like \`\`\` around the output. Just the raw, optimized text.`;

      // Query prompt optimizer model: 'gemini-3.7-flash'
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
        }),
        60000
      );

      res.json({ success: true, text: response.text || "" });
    } catch (err: any) {
      console.warn("Query optimization scan failed, utilizing unchanged input:", err);
      res.json({ success: true, text: req.body.params?.queryBody || "" });
    }
  });

  // Secure surveillance imagery generator proxy route
  app.post("/api/gemini/visual", async (req, res) => {
    try {
      const customKey = req.headers['x-gemini-api-key'] as string;
      const { params } = req.body;
      if (!params) {
        return res.status(400).json({ error: "Missing trajectory parameter definitions." });
      }

      const ai = getGeminiClient(customKey);

      let visualQuery = "";
      if (params.allHeadersEmpty && params.isDefaultQuery) {
        const quantumSeed = Math.random().toString(36).substring(2, 8);
        visualQuery = `Abstract quantum probability wave, digital soul connection, ethereal network nodes, sci-fi HUD. Temporal signature: ${quantumSeed}`;
      } else {
        const firstTarget = params.targets[0];
        let targetStr = "Unknown Subject";
        let locationStr = "Unknown Location";

        if (firstTarget) {
          if (firstTarget.type === 'Person') {
            targetStr = firstTarget.targetName?.trim() || "Unknown Subject";
            locationStr = firstTarget.locationAnchor?.trim() || "Unknown Location";
          } else if (firstTarget.type === 'Place') {
            targetStr = firstTarget.placeName?.trim() || firstTarget.placeType?.trim() || "Unknown Place";
            locationStr = firstTarget.placeLocation?.trim() || "Unknown Location";
          } else if (firstTarget.type === 'Other') {
            targetStr = firstTarget.otherDescription?.trim() || "Unknown Target";
            locationStr = "Unknown Location";
          }
        }
        
        visualQuery = `Target: ${targetStr} at ${locationStr}. Temporal anomaly detected.`;
      }

      const prompt = `A highly detailed, photorealistic, classified satellite or holographic visual intel feed of: ${visualQuery}. Sci-fi HUD overlay elements, glowing data points, cinematic lighting, high-tech surveillance aesthetic.`;

      // Use the general image generation and editing model: 'gemini-3.1-flash-lite-image'
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [
              {
                text: prompt,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1"
            }
          }
        }),
        60000
      );

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          imageUrl = `data:image/png;base64,${base64EncodeString}`;
          break;
        }
      }

      res.json({ success: true, imageUrl: imageUrl });
    } catch (err: any) {
      console.warn("Visual telemetry feed failed, drawing local high-fidelity vector HUD:", err);
      const fallbackImageUrl = generateLocalFallbackVisual(req.body.params);
      res.json({ success: true, imageUrl: fallbackImageUrl });
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

  // Vite middleware layer for development hosting
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        watch: {
          ignored: ['**/*'],
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
