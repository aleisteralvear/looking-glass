import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Eye, EyeOff, HelpCircle, ArrowRight, ExternalLink, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';
import { fetchKeyProtocolStatus, KeyProtocolStatus } from '../lib/gemini';

interface AccessGatewayProps {
  onAuthorize: () => void;
}

export function AccessGateway({ onAuthorize }: AccessGatewayProps) {
  const [email, setEmail] = useState(() => localStorage.getItem('plg_user_email') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('plg_gemini_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [protocolStatus, setProtocolStatus] = useState<KeyProtocolStatus | null>(null);
  const [useServerCore, setUseServerCore] = useState(false);

  useEffect(() => {
    fetchKeyProtocolStatus().then((status) => {
      setProtocolStatus(status);
      if (status.hasServerKey) {
        setUseServerCore(true);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('VALID SUBSCRIBER EMAIL IDENTIFICATION REQUIRED.');
      return;
    }

    if (!useServerCore) {
      const cleanKey = apiKey.trim();
      if (!cleanKey || cleanKey.length < 20) {
        setError('INVALID CREDENTIAL STRUCTURE. Please provide a valid Gemini API Key (e.g. starting with "AIza").');
        return;
      }
    }

    setIsValidating(true);

    try {
      // Validate key via backend health check proxy
      const response = await fetch('/api/gemini/health-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(!useServerCore && apiKey.trim() ? { 'x-gemini-api-key': apiKey.trim() } : {})
        },
        body: JSON.stringify({ useServerKey: useServerCore })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'COULD NOT VERIFY SPATIAL RIGHTS SPECIFIED BY THE API KEY.');
      }

      // Store in sandboxed localStorage
      localStorage.setItem('plg_user_email', cleanEmail.toLowerCase());
      localStorage.setItem('plg_gemini_api_key', useServerCore ? '__SYSTEM_CORE__' : apiKey.trim());
      
      onAuthorize();
    } catch (err: any) {
      console.error("Authentication failed:", err);
      setError(err.message || 'AUTHENTICATION TIMEOUT / VALIDATION FAILED.');
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
        className="w-full max-w-md bg-black/60 border border-cyan-500/30 rounded-2xl p-6 md:p-8 backdrop-blur-md relative z-10 shadow-[0_0_50px_rgba(6,182,212,0.1)]"
      >
        {/* Aesthetic Corner Brackets */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50" />
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50" />

        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-full mb-4 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Shield className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase">
            CLEARANCE PROTOCOL
          </h2>
          <p className="text-xs font-mono text-cyan-500/70 mt-2 uppercase tracking-wide">
            PROJECT LOOKING GLASS // GEMINI 3.7 QUANTUM CORE
          </p>
        </div>

        {protocolStatus?.hasServerKey && (
          <div className="mb-4 p-3 bg-cyan-950/30 border border-cyan-500/40 rounded-xl flex items-center justify-between font-mono text-xs">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-cyan-200 font-bold uppercase">ENVIRONMENT ALLOCATION DETECTED</div>
                <div className="text-cyan-500/70 text-[10px]">Gemini 3.7 Core Online</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseServerCore(!useServerCore)}
              className={`px-2.5 py-1 rounded text-[10px] border font-bold uppercase transition-colors ${
                useServerCore 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400' 
                  : 'bg-black/40 text-gray-400 border-gray-700 hover:border-gray-500'
              }`}
            >
              {useServerCore ? 'SYSTEM CORE ACTIVE' : 'USE SYSTEM KEY'}
            </button>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 bg-red-950/50 border border-red-500/40 p-3 rounded font-mono text-xs text-red-400 text-center leading-normal"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-cyan-500/60 uppercase tracking-widest mb-1.5">
              Subscriber Identity (Email)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              disabled={isValidating}
              className="w-full bg-black/80 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 placeholder-gray-700 font-mono text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            />
          </div>

          {!useServerCore ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono text-cyan-500/60 uppercase tracking-widest">
                  Gemini Creator API Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-[10px] font-mono text-cyan-400/70 hover:text-cyan-300 flex items-center space-x-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>HOW TO GET A KEY?</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  disabled={isValidating}
                  className="w-full bg-black/80 border border-cyan-500/30 rounded-lg pl-3 pr-10 py-2 text-cyan-100 placeholder-gray-700 font-mono text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
                <button
                  type="button"
                  disabled={isValidating}
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500/50 hover:text-cyan-400 transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-black/40 border border-cyan-500/20 rounded-lg font-mono text-xs text-cyan-400/80 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>AUTHENTICATING VIA SERVER ENVIRONMENT CORE</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isValidating}
            className="w-full bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/50 rounded-lg font-mono text-sm uppercase py-3 tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.15)]"
          >
            <span>{isValidating ? 'SYNCHRONIZING PROTOCOL...' : 'CONNECT ADVANCED REACTOR'}</span>
            {!isValidating && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Dynamic nested help drawer */}
        <motion.div
          animate={{ height: showHelp ? 'auto' : 0, opacity: showHelp ? 1 : 0 }}
          className="overflow-hidden mt-4"
        >
          <div className="border border-purple-500/30 bg-purple-950/20 rounded-lg p-4 font-mono text-xs text-purple-300 leading-relaxed space-y-2">
            <p className="font-bold uppercase text-purple-400 border-b border-purple-500/20 pb-1">
              ALLOCATING A GEMINI API KEY
            </p>
            <p>
              Usage metrics are charged strictly to the developer allocation block of the accessing user.
            </p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Open Google AI Studio.</li>
              <li>Authenticate with any Google account.</li>
              <li>Click "Create API Key" and generate a free workspace key.</li>
              <li>Copy and paste it into the terminal connection layer above.</li>
            </ol>
            <div className="pt-2">
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer referrer"
                className="inline-flex items-center space-x-1.5 text-cyan-400 hover:text-cyan-300 font-bold"
              >
                <span>OPEN GOOGLE AI STUDIO</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
