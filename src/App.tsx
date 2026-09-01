import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Terminal, AlertTriangle, Key, Shield } from 'lucide-react';
import { LookingGlass } from './components/LookingGlass';
import { IntelReport } from './components/IntelReport';
import { ScanForm } from './components/ScanForm';
import { InstructionManual } from './components/InstructionManual';
import { KeyProtocolModal } from './components/KeyProtocolModal';
import { generateIntelReport, generateVisualIntel, LookingGlassQuery, fetchKeyProtocolStatus, KeyProtocolStatus } from './lib/gemini';
import { AccessGateway } from './components/AccessGateway';

export default function App() {
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return !!(localStorage.getItem('plg_user_email') && localStorage.getItem('plg_gemini_api_key'));
  });
  const [isFormExpanded, setIsFormExpanded] = useState(true);

  const [isScanning, setIsScanning] = useState(false);
  const [isRetryingVisual, setIsRetryingVisual] = useState(false);
  const [isRetryingText, setIsRetryingText] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [reportText, setReportText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [lastQueryParams, setLastQueryParams] = useState<LookingGlassQuery | null>(null);

  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [protocolStatus, setProtocolStatus] = useState<KeyProtocolStatus | null>(null);
  const manualTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    fetchKeyProtocolStatus().then(setProtocolStatus);
  }, []);

  const refreshAuthStatus = () => {
    const hasAuth = !!(localStorage.getItem('plg_user_email') && localStorage.getItem('plg_gemini_api_key'));
    setIsAuthorized(hasAuth);
    fetchKeyProtocolStatus().then(setProtocolStatus);
  };

  if (!isAuthorized) {
    return <AccessGateway onAuthorize={refreshAuthStatus} />;
  }

  const activeKey = localStorage.getItem('plg_gemini_api_key') || '';
  const isSystemKey = activeKey === '__SYSTEM_CORE__';
  const displayCallsign = localStorage.getItem('plg_user_email') || 'OPERATOR';

  const handleManualMouseEnter = () => {
    clearTimeout(manualTimeoutRef.current);
    setIsManualOpen(true);
  };

  const handleManualMouseLeave = () => {
    manualTimeoutRef.current = setTimeout(() => setIsManualOpen(false), 400);
  };

  const handleScan = async (queryParams: LookingGlassQuery) => {
    setIsScanning(true);
    setHasScanned(true);
    setIsFormExpanded(false);
    setError(null);
    setVisualError(null);
    setTextError(null);
    setImageUrl(null);
    setReportText(null);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    setLastQueryParams(queryParams);

    try {
      const visualPromise = generateVisualIntel(queryParams);
      const textPromise = generateIntelReport(queryParams);

      visualPromise.then(setImageUrl).catch(err => {
        console.error("Visual scan failed:", err);
        setVisualError("VISUAL TELEMETRY FAILED: " + (err.message || 'Check API key & quota.'));
      });
      textPromise.then(setReportText).catch(err => {
        console.error("Text scan failed:", err);
        setTextError("INTEL REPORT FAILED: " + (err.message || 'Check API key & quota.'));
      });

      const results = await Promise.allSettled([visualPromise, textPromise]);
      
      if (results[0].status === 'rejected' && results[1].status === 'rejected') {
        const errorReason = (results[0] as PromiseRejectedResult).reason?.message || "TEMPORAL DISTORTION DETECTED. SCAN FAILED.";
        setError(errorReason);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setIsFormExpanded(true);
    setHasScanned(false);
    setImageUrl(null);
    setReportText(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetryVisual = async () => {
    if (!lastQueryParams) return;
    setVisualError(null);
    setImageUrl(null);
    setIsRetryingVisual(true);

    try {
      const visual = await generateVisualIntel(lastQueryParams);
      setImageUrl(visual);
    } catch (err: any) {
      console.error("Visual scan retry failed:", err);
      setVisualError("VISUAL TELEMETRY FAILED: " + (err.message || 'Quota or connection issue.'));
    } finally {
      setIsRetryingVisual(false);
    }
  };

  const handleRetryText = async () => {
    if (!lastQueryParams) return;
    setTextError(null);
    setReportText(null);
    setIsRetryingText(true);

    try {
      const text = await generateIntelReport(lastQueryParams);
      setReportText(text);
    } catch (err: any) {
      console.error("Text scan retry failed:", err);
      setTextError("INTEL REPORT FAILED: " + (err.message || 'Quota or connection issue.'));
    } finally {
      setIsRetryingText(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans overflow-x-hidden selection:bg-cyan-500/30 pb-24 relative">
      {/* Reactor Console Status Badge in top-right */}
      <div className="absolute top-4 right-4 z-40 flex flex-wrap items-center gap-2.5 bg-black/85 border border-cyan-500/30 px-3.5 py-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.1)] font-mono text-xs backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-cyan-400 uppercase font-semibold">
            {isSystemKey ? 'CORE: SYSTEM' : 'CORE: USER KEY'}
          </span>
        </div>
        <span className="text-cyan-500/30">|</span>
        <span className="text-cyan-300 font-bold max-w-[160px] truncate">{displayCallsign}</span>
        <span className="text-cyan-500/30">|</span>
        <button 
          onClick={() => setIsKeyModalOpen(true)}
          className="uppercase text-[10px] bg-cyan-950/60 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-900/60 border border-cyan-500/40 px-2 py-1 rounded transition-all cursor-pointer flex items-center space-x-1"
          title="Manage API Key Protocol"
        >
          <Key className="w-3 h-3" />
          <span>KEY PROTOCOL</span>
        </button>
      </div>

      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,#06b6d41a_1px,transparent_1px),linear-gradient(to_bottom,#06b6d41a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

      <main className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div 
              onMouseEnter={handleManualMouseEnter}
              onMouseLeave={handleManualMouseLeave}
              className="relative cursor-help p-2 -m-2 group"
            >
              <Terminal className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-colors group-hover:animate-pulse" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-cyan-500 whitespace-nowrap pointer-events-none">
                ACCESS PROTOCOLS
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 uppercase">
              Project Looking Glass
            </h1>
          </div>
          <p className="text-cyan-500/70 font-mono text-sm tracking-widest uppercase">
            TEMPORAL & SPATIAL INTELLIGENCE INTERFACE // GEMINI 3.7 QUANTUM CORE
          </p>
        </motion.div>

        <LookingGlass isScanning={isScanning} />

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-4xl mt-12"
        >
          <div aria-live="polite" className="sr-only">
            {isScanning ? 'Scan initiated. Analyzing temporal and spatial data...' : hasScanned ? 'Scan complete. Results are ready.' : error ? `Scan failed: ${error}` : ''}
          </div>
          <ScanForm 
            isScanning={isScanning}
            isFormExpanded={isFormExpanded}
            setIsFormExpanded={setIsFormExpanded}
            onScan={handleScan}
            onReset={handleReset}
          />
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-red-400 font-mono text-sm bg-red-950/40 border border-red-500/40 px-6 py-4 rounded-xl max-w-3xl w-full shadow-lg"
          >
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="shrink-0 px-3 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/50 rounded text-xs uppercase tracking-wider transition-colors font-bold cursor-pointer"
            >
              UPDATE KEY PROTOCOL
            </button>
          </motion.div>
        )}

        {hasScanned && !error && (
          <IntelReport 
            imageUrl={imageUrl} 
            reportText={reportText} 
            visualError={visualError}
            textError={textError}
            onRetryVisual={handleRetryVisual}
            onRetryText={handleRetryText}
            isScanning={isScanning}
            isRetryingVisual={isRetryingVisual}
            isRetryingText={isRetryingText}
            queryParams={lastQueryParams}
          />
        )}

        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-32 text-center text-cyan-500/40 font-mono text-xs max-w-2xl mx-auto flex flex-col items-center"
        >
          <div className="whitespace-pre-wrap">
            A Weird Alvear Experience coded 2026 with Google AI Studio built with and powered by Gemini 3.7...for <i className="italic text-cyan-400">Entertainment Purposes Only</i>, of course.{"\n\n\n\n"}<i className="italic">Of course.</i>
          </div>
          
          <a 
            href="mailto:weirdalvear@gmail.com"
            className="mt-12 text-[10px] uppercase tracking-widest text-cyan-500/30 hover:text-cyan-400/80 transition-colors"
          >
            [ Submit Transmission / Feedback to weirdalvear@gmail.com ]
          </a>
        </motion.footer>

      </main>

      <InstructionManual 
        isOpen={isManualOpen} 
        onMouseEnter={handleManualMouseEnter}
        onMouseLeave={handleManualMouseLeave}
        onClose={() => setIsManualOpen(false)}
      />

      <KeyProtocolModal 
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeyUpdated={refreshAuthStatus}
        hasServerKey={protocolStatus?.hasServerKey}
      />
    </div>
  );
}

