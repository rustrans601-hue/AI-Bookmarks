import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileText, FileSpreadsheet, FileJson, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Bookmark } from '../types';
import { parseFile, exportToCsv, exportToJson, ImportedData } from '../services/importUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Bookmark[];
  onImport: (data: ImportedData[]) => void;
}

export const ImportExportModal: React.FC<Props> = ({ isOpen, onClose, bookmarks, onImport }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ImportedData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    setIsParsing(true);
    setError(null);
    setParsedData([]);
    
    try {
      const data = await parseFile(file);
      if (data.length === 0) {
        setError('No URLs found in the file.');
      } else {
        setParsedData(data);
      }
    } catch (err) {
      setError('Failed to parse file. Please check the format.');
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    onImport(parsedData);
    setParsedData([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Import & Export</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'import' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Import
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'export' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Export
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'import' ? (
            <div className="space-y-6">
              {!parsedData.length ? (
                <>
                  <div 
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".json,.csv,.txt,.xlsx,.xls,.pdf" 
                      onChange={handleFileSelect}
                    />
                    
                    {isParsing ? (
                      <div className="flex flex-col items-center text-blue-600">
                        <Loader2 size={40} className="animate-spin mb-4" />
                        <p className="font-medium">Analyzing file...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500">
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                          <Upload size={32} />
                        </div>
                        <p className="font-semibold text-gray-900 mb-1">Click to upload or drag & drop</p>
                        <p className="text-sm">Supports: PDF, Excel, CSV, TXT, JSON</p>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Supported Formats</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg border border-gray-100">
                             <FileText size={16} className="text-red-500" />
                             <span>PDF Documents</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg border border-gray-100">
                             <FileSpreadsheet size={16} className="text-green-600" />
                             <span>Excel (XLSX)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg border border-gray-100">
                             <FileSpreadsheet size={16} className="text-blue-500" />
                             <span>CSV / TXT</span>
                        </div>
                         <div className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg border border-gray-100">
                             <FileJson size={16} className="text-yellow-500" />
                             <span>JSON Backup</span>
                        </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 text-green-800 rounded-lg border border-green-100">
                    <CheckCircle size={24} />
                    <div>
                      <h4 className="font-semibold">Ready to Import</h4>
                      <p className="text-sm">Found {parsedData.length} valid links.</p>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {parsedData.map((item, idx) => (
                      <div key={idx} className="p-3 border-b border-gray-100 last:border-0 flex items-center justify-between hover:bg-gray-50">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-500 truncate">{item.url}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setParsedData([])}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleConfirmImport}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                    >
                      Import {parsedData.length} Bookmarks
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-blue-50 rounded-full mb-4 text-blue-600">
                   <Download size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Export Your Data</h3>
                <p className="text-sm text-gray-500 mt-1">Download your bookmarks to use in other apps.</p>
              </div>

              <div className="grid gap-4">
                <button 
                  onClick={() => exportToJson(bookmarks)}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group bg-white"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg group-hover:bg-yellow-200 transition-colors">
                      <FileJson size={24} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">JSON Format</div>
                      <div className="text-xs text-gray-500">Best for backup & restoring here</div>
                    </div>
                  </div>
                  <Download size={18} className="text-gray-400 group-hover:text-blue-600" />
                </button>

                <button 
                  onClick={() => exportToCsv(bookmarks)}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group bg-white"
                >
                  <div className="flex items-center gap-4">
                     <div className="p-2 bg-green-100 text-green-700 rounded-lg group-hover:bg-green-200 transition-colors">
                      <FileSpreadsheet size={24} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">CSV Format</div>
                      <div className="text-xs text-gray-500">Compatible with Excel & Sheets</div>
                    </div>
                  </div>
                  <Download size={18} className="text-gray-400 group-hover:text-blue-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
