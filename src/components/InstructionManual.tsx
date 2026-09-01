import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

const MANUAL_TEXT = `PROJECT LOOKING GLASS : STANDARD OPERATING PROTOCOLS
====================================================

DESCRIPTION:
Project Looking Glass is a temporal and spatial intelligence interface. It calculates non-deterministic assessments of present trajectories, dominant themes, and probable futures based on targeted anchors.

TARGET ANCHORS:
The foundational coordinates for the scan.
- Target Type: Classifies the subject (Person, Place, or Other).
- Target Name: The designated identifier. (e.g., "John Doe", "Eiffel Tower")
- DOB / Temporal Anchor: The chronological point of origin. (e.g., "01/01/1980", "July 4th, 1776")
- Location Anchor: The spatial coordinates or general vicinity. (e.g., "New York City", "34.05° N, 118.24° W")
- Inquiry Window: The temporal range for the forecast. (e.g., "30 Days", "5 Years")

SCAN PARAMETERS:
Modifiers that tune the Looking Glass sensors.
- Modes: Defines the analytical lens.
  * Archetypal: Focuses on universal patterns and myths.
  * Probabilistic: Focuses on statistical likelihoods.
  * Reflective: Mirrors the target's internal state.
  * Symbolic: Interprets data through signs and omens.
  * Quantum: Analyzes all possible superimposed states.
  * Temporal: Focuses strictly on timeline progression.
- Primary Focus: The specific objective of the scan.

QUERY DIRECTIVE (CRITICAL):
The final prompt is the most sensitive parameter. Phrasing matters immensely because the Looking Glass interprets intent, not just syntax.

The system requires objective, symbolic, and open-ended directives to function optimally. 

AVOID BINARY QUERIES: 
"Will I get the job?" or "Is this person my soulmate?" 
These force a deterministic collapse of the timeline and often result in temporal distortion.

USE EXPLORATORY QUERIES: 
"Analyze the energetic alignment and probable outcomes of the subject's current career trajectory."
"Scan for karmic ties and immediate-future forks regarding the subject's relationship."

By keeping the directive open, you allow the system to map the highest-probability developmental paths without artificially collapsing the wave function.`;

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

  useEffect(() => {
    if (!isOpen) {
      // Reset when closed after animation finishes
      const timer = setTimeout(() => {
        setVisibleLength(0);
        setIsSkipped(false);
        setIsGlossaryOpen(false);
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

        {/* Glossary */}
        {visibleLength >= MANUAL_TEXT.length && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 border border-purple-500/30 rounded bg-purple-500/5 overflow-hidden"
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
