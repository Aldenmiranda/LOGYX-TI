import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import EtiquetaActivoFijo from './EtiquetaActivoFijo';

export default function ReimpresionQR() {
  const [equipos, setEquipos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);

  // Escuchar equipos desde Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'equipos'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEquipos(docs);
    });
    return () => unsub();
  }, []);

  // Filtrado en tiempo real
  const equiposFiltrados = equipos.filter((eq) => {
    const termino = busqueda.toLowerCase();
    return (
      (eq.codigo && eq.codigo.toLowerCase().includes(termino)) ||
      (eq.serie && eq.serie.toLowerCase().includes(termino)) ||
      (eq.marca && eq.marca.toLowerCase().includes(termino)) ||
      (eq.modelo && eq.modelo.toLowerCase().includes(termino)) ||
      (eq.asignadoA && eq.asignadoA.toLowerCase().includes(termino))
    );
  });

  // Preparar etiqueta para Registro General del Equipo
  const handleImprimirQRRegistro = (eq) => {
    setEquipoSeleccionado({
      codigo: eq.codigo || 'S/C',
      serie: eq.serie || 'N/A',
      marca: eq.marca || '',
      modelo: eq.modelo || '',
      empresaNombre: eq.empresaNombre || 'LOGIX IT',
      empresaLogo: eq.empresaLogo || '',
      categoriaNombre: eq.categoriaNombre || eq.categoriaPrincipal || 'SISTEMAS / TI',
      ubicacion: eq.ubicacion || 'ALMACÉN GENERAL',
      qrUrl: eq.qrUrl || `${window.location.origin}/?codigo=${eq.codigo}`
    });
  };

  // Preparar etiqueta personalizada para Custodia / Asignación
  const handleImprimirQRAsignacion = (eq) => {
    setEquipoSeleccionado({
      codigo: eq.codigo || 'S/C',
      serie: eq.serie || 'N/A',
      marca: eq.marca || '',
      modelo: eq.modelo || '',
      empresaNombre: eq.empresaNombre || 'LOGIX IT',
      empresaLogo: eq.empresaLogo || '',
      custodioNombre: eq.asignadoA.toUpperCase(),
      departamento: (eq.departamento || 'GENERAL').toUpperCase(),
      puesto: (eq.puesto || 'PERSONAL').toUpperCase(),
      ubicacion: `ASIGNADO A: ${eq.asignadoA.toUpperCase()}`,
      qrUrl: eq.qrUrl || `${window.location.origin}/?codigo=${eq.codigo}`
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl max-w-5xl mx-auto text-slate-100 space-y-6">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            🏷️ Reimpresión de Etiquetas QR
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Genera e imprime etiquetas tanto de Registro Físico como de Asignación / Custodios
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full self-start sm:self-auto">
          {equipos.length} Activos en Sistema
        </span>
      </div>

      {/* Buscador en tiempo real */}
      <div className="relative">
        <span className="absolute left-4 top-3.5 text-slate-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Buscar por Código, Serie (S/N), Marca, Modelo o Custodio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium transition"
        />
      </div>

      {/* Tabla de Activos con doble opción de reimpresión */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-4">Código / Serie</th>
              <th className="p-4">Equipo</th>
              <th className="p-4">Estado / Asignación</th>
              <th className="p-4 text-center">Opciones de Etiqueta QR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {equiposFiltrados.length > 0 ? (
              equiposFiltrados.map((eq) => {
                const tieneCustodio = eq.asignadoA && eq.asignadoA !== 'Sin Asignar';

                return (
                  <tr key={eq.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <span className="font-mono font-bold text-blue-400 block text-xs">
                        {eq.codigo || 'S/C'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        S/N: {eq.serie || 'N/A'}
                      </span>
                    </td>

                    <td className="p-4 font-bold text-white">
                      <div>{eq.marca} {eq.modelo}</div>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {eq.empresaNombre || 'LOGIX IT'}
                      </span>
                    </td>

                    <td className="p-4">
                      {tieneCustodio ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
                            👤 {eq.asignadoA}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {eq.departamento || 'Depto. No especificado'}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-xs">
                            📦 En Almacén / Disponible
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {eq.ubicacion || 'Sin Ubicación'}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Botón QR de Registro */}
                        <button
                          onClick={() => handleImprimirQRRegistro(eq)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-[10px] transition cursor-pointer flex items-center gap-1"
                          title="Imprimir QR genérico del activo registrado"
                        >
                          📦 QR Activo
                        </button>

                        {/* Botón QR de Asignación */}
                        <button
                          onClick={() => handleImprimirQRAsignacion(eq)}
                          disabled={!tieneCustodio}
                          className={`font-bold px-3 py-1.5 rounded-xl text-[10px] transition flex items-center gap-1 ${
                            tieneCustodio
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 cursor-pointer'
                              : 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                          }`}
                          title={tieneCustodio ? "Imprimir QR con datos del custodio" : "El equipo no está asignado"}
                        >
                          👤 QR Asignación
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="text-center p-8 text-slate-500 italic">
                  No se encontraron activos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Etiqueta reutilizable */}
      {equipoSeleccionado && (
        <EtiquetaActivoFijo
          datos={equipoSeleccionado}
          onClose={() => setEquipoSeleccionado(null)}
        />
      )}

    </div>
  );
}