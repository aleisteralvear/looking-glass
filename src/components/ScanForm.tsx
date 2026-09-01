import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Plus, Trash2, Sparkles } from 'lucide-react';
import { LookingGlassQuery, TargetData, TargetType, optimizeDirective } from '../lib/gemini';

const DEFAULT_QUERY = `Using the target identity anchors as a symbolic reference point, generate a non-deterministic assessment of present life trajectory, dominant themes, likely immediate-future forks, and the highest-probability developmental paths within the specified inquiry window. Distinguish clearly between: (1) current energetic or psychological state, (2) emerging opportunities, (3) probable obstacles, (4) likely decisions or forks, (5) best-aligned actions, and (6) possible outcomes ranked by probability, volatility, and alignment. Interpret 'divine purpose' not as fixed destiny but as the strongest presently available path of meaning, growth, and contribution`;

const MODES = ['Archetypal', 'Probabilistic', 'Reflective', 'Symbolic', 'Quantum', 'Temporal'];
const FOCUSES = ['Divine Purpose', 'Path Trajectory', 'Possible Immediate Outcomes', 'Karmic Resolution', 'Custom'];
const INQUIRY_UNITS = ['Minute(s)', 'Hour(s)', 'Day(s)', 'Month(s)', 'Year(s)'];

interface ScanFormProps {
  isScanning: boolean;
  isFormExpanded: boolean;
  setIsFormExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  onScan: (queryParams: LookingGlassQuery) => void;
  onReset: () => void;
}

export function ScanForm({ isScanning, isFormExpanded, setIsFormExpanded, onScan, onReset }: ScanFormProps) {
  const [targets, setTargets] = useState<TargetData[]>([
    { id: '1', type: 'Person', targetName: '', dob: '', locationAnchor: '', temporalAnchor: '' }
  ]);
  
  const [inquiryWindowNumber, setInquiryWindowNumber] = useState('');
  const [inquiryWindowUnit, setInquiryWindowUnit] = useState('Day(s)');
  
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>([]);
  const [customFocus, setCustomFocus] = useState('');
  
  const [queryBody, setQueryBody] = useState('');
  const [useThinkingMode, setUseThinkingMode] = useState(false);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null);
  const [optimizeLoadingPhase, setOptimizeLoadingPhase] = useState<'analyzing' | 'optimizing'>('analyzing');
  const [loadingDots, setLoadingDots] = useState('');

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isOptimizing) return;
    const interval = setInterval(() => {
      setLoadingDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 1000);
    return () => clearInterval(interval);
  }, [isOptimizing]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasData = targets.some(t => 
        t.targetName || t.dob || t.locationAnchor || t.temporalAnchor || 
        t.placeType || t.placeName || t.placeLocation || t.placeTemporal || 
        t.otherDescription
      ) || inquiryWindowNumber || selectedModes.length > 0 || selectedFocuses.length > 0 || customFocus || queryBody;
      
      if (hasData && !isScanning) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [targets, inquiryWindowNumber, selectedModes, selectedFocuses, customFocus, queryBody, isScanning]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isScanning && formRef.current) {
          formRef.current.requestSubmit();
        }
      } else if (e.key === 'Escape') {
        setIsFormExpanded(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScanning, setIsFormExpanded]);

  const toggleSelection = (item: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addTarget = () => {
    setTargets([...targets, { id: Date.now().toString(), type: 'Person' }]);
  };

  const removeTarget = (id: string) => {
    if (targets.length > 1) {
      setTargets(targets.filter(t => t.id !== id));
    }
  };

  const updateTarget = (id: string, field: keyof TargetData, value: string) => {
    setTargets(targets.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const updateTargetType = (id: string, type: TargetType) => {
    setTargets(targets.map(t => {
      if (t.id === id) {
        return { id: t.id, type }; // Reset fields when type changes
      }
      return t;
    }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const allHeadersEmpty = targets.every(t => {
      if (t.type === 'Person') return !t.targetName?.trim() && !t.dob?.trim() && !t.locationAnchor?.trim() && !t.temporalAnchor?.trim();
      if (t.type === 'Place') return !t.placeType?.trim() && !t.placeName?.trim() && !t.placeLocation?.trim() && !t.placeTemporal?.trim();
      if (t.type === 'Other') return !t.otherDescription?.trim();
      return true;
    }) && !inquiryWindowNumber.trim() && selectedModes.length === 0 && selectedFocuses.length === 0;

    const isDefaultQuery = queryBody.trim() === '';
    const inquiryWindow = inquiryWindowNumber.trim() ? `${inquiryWindowNumber} ${inquiryWindowUnit}` : '';

    const queryParams: LookingGlassQuery = {
      targets,
      inquiryWindow,
      modes: selectedModes,
      focuses: selectedFocuses,
      customFocus,
      queryBody: queryBody.trim() || DEFAULT_QUERY,
      isDefaultQuery,
      allHeadersEmpty,
      useThinkingMode
    };

    onScan(queryParams);
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setOptimizeLoadingPhase('analyzing');
    setLoadingDots('');
    
    const startTime = Date.now();

    // Phase 1: Analyzing (3 seconds)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setOptimizeLoadingPhase('optimizing');
    setLoadingDots('');

    const allHeadersEmpty = targets.every(t => {
      if (t.type === 'Person') return !t.targetName?.trim() && !t.dob?.trim() && !t.locationAnchor?.trim() && !t.temporalAnchor?.trim();
      if (t.type === 'Place') return !t.placeType?.trim() && !t.placeName?.trim() && !t.placeLocation?.trim() && !t.placeTemporal?.trim();
      if (t.type === 'Other') return !t.otherDescription?.trim();
      return true;
    }) && !inquiryWindowNumber.trim() && selectedModes.length === 0 && selectedFocuses.length === 0;

    const isDefaultQuery = queryBody.trim() === '';
    const inquiryWindow = inquiryWindowNumber.trim() ? `${inquiryWindowNumber} ${inquiryWindowUnit}` : '';

    const queryParams: LookingGlassQuery = {
      targets,
      inquiryWindow,
      modes: selectedModes,
      focuses: selectedFocuses,
      customFocus,
      queryBody: queryBody.trim(),
      isDefaultQuery,
      allHeadersEmpty,
      useThinkingMode
    };

    try {
      const result = await optimizeDirective(queryParams);
      
      // Ensure at least 3 seconds for optimizing phase (total 6 seconds)
      const elapsedSinceOptimizingStart = Date.now() - (startTime + 3000);
      if (elapsedSinceOptimizingStart < 3000) {
        await new Promise(resolve => setTimeout(resolve, 3000 - elapsedSinceOptimizingStart));
      }
      
      setOptimizedPrompt(result);
      setShowOptimizeModal(true);
    } catch (error) {
      console.error("Optimization failed", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const acceptOptimized = (initiate: boolean) => {
    if (optimizedPrompt) {
      setQueryBody(optimizedPrompt);
    }
    setShowOptimizeModal(false);
    setOptimizedPrompt(null);
    if (initiate && formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const declineOptimized = () => {
    setShowOptimizeModal(false);
    setOptimizedPrompt(null);
  };

  const declineAndRegenerate = () => {
    setShowOptimizeModal(false);
    setOptimizedPrompt(null);
    handleOptimize();
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="w-full">
      <motion.div
        initial={false}
        animate={{ 
          height: isFormExpanded ? 'auto' : 0, 
          opacity: isFormExpanded ? 1 : 0,
          marginBottom: isFormExpanded ? 24 : 0
        }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Manual Inputs */}
            <div className="space-y-6 bg-black/40 border border-cyan-500/20 p-6 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.05)] max-h-[800px] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2 mb-4 sticky top-0 bg-[#050505]/90 backdrop-blur z-10">
                <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-widest">Target Anchors</h3>
                <button
                  type="button"
                  onClick={addTarget}
                  disabled={isScanning}
                  className="flex items-center space-x-1 text-xs font-mono text-cyan-500 hover:text-cyan-300 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded px-2 py-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>ADD TARGET</span>
                </button>
              </div>
              
              <AnimatePresence>
                {targets.map((target, index) => (
                  <motion.div 
                    key={target.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pb-6 border-b border-cyan-500/10 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-cyan-500/50">TARGET {index + 1}</span>
                      {targets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTarget(target.id)}
                          disabled={isScanning}
                          className="text-red-500/70 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 rounded p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-cyan-500/70 mb-1">Target Type</label>
                      <div className="relative">
                        <select
                          value={target.type}
                          onChange={(e) => updateTargetType(target.id, e.target.value as TargetType)}
                          className="w-full bg-black/60 border border-cyan-500/30 rounded px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors appearance-none"
                          disabled={isScanning}
                        >
                          <option value="Person" className="bg-gray-900">Person</option>
                          <option value="Place" className="bg-gray-900">Place</option>
                          <option value="Other" className="bg-gray-900">Other / Thing</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/50 pointer-events-none" />
                      </div>
                    </div>

                    {target.type === 'Person' && (
                      <>
                        <div>
                          <label className="block text-xs font-mono text-cyan-500/70 mb-1">Target Name</label>
                          <input
                            type="text"
                            value={target.targetName || ''}
                            onChange={(e) => updateTarget(target.id, 'targetName', e.target.value)}
                            placeholder="[Name]"
                            className="w-full bg-black/60 border border-cyan-500/30 rounded px-3 py-2 text-cyan-100 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors"
                            disabled={isScanning}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-cyan-500/70 mb-1">DOB</label>
                          <input
                            type="text"
                            value={target.dob || ''}
                            onChange={(e) => updateTarget(target.id, 'dob', e.target.value)}
                            placeholder="[Date and/or Time]"
                            className="w-full bg-black/60 border border-cyan-500/30 rounded px-3 py-2 text-cyan-100 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors"
                            disabled={isScanning}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-cyan-500/70 mb-1">Location Anchor</label>
                          <input
                            type="text"
                            value={target.locationAnchor || ''}
                            onChange={(e) => updateTarget(target.id, 'locationAnchor', e.target.value)}
                            placeholder="[City, State, Country]"
                            className="w-full bg-black/60 border border-cyan-500/30 rounded px-3 py-2 text-cyan-100 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors"
                            disabled={isScanning}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-cyan-500/70 mb-1">Temporal Anchor</label>
                          <input
                            type="text"
                            value={target.temporalAnchor || ''}
                            onChange={(e) => updateTarget(target.id, 'temporalAnchor', e.target.value)}
                            placeholder="[Date and/or Time]"
                            className="w-full bg-black/60 border border-cyan-500/30 rounded px-3 py-2 text-cyan-100 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors"
                            disabled={isScanning}
                          />
                        </div>
                      </>
                    )}

                    {target.type === 'Place' && (
                      <>
                        <div>
                          <label className="block text-xs font-mono text-cyan-500/70 mb-1">Type</label>
                          <input
                            type="text"
                            value={target.placeType || ''}
                            onChange={(e) => updateTarget(target.id, 'placeType', e.target.value)}
                            placeholder="[Physical Description]"
                            className="w-full bg-black/60 border border-cyan-500/30 rounded px-3 py-2 text-cyan-100 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors"
                            disabled={isScanning}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-cyan-500/70 mb-1">Name of Place</label>
                          <input
                            type="text"
                            value={target.placeName || ''}
                            onChange={(e) => updateTarget(target.id, 'placeName', e.target.value)}
                            placeholder="[Leave blank, if not applicable]"
                            className="w-full bg-black/60 border border-cyan-500/30 rounded px-3 py-2 text-cyan-100 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors"
                            disabled={isScanning}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-cyan-500/70 mb-1">Location</label>
                          <input
                            type="text"
                            value={target.placeLocation || ''}
                            onChange={(e) => updateTarget(target.id, 'placeLocation', e.target.value)}
                            placeholder="[Specify Location or Exact Coordinates]"
                            className="w-full bg-black/60 border border-cyan-500/30 rounded px-3 py-2 text-cyan-100 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors"
                            disabled={isScanning}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-cyan-500/70 mb-1">Temporal Anchor</label>
                          <input
                            type="text"
                            value={target.placeTemporal || ''}
                            onChange={(e) => updateTarget(target.id, 'placeTemporal', e.target.value)}
                            placeholder="[Date and/or Time]"
                            className="w-full bg-black/60 border border-cyan-500/30 rounded px-3 py-2 text-cyan-100 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors"
                            disabled={isScanning}
                          />
                        </div>
                      </>
                    )}

                    {target.type === 'Other' && (
                      <div>
                        <label className="block text-xs font-mono text-cyan-500/70 mb-1">Description</label>
                        <div className="relative">
                          <textarea
                            value={target.otherDescription || ''}
                            onChange={(e) => {
                              if (e.target.value.length <= 300) {
                                updateTarget(target.id, 'otherDescription', e.target.value);
                              }
                            }}
                            placeholder="[Describe Target] or [Describe Other Target]"
                            className="w-full h-32 bg-black/60 border border-cyan-500/30 rounded px-3 py-2 text-cyan-100 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors resize-none custom-scrollbar"
                            disabled={isScanning}
                          />
                          <div className={`absolute bottom-2 right-2 text-[10px] font-mono ${(target.otherDescription?.length || 0) >= 300 ? 'text-red-400' : 'text-cyan-500/50'}`}>
                            {target.otherDescription?.length || 0} / 300
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Selection Inputs */}
            <div className="space-y-6 bg-black/40 border border-purple-500/20 p-6 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.05)]">
              <h3 className="text-purple-400 font-mono text-sm uppercase tracking-widest border-b border-purple-500/30 pb-2 mb-4">Scan Parameters</h3>
              
              <div>
                <label className="block text-xs font-mono text-purple-500/70 mb-1">Choose Mode</label>
                <span className="text-[10px] font-mono text-gray-500 block mb-2">SELECT ONE OR MORE</span>
                <div className="flex flex-wrap gap-2">
                  {MODES.map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => toggleSelection(mode, selectedModes, setSelectedModes)}
                      disabled={isScanning}
                      aria-pressed={selectedModes.includes(mode)}
                      className={`px-3 py-1.5 rounded font-mono text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black ${
                        selectedModes.includes(mode)
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                          : 'bg-black/60 text-gray-500 border border-gray-800 hover:border-purple-500/30 hover:text-purple-400'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-purple-500/70 mb-1">Primary Focus</label>
                <span className="text-[10px] font-mono text-gray-500 block mb-2">SELECT ONE OR MORE</span>
                <div className="flex flex-wrap gap-2">
                  {FOCUSES.map(focus => (
                    <button
                      key={focus}
                      type="button"
                      onClick={() => toggleSelection(focus, selectedFocuses, setSelectedFocuses)}
                      disabled={isScanning}
                      aria-pressed={selectedFocuses.includes(focus)}
                      className={`px-3 py-1.5 rounded font-mono text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black ${
                        selectedFocuses.includes(focus)
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                          : 'bg-black/60 text-gray-500 border border-gray-800 hover:border-purple-500/30 hover:text-purple-400'
                      }`}
                    >
                      {focus}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-mono text-purple-500/70 mb-1">Inquiry Window</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inquiryWindowNumber}
                    onChange={(e) => setInquiryWindowNumber(e.target.value)}
                    placeholder="[Number]"
                    className="w-1/2 bg-black/60 border border-purple-500/30 rounded px-3 py-2 text-purple-100 placeholder-gray-600 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors"
                    disabled={isScanning}
                  />
                  <div className="relative w-1/2">
                    <select
                      value={inquiryWindowUnit}
                      onChange={(e) => setInquiryWindowUnit(e.target.value)}
                      className="w-full h-full bg-black/60 border border-purple-500/30 rounded px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors appearance-none"
                      disabled={isScanning}
                    >
                      {INQUIRY_UNITS.map(unit => (
                        <option key={unit} value={unit} className="bg-gray-900">{unit}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500/50 pointer-events-none" />
                  </div>
                </div>
              </div>

              {selectedFocuses.includes('Custom') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-2"
                >
                  <label className="block text-xs font-mono text-purple-500/70 mb-1">Custom Focus Directive</label>
                  <input
                    type="text"
                    value={customFocus}
                    onChange={(e) => setCustomFocus(e.target.value)}
                    placeholder="[Enter custom parameters]"
                    className="w-full bg-black/60 border border-purple-500/30 rounded px-3 py-2 text-purple-100 placeholder-gray-600 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors"
                    disabled={isScanning}
                  />
                </motion.div>
              )}
            </div>
          </div>

          <div className="bg-black/40 border border-cyan-500/20 p-6 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.05)]">
             <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2 mb-4">
               <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-widest">Query Directive</h3>
               <label className="flex items-center space-x-2 cursor-pointer group">
                 <div className="relative flex items-center">
                   <input 
                     type="checkbox" 
                     className="sr-only peer" 
                     checked={useThinkingMode}
                     onChange={(e) => setUseThinkingMode(e.target.checked)}
                     disabled={isScanning}
                   />
                   <div className={`w-8 h-4 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-cyan-400 peer-focus:ring-offset-2 peer-focus:ring-offset-black ${useThinkingMode ? 'bg-cyan-500' : 'bg-gray-700'}`}></div>
                   <div className={`absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${useThinkingMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                 </div>
                 <span className="text-xs font-mono text-cyan-500/70 group-hover:text-cyan-400 transition-colors">Deep Scan (Thinking Mode)</span>
               </label>
             </div>
             <textarea
                value={queryBody}
                onChange={(e) => setQueryBody(e.target.value)}
                placeholder={DEFAULT_QUERY}
                className="w-full h-48 bg-black/60 border border-cyan-500/30 rounded px-4 py-3 text-cyan-100 placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black font-mono text-sm transition-colors resize-none custom-scrollbar"
                disabled={isScanning || isOptimizing}
             />
             <div className="flex justify-end mt-2">
               <button
                 type="button"
                 onClick={handleOptimize}
                 disabled={isScanning || isOptimizing}
                 className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded font-mono text-xs uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isOptimizing ? (
                   <span className="inline-block w-32 text-left">
                     {optimizeLoadingPhase === 'analyzing' ? 'Analyzing' : 'Optimizing Directive'}{loadingDots}
                   </span>
                 ) : (
                   <>
                     <Sparkles className="w-3 h-3" />
                     <span>Optimize Directive</span>
                   </>
                 )}
               </button>
             </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 flex flex-col items-center">
        {isFormExpanded ? (
        <button
          type="submit"
          disabled={isScanning}
          className={`relative group overflow-hidden px-12 py-4 rounded font-mono text-lg uppercase tracking-[0.2em] transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black ${
            isScanning 
              ? 'bg-gray-800/50 text-gray-500 border border-gray-700 cursor-not-allowed' 
              : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
          }`}
        >
          {!isScanning && (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          )}
          {isScanning ? 'INITIATING...' : 'INITIATE'}
        </button>
        ) : (
          <button
            type="button"
            onClick={onReset}
            disabled={isScanning}
            className={`relative group overflow-hidden px-12 py-4 rounded font-mono text-lg uppercase tracking-[0.2em] transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black ${
              isScanning 
                ? 'bg-gray-800/50 text-gray-500 border border-gray-700 cursor-not-allowed' 
                : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/50'
            }`}
          >
            {!isScanning && (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-purple-400/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            )}
            {isScanning ? 'SCANNING...' : 'MODIFY PARAMETERS'}
          </button>
        )}
        <div className="mt-4 text-center">
          <p className="text-xs font-mono text-gray-500">
            <span className="text-purple-400">WARNING:</span> Accessing restricted timelines may cause cognitive dissonance.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showOptimizeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#050505] border border-cyan-500/40 rounded-xl p-6 max-w-2xl w-full shadow-[0_0_50px_rgba(6,182,212,0.15)]"
            >
              <h3 className="text-cyan-400 font-mono text-lg uppercase tracking-widest mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Optimized Directive Preview
              </h3>
              
              <div className="bg-black/60 border border-cyan-500/20 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto custom-scrollbar">
                <p className="text-cyan-100 font-mono text-sm whitespace-pre-wrap">
                  {optimizedPrompt}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => acceptOptimized(false)}
                  className="px-4 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 rounded font-mono text-xs uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => acceptOptimized(true)}
                  className="px-4 py-3 bg-cyan-500 text-black hover:bg-cyan-400 rounded font-mono text-xs uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black font-bold"
                >
                  Accept & Initiate
                </button>
                <button
                  type="button"
                  onClick={declineOptimized}
                  className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded font-mono text-xs uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-black"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={declineAndRegenerate}
                  className="px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded font-mono text-xs uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-black"
                >
                  Decline & Regenerate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
