import React from 'react';
import { X, ShieldCheck, Server, Cpu } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600" />
              AI Configuration
            </h3>
            
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-gray-500">
                    <Server size={18} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</label>
                    <div className="text-sm font-semibold text-gray-900">Google Gemini</div>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                 <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-gray-500">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Model</label>
                    <div className="text-sm font-semibold text-gray-900">gemini-2.5-flash</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs flex items-start gap-2">
                <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                <span>
                  API access is securely managed by the application environment. No manual key configuration is required.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
             <p className="text-xs text-center text-gray-400">
               OpenRouter and custom keys are disabled in this environment to ensure compatibility with the embedded Google GenAI SDK.
             </p>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
           <button 
             onClick={onClose}
             className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
           >
             Close
           </button>
        </div>
      </div>
    </div>
  );
};
