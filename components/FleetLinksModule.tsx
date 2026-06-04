import React from 'react';
import { ExternalLink, Link as LinkIcon, Globe, FileText, Layout, Database, Share2, AlertCircle, BarChart3, ClipboardCheck, Eye, MapPin, Layers } from 'lucide-react';

interface FleetLink {
  id: string;
  title: string;
  description: string;
  url: string;
  category: 'OPERATIVO' | 'DOCUMENTAL' | 'GESTIÓN' | 'OTROS';
  icon: React.ReactNode;
}

const FleetLinksModule: React.FC = () => {
  const links: FleetLink[] = [
    {
      id: '1',
      title: 'Alertas Base Documental',
      description: 'Seguimiento detallado de vencimientos y alertas de documentos de la flota.',
      url: 'https://docs.google.com/spreadsheets/d/1WPSBKnrEHOMeOzctsMHVgImmwhzx-s5Z1aOD-P0YTiY/edit?usp=sharing',
      category: 'DOCUMENTAL',
      icon: <AlertCircle className="text-rose-500" size={24} />
    },
    {
      id: '2',
      title: 'Flota.Gerencia',
      description: 'Consolidado gerencial de indicadores y gestión de activos.',
      url: 'https://docs.google.com/spreadsheets/d/1mE8aBo0DG5Lk3GUHAGegwuBnk4vEhjOA_xj2lvvtcV0/edit?gid=1999173033#gid=1999173033',
      category: 'GESTIÓN',
      icon: <BarChart3 className="text-indigo-500" size={24} />
    },
    {
      id: '3',
      title: 'Forms Disponibilidad Regional',
      description: 'Formulario para el reporte de disponibilidad de equipos a nivel regional.',
      url: 'https://docs.google.com/forms/d/e/1FAIpQLSdqlA-guftPe-6Gql96Y0qQJzd45ttBrAdgqz1pcklhvMqpQA/viewform',
      category: 'OPERATIVO',
      icon: <MapPin className="text-blue-500" size={24} />
    },
    {
      id: '4',
      title: 'Visual Check List',
      description: 'Reporte visual interactivo de inspecciones y listas de chequeo.',
      url: 'https://app.powerbi.com/view?r=eyJrIjoiZWFkM2ZiZWItOTUwMi00MGEwLThhNTYtZjg0ZTZlMzc2MThiIiwidCI6IjUxMzdjY2UxLTAzMTUtNDU5Zi04NGU5LTFmMTViMmZkMGU3OSIsImMiOjR9',
      category: 'OPERATIVO',
      icon: <Eye className="text-amber-500" size={24} />
    },
    {
      id: '5',
      title: 'Check List Barranquilla',
      description: 'Panel de control de listas de chequeo específicas para Barranquilla.',
      url: 'https://lookerstudio.google.com/reporting/53d59e9f-6fd3-4330-b6dc-b561d64a92d6/page/fpZhF',
      category: 'OPERATIVO',
      icon: <ClipboardCheck className="text-emerald-500" size={24} />
    }
  ];

  const categories = ['TODOS', 'OPERATIVO', 'DOCUMENTAL', 'GESTIÓN', 'OTROS'];
  const [activeCategory, setActiveCategory] = React.useState('TODOS');

  const filteredLinks = activeCategory === 'TODOS' 
    ? links 
    : links.filter(link => link.category === activeCategory);

  return (
    <div className="max-w-md mx-auto space-y-8 pb-20 animate-in fade-in duration-700 flex flex-col items-center">
      {/* Profile Section */}
      <div className="flex flex-col items-center text-center space-y-4 mb-4">
        <div className="w-24 h-24 bg-white rounded-full shadow-2xl p-1 border-4 border-white overflow-hidden group">
          <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform duration-500">
            <LinkIcon size={40} />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">@FlotaBarranquilla</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Enlaces de Gestión</p>
        </div>
      </div>

      {/* Category Filter (Bubble Style) */}
      <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto max-w-full no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeCategory === cat 
                ? 'bg-[#0f172a] text-white shadow-lg shadow-slate-200' 
                : 'text-slate-400 hover:bg-white hover:text-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Linktree Style List */}
      <div className="w-full space-y-3 md:space-y-4">
        {filteredLinks.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative w-full bg-[#0f172a] hover:bg-[#1e293b] p-4 md:p-5 rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center text-center overflow-hidden border border-white/10 hover:border-indigo-500"
          >
            <div className="absolute left-4 md:left-6 text-indigo-400 group-hover:text-white group-hover:scale-125 transition-all duration-500">
              {React.cloneElement(link.icon as React.ReactElement, { size: 18 })}
            </div>
            
            <h3 className="text-[11px] md:text-sm font-black text-white uppercase tracking-widest relative z-10 px-8">
              {link.title}
            </h3>

            <div className="absolute right-4 md:right-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <ExternalLink size={14} className="text-white md:size-4" />
            </div>
          </a>
        ))}
      </div>

      {filteredLinks.length === 0 && (
        <div className="text-center py-10 w-full">
          <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No hay enlaces disponibles</p>
        </div>
      )}

      {/* Footer Logo */}
      <div className="pt-10 flex flex-col items-center gap-2 opacity-30 grayscale">
         <div className="flex items-center gap-2 font-black text-slate-900 uppercase tracking-tighter text-xl">
            <Layers size={24} />
            <span>Linktree</span>
         </div>
      </div>
    </div>
  );
};

export default FleetLinksModule;
