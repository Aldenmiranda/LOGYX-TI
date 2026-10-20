import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// 🔗 URL de tu Web App de Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwf6Jng14glzEmZMeqF5qaf5iECXjcQdTOv3uadq7AkrAYiKah_7WK1b9XTRJoU3mL_/exec";

const convertirABase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export default function RegistroDocumento({ tipoSubmenu = 'Factura' }) {
  // Configuración dinámica según la opción del submenú elegida
  const config = {
    Factura: {
      titulo: '🧾 Registrar Factura de Compra',
      descripcion: 'Adjunta y vincula la factura comercial / fiscal de compra del equipo en Google Drive.',
      colorTexto: 'text-amber-400',
      colorBoton: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20',
      docKey: 'docFactura'
    },
    Garantia: {
      titulo: '🛡️ Registrar Póliza / Documento de Garantía',
      descripcion: 'Sube la póliza o documento de garantía expedido por el proveedor.',
      colorTexto: 'text-emerald-400',
      colorBoton: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20',
      docKey: 'docGarantia'
    },
    ActaEntrega: {
      titulo: '✍️ Registrar Ficha / Acta de Entrega Firmada',
      descripcion: 'Carga el acta de responsabilidad / entrega firmada por el colaborador asignado.',
      colorTexto: 'text-cyan-400',
      colorBoton: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/20',
      docKey: 'docActaEntrega'
    }
  }[tipoSubmenu] || config.Factura;

  const [empresas, setEmpresas] = useState([]);
  const [empresaSel, setEmpresaSel] = useState('');
  const [equipos, setEquipos] = useState([]);
  const [equipoSel, setEquipoSel] = useState(null);
  
  const [archivo, setArchivo] = useState(null);
  const [numeroReferencia, setNumeroReferencia] = useState('');
  const [fechaDocumento, setFechaDocumento] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [notificacion, setNotificacion] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      const empSnap = await getDocs(collection(db, 'empresas'));
      setEmpresas(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const eqSnap = await getDocs(collection(db, 'equipos'));
      setEquipos(eqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    cargarDatos();
  }, []);

  const mostrarToast = (mensaje, tipo = 'exito') => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 4000);
  };

  const equiposFiltrados = equipos.filter(e => 
    !empresaSel || e.empresaId === empresaSel || e.empresa === empresaSel || e.empresaNombre === empresaSel
  );

  const handleGuardarDocumento = async (e) => {
    e.preventDefault();
    if (!equipoSel || !archivo) {
      mostrarToast("Por favor selecciona un equipo y adjunta un archivo.", "error");
      return;
    }

    setSubiendo(true);
    try {
      const base64Data = await convertirABase64(archivo);
      const payload = {
        fileName: `${tipoSubmenu.toUpperCase()}_${equipoSel.codigo}_${Date.now()}_${archivo.name}`,
        mimeType: archivo.type || 'application/pdf',
        base64Data,
        tipoDoc: tipoSubmenu
      };

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.status === 'success') {
        const equipoRef = doc(db, 'equipos', equipoSel.id);
        const actualizacion = {
          [`expediente.${config.docKey}`]: {
            url: data.driveUrl || data.fileUrl,
            fileId: data.fileId,
            nombreArchivo: archivo.name,
            numeroReferencia: numeroReferencia.trim(),
            fechaDocumento: fechaDocumento,
            fechaCarga: new Date().toISOString().split('T')[0]
          }
        };

        await updateDoc(equipoRef, actualizacion);

        mostrarToast(`Documento guardado en Google Drive y vinculado al activo ${equipoSel.codigo}`, "exito");
        setArchivo(null);
        setNumeroReferencia('');
        setFechaDocumento('');
      } else {
        mostrarToast("Error devuelto por Apps Script: " + data.message, "error");
      }
    } catch (err) {
      console.error(err);
      mostrarToast("Error al subir el documento.", "error");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 text-slate-200">
      
      {/* TOAST FLOTANTE */}
      {notificacion && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center gap-3 ${
          notificacion.tipo === 'exito' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' : 'bg-red-950/90 border-red-500/50 text-red-200'
        }`}>
          <span>{notificacion.tipo === 'exito' ? '✅' : '⚠️'}</span>
          <span className="text-xs font-bold">{notificacion.mensaje}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-2xl">
        
        <div>
          <h1 className={`text-xl font-extrabold ${config.colorTexto}`}>
            {config.titulo}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {config.descripcion}
          </p>
        </div>

        <form onSubmit={handleGuardarDocumento} className="space-y-4 text-xs">
          
          {/* PASO 1: EMPRESA Y ACTIVO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="block font-bold text-slate-400 mb-1">1. Filtrar por Empresa</label>
              <select
                value={empresaSel}
                onChange={(e) => {
                  setEmpresaSel(e.target.value);
                  setEquipoSel(null);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
              >
                <option value="">-- Todas las Empresas --</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nombre || emp.razonSocial}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">2. Seleccionar Activo / Equipo</label>
              <select
                required
                value={equipoSel?.id || ''}
                onChange={(e) => setEquipoSel(equipos.find(eq => eq.id === e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-blue-400 font-bold"
              >
                <option value="">-- Seleccionar Equipo --</option>
                {equiposFiltrados.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.codigo} - {eq.marca} {eq.modelo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PASO 2: CAMPOS DEL DOCUMENTO */}
          {equipoSel && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="font-bold text-white">Detalles del Activo: <span className="text-blue-400 font-mono">{equipoSel.codigo}</span></span>
                <span className="text-[10px] text-slate-400">{equipoSel.marca} {equipoSel.modelo}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Número de Referencia / Folio</label>
                  <input
                    type="text"
                    placeholder="Ej. FACT-99382 / POL-2026 / ACTA-001"
                    value={numeroReferencia}
                    onChange={(e) => setNumeroReferencia(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Fecha del Documento</label>
                  <input
                    type="date"
                    value={fechaDocumento}
                    onChange={(e) => setFechaDocumento(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Archivo Adjunto (PDF / Imagen)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/*"
                  onChange={(e) => setArchivo(e.target.files[0])}
                  className="w-full text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={subiendo}
                className={`w-full ${config.colorBoton} text-white font-bold py-3 rounded-xl transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {subiendo ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Subiendo a Google Drive...
                  </>
                ) : (
                  '📤 Guardar y Vincular Documento'
                )}
              </button>
            </div>
          )}

        </form>

      </div>
    </div>
  );
}