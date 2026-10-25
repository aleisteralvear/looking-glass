import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowRight, Cpu, Radio, Sparkles, CheckCircle2 } from 'lucide-react';
import { checkArgonHealth } from '../lib/gemini';

interface AccessGatewayProps {
  onAuthorize: () => void;
}

export function AccessGateway({ onAuthorize }: AccessGatewayProps) {
  const [operatorId, setOperatorId] = useState(() => {
    return localStorage.getItem('plg_user_email') || 'aleisteralvear@gmail.com';
  });
  const [clearanceLevel, setClearanceLevel] = useState('LEVEL-V-RESTRICTED');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [argonStatus, setArgonStatus] = useState<string>('SYNCHRONIZING CORE...');

  useEffect(() => {
    checkArgonHealth()
      .then((data) => {
        setArgonStatus(`GEMINI 4 ARGON ONLINE // ${data.version || 'V4.0'}`);
      })
      .catch(() => {
        setArgonStatus('GEMINI 4 ARGON QUANTUM RESONANCE READY');
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const callSign = operatorId.trim();
    if (!callSign) {
      setError('OPERATOR IDENTITY OR CALL SIGN REQUIRED.');
      return;
    }

    setIsValidating(true);

    try {
      localStorage.setItem('plg_user_email', callSign);
      localStorage.setItem('plg_operator_clearance', clearanceLevel);
      onAuthorize();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ARGON REACTOR INITIALIZATION ERROR.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic scanline grid */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,#06b6d412_1px,transparent_1px),linear-gradient(to_bottom,#06b6d412_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-lg bg-black/70 border border-cyan-500/40 rounded-2xl p-6 md:p-8 backdrop-blur-md relative z-10 shadow-[0_0_60px_rgba(6,182,212,0.15)]"
      >
        {/* Aesthetic Corner Brackets */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-500/60" />
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-500/60" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-500/60" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-500/60" />

        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-full mb-4 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Shield className="w-8 h-8 animate-pulse text-cyan-400" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              {argonStatus}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-purple-500 uppercase">
            CLEARANCE PROTOCOL
          </h2>
          <p className="text-xs font-mono text-cyan-500/70 mt-2 uppercase tracking-wide">
            Project Looking Glass V4.0 // Powered by Gemini 4 Argon Tech
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 bg-red-950/50 border border-red-500/40 p-3 rounded font-mono text-xs text-red-400 text-center leading-normal"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-cyan-500/70 uppercase tracking-widest mb-1.5 flex items-center justify-between">
              <span>Operator Identifier / Call Sign</span>
              <span className="text-[10px] text-cyan-400 font-bold">ARGON VERIFIED</span>
            </label>
            <input
              type="text"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              placeholder="operator@lookingglass.mil or Call Sign"
              disabled={isValidating}
              className="w-full bg-black/80 border border-cyan-500/40 rounded-lg px-3.5 py-2.5 text-cyan-100 placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-purple-400/80 uppercase tracking-widest mb-1.5">
              Argon Security Clearance Protocol
            </label>
            <select
              value={clearanceLevel}
              onChange={(e) => setClearanceLevel(e.target.value)}
              disabled={isValidating}
              className="w-full bg-black/80 border border-purple-500/40 rounded-lg px-3.5 py-2.5 text-purple-200 font-mono text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors"
            >
              <option value="LEVEL-V-RESTRICTED">LEVEL V // RESTRICTED TEMPORAL DISCLOSURE (RECOMMENDED)</option>
              <option value="LEVEL-IV-TACTICAL">LEVEL IV // TACTICAL TRAJECTORY CLEARANCE</option>
              <option value="LEVEL-III-GENERAL">LEVEL III // PROBABILISTIC GENERAL ACCESS</option>
            </select>
          </div>

          {/* Engine Capability Indicators */}
          <div className="grid grid-cols-2 gap-3 py-1 font-mono text-[11px]">
            <div className="bg-cyan-950/30 border border-cyan-500/20 p-2.5 rounded-lg flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-cyan-300 font-bold">GEMINI 4 ARGON</p>
                <p className="text-[9px] text-cyan-500/70">Quantum Timeline Engine</p>
              </div>
            </div>
            <div className="bg-purple-950/30 border border-purple-500/20 p-2.5 rounded-lg flex items-center space-x-2">
              <Radio className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <p className="text-purple-300 font-bold">MULTIMODAL HUD</p>
                <p className="text-[9px] text-purple-500/70">Surveillance Telemetry</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isValidating}
            className="w-full bg-gradient-to-r from-cyan-950/80 to-purple-950/80 hover:from-cyan-900/90 hover:to-purple-900/90 text-cyan-200 hover:text-white border border-cyan-500/60 hover:border-cyan-400 rounded-lg font-mono text-sm uppercase py-3.5 tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(6,182,212,0.2)] cursor-pointer group"
          >
            <span>{isValidating ? 'SYNCHRONIZING WITH ARGON REACTOR...' : 'INITIALIZE GEMINI 4 ARGON INTERFACE'}</span>
            {!isValidating && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-cyan-500/20 flex items-center justify-between font-mono text-[10px] text-cyan-500/60">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>SERVER-SIDE GEMINI API LINK ACTIVE</span>
          </span>
          <span className="flex items-center gap-1 text-purple-400">
            <Sparkles className="w-3 h-3" />
            <span>V4.0 ARGON TECH</span>
          </span>
        </div>
      </motion.div>
    </div>
  );
}
