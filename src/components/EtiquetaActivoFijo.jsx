import React from 'react';

export default function EtiquetaActivoFijo({ datos, onClose }) {
  if (!datos) return null;

  const qrData = datos.qrUrl || datos.codigo || 'S/C';

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-md print:p-0 print:bg-white print:static no-print">
      
      {/* Estilos CSS para Impresión Térmica Directa */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #etiqueta-activo-fijo, #etiqueta-activo-fijo * {
            visibility: visible;
          }
          #etiqueta-activo-fijo {
            position: absolute;
            left: 0;
            top: 0;
            width: 90mm;
            margin: 0;
            padding: 8px;
            border: 1px solid #000 !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full text-center space-y-5 shadow-2xl no-print">
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
            <span>🏷️</span> Etiqueta de Activo Fijo
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* TARJETA DE ETIQUETA DE ACTIVO FIJO (DISEÑO EXACTO) */}
        <div 
          id="etiqueta-activo-fijo"
          className="bg-white text-black p-4 rounded-xl border border-slate-300 shadow-md text-left font-sans select-none"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {/* BANNER SUPERIOR DE MARCA */}
          <div className="flex items-center gap-2 border-b-2 border-black pb-1.5 mb-2">
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
              {datos.empresaLogo ? (
                <img 
                  src={datos.empresaLogo} 
                  alt="Logo" 
                  className="max-h-10 max-w-10 object-contain" 
                />
              ) : (
                <div className="text-2xl leading-none">🏢</div>
              )}
            </div>

            <div className="flex-1 bg-black text-white px-3 py-1 rounded-sm text-center">
              <h2 className="text-sm font-black uppercase tracking-wider leading-tight">
                {datos.empresaNombre || 'LOGIX IT'}
              </h2>
              <span className="text-[8px] font-semibold text-slate-300 tracking-widest block -mt-0.5">
                S.A. DE C.V.
              </span>
            </div>
          </div>

          {/* SUBENCABEZADO DE SISTEMA */}
          <div className="text-[10px] font-black uppercase text-slate-800 tracking-tight mb-2 border-b border-slate-300 pb-0.5 flex justify-between items-center">
            <span>LOGIX IT <span className="font-normal text-slate-600">| Control de Activos</span></span>
          </div>

          {/* CONTENIDO PRINCIPAL: QR Y DETALLES */}
          <div className="flex items-center gap-3">
            
            {/* QR CODE */}
            <div className="flex-shrink-0 border border-black p-1 bg-white rounded">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`}
                alt={`QR ${datos.codigo}`}
                className="w-24 h-24 object-contain block"
              />
            </div>

            {/* DETALLES DEL ACTIVO */}
            <div className="flex-1 text-[10px] leading-tight space-y-0.5 text-black font-bold">
              
              <div>
                <span className="font-extrabold uppercase text-slate-700">CÓDIGO INVENTARIO: </span>
                <span className="font-black text-xs text-black font-mono tracking-tight">{datos.codigo || 'S/C'}</span>
              </div>

              <div>
                <span className="font-extrabold uppercase text-slate-700">S/N: </span>
                <span className="font-bold text-black font-mono">{datos.serie || 'N/A'}</span>
              </div>

              <div className="truncate">
                <span className="font-extrabold uppercase text-slate-700">EQUIPO: </span>
                <span className="font-extrabold text-black uppercase">
                  {datos.marca || ''} {datos.modelo || ''}
                </span>
              </div>

              <div className="truncate">
                <span className="font-extrabold uppercase text-slate-700">DEPTO / CUSTODIO: </span>
                <span className="font-bold text-black uppercase">
                  {datos.custodioNombre || datos.categoriaNombre || datos.departamento || 'GENERAL'}
                </span>
              </div>

              <div className="truncate">
                <span className="font-extrabold uppercase text-slate-700">UBIC: </span>
                <span className="font-bold text-black uppercase">
                  {datos.ubicacion || 'SIN UBICACIÓN'}
                </span>
              </div>

            </div>

          </div>

        </div>

        {/* BOTONES */}
        <div className="pt-2 flex gap-2 no-print">
          <button
            onClick={() => window.print()}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            🖨️ Imprimir Etiqueta QR
          </button>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-3 rounded-xl text-xs transition cursor-pointer"
          >
            Aceptar
          </button>
        </div>

      </div>
    </div>
  );
}