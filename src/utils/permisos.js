export const ROLES = {
  ADMIN: 'Admin',
  TECNICO: 'Tecnico',
  RRHH: 'RRHH',
  CONSULTOR: 'Consultor'
};

// Solo el Admin puede eliminar registros
export const puedeEliminar = (rol) => rol === ROLES.ADMIN;

// Solo el Admin puede crear o modificar cuentas de usuario
export const puedeGestionarUsuarios = (rol) => rol === ROLES.ADMIN;

// Admin y Técnico pueden gestionar catálogos y registrar/asignar equipos
export const puedeGestionarCatalogos = (rol) => rol === ROLES.ADMIN || rol === ROLES.TECNICO;
export const puedeRegistrarOAsignar = (rol) => rol === ROLES.ADMIN || rol === ROLES.TECNICO;

// Consultor es lectura pura
export const esSoloLectura = (rol) => rol === ROLES.CONSULTOR;