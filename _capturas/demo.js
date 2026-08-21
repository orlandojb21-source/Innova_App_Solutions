/* Banco de pruebas para tomar capturas del panel.
 *
 * Reemplaza llamarApi() por datos inventados, así el panel se ve completo y
 * poblado SIN conectarse a nada. No toca la hoja real, no necesita permisos y
 * no hay forma de que se filtre un dato de un cliente.
 *
 * Los correos usan el dominio ".example", reservado por norma para ejemplos:
 * nunca puede pertenecer a nadie.
 *
 * Se carga solo desde _capturas/index.html. No forma parte de la aplicación
 * publicada: la carpeta app/ no lo incluye ni lo referencia.
 */

(function () {
  'use strict';

  // Sesión falsa para que el panel entre directo, sin pasar por Google.
  localStorage.setItem('ias_panel_session', JSON.stringify({
    token: 'demo-solo-para-capturas',
    email: 'demo@innovaapps.example',
  }));

  const CLIENTES = [
    { Id: 'CLI-001', Nombre: 'Marisol Quintero', Empresa: 'Ferretería El Tornillo', Telefono: '6421-0098', Email: 'ventas@eltornillo.example', Direccion: 'Vía España, Ciudad de Panamá', Notas: 'Prefiere que la contacten los martes.', FechaCreacion: '2026-02-14' },
    { Id: 'CLI-002', Nombre: 'Rubén Achurra', Empresa: 'Panadería La Espiga', Telefono: '6730-4412', Email: 'ruben@laespiga.example', Direccion: 'Calle 50, Ciudad de Panamá', Notas: '', FechaCreacion: '2026-03-02' },
    { Id: 'CLI-003', Nombre: 'Ivette Barría', Empresa: 'Clínica Dental Sonrisa', Telefono: '6011-7734', Email: 'contacto@sonrisa.example', Direccion: 'David, Chiriquí', Notas: 'Facturar a nombre de la clínica.', FechaCreacion: '2026-04-18' },
    { Id: 'CLI-004', Nombre: 'Aníbal Justavino', Empresa: 'Transporte Veraguas', Telefono: '6255-9081', Email: 'operaciones@tveraguas.example', Direccion: 'Santiago, Veraguas', Notas: '', FechaCreacion: '2026-05-27' },
    { Id: 'CLI-005', Nombre: 'Karina Him', Empresa: 'Boutique Casa Kena', Telefono: '6398-2210', Email: 'karina@casakena.example', Direccion: 'Costa del Este, Ciudad de Panamá', Notas: 'Pide informe de ventas cada mes.', FechaCreacion: '2026-06-09' },
  ];

  const COTIZACIONES = [
    { Id: 'COT-1', Folio: 'COT-2026-0016', ClienteId: 'CLI-005', Fecha: '2026-08-14', ValidezDias: 15, Subtotal: 2400, DescuentoPct: 0, ImpuestoPct: 7, Total: 2568, Estado: 'Enviada', Notas: 'Incluye capacitación al personal.', FechaCreacion: '2026-08-14' },
    { Id: 'COT-2', Folio: 'COT-2026-0015', ClienteId: 'CLI-004', Fecha: '2026-08-06', ValidezDias: 30, Subtotal: 3800, DescuentoPct: 5, ImpuestoPct: 7, Total: 3863.30, Estado: 'Aceptada', Notas: '', FechaCreacion: '2026-08-06' },
    { Id: 'COT-3', Folio: 'COT-2026-0014', ClienteId: 'CLI-003', Fecha: '2026-07-29', ValidezDias: 15, Subtotal: 1250, DescuentoPct: 0, ImpuestoPct: 0, Total: 1250, Estado: 'Aceptada', Notas: '', FechaCreacion: '2026-07-29' },
    { Id: 'COT-4', Folio: 'COT-2026-0013', ClienteId: 'CLI-002', Fecha: '2026-07-21', ValidezDias: 15, Subtotal: 900, DescuentoPct: 0, ImpuestoPct: 7, Total: 963, Estado: 'Borrador', Notas: 'Falta confirmar alcance del módulo de inventario.', FechaCreacion: '2026-07-21' },
    { Id: 'COT-5', Folio: 'COT-2026-0012', ClienteId: 'CLI-001', Fecha: '2026-07-03', ValidezDias: 15, Subtotal: 1600, DescuentoPct: 0, ImpuestoPct: 7, Total: 1712, Estado: 'Rechazada', Notas: 'Pospuesto para el próximo año.', FechaCreacion: '2026-07-03' },
  ];

  const ITEMS_POR_COTIZACION = {
    'COT-1': [
      { Id: 'IT-1', CotizacionId: 'COT-1', Descripcion: 'App de inventario y ventas (PWA)', Cantidad: 1, PrecioUnitario: 1900, Subtotal: 1900 },
      { Id: 'IT-2', CotizacionId: 'COT-1', Descripcion: 'Capacitación al personal (2 sesiones)', Cantidad: 2, PrecioUnitario: 250, Subtotal: 500 },
    ],
    'COT-2': [
      { Id: 'IT-3', CotizacionId: 'COT-2', Descripcion: 'Sistema de control de flota', Cantidad: 1, PrecioUnitario: 3200, Subtotal: 3200 },
      { Id: 'IT-4', CotizacionId: 'COT-2', Descripcion: 'Integración con planilla', Cantidad: 1, PrecioUnitario: 600, Subtotal: 600 },
    ],
  };

  const VENTAS = [
    { Id: 'VEN-1', ClienteId: 'CLI-004', CotizacionId: 'COT-2', Concepto: 'Sistema de control de flota', Monto: 3863.30, MontoPagado: 1931.65, FacturaFolio: '', Fecha: '2026-08-08', Estado: 'Parcial', MetodoPago: 'Transferencia', Notas: 'Segundo pago contra entrega.', FechaCreacion: '2026-08-08' },
    { Id: 'VEN-2', ClienteId: 'CLI-003', CotizacionId: 'COT-3', Concepto: 'Agenda de citas para consultorio', Monto: 1250, MontoPagado: 1250, FacturaFolio: 'FACT-2026-0031', Fecha: '2026-08-02', Estado: 'Pagado', MetodoPago: 'Yappy', Notas: '', FechaCreacion: '2026-08-02' },
    { Id: 'VEN-3', ClienteId: 'CLI-005', CotizacionId: '', Concepto: 'Ajustes al catálogo de productos', Monto: 380, MontoPagado: 380, FacturaFolio: 'FACT-2026-0030', Fecha: '2026-08-01', Estado: 'Pagado', MetodoPago: 'Efectivo', Notas: '', FechaCreacion: '2026-08-01' },
    { Id: 'VEN-4', ClienteId: 'CLI-001', CotizacionId: '', Concepto: 'Mantenimiento mensual', Monto: 180, MontoPagado: 180, FacturaFolio: 'FACT-2026-0029', Fecha: '2026-07-30', Estado: 'Pagado', MetodoPago: 'Transferencia', Notas: '', FechaCreacion: '2026-07-30' },
    { Id: 'VEN-5', ClienteId: 'CLI-002', CotizacionId: '', Concepto: 'Módulo de pedidos por WhatsApp', Monto: 1420, MontoPagado: 1040, FacturaFolio: '', Fecha: '2026-07-19', Estado: 'Parcial', MetodoPago: 'Transferencia', Notas: '', FechaCreacion: '2026-07-19' },
    { Id: 'VEN-6', ClienteId: 'CLI-003', CotizacionId: '', Concepto: 'Migración de historial a la nube', Monto: 640, MontoPagado: 0, FacturaFolio: '', Fecha: '2026-07-11', Estado: 'Pendiente', MetodoPago: '', Notas: 'Cobrar al cerrar el mes.', FechaCreacion: '2026-07-11' },
  ];

  const ABONOS = {
    'VEN-1': [{ Id: 'AB-1', VentaId: 'VEN-1', Folio: 'REC-2026-0044', Monto: 1931.65, Fecha: '2026-08-08', FechaCreacion: '2026-08-08' }],
    'VEN-5': [
      { Id: 'AB-2', VentaId: 'VEN-5', Folio: 'REC-2026-0041', Monto: 700, Fecha: '2026-07-19', FechaCreacion: '2026-07-19' },
      { Id: 'AB-3', VentaId: 'VEN-5', Folio: 'REC-2026-0043', Monto: 340, Fecha: '2026-08-05', FechaCreacion: '2026-08-05' },
    ],
  };

  const GASTOS = [
    { Id: 'GAS-1', Concepto: 'Hosting y dominio', Categoria: 'Infraestructura', Monto: 42.50, Fecha: '2026-08-12', ClienteId: '', ProyectoId: '', Notas: '', FechaCreacion: '2026-08-12' },
    { Id: 'GAS-2', Concepto: 'Licencia de diseño', Categoria: 'Herramientas', Monto: 22, Fecha: '2026-08-10', ClienteId: '', ProyectoId: '', Notas: '', FechaCreacion: '2026-08-10' },
    { Id: 'GAS-3', Concepto: 'Publicidad en redes', Categoria: 'Mercadeo', Monto: 150, Fecha: '2026-08-07', ClienteId: '', ProyectoId: '', Notas: 'Campaña de agosto.', FechaCreacion: '2026-08-07' },
    { Id: 'GAS-4', Concepto: 'Monitor adicional', Categoria: 'Equipos', Monto: 320, Fecha: '2026-08-05', ClienteId: '', ProyectoId: '', Notas: '', FechaCreacion: '2026-08-05' },
    { Id: 'GAS-5', Concepto: 'Visita a cliente en David', Categoria: 'Transporte', Monto: 88, Fecha: '2026-08-03', ClienteId: 'CLI-003', ProyectoId: 'PRO-2', Notas: '', FechaCreacion: '2026-08-03' },
    { Id: 'GAS-6', Concepto: 'Servidor de base de datos', Categoria: 'Infraestructura', Monto: 520, Fecha: '2026-08-01', ClienteId: '', ProyectoId: '', Notas: 'Plan anual.', FechaCreacion: '2026-08-01' },
  ];

  const PROYECTOS = [
    { Id: 'PRO-1', ClienteId: 'CLI-004', VentaId: 'VEN-1', Nombre: 'Control de flota', Descripcion: 'Seguimiento de unidades, rutas y consumo de combustible.', Alcance: 'Registro de unidades, asignación de rutas, control de combustible y reportes mensuales por vehículo.', Stack: 'PWA + Apps Script + Sheets', FechaInicio: '2026-08-08', FechaEntrega: '2026-09-30', Estado: 'EnProgreso', UrlRepo: '', UrlDemo: '', Notas: '', FechaCreacion: '2026-08-08' },
    { Id: 'PRO-2', ClienteId: 'CLI-003', VentaId: 'VEN-2', Nombre: 'Agenda de citas', Descripcion: 'Agenda para consultorio con recordatorios.', Alcance: 'Calendario por profesional, recordatorio por WhatsApp y control de asistencia.', Stack: 'PWA + Apps Script + Sheets', FechaInicio: '2026-07-29', FechaEntrega: '2026-08-25', Estado: 'EnProgreso', UrlRepo: '', UrlDemo: '', Notas: '', FechaCreacion: '2026-07-29' },
    { Id: 'PRO-3', ClienteId: 'CLI-005', VentaId: 'VEN-3', Nombre: 'Catálogo en línea', Descripcion: 'Catálogo de productos con pedidos por WhatsApp.', Alcance: 'Catálogo con fotos, carrito y envío del pedido por WhatsApp.', Stack: 'PWA + Vercel', FechaInicio: '2026-06-15', FechaEntrega: '2026-07-20', Estado: 'Entregado', UrlRepo: '', UrlDemo: '', Notas: '', FechaCreacion: '2026-06-15' },
    { Id: 'PRO-4', ClienteId: 'CLI-002', VentaId: 'VEN-5', Nombre: 'Pedidos por WhatsApp', Descripcion: 'Toma de pedidos para panadería.', Alcance: 'Pedidos por producto, cuadre de caja diario y reporte de mermas.', Stack: 'PWA + Apps Script + Sheets', FechaInicio: '2026-07-19', FechaEntrega: '2026-09-05', Estado: 'EnProgreso', UrlRepo: '', UrlDemo: '', Notas: '', FechaCreacion: '2026-07-19' },
  ];

  const ENTREGABLES = {
    'PRO-1': [
      { Id: 'ENT-1', ProyectoId: 'PRO-1', Titulo: 'Registro de unidades', Descripcion: 'Alta, baja y ficha de cada vehículo.', Estado: 'Entregado' },
      { Id: 'ENT-2', ProyectoId: 'PRO-1', Titulo: 'Asignación de rutas', Descripcion: 'Ruta diaria por unidad y conductor.', Estado: 'Entregado' },
      { Id: 'ENT-3', ProyectoId: 'PRO-1', Titulo: 'Control de combustible', Descripcion: 'Carga de galones y costo por unidad.', Estado: 'Pendiente' },
      { Id: 'ENT-4', ProyectoId: 'PRO-1', Titulo: 'Reportes mensuales', Descripcion: 'Consumo y rendimiento por vehículo.', Estado: 'Pendiente' },
    ],
  };

  const SUSCRIPCIONES = [
    { Id: 'SUS-1', ClienteId: 'CLI-005', ProyectoId: 'PRO-3', Producto: 'Catálogo en línea', Monto: 25, Frecuencia: 'Mensual', FechaInicio: '2026-07-20', ProximoVencimiento: '2026-08-22', Estado: 'Activa', Notas: '', FechaCreacion: '2026-07-20' },
    { Id: 'SUS-2', ClienteId: 'CLI-001', ProyectoId: '', Producto: 'Mantenimiento mensual', Monto: 180, Frecuencia: 'Mensual', FechaInicio: '2026-03-01', ProximoVencimiento: '2026-08-24', Estado: 'Activa', Notas: '', FechaCreacion: '2026-03-01' },
    { Id: 'SUS-3', ClienteId: 'CLI-003', ProyectoId: 'PRO-2', Producto: 'Agenda de citas', Monto: 40, Frecuencia: 'Mensual', FechaInicio: '2026-08-02', ProximoVencimiento: '2026-09-02', Estado: 'Activa', Notas: '', FechaCreacion: '2026-08-02' },
    { Id: 'SUS-4', ClienteId: 'CLI-002', ProyectoId: '', Producto: 'Licencia anual', Monto: 480, Frecuencia: 'Anual', FechaInicio: '2026-01-15', ProximoVencimiento: '2027-01-15', Estado: 'Activa', Notas: '', FechaCreacion: '2026-01-15' },
  ];

  const SOPORTE = [
    { Id: 'SOP-1', ClienteId: 'CLI-004', ProyectoId: 'PRO-1', Concepto: 'Soporte y mantenimiento', Alcance: 'Correcciones, respaldos y hasta 4 horas de cambios al mes.', Monto: 120, DuracionContrato: '12 meses', FechaInicio: '2026-08-08', FechaFin: '2027-08-08', ProximoPago: '2026-08-23', Estado: 'Activo', Notas: '', FechaCreacion: '2026-08-08' },
    { Id: 'SOP-2', ClienteId: 'CLI-005', ProyectoId: 'PRO-3', Concepto: 'Soporte básico', Alcance: 'Atención por WhatsApp en horario laboral.', Monto: 60, DuracionContrato: '6 meses', FechaInicio: '2026-07-20', FechaFin: '2027-01-20', ProximoPago: '2026-09-20', Estado: 'Activo', Notas: '', FechaCreacion: '2026-07-20' },
    { Id: 'SOP-3', ClienteId: 'CLI-002', ProyectoId: 'PRO-4', Concepto: 'Soporte y mantenimiento', Alcance: 'Correcciones y respaldos.', Monto: 90, DuracionContrato: '12 meses', FechaInicio: '2026-07-19', FechaFin: '2027-07-19', ProximoPago: '2026-09-19', Estado: 'Activo', Notas: '', FechaCreacion: '2026-07-19' },
  ];

  const RESPUESTAS = {
    'auth.login': { token: 'demo-solo-para-capturas', email: 'demo@innovaapps.example' },

    'config.obtener': {
      NombreEmpresa: 'Innova App Solutions',
      RUC: '8-888-8888',
      Direccion: 'Ciudad de Panamá, Panamá',
      Telefono: '6760-4043',
      EmailContacto: 'info@innovaapps.app',
      Moneda: '$',
      ImpuestoPctDefault: '7',
      LogoUrl: '',
      NombreFirmante: 'Orlando Bernal',
      Cargo: 'Desarrollador',
    },

    'dashboard.resumen': {
      cotizacionesPendientes: 2,
      ventasDelMes: 4850.00,
      ventasPendientesMonto: 2311.65,
      gastosDelMes: 1142.50,
      gananciaDelMes: 3707.50,
      proyectosActivos: 3,
      totalClientes: 5,
      suscripcionesPorVencer: 2,
      soportePorVencer: 1,
    },

    'clientes.listar': CLIENTES,
    'cotizaciones.listar': COTIZACIONES,
    'ventas.listar': VENTAS,
    'gastos.listar': GASTOS,
    'proyectos.listar': PROYECTOS,
    'suscripciones.listar': SUSCRIPCIONES,
    'soporte.listar': SOPORTE,
    'papelera.listar': [],

    'suscripciones.alertas': SUSCRIPCIONES.filter((s) => s.ProximoVencimiento <= '2026-08-25'),
    'soporte.alertas': SOPORTE.filter((s) => s.ProximoPago <= '2026-08-25'),

    'cotizaciones.obtener': (payload) => {
      const cot = COTIZACIONES.find((c) => c.Id === (payload && payload.Id)) || COTIZACIONES[0];
      return { cotizacion: cot, items: ITEMS_POR_COTIZACION[cot.Id] || [] };
    },

    'proyectos.obtener': (payload) => {
      const pro = PROYECTOS.find((p) => p.Id === (payload && payload.Id)) || PROYECTOS[0];
      return { proyecto: pro, entregables: ENTREGABLES[pro.Id] || [] };
    },

    'ventas.listarAbonos': (payload) => ABONOS[(payload && payload.VentaId)] || [],

    'reportes.resumen': {
      porMes: [
        { mes: '2026-03', ventas: 2100, gastos: 640, ganancia: 1460 },
        { mes: '2026-04', ventas: 3250, gastos: 890, ganancia: 2360 },
        { mes: '2026-05', ventas: 2780, gastos: 1020, ganancia: 1760 },
        { mes: '2026-06', ventas: 4100, gastos: 1180, ganancia: 2920 },
        { mes: '2026-07', ventas: 3620, gastos: 970, ganancia: 2650 },
        { mes: '2026-08', ventas: 4850, gastos: 1142.50, ganancia: 3707.50 },
      ],
      topClientes: [
        { ClienteId: 'CLI-004', Nombre: 'Aníbal Justavino', Total: 3863.30 },
        { ClienteId: 'CLI-002', Nombre: 'Rubén Achurra', Total: 1420 },
        { ClienteId: 'CLI-003', Nombre: 'Ivette Barría', Total: 1890 },
        { ClienteId: 'CLI-005', Nombre: 'Karina Him', Total: 380 },
        { ClienteId: 'CLI-001', Nombre: 'Marisol Quintero', Total: 180 },
      ],
    },
  };

  window.llamarApi = async function (action, payload) {
    // Una pausa corta para que se vean los estados de carga al capturar.
    await new Promise((listo) => setTimeout(listo, 140));

    if (!(action in RESPUESTAS)) {
      throw new Error(
        'Esta es una copia solo para capturas: "' + action + '" no guarda ni modifica nada.'
      );
    }

    const respuesta = RESPUESTAS[action];
    return typeof respuesta === 'function' ? respuesta(payload) : respuesta;
  };
})();
