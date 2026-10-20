import React from 'react';

export default function InformesReportes({ activos = [], empresas = [] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Informes y Reportes</h2>
        <p className="text-xs text-slate-400">Genera reportes ejecutivos, exportaciones y listas de inventario.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* REPORTE 1 */}
        <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <span className="text-2xl">📊</span>
            <h3 className="text-sm font-bold text-white mt-2">Inventario General de Activos</h3>
            <p className="text-xs text-slate-400 mt-1">Exporta la lista completa de activos registrados con sus números de serie y estado.</p>
          </div>
          <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors">
            Exportar a Excel / CSV
          </button>
        </div>

        {/* REPORTE 2 */}
        <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <span className="text-2xl">📋</span>
            <h3 className="text-sm font-bold text-white mt-2">Asignaciones por Empleado</h3>
            <p className="text-xs text-slate-400 mt-1">Listado detallado de responsabilidad de activos por colaborador y departamento.</p>
          </div>
          <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors">
            Generar Reporte PDF
          </button>
        </div>

        {/* REPORTE 3 */}
        <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <span className="text-2xl">🛡️</span>
            <h3 className="text-sm font-bold text-white mt-2">Garantías y Mantenimiento</h3>
            <p className="text-xs text-slate-400 mt-1">Estado de garantías vigentes, próximas a vencer y activos dados de baja.</p>
          </div>
          <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors">
            Ver Estado de Garantías
          </button>
        </div>
      </div>
    </div>
  );
}