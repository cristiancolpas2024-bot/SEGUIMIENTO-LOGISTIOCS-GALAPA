
import React from 'react';
import { X, Rocket, Database, Globe, Key, CheckCircle } from 'lucide-react';

interface PublishingGuideProps {
  onClose: () => void;
}

const PublishingGuide: React.FC<PublishingGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl border-[8px] border-indigo-600 overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Rocket size={32} />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">GUÍA DE PUBLICACIÓN GRATUITA</h2>
              <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest">Despliegue Profesional paso a paso</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={32} /></button>
        </div>

        <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          
          <div className="flex gap-6">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl h-fit shadow-sm"><Database size={24}/></div>
            <div className="space-y-3">
               <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">1. Configurar Base de Datos (Sheets)</h3>
               <p className="text-xs text-slate-500 leading-relaxed font-bold">
                 Crea una hoja de Google y tienes <span className="text-indigo-600">Extensiones &gt; Apps Script</span>. Pegue el código de <span className="font-mono">GOOGLE_APPS_SCRIPT.gs</span> proporcionado. Implementa como <b>Aplicación Web</b> con acceso para "Cualquier persona".
               </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl h-fit shadow-sm"><Globe size={24}/></div>
            <div className="space-y-3">
               <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">2. Hosting Gratuito (Vercel)</h3>
               <p className="text-xs text-slate-500 leading-relaxed font-bold">
                 Crea una cuenta en <b>vercel.com</b>. Sube tu código a un repositorio privado en GitHub y conéctalo. Vercel compilará y publicará tu app con un dominio HTTPS seguro gratis.
               </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl h-fit shadow-sm"><Key size={24}/></div>
            <div className="space-y-3">
               <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">3. Variables de Entorno</h3>
               <p className="text-xs text-slate-500 leading-relaxed font-bold">
                 En el panel de Vercel, agrega la variable <span className="font-mono bg-slate-100 p-1 px-2 rounded">API_KEY</span> con tu clave de Gemini. Esto permitirá que el asistente de IA funcione en la versión publicada.
               </p>
            </div>
          </div>

          <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
             <div className="flex items-center gap-3 mb-4">
                <CheckCircle size={20} className="text-indigo-600" />
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Recomendación Pro</span>
             </div>
             <p className="text-xs text-slate-600 leading-relaxed font-bold italic">
               "Una vez publicada, tus conductores pueden 'Añadir a pantalla de inicio' desde Chrome para que funcione como una App instalada sin pasar por la Play Store."
             </p>
          </div>
        </div>

        <div className="p-8 border-t bg-slate-50">
           <button onClick={onClose} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">ENTENDIDO, ¡VAMOS A ELLO!</button>
        </div>
      </div>
    </div>
  );
};

export default PublishingGuide;
