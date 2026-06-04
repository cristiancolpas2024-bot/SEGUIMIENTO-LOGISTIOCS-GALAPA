
import React, { useState, useMemo } from 'react';
import { X, ExternalLink, FileText, Info, Image as ImageIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getDriveDirectLink, isImageLink } from '../utils';

interface DocumentItem {
  url: string;
  label?: string;
}

interface DocumentViewerProps {
  url: string | string[] | DocumentItem[];
  title: string;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ url, title, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const items = useMemo((): DocumentItem[] => {
    if (Array.isArray(url)) {
      return url.map(item => typeof item === 'string' ? { url: item } : item);
    }
    return url.split(',').filter(u => u.trim() !== '').map(u => ({ url: u.trim() }));
  }, [url]);

  const currentItem = items[currentIndex] || { url: '' };
  const currentUrl = currentItem.url;
  
  const isBase64 = currentUrl.startsWith('data:image');
  const isGoogleDrive = currentUrl.includes('drive.google.com');
  const isImage = isImageLink(currentUrl);

  const getFrameUrl = (targetUrl: string) => {
    if (!targetUrl.includes('drive.google.com')) return targetUrl;
    if (isImageLink(targetUrl)) return getDriveDirectLink(targetUrl);
    return targetUrl.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
  };

  const displayUrl = getFrameUrl(currentUrl);

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[60] p-0 md:p-6">
      <div className="bg-white w-full h-full md:max-w-6xl md:h-[90vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 border-[6px] border-white/20">
        
        {/* Header del Visor */}
        <div className="bg-[#0f172a] text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#4f46e5] rounded-2xl shadow-lg">
              {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tighter truncate max-w-[200px] md:max-w-md">
                {title} {items.length > 1 ? `(${currentIndex + 1}/${items.length})` : ''}
              </h2>
              {currentItem.label && (
                <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mt-0.5">
                  {currentItem.label}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isBase64 && currentUrl && (
              <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all" title="Abrir en pestaña nueva">
                <ExternalLink size={20} />
              </a>
            )}
            <button onClick={onClose} className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Área de Visualización */}
        <div className="flex-grow bg-slate-50 relative flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
              <Loader2 size={40} className="text-indigo-600 animate-spin mb-3" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando Evidencia...</p>
            </div>
          )}

          {items.length > 1 && (
            <>
              <button 
                onClick={() => { setCurrentIndex(prev => (prev > 0 ? prev - 1 : items.length - 1)); setLoading(true); }}
                className="absolute left-4 z-20 p-4 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all shadow-xl"
              >
                <ChevronLeft size={32} />
              </button>
              <button 
                onClick={() => { setCurrentIndex(prev => (prev < items.length - 1 ? prev + 1 : 0)); setLoading(true); }}
                className="absolute right-4 z-20 p-4 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all shadow-xl"
              >
                <ChevronRight size={32} />
              </button>
              
              {/* Thumbnails/Labels selector at bottom */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/40 backdrop-blur-md p-2 rounded-2xl">
                {items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setCurrentIndex(idx); setLoading(true); }}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentIndex === idx ? 'bg-white text-slate-900 shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                  >
                    {item.label || `Imagen ${idx + 1}`}
                  </button>
                ))}
              </div>
            </>
          )}

          {isImage ? (
            <div className="w-full h-full p-4 md:p-10 flex items-center justify-center">
              <img 
                key={displayUrl}
                src={displayUrl} 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl bg-white border-8 border-white transition-opacity duration-500"
                alt={title}
                referrerPolicy="no-referrer"
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            </div>
          ) : (
            <iframe 
              key={displayUrl}
              src={displayUrl} 
              className="w-full h-full border-none bg-white" 
              title={title}
              onLoad={() => setLoading(false)}
            />
          )}
        </div>

        {/* Footer del Visor */}
        <div className="p-4 bg-white border-t flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          <Info size={14} className="text-indigo-500" />
          VISOR DE DOCUMENTACIÓN LEGAL - BQA
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
