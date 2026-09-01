import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, CheckCircle2, AlertTriangle, RefreshCw, X, ExternalLink, Cpu } from 'lucide-react';

interface KeyProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated: () => void;
  hasServerKey?: boolean;
}

export function KeyProtocolModal({
  isOpen,
  onClose,
  onKeyUpdated,
  hasServerKey = false,
}: KeyProtocolModalProps) {
  const currentKey = localStorage.getItem('plg_gemini_api_key') || '';
  const currentEmail = localStorage.getItem('plg_user_email') || '';
  const isSystemCore = currentKey === '__SYSTEM_CORE__';

  const [newKey, setNewKey] = useState(isSystemCore ? '' : currentKey);
  const [newEmail, setNewEmail] = useState(currentEmail);
  const [useSystemMode, setUseSystemMode] = useState(isSystemCore);
  const [isValidating, setIsValidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  const maskedKey = currentKey
    ? isSystemCore
      ? 'SYSTEM ENVIRONMENT ALLOCATION'
      : `${currentKey.slice(0, 6)}••••••••••••${currentKey.slice(-4)}`
    : 'NO KEY CONFIGURED';

  const handleTestConnection = async () => {
    setIsValidating(true);
    setStatusMessage(null);

    const testKeyToUse = useSystemMode ? '' : newKey.trim() || currentKey;

    try {
      const response = await fetch('/api/gemini/health-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(testKeyToUse ? { 'x-gemini-api-key': testKeyToUse } : {}),
        },
        body: JSON.stringify({ useServerKey: useSystemMode }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Connection validation failed. Check your API key.');
      }

      setStatusMessage({
        type: 'success',
        text: `PROTOCOL ONLINE: ${data.mode || 'Active'} connected to Gemini 3.7.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Key validation error. Please check quota & credentials.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setStatusMessage(null);

    const keyToSave = useSystemMode ? '__SYSTEM_CORE__' : newKey.trim();
    const emailToSave = newEmail.trim() || (useSystemMode ? 'system-operator@lookingglass.local' : 'operator@lookingglass.local');

    if (!useSystemMode) {
      if (!keyToSave || keyToSave.length < 20) {
        setStatusMessage({
          type: 'error',
          text: 'INVALID CREDENTIAL. Please enter a valid Gemini API Key.',
        });
        setIsValidating(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/gemini/health-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(!useSystemMode ? { 'x-gemini-api-key': keyToSave } : {}),
        },
        body: JSON.stringify({ useServerKey: useSystemMode }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to authenticate key with Gemini 3.7.');
      }

      localStorage.setItem('plg_gemini_api_key', keyToSave);
      localStorage.setItem('plg_user_email', emailToSave);

      setStatusMessage({
        type: 'success',
        text: 'KEY PROTOCOL UPDATED & SYNCHRONIZED SUCCESSFULLY.',
      });

      setTimeout(() => {
        onKeyUpdated();
        onClose();
      }, 600);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Validation rejected. Protocol not updated.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleEject = () => {
    localStorage.removeItem('plg_gemini_api_key');
    localStorage.removeItem('plg_user_email');
    onKeyUpdated();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-[#09090b] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative font-sans text-gray-200"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-cyan-400 transition-colors p-1"
            title="Close Protocol Dialog"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3 mb-6 border-b border-cyan-500/20 pb-4">
            <div className="p-2.5 bg-cyan-950/60 border border-cyan-500/40 rounded-lg text-cyan-400">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase">
                API KEY PROTOCOL CONTROL
              </h2>
              <p className="text-xs font-mono text-cyan-500/70 uppercase tracking-widest">
                Gemini 3.7 Quantum Engine Management
              </p>
            </div>
          </div>

          {/* Current Status Card */}
          <div className="bg-black/60 border border-cyan-500/20 rounded-xl p-4 mb-5 font-mono text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-cyan-500/60 uppercase">ACTIVE PROTOCOL:</span>
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                {isSystemCore ? 'SYSTEM CORE ENVIRONMENT' : 'CUSTOM CREATOR KEY'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-500/60 uppercase">CURRENT KEY:</span>
              <span className="text-cyan-400 font-mono tracking-wider">{maskedKey}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-500/60 uppercase">OPERATOR CALLSIGN:</span>
              <span className="text-gray-300">{currentEmail || 'Unassigned'}</span>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`mb-4 p-3 rounded-lg font-mono text-xs flex items-center space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border border-red-500/40 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span className="leading-tight">{statusMessage.text}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSaveProtocol} className="space-y-4 font-mono text-xs">
            {hasServerKey && (
              <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-200">Use System Server Core Key</span>
                </div>
                <input
                  type="checkbox"
                  checked={useSystemMode}
                  onChange={(e) => setUseSystemMode(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>
            )}

            {!useSystemMode && (
              <div>
                <label className="block text-cyan-500/70 uppercase tracking-wider mb-1">
                  Replace / Enter Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="AIzaSy..."
                    disabled={isValidating}
                    className="w-full bg-black/80 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 placeholder-gray-700 font-mono text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <Key className="w-4 h-4 text-cyan-500/40 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-cyan-500/70 uppercase tracking-wider mb-1">
                Operator Identity (Email / Callsign)
              </label>
              <input
                type="text"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="operator@domain.com"
                disabled={isValidating}
                className="w-full bg-black/80 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 placeholder-gray-700 font-mono text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400/80 hover:text-cyan-300 flex items-center space-x-1"
              >
                <span>GET KEY ON GOOGLE AI STUDIO</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isValidating}
                className="px-3 py-1.5 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 border border-cyan-500/40 rounded text-xs transition-colors flex items-center space-x-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                <span>TEST CONNECTION</span>
              </button>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-cyan-500/20">
              <button
                type="button"
                onClick={handleEject}
                className="px-4 py-2.5 bg-red-950/30 hover:bg-red-900/30 text-red-400 border border-red-500/40 rounded-lg uppercase tracking-wider transition-colors"
              >
                EJECT KEY
              </button>

              <button
                type="submit"
                disabled={isValidating}
                className="flex-1 px-4 py-2.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/50 rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-bold"
              >
                <span>{isValidating ? 'VERIFYING...' : 'APPLY KEY PROTOCOL'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
