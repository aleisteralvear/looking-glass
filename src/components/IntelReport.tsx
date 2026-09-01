import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import { Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { LookingGlassQuery } from '../lib/gemini';

interface IntelReportProps {
  imageUrl: string | null;
  reportText: string | null;
  visualError?: string | null;
  textError?: string | null;
  onRetryVisual?: () => void;
  onRetryText?: () => void;
  isScanning?: boolean;
  isRetryingVisual?: boolean;
  isRetryingText?: boolean;
  queryParams?: LookingGlassQuery | null;
}

export function IntelReport({ 
  imageUrl, 
  reportText, 
  visualError, 
  textError, 
  onRetryVisual, 
  onRetryText,
  isScanning,
  isRetryingVisual,
  isRetryingText,
  queryParams
}: IntelReportProps) {
  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `intel-feed-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl mx-auto mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8"
    >
      {/* Visual Telemetry */}
      <div className="lg:col-span-5 space-y-4">
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
          <div className="flex items-center space-x-2 text-cyan-400 font-mono text-sm uppercase tracking-widest">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span>Visual Telemetry Feed</span>
          </div>
          {imageUrl && (
            <button
              onClick={handleDownloadImage}
              className="text-cyan-500 hover:text-cyan-300 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black rounded p-1"
              title="Download Intel Image"
              aria-label="Download Intel Image"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div 
          className="relative aspect-square md:aspect-video lg:aspect-square w-full rounded-xl overflow-hidden border border-cyan-500/20 bg-black/50 shadow-[0_0_30px_rgba(6,182,212,0.1)] group focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black"
          tabIndex={0}
        >
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt="Intel Feed" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : visualError ? (
            <div className="flex flex-col items-center justify-center h-full text-red-400/80 font-mono text-sm p-4 text-center">
              <AlertTriangle className="w-8 h-8 mb-4 opacity-50" />
              <p className="mb-4">{visualError}</p>
              {onRetryVisual && (
                <button 
                  onClick={onRetryVisual}
                  disabled={isScanning || isRetryingVisual}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isRetryingVisual ? 'animate-spin' : ''}`} />
                  <span>{isRetryingVisual ? 'RETRYING...' : 'RETRY VISUAL'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-cyan-500/30 font-mono text-sm">
              [NO VISUAL DATA AVAILABLE]
            </div>
          )}
          
          {/* HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 mix-blend-screen">
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-400/50" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-400/50" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-400/50" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-400/50" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-cyan-400/50 tracking-widest">
              REC // T-MINUS 00:00:00
            </div>
          </div>
        </div>
      </div>

      {/* Text Report */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
          <div className="flex items-center space-x-2 text-purple-400 font-mono text-sm uppercase tracking-widest">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            <span>Classified Intel Report</span>
          </div>
          {reportText && (
            <button
              onClick={() => {
                let metadataHeader = '';
                if (queryParams) {
                  const timestampStr = new Date().toISOString();
                  metadataHeader += `========================================================\n`;
                  metadataHeader += `PROJECT LOOKING GLASS TRAJECTORY RUN ENVELOPE\n`;
                  metadataHeader += `SCAN TIME (UTC): ${timestampStr}\n`;
                  metadataHeader += `INQUIRY WINDOW: ${queryParams.inquiryWindow || 'Blind Scan Mode'}\n`;
                  metadataHeader += `CHOSEN MODES: ${queryParams.modes.length > 0 ? queryParams.modes.join(', ') : 'Unspecified'}\n`;
                  
                  const activeFocuses = queryParams.focuses.filter(f => f !== 'Custom');
                  if (queryParams.focuses.includes('Custom') && queryParams.customFocus) {
                    activeFocuses.push(`Custom (${queryParams.customFocus})`);
                  }
                  metadataHeader += `INQUIRY FOCUS: ${activeFocuses.length > 0 ? activeFocuses.join(', ') : 'Unspecified'}\n`;
                  
                  metadataHeader += `\nTARGET ANCHOR METRICS:\n`;
                  queryParams.targets.forEach((t, i) => {
                    metadataHeader += `  TARGET ${i + 1} (${t.type}):\n`;
                    if (t.type === 'Person') {
                      metadataHeader += `    - Name: ${t.targetName || 'Unspecified'}\n`;
                      metadataHeader += `    - DOB Anchor: ${t.dob || 'Unspecified'}\n`;
                      metadataHeader += `    - Location Anchor: ${t.locationAnchor || 'Unspecified'}\n`;
                      metadataHeader += `    - Temporal Anchor: ${t.temporalAnchor || 'Unspecified'}\n`;
                    } else if (t.type === 'Place') {
                      metadataHeader += `    - Type: ${t.placeType || 'Unspecified'}\n`;
                      metadataHeader += `    - Name: ${t.placeName || 'Unspecified'}\n`;
                      metadataHeader += `    - Coordinates: ${t.placeLocation || 'Unspecified'}\n`;
                      metadataHeader += `    - Temporal: ${t.placeTemporal || 'Unspecified'}\n`;
                    } else if (t.type === 'Other') {
                      metadataHeader += `    - Description Summary: ${t.otherDescription || 'Unspecified'}\n`;
                    }
                  });
                  
                  metadataHeader += `\nEMULATION DIRECTIVE (QUERY):\n`;
                  metadataHeader += `${queryParams.queryBody}\n`;
                  metadataHeader += `========================================================\n\n\n`;
                }

                const finalContent = metadataHeader + reportText;
                const blob = new Blob([finalContent], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `intel-report-${Date.now()}.md`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="text-purple-500 hover:text-purple-300 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black rounded p-1"
              title="Download Intel Report"
              aria-label="Download Intel Report"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div 
          className="bg-black/40 border border-purple-500/20 rounded-xl p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)] h-[600px] overflow-y-auto custom-scrollbar focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black"
          tabIndex={0}
        >
          {reportText ? (
            <div className="markdown-body prose prose-invert prose-cyan max-w-none font-mono text-sm leading-relaxed">
              <Markdown>{reportText}</Markdown>
            </div>
          ) : textError ? (
            <div className="flex flex-col items-center justify-center h-full text-red-400/80 font-mono text-sm p-4 text-center">
              <AlertTriangle className="w-8 h-8 mb-4 opacity-50" />
              <p className="mb-4">{textError}</p>
              {onRetryText && (
                <button 
                  onClick={onRetryText}
                  disabled={isScanning || isRetryingText}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isRetryingText ? 'animate-spin' : ''}`} />
                  <span>{isRetryingText ? 'RETRYING...' : 'RETRY REPORT'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-purple-500/30 font-mono text-sm">
              [DECRYPTING DATA STREAM...]
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
