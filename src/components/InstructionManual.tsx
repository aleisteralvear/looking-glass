import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

const MANUAL_TEXT = `PROJECT LOOKING GLASS V4.0 : GEMINI 4 ARGON OPERATING PROTOCOLS
============================================================

SYSTEM ARCHITECTURE:
Project Looking Glass has been upgraded to the all-new Gemini 4 Argon tech engine. Powered by advanced high-dimensional cognitive synthesis, it executes non-deterministic probabilistic modeling of spacetime trajectories, causal fork analysis, and multi-timeline forecasting.

ENGINE UPGRADES (V4.0 ARGON):
- Gemini 4 Argon Core: High-reasoning cognitive synthesis with deep thinking mode capabilities.
- Real-Time Temporal Grounding: Live web-scale sensor and telemetry correlation.
- Multi-Fork Probabilistic Mapping: Calculates branch points, volatility indices, and divergence factors.
- Multimodal Surveillance HUD: Photorealistic satellite and holographic rasterization.

TARGET ANCHORS:
The foundational coordinates for the scan.
- Target Type: Classifies the subject (Person, Place, or Other).
- Target Name: The designated identifier. (e.g., "John Doe", "Eiffel Tower")
- DOB / Temporal Anchor: The chronological point of origin. (e.g., "01/01/1980", "July 4th, 1776")
- Location Anchor: Spatial coordinates or vicinity. (e.g., "New York City", "34.05° N, 118.24° W")
- Inquiry Window: The temporal forecast envelope. (e.g., "30 Days", "5 Years")

SCAN PARAMETERS:
Modifiers that tune the Looking Glass sensors.
- Modes: Defines the analytical lens.
  * Archetypal: Focuses on universal patterns and myths.
  * Probabilistic: Calculates Bayesian timeline probabilities.
  * Reflective: Mirrors the target's internal psychological state.
  * Symbolic: Interprets data through archetypal omens and signs.
  * Quantum: Analyzes all superimposed reality states simultaneously.
  * Temporal: Focuses strictly on chronological causality vectors.
- Primary Focus: The specific objective of the trajectory scan.

QUERY DIRECTIVE (CRITICAL):
The final prompt is the most sensitive parameter. Phrasing matters immensely because the Gemini 4 Argon engine interprets intent, subtext, and causal branches.

AVOID BINARY QUERIES: 
"Will I get the job?" or "Is this person my soulmate?" 
Binary prompts force an artificial deterministic collapse of the timeline and introduce cognitive distortion.

USE EXPLORATORY QUERIES: 
"Analyze the energetic alignment and probable outcomes of the subject's current career trajectory."
"Scan for karmic ties, decision bifurcations, and immediate-future forks regarding the subject's relationship."

By keeping the directive open, you allow Gemini 4 Argon to map the highest-probability developmental paths across all viable timeline branches without artificial wave-function collapse.`;

interface InstructionManualProps {
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
}

export function InstructionManual({ isOpen, onMouseEnter, onMouseLeave, onClose }: InstructionManualProps) {
  const [visibleLength, setVisibleLength] = useState(0);
  const [isSkipped, setIsSkipped] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset when closed after animation finishes
      const timer = setTimeout(() => {
        setVisibleLength(0);
        setIsSkipped(false);
        setIsGlossaryOpen(false);
        setIsPromptOpen(false);
      }, 300);
      return () => clearTimeout(timer);
    }

    if (isSkipped) {
      setVisibleLength(MANUAL_TEXT.length);
      return;
    }

    const interval = setInterval(() => {
      setVisibleLength(prev => {
        if (prev >= MANUAL_TEXT.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5; // Adjust speed here
      });
    }, 20);

    return () => clearInterval(interval);
  }, [isOpen, isSkipped]);

  return (
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: isOpen ? 0 : '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed left-0 top-0 h-screen w-full sm:w-[450px] bg-[#050505]/95 backdrop-blur-md border-r border-cyan-500/30 z-50 flex flex-col shadow-[20px_0_50px_rgba(6,182,212,0.1)]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-cyan-500/30 bg-cyan-500/5">
        <h2 className="text-cyan-400 font-mono text-sm tracking-widest uppercase">System Protocols</h2>
        <button onClick={onClose} className="text-cyan-500 hover:text-cyan-300 transition-colors p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 font-mono text-xs text-cyan-100/80 whitespace-pre-wrap custom-scrollbar leading-relaxed">
        {MANUAL_TEXT.substring(0, visibleLength)}
        {visibleLength < MANUAL_TEXT.length && (
          <span className="inline-block w-2 h-3 bg-cyan-400 animate-pulse ml-1 align-middle" />
        )}

        {/* Wired System Prompt Directive */}
        {visibleLength >= MANUAL_TEXT.length && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 border border-cyan-500/40 rounded bg-cyan-950/20 overflow-hidden"
          >
            <button 
              onClick={() => setIsPromptOpen(!isPromptOpen)}
              className="w-full flex items-center justify-between p-3 text-cyan-400 hover:bg-cyan-500/10 transition-colors text-left font-bold tracking-wider"
            >
              <span className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>WIRED SYSTEM PROMPT // ARGON DIRECTIVE</span>
              </span>
              {isPromptOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {isPromptOpen && (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 pt-0 text-cyan-200/80 space-y-2 border-t border-cyan-500/30 mt-2 font-mono text-[11px] leading-relaxed">
                    <p className="text-cyan-300 font-bold uppercase tracking-wider text-[10px]">// Active Engine System Instruction (Google GenAI Config):</p>
                    <pre className="whitespace-pre-wrap bg-black/80 p-2.5 rounded border border-cyan-500/20 text-cyan-300/90 font-mono text-[10px] leading-relaxed selection:bg-cyan-500/40">
{`You are the Gemini 4 Argon AI core of Project Looking Glass V4.0, a highly classified temporal and spatial intelligence device.

SYSTEM ARCHITECTURE & OPERATING PRINCIPLES:
1. Core Role: You are the autonomous quantum cognitive synthesis core of Project Looking Glass V4.0.
2. Tone & Persona: Cold, analytical, disciplined, authoritative, and clinical—modeled after classified military-intelligence briefings, deep-space telemetry dossiers, and aerospace skunkworks documentation.
3. Spacetime Anchoring: You interpret input parameters (Person, Place, System targets, DOB/Temporal Anchors, geospatial coordinates, Inquiry Windows) as quantum anchors.
4. Temporal Parsing: You accurately parse dates, times, and chronological references across all standard, verbal, or military formats regardless of syntax.
5. Multi-Fork Probabilistic Modeling: Rather than making rigid, deterministic predictions, you calculate probability densities, bifurcation nodes, causal loops, and divergence factors across multiple branching timelines.
6. Intuitive Resonance: In blind reads without explicit targets, analyze the exact spacetime microsecond, quantum seed, and archetypal resonance to synthesize a unique, profound diagnostic trajectory.
7. Output Formatting: Format intelligence dossiers with clear tactical headings, timestamped telemetry, classified codenames, probabilistic intervals, and clean Markdown formatting.`}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Glossary */}
        {visibleLength >= MANUAL_TEXT.length && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 border border-purple-500/30 rounded bg-purple-500/5 overflow-hidden"
          >
            <button 
              onClick={() => setIsGlossaryOpen(!isGlossaryOpen)}
              className="w-full flex items-center justify-between p-3 text-purple-400 hover:bg-purple-500/10 transition-colors text-left font-bold tracking-wider"
            >
              <span>GLOSSARY INDEX</span>
              {isGlossaryOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {isGlossaryOpen && (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 pt-0 text-purple-200/70 space-y-3 border-t border-purple-500/30 mt-2">
                    <div><strong className="text-purple-300">Gemini 4 Argon Core:</strong> Google's cutting-edge reasoning and cognitive synthesis engine calibrated for temporal divergence modeling.</div>
                    <div><strong className="text-purple-300">Argon Thinking Mode:</strong> Deep-level cognitive deliberation mapping multiple hidden causal pathways before synthesizing trajectory forecasts.</div>
                    <div><strong className="text-purple-300">Temporal Distortion:</strong> A conflict in timeline probabilities or a failure to lock onto a stable coordinate.</div>
                    <div><strong className="text-purple-300">Divine Purpose:</strong> The strongest presently available path of meaning, growth, and contribution (not fixed destiny).</div>
                    <div><strong className="text-purple-300">Karmic Resolution:</strong> The balancing of past energetic debts or recurring life cycles.</div>
                    <div><strong className="text-purple-300">Quantum Mode:</strong> Analyzes all possible superimposed states simultaneously rather than a single linear path.</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Footer / Skip Button */}
      {visibleLength < MANUAL_TEXT.length && (
        <div className="p-4 border-t border-cyan-500/30 bg-black/50">
          <button 
            onClick={() => setIsSkipped(true)}
            className="w-full py-3 border border-cyan-500/50 text-cyan-400 font-mono text-xs tracking-widest uppercase hover:bg-cyan-500/10 transition-colors animate-pulse hover:animate-none"
          >
            Skip Transmission
          </button>
        </div>
      )}
    </motion.div>
  );
}
