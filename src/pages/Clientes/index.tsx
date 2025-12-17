/**
 * Módulo de Clientes
 * CRUD completo con estadísticas, obras/sucursales e historial
 */

import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  DollarSign,
  X,
  Check,
  RefreshCw,
  ChevronRight,
  Users,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  desactivarCliente,
  reactivarCliente,
  eliminarCliente,
} from '../../services/client.service';
import type { Cliente, ClienteFormInput, FiltrosCliente } from '../../types/client.types';
import { TIPOS_OBRA } from '../../types/client.types';
import ClienteForm from '../../components/forms/ClienteForm';

export default function Clientes() {
  const [todosLosClientes, setTodosLosClientes] = useState<Cliente[]>([]); // Para estadísticas
  const [clientes, setClientes] = useState<Cliente[]>([]); // Filtrados para la tabla
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<boolean | undefined>(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteDetalle, setClienteDetalle] = useState<Cliente | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarClientes();
  }, [filtroActivo]);

  async function cargarClientes() {
    setLoading(true);
    try {
      // Cargar todos para estadísticas
      const todosData = await obtenerClientes();
      setTodosLosClientes(todosData);

      // Aplicar filtro de activo
      if (filtroActivo !== undefined) {
        setClientes(todosData.filter(c => c.activo === filtroActivo));
      } else {
        setClientes(todosData);
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    } finally {
      setLoading(false);
    }
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.nombreComercial?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.rfc?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.contactoPrincipal?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.obras?.some(o => o.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

  function abrirModal(cliente?: Cliente) {
    if (cliente) {
      setClienteEditando(cliente);
    } else {
      setClienteEditando(null);
    }
    setModalAbierto(true);
  }

  async function handleGuardarCliente(data: ClienteFormInput) {
    setGuardando(true);
    try {
      if (clienteEditando) {
        await actualizarCliente(clienteEditando.id, data);
      } else {
        await crearCliente(data);
      }
      setModalAbierto(false);
      cargarClientes();
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      alert('Error al guardar el cliente');
    } finally {
      setGuardando(false);
    }
  }

  async function toggleActivoCliente(cliente: Cliente) {
    const accion = cliente.activo ? 'desactivar' : 'activar';
    const confirmacion = window.confirm(
      `¿Estás seguro de ${accion} al cliente "${cliente.nombreComercial || cliente.nombre}"?\n\n` +
      (cliente.activo
        ? 'El cliente no aparecerá en los selectores de viajes y órdenes de trabajo.'
        : 'El cliente volverá a estar disponible en los selectores.')
    );

    if (!confirmacion) return;

    try {
      if (cliente.activo) {
        await desactivarCliente(cliente.id);
      } else {
        await reactivarCliente(cliente.id);
      }
      cargarClientes();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar el estado del cliente');
    }
  }

  async function handleEliminarCliente(cliente: Cliente) {
    const confirmacion = window.confirm(
      `⚠️ ATENCIÓN: ¿Estás seguro de ELIMINAR PERMANENTEMENTE al cliente "${cliente.nombreComercial || cliente.nombre}"?\n\n` +
      `Esta acción NO se puede deshacer.\n` +
      `Se eliminarán todos los datos del cliente, incluyendo sus obras y contactos.\n\n` +
      `Si solo quieres que el cliente no aparezca en los selectores, usa "Desactivar" en su lugar.`
    );

    if (!confirmacion) return;

    // Segunda confirmación para eliminar
    const segundaConfirmacion = window.confirm(
      `¿Confirmas la eliminación definitiva de "${cliente.nombreComercial || cliente.nombre}"?`
    );

    if (!segundaConfirmacion) return;

    try {
      await eliminarCliente(cliente.id);
      cargarClientes();
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      alert('Error al eliminar el cliente');
    }
  }

  // Estadísticas generales (siempre del total, no filtrado)
  const totalClientes = todosLosClientes.length;
  const clientesActivos = todosLosClientes.filter(c => c.activo).length;
  const clientesInactivos = todosLosClientes.filter(c => !c.activo).length;
  const ingresoTotalClientes = todosLosClientes.reduce((sum, c) => sum + (c.estadisticas?.ingresoTotal || 0), 0);
  const viajesTotal = todosLosClientes.reduce((sum, c) => sum + (c.estadisticas?.totalViajes || 0), 0);

  // Preparar datos iniciales para el formulario
  function getInitialData(): Partial<ClienteFormInput> | undefined {
    if (!clienteEditando) return undefined;
    return {
      nombre: clienteEditando.nombre,
      nombreComercial: clienteEditando.nombreComercial || '',
      rfc: clienteEditando.rfc || '',
      contactoPrincipal: clienteEditando.contactoPrincipal || '',
      telefono: clienteEditando.telefono || '',
      email: clienteEditando.email || '',
      direccion: clienteEditando.direccion,
      obras: clienteEditando.obras?.map(o => ({
        id: o.id,
        nombre: o.nombre,
        alias: o.alias,
        tipo: o.tipo,
        direccion: o.direccion,
        contactos: (o.contactos || []).map(c => ({
          id: c.id,
          nombre: c.nombre,
          puesto: c.puesto,
          telefono: c.telefono,
          celular: c.celular,
          email: c.email,
          horarioDisponible: c.horarioDisponible,
          esPrincipal: c.esPrincipal,
        })),
        condicionesAcceso: o.condicionesAcceso,
        activa: o.activa,
        notas: o.notas,
        createdAt: o.createdAt,
      })),
      requiereFactura: clienteEditando.requiereFactura,
      diasCredito: clienteEditando.diasCredito,
      limiteCredito: clienteEditando.limiteCredito,
      notas: clienteEditando.notas || '',
    };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">Gestión de clientes, obras y sucursales</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="flex items-center gap-2 bg-[#BB0034] text-white px-4 py-2 rounded-lg hover:bg-[#9a002b]"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Clientes</p>
              <p className="text-xl font-bold">{totalClientes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activos</p>
              <p className="text-xl font-bold">{clientesActivos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Viajes Totales</p>
              <p className="text-xl font-bold">{viajesTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ingresos Totales</p>
              <p className="text-xl font-bold">${ingresoTotalClientes.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, RFC, contacto, obra..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltroActivo(undefined)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filtroActivo === undefined ? 'bg-[#BB0034] text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Todos ({totalClientes})
            </button>
            <button
              onClick={() => setFiltroActivo(true)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filtroActivo === true ? 'bg-[#BB0034] text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Activos ({clientesActivos})
            </button>
            <button
              onClick={() => setFiltroActivo(false)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filtroActivo === false ? 'bg-[#BB0034] text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Inactivos ({clientesInactivos})
            </button>
          </div>

          <button
            onClick={cargarClientes}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="w-8 h-8 border-4 border-[#BB0034] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Cargando clientes...
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron clientes
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">Cliente</th>
                  <th className="text-left p-4 font-medium text-gray-600">Contacto</th>
                  <th className="text-left p-4 font-medium text-gray-600">Ubicación</th>
                  <th className="text-center p-4 font-medium text-gray-600">Obras</th>
                  <th className="text-center p-4 font-medium text-gray-600">Viajes</th>
                  <th className="text-right p-4 font-medium text-gray-600">Ingresos</th>
                  <th className="text-center p-4 font-medium text-gray-600">Estado</th>
                  <th className="text-center p-4 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientesFiltrados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setClienteDetalle(cliente)}
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{cliente.nombre}</p>
                        {cliente.nombreComercial && (
                          <p className="text-sm text-gray-500">{cliente.nombreComercial}</p>
                        )}
                        {cliente.rfc && (
                          <p className="text-xs text-gray-400">{cliente.rfc}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {cliente.contactoPrincipal && (
                          <p className="text-sm">{cliente.contactoPrincipal}</p>
                        )}
                        {cliente.telefono && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {cliente.telefono}
                          </p>
                        )}
                        {cliente.email && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {cliente.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {cliente.direccion?.municipio}
                          {cliente.direccion?.estado && `, ${cliente.direccion.estado}`}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {(cliente.obras?.length || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          <Building2 className="w-3 h-3" />
                          {cliente.obras?.length}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-medium">
                        {cliente.estadisticas?.totalViajes || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-medium text-emerald-600">
                        ${(cliente.estadisticas?.ingresoTotal || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          cliente.activo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {cliente.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModal(cliente);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="Editar cliente"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActivoCliente(cliente);
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            cliente.activo
                              ? 'hover:bg-red-50 text-green-600'
                              : 'hover:bg-green-50 text-gray-400'
                          }`}
                          title={cliente.activo ? 'Desactivar cliente' : 'Activar cliente'}
                        >
                          {cliente.activo ? (
                            <ToggleRight className="w-5 h-5" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminarCliente(cliente);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors text-red-500 hover:text-red-700"
                          title="Eliminar cliente permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Crear/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">
                {clienteEditando ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={() => setModalAbierto(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <ClienteForm
                initialData={getInitialData()}
                onSubmit={handleGuardarCliente}
                onCancel={() => setModalAbierto(false)}
                isLoading={guardando}
                submitLabel={clienteEditando ? 'Guardar Cambios' : 'Crear Cliente'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {clienteDetalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold">{clienteDetalle.nombre}</h2>
                {clienteDetalle.nombreComercial && (
                  <p className="text-gray-500">{clienteDetalle.nombreComercial}</p>
                )}
              </div>
              <button onClick={() => setClienteDetalle(null)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Estadísticas del cliente */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{clienteDetalle.estadisticas?.totalViajes || 0}</p>
                  <p className="text-xs text-gray-500">Viajes Totales</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{clienteDetalle.estadisticas?.viajesUltimoMes || 0}</p>
                  <p className="text-xs text-gray-500">Viajes Este Mes</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    ${(clienteDetalle.estadisticas?.ingresoTotal || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Ingresos Totales</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">
                    ${(clienteDetalle.estadisticas?.promedioViajeMensual || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Promedio/Viaje</p>
                </div>
              </div>

              {/* Información de contacto */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#BB0034]" />
                    Contacto Corporativo
                  </h3>
                  <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-3">
                    {clienteDetalle.contactoPrincipal && (
                      <p><span className="text-gray-500">Contacto:</span> {clienteDetalle.contactoPrincipal}</p>
                    )}
                    {clienteDetalle.telefono && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {clienteDetalle.telefono}
                      </p>
                    )}
                    {clienteDetalle.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {clienteDetalle.email}
                      </p>
                    )}
                    {clienteDetalle.rfc && (
                      <p><span className="text-gray-500">RFC:</span> {clienteDetalle.rfc}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#BB0034]" />
                    Dirección Fiscal
                  </h3>
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <p>{clienteDetalle.direccion?.calle} {clienteDetalle.direccion?.numeroExterior}</p>
                    <p>{clienteDetalle.direccion?.colonia}</p>
                    <p>{clienteDetalle.direccion?.municipio}, {clienteDetalle.direccion?.estado}</p>
                    <p>C.P. {clienteDetalle.direccion?.codigoPostal}</p>
                  </div>
                </div>
              </div>

              {/* Obras/Sucursales */}
              {(clienteDetalle.obras?.length || 0) > 0 && (
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#BB0034]" />
                    Obras / Sucursales ({clienteDetalle.obras?.length})
                  </h3>
                  <div className="space-y-3">
                    {clienteDetalle.obras?.map((obra) => (
                      <div key={obra.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{obra.nombre}</p>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {TIPOS_OBRA.find(t => t.value === obra.tipo)?.label || obra.tipo}
                              </span>
                              {!obra.activa && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                                  Inactiva
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {obra.direccion?.calle} {obra.direccion?.numeroExterior}, {obra.direccion?.colonia}, {obra.direccion?.municipio}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>

                        {/* Contactos de la obra */}
                        {obra.contactos?.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                              <Users className="w-3 h-3" />
                              Contactos en sitio:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {obra.contactos.map((contacto) => (
                                <div
                                  key={contacto.id}
                                  className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center gap-1"
                                >
                                  {contacto.nombre}
                                  {contacto.puesto && <span className="text-blue-400">({contacto.puesto})</span>}
                                  {contacto.celular && (
                                    <span className="text-blue-500">• {contacto.celular}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Facturación */}
              <div>
                <h3 className="font-medium mb-3">Facturación y Crédito</h3>
                <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 rounded-lg p-3">
                  <div>
                    <p className="text-gray-500">Requiere Factura</p>
                    <p className="font-medium">{clienteDetalle.requiereFactura ? 'Sí' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Días de Crédito</p>
                    <p className="font-medium">{clienteDetalle.diasCredito} días</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Calificación de Pago</p>
                    <p className={`font-medium capitalize ${
                      clienteDetalle.estadisticas?.calificacionPago === 'excelente' ? 'text-green-600' :
                      clienteDetalle.estadisticas?.calificacionPago === 'bueno' ? 'text-blue-600' :
                      clienteDetalle.estadisticas?.calificacionPago === 'regular' ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {clienteDetalle.estadisticas?.calificacionPago || 'Sin calificar'}
                    </p>
                  </div>
                </div>
              </div>

              {clienteDetalle.notas && (
                <div>
                  <h3 className="font-medium mb-3">Notas</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {clienteDetalle.notas}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setClienteDetalle(null);
                  abrirModal(clienteDetalle);
                }}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => setClienteDetalle(null)}
                className="px-4 py-2 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
