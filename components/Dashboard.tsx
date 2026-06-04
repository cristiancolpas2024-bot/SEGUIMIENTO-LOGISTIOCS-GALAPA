
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Truck, Users, Gavel, ClipboardList, TrendingUp, 
  AlertTriangle, CheckCircle2, Clock, Building2,
  Droplets, Sparkles, Disc
} from 'lucide-react';
import { Vehicle, Driver, Fine, Report, Calibration } from '../types';

interface DashboardProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  fines: Fine[];
  reports: Report[];
  calibrations: Calibration[];
  onNavigate?: (view: any) => void;
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC<DashboardProps> = ({ 
  vehicles, drivers, fines, reports, calibrations, onNavigate
}) => {

  // 1. Vehicles by CD
  const vehiclesByCd = useMemo(() => {
    const counts: Record<string, number> = {};
    vehicles.forEach(v => {
      const cd = v.cd || 'GENERAL';
      counts[cd] = (counts[cd] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [vehicles]);

  // 2. Fines Status
  const finesStatus = useMemo(() => {
    const pending = fines.filter(f => f.status === 'PENDIENTE').length;
    const paid = fines.filter(f => f.status === 'PAGADO').length;
    return [
      { name: 'Pendientes', value: pending },
      { name: 'Pagados', value: paid }
    ];
  }, [fines]);

  // 3. Reports Status
  const reportsStatus = useMemo(() => {
    const open = reports.filter(r => r.status === 'ABIERTO').length;
    const closed = reports.filter(r => r.status === 'CERRADO').length;
    return [
      { name: 'Abiertos', value: open },
      { name: 'Cerrados', value: closed }
    ];
  }, [reports]);

  // 5. Document Warnings
  const docWarnings = useMemo(() => {
    const soat = vehicles.filter(v => v.soat.status !== 'active').length;
    const rtm = vehicles.filter(v => v.rtm.status !== 'active').length;
    const ext = vehicles.filter(v => v.extinguisher.status !== 'active').length;
    const license = drivers.filter(d => d.license.status !== 'active').length;
    return [
      { name: 'SOAT', value: soat },
      { name: 'RTM', value: rtm },
      { name: 'Extintor', value: ext },
      { name: 'Licencia', value: license }
    ];
  }, [vehicles, drivers]);

  const stats = [
    { label: 'Total Vehículos', value: vehicles.length, icon: <Truck className="text-indigo-600" />, color: 'bg-indigo-50', view: 'vehiculos' },
    { label: 'Conductores Activos', value: drivers.length, icon: <Users className="text-emerald-600" />, color: 'bg-emerald-50', view: 'conductores' },
    { label: 'Comparendos Pendientes', value: fines.filter(f => f.status === 'PENDIENTE').length, icon: <Gavel className="text-rose-600" />, color: 'bg-rose-50', view: 'comparendos' },
    { label: 'Novedades Abiertas', value: reports.filter(r => r.status === 'ABIERTO').length, icon: <ClipboardList className="text-amber-600" />, color: 'bg-amber-50', view: 'novedades' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 md:px-0">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3 md:gap-4">
            <TrendingUp size={32} className="text-indigo-600 md:size-10" /> Tablero de Indicadores
          </h2>
          <p className="text-[9px] md:text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] ml-11 md:ml-14">Resumen ejecutivo y métricas de gestión</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            onClick={() => onNavigate && onNavigate(stat.view)}
            className="bg-white p-3 md:p-6 rounded-xl md:rounded-[2.5rem] border border-slate-200 shadow-lg hover:shadow-xl transition-all group cursor-pointer active:scale-95"
          >
            <div className="flex flex-col md:flex-row items-center md:items-center gap-1.5 md:gap-4 text-center md:text-left">
              <div className={`p-2.5 md:p-4 ${stat.color} rounded-lg md:rounded-2xl group-hover:scale-110 transition-transform`}>
                {React.cloneElement(stat.icon as React.ReactElement, { size: 18, className: 'md:size-6' })}
              </div>
              <div>
                <p className="text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-lg md:text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        
        {/* Vehicles by CD */}
        <div className="lg:col-span-2 bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-lg overflow-hidden">
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <Building2 className="text-indigo-600" size={18} />
            <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest">Vehículos por Centro (C.D.)</h3>
          </div>
          <div className="h-[250px] md:h-[300px] overflow-x-auto">
            <div style={{ minWidth: vehiclesByCd.length > 5 ? `${vehiclesByCd.length * 80}px` : '100%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehiclesByCd}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} />
                  <YAxis fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Fines & Reports Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:col-span-2">
          
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-lg flex flex-col items-center">
            <div className="w-full flex items-center gap-3 mb-8">
              <Gavel className="text-rose-600" size={20} />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Estado Comparendos</h3>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={finesStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {finesStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#10b981'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-lg flex flex-col items-center">
            <div className="w-full flex items-center gap-3 mb-8">
              <ClipboardList className="text-amber-600" size={20} />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Estado Novedades</h3>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportsStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {reportsStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Document Alerts */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-lg">
          <div className="flex items-center gap-3 mb-8">
            <AlertTriangle className="text-rose-500" size={20} />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Alertas Documentales (Vencidos/Próximos)</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {docWarnings.map((warning, idx) => (
              <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{warning.name}</span>
                <span className={`text-3xl font-black ${warning.value > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {warning.value}
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Alertas</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
