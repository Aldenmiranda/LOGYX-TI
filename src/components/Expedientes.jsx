import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const convertirABase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export default function Expedientes() {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSel, setEmpresaSel] = useState('');
  const [equipos, setEquipos] = useState([]);
  const [equipoSel, setEquipoSel] = useState(null);

  // Modal rápido de carga/reemplazo desde el mismo expediente
  const [mostrarModalCarga, setMostrarModalCarga] = useState(false);
  const [tipoDocCarga, setTipoDocCarga] = useState('Factura'); // Factura | Garantia | ActaEntrega
  const [archivo, setArchivo] = useState(null);
  const [numeroRef, setNumeroRef] = useState('');
  const [fechaDoc, setFechaDoc] = useState(new Date().toISOString().split('T')[0]);
  const [subiendo, setSubiendo] = useState(false);

  // Toast Notificaciones
  const [notificacion, setNotificacion] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const empSnap = await getDocs(collection(db, 'empresas'));
        setEmpresas(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const eqSnap = await getDocs(collection(db, 'equipos'));
        setEquipos(eqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error al cargar datos:", err);
      }
    };
    cargarDatos();
  }, []);

  const mostrarToast = (mensaje, tipo = 'exito') => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 4000);
  };

  const setFechaHoy = () => {
    setFechaDoc(new Date().toISOString().split('T')[0]);
  };

  // Filtrado de equipos por empresa
  const equiposFiltrados = equipos.filter(e => 
    !empresaSel || e.empresaId === empresaSel || e.empresa === empresaSel || e.empresaNombre === empresaSel
  );

  const abrirModalParaDoc = (tipo) => {
    setTipoDocCarga(tipo);
    setArchivo(null);
    setNumeroRef('');
    setFechaDoc(new Date().toISOString().split('T')[0]);
    setMostrarModalCarga(true);
  };

  const handleSubirODocumento = async (e) => {
    e.preventDefault();
    if (!equipoSel || !archivo) {
      mostrarToast("Selecciona un archivo válido.", "error");
      return;
    }

    const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

    if (!APPS_SCRIPT_URL) {
      mostrarToast("URL de Apps Script no configurada en .env (VITE_APPS_SCRIPT_URL).", "error");
      return;
    }

    setSubiendo(true);
    try {
      const base64Data = await convertirABase64(archivo);
      const payload = {
        codigoEquipo: equipoSel.codigo,
        codigo: equipoSel.codigo,
        fileName: `${tipoDocCarga.toUpperCase()}_${equipoSel.codigo}_${Date.now()}_${archivo.name}`,
        mimeType: archivo.type || 'application/pdf',
        base64Data,
        tipoDoc: tipoDocCarga,
        tipoArchivo: 'documento'
      };

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.status === 'success' || data.driveUrl || data.fileUrl) {
        const driveUrlResult = data.driveUrl || data.fileUrl || data.url;
        const docKey = tipoDocCarga === 'Factura' ? 'docFactura' : tipoDocCarga === 'Garantia' ? 'docGarantia' : 'docActaEntrega';
        
        const nuevoDocumento = {
          url: driveUrlResult,
          fileId: data.fileId || '',
          nombreArchivo: archivo.name,
          numeroReferencia: numeroRef.trim(),
          fechaDocumento: fechaDoc,
          fechaCarga: new Date().toISOString().split('T')[0]
        };

        const updatePayload = {
          [`expediente.${docKey}`]: nuevoDocumento
        };

        // Si el documento que subimos es el Acta de Entrega, actualizamos también los accesos rápidos principales
        if (tipoDocCarga === 'ActaEntrega') {
          updatePayload.tieneActaEntrega = true;
          updatePayload.actaDriveUrl = driveUrlResult;
          updatePayload.actaFechaRegistro = fechaDoc;
          updatePayload.ultimaActaFolio = numeroRef.trim();
        } else if (tipoDocCarga === 'Factura') {
          updatePayload.facturaDriveUrl = driveUrlResult;
        } else if (tipoDocCarga === 'Garantia') {
          updatePayload.garantiaDriveUrl = driveUrlResult;
        }

        const equipoRef = doc(db, 'equipos', equipoSel.id);
        await updateDoc(equipoRef, updatePayload);

        // Actualizar estados locales
        const equipoActualizado = {
          ...equipoSel,
          ...(tipoDocCarga === 'ActaEntrega' ? {
            tieneActaEntrega: true,
            actaDriveUrl: driveUrlResult,
            actaFechaRegistro: fechaDoc,
            ultimaActaFolio: numeroRef.trim()
          } : {}),
          ...(tipoDocCarga === 'Factura' ? { facturaDriveUrl: driveUrlResult } : {}),
          ...(tipoDocCarga === 'Garantia' ? { garantiaDriveUrl: driveUrlResult } : {}),
          expediente: {
            ...(equipoSel.expediente || {}),
            [docKey]: nuevoDocumento
          }
        };

        setEquipoSel(equipoActualizado);
        setEquipos(prev => prev.map(eq => eq.id === equipoSel.id ? equipoActualizado : eq));

        mostrarToast(`Documento (${tipoDocCarga}) respaldado en Google Drive correctamente.`, "exito");
        setMostrarModalCarga(false);
      } else {
        mostrarToast("Error devuelto por Apps Script: " + (data.message || 'Error desconocido'), "error");
      }
    } catch (err) {
      console.error(err);
      mostrarToast("Ocurrió un error al subir el archivo.", "error");
    } finally {
      setSubiendo(false);
    }
  };

  // Desestructuración defensiva para compatibilidad total de URLs
  const urlFactura = equipoSel?.expediente?.docFactura?.url || equipoSel?.facturaDriveUrl;
  const urlGarantia = equipoSel?.expediente?.docGarantia?.url || equipoSel?.garantiaDriveUrl;
  const urlActa = equipoSel?.expediente?.docActaEntrega?.url || equipoSel?.actaDriveUrl;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 text-slate-200">
      
      {/* 🔔 TOAST NOTIFICACIÓN */}
      {notificacion && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center gap-3 ${
          notificacion.tipo === 'exito' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' : 'bg-red-950/90 border-red-500/50 text-red-200'
        }`}>
          <span className="text-xl">{notificacion.tipo === 'exito' ? '✅' : '⚠️'}</span>
          <span className="text-xs font-bold leading-relaxed">{notificacion.mensaje}</span>
        </div>
      )}

      {/* TARJETA PRINCIPAL */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-2xl">
        
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>📁</span> Expediente Digital de Activos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Consulta la documentación contable y legal (Facturas, Garantías y Actas de Entrega) respaldada en la carpeta <strong className="text-slate-300">LOGIX_Expedientes_Digitales</strong> de Google Drive.
          </p>
        </div>

        {/* CONTROLES DE FILTRADO Y SELECCIÓN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">1. Empresa</label>
            <select
              value={empresaSel}
              onChange={(e) => {
                setEmpresaSel(e.target.value);
                setEquipoSel(null);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition"
            >
              <option value="">-- Todas las Empresas --</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre || emp.razonSocial}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">2. Seleccionar Activo</label>
            <select
              value={equipoSel?.id || ''}
              onChange={(e) => setEquipoSel(equipos.find(eq => eq.id === e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-blue-400 font-bold font-mono outline-none focus:border-blue-500 transition"
            >
              <option value="">-- Seleccionar Equipo ({equiposFiltrados.length}) --</option>
              {equiposFiltrados.map(eq => (
                <option key={eq.id} value={eq.id}>
                  [{eq.codigo}] - {eq.marca} {eq.modelo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* VISTA DEL EXPEDIENTE SELECCIONADO */}
        {equipoSel ? (
          <div className="space-y-6 animate-fade-in">
            
            {/* CABECERA DEL ACTIVO */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg uppercase">
                  {equipoSel.empresaNombre || equipoSel.empresa || 'LOGIX IT'}
                </span>
                <h2 className="text-lg font-bold text-white mt-1">{equipoSel.marca} {equipoSel.modelo}</h2>
                <p className="text-xs text-slate-400 font-mono">Código: {equipoSel.codigo} | S/N: {equipoSel.serie || 'N/A'}</p>
              </div>

              <a
                href={`/ver-equipo?codigo=${equipoSel.codigo}`}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                👁️ Ver Ficha Completa
              </a>
            </div>

            {/* GRILLA DE LOS 3 DOCUMENTOS DEL EXPEDIENTE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* 🧾 FACTURA DE COMPRA */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-amber-500/40 transition">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🧾</span> Factura de Compra
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${urlFactura ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                      {urlFactura ? 'Cargado' : 'Pendiente'}
                    </span>
                  </div>

                  {urlFactura ? (
                    <div className="text-xs space-y-1 pt-2">
                      <p className="text-white font-mono font-bold truncate">{equipoSel.expediente?.docFactura?.nombreArchivo || 'Factura Resguardada'}</p>
                      <p className="text-slate-400 text-[11px]">Folio / OC: <span className="text-slate-200 font-mono">{equipoSel.expediente?.docFactura?.numeroReferencia || equipoSel.ordenCompra || 'N/A'}</span></p>
                      <p className="text-slate-400 text-[11px]">Proveedor: <span className="text-slate-200">{equipoSel.proveedor || 'N/A'}</span></p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic pt-2">No se ha adjuntado la factura fiscal de este activo.</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex gap-2">
                  {urlFactura ? (
                    <>
                      <a
                        href={urlFactura}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-center font-bold py-2 rounded-xl text-xs transition"
                      >
                        Abrir en Drive ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => abrirModalParaDoc('Factura')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl text-xs transition border border-slate-700"
                        title="Reemplazar factura"
                      >
                        🔄
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => abrirModalParaDoc('Factura')}
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl text-xs transition shadow-lg shadow-amber-600/20"
                    >
                      + Cargar Factura
                    </button>
                  )}
                </div>
              </div>

              {/* 🛡️ PÓLIZA DE GARANTÍA */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-emerald-500/40 transition">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🛡️</span> Póliza de Garantía
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${urlGarantia ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                      {urlGarantia ? 'Cargado' : 'Pendiente'}
                    </span>
                  </div>

                  {urlGarantia ? (
                    <div className="text-xs space-y-1 pt-2">
                      <p className="text-white font-mono font-bold truncate">{equipoSel.expediente?.docGarantia?.nombreArchivo || 'Garantía Resguardada'}</p>
                      {equipoSel.expediente?.docGarantia?.numeroReferencia && (
                        <p className="text-slate-400 text-[11px]">Póliza No.: <span className="text-slate-200 font-mono">{equipoSel.expediente.docGarantia.numeroReferencia}</span></p>
                      )}
                      {equipoSel.expediente?.docGarantia?.fechaDocumento && (
                        <p className="text-slate-400 text-[11px]">Vencimiento: <span className="text-slate-200">{equipoSel.expediente.docGarantia.fechaDocumento}</span></p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic pt-2">No se ha registrado póliza o documento de garantía.</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex gap-2">
                  {urlGarantia ? (
                    <>
                      <a
                        href={urlGarantia}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-center font-bold py-2 rounded-xl text-xs transition"
                      >
                        Abrir en Drive ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => abrirModalParaDoc('Garantia')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl text-xs transition border border-slate-700"
                        title="Reemplazar garantía"
                      >
                        🔄
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => abrirModalParaDoc('Garantia')}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20"
                    >
                      + Cargar Garantía
                    </button>
                  )}
                </div>
              </div>

              {/* ✍️ ACTA / FICHA DE ENTREGA */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-cyan-500/40 transition">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>✍️</span> Acta de Entrega
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${urlActa ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                      {urlActa ? 'Cargado' : 'Pendiente'}
                    </span>
                  </div>

                  {urlActa ? (
                    <div className="text-xs space-y-1 pt-2">
                      <p className="text-white font-mono font-bold truncate">{equipoSel.expediente?.docActaEntrega?.nombreArchivo || `Acta Folio ${equipoSel.ultimaActaFolio || 'Digital'}`}</p>
                      <p className="text-slate-400 text-[11px]">Folio: <span className="text-slate-200 font-mono">{equipoSel.ultimaActaFolio || equipoSel.expediente?.docActaEntrega?.numeroReferencia || 'N/A'}</span></p>
                      <p className="text-slate-400 text-[11px]">Asignado A: <span className="text-slate-200">{equipoSel.actaUsuarioFirmante || equipoSel.asignadoA || 'N/A'}</span></p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic pt-2">No hay acta de entrega o custodia firmada en archivo.</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex gap-2">
                  {urlActa ? (
                    <>
                      <a
                        href={urlActa}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-center font-bold py-2 rounded-xl text-xs transition"
                      >
                        Abrir en Drive ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => abrirModalParaDoc('ActaEntrega')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl text-xs transition border border-slate-700"
                        title="Reemplazar acta"
                      >
                        🔄
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => abrirModalParaDoc('ActaEntrega')}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-xl text-xs transition shadow-lg shadow-cyan-600/20"
                    >
                      + Cargar Acta
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="text-center py-12 bg-slate-950 border border-slate-800/60 rounded-2xl space-y-3">
            <span className="text-4xl">📂</span>
            <p className="text-xs font-bold text-slate-400">Selecciona una empresa y un activo para visualizar su expediente digital completo.</p>
          </div>
        )}

      </div>

      {/* 📤 MODAL RÁPIDO DE CARGA DE DOCUMENTO DESDE EL MISMO EXPEDIENTE */}
      {mostrarModalCarga && equipoSel && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📤</span> Subir {tipoDocCarga === 'Factura' ? 'Factura' : tipoDocCarga === 'Garantia' ? 'Garantía' : 'Acta de Entrega'}
              </h3>
              <button type="button" onClick={() => setMostrarModalCarga(false)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleSubirODocumento} className="space-y-4 text-xs text-left">
              <p className="text-slate-400 text-[11px]">
                El archivo se guardará en Google Drive dentro de la carpeta del activo <strong className="text-white font-mono">{equipoSel.codigo}</strong>.
              </p>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Número de Referencia / Folio</label>
                <input
                  type="text"
                  placeholder="Ej. FACT-9983 / POL-2026"
                  value={numeroRef}
                  onChange={(e) => setNumeroRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Fecha del Documento</label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={fechaDoc}
                    onChange={(e) => setFechaDoc(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={setFechaHoy}
                    className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
                  >
                    📅 Hoy
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Archivo (PDF / Imagen)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/*"
                  onChange={(e) => setArchivo(e.target.files[0])}
                  className="w-full text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white cursor-pointer"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={subiendo}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
                >
                  {subiendo ? 'Subiendo a Drive...' : '📤 Guardar en Drive'}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarModalCarga(false)}
                  disabled={subiendo}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}