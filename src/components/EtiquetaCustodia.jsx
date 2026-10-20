import React from 'react';

export default function EtiquetaCustodia({ datos, onClose }) {
  // Datos de fallback en caso de probar el componente de forma aislada
  const info = datos || {
    codigo: 'ZAM-LAP-001',
    serie: '7X892B3',
    modelo: 'Dell Latitude 3420',
    empresaNombre: 'LOGIX IT',
    empresaLogo: '',
    custodioNombre: 'JUAN PÉREZ',
    puesto: 'ANALISTA SÉNIOR',
    departamento: 'FINANZAS',
  };

  // URL Dinámica para el escaneo del QR (Apunta a la vista pública o interna del carnet)
  const urlCustodia = `${window.location.origin}/custodia?codigo=${encodeURIComponent(info.codigo)}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(urlCustodia)}`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md print:p-0 print:bg-white print:static">
      
      {/* 🖨️ ESTILOS CSS EXCLUSIVOS PARA IMPRESIÓN EN MEDIDA 2" x 1.5" (50.8mm x 38.1mm) */}
      <style>{`
        @media print {
          @page {
            size: 2in 1.5in;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #etiqueta-custodia-print, #etiqueta-custodia-print * {
            visibility: visible;
          }
          #etiqueta-custodia-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 2in !in;
            height: 1.5in;
            max-width: 2in;
            max-height: 1.5in;
            margin: 0;
            padding: 3mm;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl no-print">
        
        {/* ENCABEZADO MODAL */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            🏷️ Etiqueta de Custodia (2" x 1.5")
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕ Cerrar
            </button>
          )}
        </div>

        {/* 🏷️ PLANTILLA FÍSICA DE ETIQUETA (2x1.5 Pulgadas) */}
        <div className="flex justify-center">
          <div
            id="etiqueta-custodia-print"
            className="bg-white text-black p-2 rounded-lg border border-slate-300 shadow-md text-left font-sans select-none overflow-hidden flex flex-col justify-between"
            style={{ 
              width: '2in', 
              height: '1.5in', 
              fontFamily: 'Arial, Helvetica, sans-serif',
              boxSizing: 'border-box'
            }}
          >
            {/* ENCABEZADO DE MARCA */}
            <div className="flex items-center justify-between border-b border-black pb-0.5">
              <span className="text-[7px] font-black uppercase tracking-tight text-black">
                {info.empresaNombre || 'LOGIX IT'} | CUSTODIA
              </span>
              <span className="text-[6px] font-bold text-slate-600 uppercase">
                ACTIVO FIJO
              </span>
            </div>

            {/* CONTENIDO PRINCIPAL: DATOS Y QR */}
            <div className="flex items-center gap-1.5 my-auto">
              {/* QR CODE */}
              <div className="flex-shrink-0 border border-black p-0.5 bg-white rounded">
                <img
                  src={qrApiUrl}
                  alt={`QR ${info.codigo}`}
                  className="w-12 h-12 object-contain block"
                />
              </div>

              {/* DETALLES DEL EQUIPO */}
              <div className="flex-1 text-[6.5px] leading-tight text-black overflow-hidden">
                <div className="truncate">
                  <span className="font-extrabold uppercase">CÓDIGO: </span>
                  <span className="font-black font-mono text-[7.5px] text-blue-900">{info.codigo}</span>
                </div>

                <div className="truncate">
                  <span className="font-extrabold uppercase">S/N: </span>
                  <span className="font-bold font-mono">{info.serie || 'N/A'}</span>
                </div>

                <div className="truncate">
                  <span className="font-extrabold uppercase">EQUIPO: </span>
                  <span className="font-bold">{info.modelo || 'GENÉRICO'}</span>
                </div>
              </div>
            </div>

            {/* PIE DE ETIQUETA: CUSTODIO ACTUAL */}
            <div className="border-t border-black pt-0.5 bg-slate-100 -mx-2 -mb-2 p-1">
              <div className="text-[6.5px] font-black uppercase text-black truncate leading-none">
                CUSTODIO: {info.custodioNombre || 'SIN ASIGNAR'}
              </div>
              <div className="text-[5.5px] text-slate-700 font-bold uppercase truncate leading-tight">
                {info.puesto || info.departamento || 'OPERACIONES'}
              </div>
            </div>

          </div>
        </div>

        {/* ACCIONES DEL MODAL */}
        <div className="pt-2 flex gap-2 no-print">
          <button
            onClick={() => window.print()}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-blue-600/30"
          >
            🖨️ Imprimir Etiqueta (2"x1.5")
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-2.5 rounded-xl text-xs transition"
            >
              Aceptar
            </button>
          )}
        </div>

      </div>
    </div>
  );
}