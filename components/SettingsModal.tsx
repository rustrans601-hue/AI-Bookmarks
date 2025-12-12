
import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Server, Cpu, Save, Key, ExternalLink, Zap, RefreshCw, Gauge, Clock, HardDrive, AlertTriangle, DatabaseBackup, Archive } from 'lucide-react';
import { getAISettings, saveAISettings } from '../services/storage';
import { OPENROUTER_MODELS, GEMINI_MODELS, AIProvider, DEFAULT_AI_SETTINGS } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [provider, setProvider] = useState<AIProvider>('openrouter');
  
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState('');
  const [openRouterModelsList, setOpenRouterModelsList] = useState(OPENROUTER_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('');

  // Ollama Settings
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('');
  const [ollamaModel, setOllamaModel] = useState('');
  const [ollamaApiKey, setOllamaApiKey] = useState('');
  const [ollamaModelsList, setOllamaModelsList] = useState<{id: string, name: string}[]>([]);
  const [isFetchingOllama, setIsFetchingOllama] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  // Performance Settings
  const [batchSize, setBatchSize] = useState<number>(DEFAULT_AI_SETTINGS.batchSize);
  const [delaySeconds, setDelaySeconds] = useState<number>(5);

  // Backup Settings
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupInterval, setAutoBackupInterval] = useState(24);
  const [lastBackupTime, setLastBackupTime] = useState(0);

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const settings = getAISettings();
      setProvider(settings.provider);
      setOpenRouterApiKey(settings.openRouterApiKey);
      setOpenRouterModel(settings.openRouterModel);
      setGeminiApiKey(settings.geminiApiKey);
      setGeminiModel(settings.geminiModel);
      
      setOllamaBaseUrl(settings.ollamaBaseUrl);
      setOllamaApiKey(settings.ollamaApiKey || '');
      
      const currentOllamaModel = settings.ollamaModel;
      setOllamaModel(currentOllamaModel);
      
      // Initialize list with current model so it appears in the dropdown immediately
      if (currentOllamaModel) {
          setOllamaModelsList([{ id: currentOllamaModel, name: currentOllamaModel }]);
      }

      setBatchSize(settings.batchSize || 1);
      setDelaySeconds((settings.delayBetweenBatches || 5000) / 1000);

      setAutoBackupEnabled(settings.autoBackupEnabled);
      setAutoBackupInterval(settings.autoBackupInterval);
      setLastBackupTime(settings.lastBackupTime);

      setIsSaved(false);
      setOllamaError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && provider === 'openrouter') {
      fetchOpenRouterModels();
    }
  }, [isOpen, provider]);

  const fetchOpenRouterModels = async () => {
    setIsLoadingModels(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          const mapped = data.data.map((m: any) => ({ 
            id: m.id, 
            name: m.name || m.id 
          }));
          
          // Sort: Free models first, then alphabetical
          mapped.sort((a: any, b: any) => {
             const aFree = a.id.includes(':free');
             const bFree = b.id.includes(':free');
             if (aFree && !bFree) return -1;
             if (!aFree && bFree) return 1;
             return a.name.localeCompare(b.name);
          });
          
          setOpenRouterModelsList(mapped);
        }
      }
    } catch (error) {
      console.error("Failed to fetch OpenRouter models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const fetchOllamaModels = async () => {
    if (!ollamaBaseUrl) return;
    setIsFetchingOllama(true);
    setOllamaError(null);

    // Normalize URL helper
    const normalize = (u: string) => {
        let clean = u.trim();
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
            clean = `http://${clean}`;
        }
        return clean.replace(/\/$/, '');
    };

    const tryFetch = async (url: string) => {
        const headers: HeadersInit = {};
        if (ollamaApiKey) {
            headers['Authorization'] = `Bearer ${ollamaApiKey}`;
        }

        const response = await fetch(`${url}/api/tags`, { headers });
        if (!response.ok) throw new Error(`Status: ${response.status} ${response.statusText}`);
        return await response.json();
    };

    try {
        let normalizedUrl = normalize(ollamaBaseUrl);
        // Update state with normalized URL for better UX
        setOllamaBaseUrl(normalizedUrl); 
        
        let data;
        try {
            data = await tryFetch(normalizedUrl);
        } catch (e) {
             // Retry with 127.0.0.1 if localhost failed
             if (normalizedUrl.includes('localhost')) {
                const altUrl = normalizedUrl.replace('localhost', '127.0.0.1');
                try {
                    data = await tryFetch(altUrl);
                    setOllamaBaseUrl(altUrl); // Update field if successful
                } catch (e2) {
                    throw e; // Throw original error
                }
             } else {
                 throw e;
             }
        }

        if (data.models && Array.isArray(data.models)) {
            const mapped = data.models.map((m: any) => ({
                id: m.name, // Usually "model:tag"
                name: m.name
            }));
            
            // If the currently selected model isn't in the new list, add it temporarily
            // so the select box doesn't break or jump to the first item unexpectedly.
            if (ollamaModel && !mapped.find(m => m.id === ollamaModel)) {
                mapped.unshift({ id: ollamaModel, name: `${ollamaModel} (Current)` });
            }

            setOllamaModelsList(mapped);
            
            // Auto-select first real model if absolutely nothing was selected before
            if (mapped.length > 0 && !ollamaModel) {
                setOllamaModel(mapped[0].id);
            }
        }
    } catch (error: any) {
        console.error("Failed to fetch Ollama models:", error);
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
             setOllamaError("Connection failed. Check URL, ensure Ollama is running ('ollama serve') or check CORS.");
        } else if (error.message && error.message.includes('403')) {
             setOllamaError("Access Forbidden (403). If using Auth, check your token.");
        } else if (error.message && error.message.includes('404')) {
             setOllamaError("Not Found (404). Check if Ollama is running on this port.");
        } else {
             setOllamaError(error.message || "Unknown error connecting to Ollama");
        }
    } finally {
        setIsFetchingOllama(false);
    }
  };

  const handleSave = () => {
    saveAISettings({ 
      provider, 
      openRouterApiKey, 
      openRouterModel,
      geminiApiKey,
      geminiModel,
      ollamaBaseUrl,
      ollamaModel,
      ollamaApiKey,
      batchSize,
      delayBetweenBatches: delaySeconds * 1000,
      autoBackupEnabled,
      autoBackupInterval,
      lastBackupTime
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Helper to format seconds into friendly text
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} minutes`;
  };

  const formatLastBackup = (timestamp: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all scale-100 scrollbar-hide">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Provider Toggle */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
              AI Provider
            </label>
            <div className="grid grid-cols-3 bg-gray-100 p-1 rounded-lg gap-1">
                <button
                    onClick={() => setProvider('openrouter')}
                    className={`py-2 text-xs font-medium rounded-md transition-all flex flex-col items-center justify-center gap-1 ${provider === 'openrouter' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Server size={14} /> OpenRouter
                </button>
                <button
                    onClick={() => setProvider('gemini')}
                    className={`py-2 text-xs font-medium rounded-md transition-all flex flex-col items-center justify-center gap-1 ${provider === 'gemini' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Zap size={14} /> Google Gemini
                </button>
                <button
                    onClick={() => setProvider('ollama')}
                    className={`py-2 text-xs font-medium rounded-md transition-all flex flex-col items-center justify-center gap-1 ${provider === 'ollama' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <HardDrive size={14} /> Local (Ollama)
                </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  {provider === 'openrouter' && <Server size={18} className="text-blue-600" />}
                  {provider === 'gemini' && <Zap size={18} className="text-blue-600" />}
                  {provider === 'ollama' && <HardDrive size={18} className="text-blue-600" />}
                  
                  {provider === 'openrouter' && 'OpenRouter Configuration'}
                  {provider === 'gemini' && 'Gemini API Configuration'}
                  {provider === 'ollama' && 'Ollama Configuration'}
                </h3>
                
                {provider === 'openrouter' && (
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        Get API Key <ExternalLink size={10} />
                    </a>
                )}
                {provider === 'gemini' && (
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        Get API Key <ExternalLink size={10} />
                    </a>
                )}
              </div>
              
              {provider === 'ollama' ? (
                 <>
                    {/* Ollama Base URL */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Base URL
                        </label>
                        <input 
                            type="text" 
                            value={ollamaBaseUrl}
                            onChange={(e) => setOllamaBaseUrl(e.target.value)}
                            placeholder="http://localhost:11434"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        />
                        <p className="text-[10px] text-gray-400">Default is http://localhost:11434</p>
                    </div>

                    {/* Ollama API Key (Optional) */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
                            API Key / Token (Optional)
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Key size={16} className="text-gray-400" />
                            </div>
                            <input 
                                type="password" 
                                value={ollamaApiKey}
                                onChange={(e) => setOllamaApiKey(e.target.value)}
                                placeholder="Bearer Token (if using auth)"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            />
                        </div>
                        <p className="text-[10px] text-gray-400">Only required if your Ollama instance uses Authentication.</p>
                    </div>

                    {/* Ollama Model Input */}
                    <div className="space-y-2">
                         <div className="flex items-center justify-between">
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Model Name
                            </label>
                            <button 
                                onClick={fetchOllamaModels} 
                                disabled={isFetchingOllama || !ollamaBaseUrl}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                            >
                                <RefreshCw size={10} className={isFetchingOllama ? "animate-spin" : ""} />
                                {isFetchingOllama ? 'Connecting...' : 'Fetch Models'}
                            </button>
                        </div>
                        <div className="relative">
                            {ollamaModelsList.length > 0 ? (
                                <select 
                                    value={ollamaModel}
                                    onChange={(e) => setOllamaModel(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                    {ollamaModelsList.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <input 
                                    type="text" 
                                    value={ollamaModel}
                                    onChange={(e) => setOllamaModel(e.target.value)}
                                    placeholder="llama3"
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                />
                            )}
                        </div>
                        {ollamaError && (
                            <div className="flex items-start gap-2 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-100">
                                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                <span>{ollamaError}</span>
                            </div>
                        )}
                    </div>
                 </>
              ) : (
                <>
                    {/* API Key Input */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
                        API Key
                        </label>
                        <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Key size={16} className="text-gray-400" />
                        </div>
                        <input 
                            type="password" 
                            value={provider === 'openrouter' ? openRouterApiKey : geminiApiKey}
                            onChange={(e) => provider === 'openrouter' ? setOpenRouterApiKey(e.target.value) : setGeminiApiKey(e.target.value)}
                            placeholder={provider === 'openrouter' ? "sk-or-..." : "AIza..."}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        />
                        </div>
                    </div>

                    {/* Model Select */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
                            AI Model
                            </label>
                            {provider === 'openrouter' && (
                                <button 
                                    onClick={fetchOpenRouterModels} 
                                    disabled={isLoadingModels}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                                >
                                    <RefreshCw size={10} className={isLoadingModels ? "animate-spin" : ""} />
                                    {isLoadingModels ? 'Loading...' : 'Refresh List'}
                                </button>
                            )}
                        </div>
                        <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Cpu size={16} className="text-gray-400" />
                        </div>
                        <select 
                            value={provider === 'openrouter' ? openRouterModel : geminiModel} 
                            onChange={(e) => provider === 'openrouter' ? setOpenRouterModel(e.target.value) : setGeminiModel(e.target.value)}
                            disabled={isLoadingModels}
                            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none truncate disabled:bg-gray-100"
                        >
                            {provider === 'openrouter' 
                                ? openRouterModelsList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                : GEMINI_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                            }
                            {provider === 'openrouter' && <option value="custom">Custom (Specify ID below)</option>}
                        </select>
                        </div>
                    </div>
                </>
              )}
          </div>

          {/* BACKUP SETTINGS */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <DatabaseBackup size={18} className="text-purple-600" />
                Automatic Backup
              </h3>
              
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${autoBackupEnabled ? 'bg-purple-600' : 'bg-gray-200'}`} onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${autoBackupEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                      <span className="text-sm text-gray-700">Enable Auto-Backup</span>
                  </div>
              </div>

              {autoBackupEnabled && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Archive size={12} /> Backup Interval
                        </label>
                        <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                            Every {autoBackupInterval} hour{autoBackupInterval > 1 ? 's' : ''}
                        </span>
                    </div>
                    <input 
                        type="range" 
                        min="1" 
                        max="168" // 1 week
                        step="1"
                        value={autoBackupInterval}
                        onChange={(e) => setAutoBackupInterval(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400">
                        <span>1h</span>
                        <span>12h</span>
                        <span>24h</span>
                        <span>48h</span>
                        <span>1 Week</span>
                    </div>
                    
                    <div className="pt-2 text-xs text-gray-500 flex justify-between border-t border-gray-50 mt-2">
                        <span>Last backup:</span>
                        <span className="font-medium text-gray-700">{formatLastBackup(lastBackupTime)}</span>
                    </div>
                </div>
              )}
          </div>

          {/* PERFORMANCE SETTINGS */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <Gauge size={18} className="text-orange-500" />
                Performance & Rate Limits
              </h3>
              
              {/* Batch Size */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch Size
                    </label>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {batchSize} request{batchSize > 1 ? 's' : ''}
                    </span>
                </div>
                <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    step="1"
                    value={batchSize}
                    onChange={(e) => setBatchSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-gray-400">Lower this if you hit rate limits frequently.</p>
              </div>

              {/* Delay Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Clock size={12} /> Delay Between Batches
                    </label>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {formatTime(delaySeconds)}
                    </span>
                </div>
                <input 
                    type="range" 
                    min="1" 
                    max="3600" 
                    step="1" 
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                    <span>1s</span>
                    <span>15m</span>
                    <span>30m</span>
                    <span>45m</span>
                    <span>60m</span>
                </div>
                <p className="text-xs text-gray-400">Increase this significantly (e.g. 5-10m) for free API tiers.</p>
              </div>
          </div>
            
          <button 
              onClick={handleSave}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${isSaved ? 'bg-green-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
            >
              {isSaved ? (
                <>
                  <ShieldCheck size={16} /> Saved Successfully
                </>
              ) : (
                <>
                  <Save size={16} /> Save Settings
                </>
              )}
          </button>

          <div className="pt-2 border-t border-gray-100">
             <p className="text-xs text-center text-gray-400">
               Your API key is stored locally in your browser.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
