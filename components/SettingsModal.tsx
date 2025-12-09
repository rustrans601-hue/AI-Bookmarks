import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Server, Cpu, Save, Key, ExternalLink, Zap, RefreshCw, Gauge, Clock } from 'lucide-react';
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

  // Performance Settings
  const [batchSize, setBatchSize] = useState<number>(DEFAULT_AI_SETTINGS.batchSize);
  const [delaySeconds, setDelaySeconds] = useState<number>(5);

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const settings = getAISettings();
      setProvider(settings.provider);
      setOpenRouterApiKey(settings.openRouterApiKey);
      setOpenRouterModel(settings.openRouterModel);
      setGeminiApiKey(settings.geminiApiKey);
      setGeminiModel(settings.geminiModel);
      setBatchSize(settings.batchSize || 1);
      setDelaySeconds((settings.delayBetweenBatches || 5000) / 1000);
      setIsSaved(false);
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
      // Keep default list on error
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSave = () => {
    saveAISettings({ 
      provider, 
      openRouterApiKey, 
      openRouterModel,
      geminiApiKey,
      geminiModel,
      batchSize,
      delayBetweenBatches: delaySeconds * 1000
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
            <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setProvider('openrouter')}
                    className={`py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${provider === 'openrouter' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Server size={16} /> OpenRouter
                </button>
                <button
                    onClick={() => setProvider('gemini')}
                    className={`py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${provider === 'gemini' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Zap size={16} /> Google Gemini
                </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  {provider === 'openrouter' ? <Server size={18} className="text-blue-600" /> : <Zap size={18} className="text-blue-600" />}
                  {provider === 'openrouter' ? 'OpenRouter Configuration' : 'Gemini API Configuration'}
                </h3>
                <a 
                  href={provider === 'openrouter' ? "https://openrouter.ai/keys" : "https://aistudio.google.com/app/apikey"}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Get API Key <ExternalLink size={10} />
                </a>
              </div>
              
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