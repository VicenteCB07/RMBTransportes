/**
 * Componente reutilizable para formulario de Cliente
 * Se usa en: Catálogos/Clientes y modal de Viajes
 */

import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { consultarCodigoPostal, ESTADOS_MEXICO } from '../../services/codigopostal.service';
import type {
  ClienteFormInput,
  ObraFormInput,
  ContactoObraInput,
  TipoObra,
} from '../../types/client.types';
import { TIPOS_OBRA } from '../../types/client.types';

interface ClienteFormProps {
  initialData?: Partial<ClienteFormInput>;
  onSubmit: (data: ClienteFormInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

// Estado inicial para dirección vacía
const DIRECCION_VACIA = {
  calle: '',
  numeroExterior: '',
  colonia: '',
  municipio: '',
  estado: '',
  codigoPostal: '',
  pais: 'México',
};

// Estado inicial para contacto vacío
const CONTACTO_VACIO: ContactoObraInput = {
  nombre: '',
  puesto: '',
  telefono: '',
  celular: '',
  email: '',
  esPrincipal: true,
};

// Estado inicial para obra vacía
const OBRA_VACIA: ObraFormInput = {
  nombre: '',
  alias: '',
  tipo: 'obra',
  direccion: { ...DIRECCION_VACIA },
  contactos: [{ ...CONTACTO_VACIO }],
  notas: '',
};

export default function ClienteForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Guardar Cliente',
}: ClienteFormProps) {
  // Estado del formulario
  const [formData, setFormData] = useState<ClienteFormInput>({
    nombre: '',
    nombreComercial: '',
    rfc: '',
    contactoPrincipal: '',
    telefono: '',
    email: '',
    direccion: { ...DIRECCION_VACIA },
    obras: [],
    requiereFactura: false,
    diasCredito: 0,
    notas: '',
    ...initialData,
  });

  // Estados de UI
  const [coloniasDisponibles, setColoniasDisponibles] = useState<string[]>([]);
  const [buscandoCp, setBuscandoCp] = useState(false);
  const [obrasExpandidas, setObrasExpandidas] = useState<Set<number>>(new Set([0]));
  const [mostrarObras, setMostrarObras] = useState((initialData?.obras?.length || 0) > 0);

  // Colonias por obra (índice -> colonias[])
  const [coloniasObras, setColoniasObras] = useState<Map<number, string[]>>(new Map());
  const [buscandoCpObra, setBuscandoCpObra] = useState<number | null>(null);

  // Consultar CP para dirección fiscal
  async function handleCodigoPostalChange(cp: string) {
    setFormData({
      ...formData,
      direccion: { ...formData.direccion, codigoPostal: cp },
    });

    if (cp.length === 5) {
      setBuscandoCp(true);
      try {
        const datos = await consultarCodigoPostal(cp);
        if (datos) {
          setColoniasDisponibles(datos.colonias);
          setFormData((prev) => ({
            ...prev,
            direccion: {
              ...prev.direccion,
              estado: datos.estado,
              municipio: datos.municipio,
              colonia: datos.colonias.length === 1 ? datos.colonias[0] : prev.direccion?.colonia || '',
            },
          }));
        } else {
          setColoniasDisponibles([]);
        }
      } catch (error) {
        console.error('Error consultando CP:', error);
        setColoniasDisponibles([]);
      } finally {
        setBuscandoCp(false);
      }
    } else {
      setColoniasDisponibles([]);
    }
  }

  // Consultar CP para obra
  async function handleCodigoPostalObraChange(obraIndex: number, cp: string) {
    const obras = [...(formData.obras || [])];
    obras[obraIndex] = {
      ...obras[obraIndex],
      direccion: { ...obras[obraIndex].direccion, codigoPostal: cp },
    };
    setFormData({ ...formData, obras });

    if (cp.length === 5) {
      setBuscandoCpObra(obraIndex);
      try {
        const datos = await consultarCodigoPostal(cp);
        if (datos) {
          const nuevasColonias = new Map(coloniasObras);
          nuevasColonias.set(obraIndex, datos.colonias);
          setColoniasObras(nuevasColonias);

          const obrasActualizadas = [...(formData.obras || [])];
          obrasActualizadas[obraIndex] = {
            ...obrasActualizadas[obraIndex],
            direccion: {
              ...obrasActualizadas[obraIndex].direccion,
              estado: datos.estado,
              municipio: datos.municipio,
              colonia: datos.colonias.length === 1 ? datos.colonias[0] : obrasActualizadas[obraIndex].direccion?.colonia || '',
            },
          };
          setFormData({ ...formData, obras: obrasActualizadas });
        }
      } catch (error) {
        console.error('Error consultando CP obra:', error);
      } finally {
        setBuscandoCpObra(null);
      }
    }
  }

  // Agregar obra
  function agregarObra() {
    const obras = [...(formData.obras || []), { ...OBRA_VACIA, contactos: [{ ...CONTACTO_VACIO }] }];
    setFormData({ ...formData, obras });
    setObrasExpandidas(new Set([...obrasExpandidas, obras.length - 1]));
    setMostrarObras(true);
  }

  // Eliminar obra
  function eliminarObra(index: number) {
    const obras = formData.obras?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, obras });
    const nuevasExpandidas = new Set<number>();
    obrasExpandidas.forEach((i) => {
      if (i < index) nuevasExpandidas.add(i);
      else if (i > index) nuevasExpandidas.add(i - 1);
    });
    setObrasExpandidas(nuevasExpandidas);
  }

  // Actualizar obra
  function actualizarObra(index: number, campo: keyof ObraFormInput, valor: unknown) {
    const obras = [...(formData.obras || [])];
    obras[index] = { ...obras[index], [campo]: valor };
    setFormData({ ...formData, obras });
  }

  // Agregar contacto a obra
  function agregarContacto(obraIndex: number) {
    const obras = [...(formData.obras || [])];
    obras[obraIndex] = {
      ...obras[obraIndex],
      contactos: [...obras[obraIndex].contactos, { ...CONTACTO_VACIO, esPrincipal: false }],
    };
    setFormData({ ...formData, obras });
  }

  // Eliminar contacto de obra
  function eliminarContacto(obraIndex: number, contactoIndex: number) {
    const obras = [...(formData.obras || [])];
    obras[obraIndex] = {
      ...obras[obraIndex],
      contactos: obras[obraIndex].contactos.filter((_, i) => i !== contactoIndex),
    };
    setFormData({ ...formData, obras });
  }

  // Actualizar contacto
  function actualizarContacto(
    obraIndex: number,
    contactoIndex: number,
    campo: keyof ContactoObraInput,
    valor: unknown
  ) {
    const obras = [...(formData.obras || [])];
    const contactos = [...obras[obraIndex].contactos];
    contactos[contactoIndex] = { ...contactos[contactoIndex], [campo]: valor };
    obras[obraIndex] = { ...obras[obraIndex], contactos };
    setFormData({ ...formData, obras });
  }

  // Toggle expandir obra
  function toggleObra(index: number) {
    const nuevas = new Set(obrasExpandidas);
    if (nuevas.has(index)) {
      nuevas.delete(index);
    } else {
      nuevas.add(index);
    }
    setObrasExpandidas(nuevas);
  }

  // Submit
  async function handleSubmit() {
    if (!formData.nombre.trim()) {
      alert('El nombre del cliente es requerido');
      return;
    }
    await onSubmit(formData);
  }

  return (
    <div className="space-y-6">
      {/* Información Básica */}
      <div>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#BB0034]" />
          Información Básica
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre / Razón Social *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
              placeholder="Nombre completo o razón social"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Comercial
              </label>
              <input
                type="text"
                value={formData.nombreComercial || ''}
                onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
              <input
                type="text"
                value={formData.rfc || ''}
                onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                maxLength={13}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contacto Corporativo */}
      <div>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Phone className="w-4 h-4 text-[#BB0034]" />
          Contacto Corporativo
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contacto Principal</label>
            <input
              type="text"
              value={formData.contactoPrincipal || ''}
              onChange={(e) => setFormData({ ...formData, contactoPrincipal: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={formData.telefono || ''}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Dirección Fiscal */}
      <div>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#BB0034]" />
          Dirección Fiscal
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.direccion?.codigoPostal ?? ''}
                  onChange={(e) => handleCodigoPostalChange(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                  maxLength={5}
                  placeholder="01000"
                />
                {buscandoCp && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#BB0034] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={formData.direccion?.estado || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    direccion: { ...formData.direccion, estado: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none bg-gray-50"
              >
                <option value="">Seleccionar...</option>
                {ESTADOS_MEXICO.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Municipio</label>
              <input
                type="text"
                value={formData.direccion?.municipio || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    direccion: { ...formData.direccion, municipio: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Colonia</label>
            {coloniasDisponibles.length > 0 ? (
              <select
                value={formData.direccion?.colonia || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    direccion: { ...formData.direccion, colonia: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
              >
                <option value="">Seleccionar colonia...</option>
                {coloniasDisponibles.map((colonia) => (
                  <option key={colonia} value={colonia}>
                    {colonia}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.direccion?.colonia || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    direccion: { ...formData.direccion, colonia: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                placeholder="Ingresa el CP para ver colonias"
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Calle</label>
              <input
                type="text"
                value={formData.direccion?.calle || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    direccion: { ...formData.direccion, calle: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número Exterior</label>
              <input
                type="text"
                value={formData.direccion?.numeroExterior || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    direccion: { ...formData.direccion, numeroExterior: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Obras / Sucursales */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setMostrarObras(!mostrarObras)}
          className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#BB0034]" />
            <span className="font-medium">Obras / Sucursales</span>
            <span className="text-xs text-gray-500">
              ({formData.obras?.length || 0} registradas)
            </span>
          </div>
          {mostrarObras ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {mostrarObras && (
          <div className="p-4 space-y-4">
            {formData.obras?.map((obra, obraIndex) => (
              <div key={obraIndex} className="border rounded-lg">
                {/* Header de obra */}
                <div
                  className="p-3 bg-gray-100 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleObra(obraIndex)}
                >
                  <div className="flex items-center gap-2">
                    {obrasExpandidas.has(obraIndex) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {obra.nombre || `Obra ${obraIndex + 1}`}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                      {TIPOS_OBRA.find((t) => t.value === obra.tipo)?.label || obra.tipo}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarObra(obraIndex);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Contenido de obra */}
                {obrasExpandidas.has(obraIndex) && (
                  <div className="p-4 space-y-4">
                    {/* Info básica obra */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre de la Obra *
                        </label>
                        <input
                          type="text"
                          value={obra.nombre}
                          onChange={(e) => actualizarObra(obraIndex, 'nombre', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                          placeholder="Ej: Planta Monterrey"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alias</label>
                        <input
                          type="text"
                          value={obra.alias || ''}
                          onChange={(e) => actualizarObra(obraIndex, 'alias', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                          placeholder="Nombre corto"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                        <select
                          value={obra.tipo}
                          onChange={(e) => actualizarObra(obraIndex, 'tipo', e.target.value as TipoObra)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
                        >
                          {TIPOS_OBRA.map((tipo) => (
                            <option key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Dirección de obra */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Dirección
                      </h4>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-3">
                          <label className="block text-xs text-gray-600 mb-1">Código Postal</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={obra.direccion?.codigoPostal ?? ''}
                              onChange={(e) =>
                                handleCodigoPostalObraChange(obraIndex, e.target.value.replace(/\D/g, ''))
                              }
                              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none font-mono"
                              maxLength={5}
                              placeholder="01000"
                            />
                            {buscandoCpObra === obraIndex && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-[#BB0034] border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-span-4">
                          <label className="block text-xs text-gray-600 mb-1">Estado</label>
                          <input
                            type="text"
                            value={obra.direccion?.estado || ''}
                            onChange={(e) => {
                              const obras = [...(formData.obras || [])];
                              obras[obraIndex] = {
                                ...obras[obraIndex],
                                direccion: { ...obras[obraIndex].direccion, estado: e.target.value },
                              };
                              setFormData({ ...formData, obras });
                            }}
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none bg-white"
                          />
                        </div>
                        <div className="col-span-5">
                          <label className="block text-xs text-gray-600 mb-1">Municipio</label>
                          <input
                            type="text"
                            value={obra.direccion?.municipio || ''}
                            onChange={(e) => {
                              const obras = [...(formData.obras || [])];
                              obras[obraIndex] = {
                                ...obras[obraIndex],
                                direccion: { ...obras[obraIndex].direccion, municipio: e.target.value },
                              };
                              setFormData({ ...formData, obras });
                            }}
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Colonia</label>
                        {(coloniasObras.get(obraIndex)?.length || 0) > 0 ? (
                          <select
                            value={obra.direccion?.colonia || ''}
                            onChange={(e) => {
                              const obras = [...(formData.obras || [])];
                              obras[obraIndex] = {
                                ...obras[obraIndex],
                                direccion: { ...obras[obraIndex].direccion, colonia: e.target.value },
                              };
                              setFormData({ ...formData, obras });
                            }}
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                          >
                            <option value="">Seleccionar colonia...</option>
                            {coloniasObras.get(obraIndex)?.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={obra.direccion?.colonia || ''}
                            onChange={(e) => {
                              const obras = [...(formData.obras || [])];
                              obras[obraIndex] = {
                                ...obras[obraIndex],
                                direccion: { ...obras[obraIndex].direccion, colonia: e.target.value },
                              };
                              setFormData({ ...formData, obras });
                            }}
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                            placeholder="Ingresa CP para ver colonias"
                          />
                        )}
                      </div>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-9">
                          <label className="block text-xs text-gray-600 mb-1">Calle</label>
                          <input
                            type="text"
                            value={obra.direccion?.calle || ''}
                            onChange={(e) => {
                              const obras = [...(formData.obras || [])];
                              obras[obraIndex] = {
                                ...obras[obraIndex],
                                direccion: { ...obras[obraIndex].direccion, calle: e.target.value },
                              };
                              setFormData({ ...formData, obras });
                            }}
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs text-gray-600 mb-1">No. Ext</label>
                          <input
                            type="text"
                            value={obra.direccion?.numeroExterior || ''}
                            onChange={(e) => {
                              const obras = [...(formData.obras || [])];
                              obras[obraIndex] = {
                                ...obras[obraIndex],
                                direccion: { ...obras[obraIndex].direccion, numeroExterior: e.target.value },
                              };
                              setFormData({ ...formData, obras });
                            }}
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#BB0034] outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contactos de obra */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <User className="w-3 h-3" /> Contactos en Sitio
                        </h4>
                        <button
                          type="button"
                          onClick={() => agregarContacto(obraIndex)}
                          className="text-xs text-[#BB0034] hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Agregar contacto
                        </button>
                      </div>

                      {obra.contactos.map((contacto, contactoIndex) => (
                        <div
                          key={contactoIndex}
                          className="bg-blue-50 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-blue-700">
                              Contacto {contactoIndex + 1}
                              {contacto.esPrincipal && ' (Principal)'}
                            </span>
                            {obra.contactos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => eliminarContacto(obraIndex, contactoIndex)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <input
                                type="text"
                                value={contacto.nombre}
                                onChange={(e) =>
                                  actualizarContacto(obraIndex, contactoIndex, 'nombre', e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-[#BB0034] outline-none"
                                placeholder="Nombre"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                value={contacto.puesto || ''}
                                onChange={(e) =>
                                  actualizarContacto(obraIndex, contactoIndex, 'puesto', e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-[#BB0034] outline-none"
                                placeholder="Puesto"
                              />
                            </div>
                            <div>
                              <input
                                type="tel"
                                value={contacto.celular || ''}
                                onChange={(e) =>
                                  actualizarContacto(obraIndex, contactoIndex, 'celular', e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-[#BB0034] outline-none"
                                placeholder="Celular"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={agregarObra}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#BB0034] hover:text-[#BB0034] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Obra / Sucursal
            </button>
          </div>
        )}
      </div>

      {/* Configuración Comercial */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requiereFactura}
              onChange={(e) => setFormData({ ...formData, requiereFactura: e.target.checked })}
              className="rounded border-gray-300 text-[#BB0034] focus:ring-[#BB0034]"
            />
            <span className="text-sm">Requiere factura</span>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Días de crédito</label>
          <input
            type="number"
            value={formData.diasCredito}
            onChange={(e) => setFormData({ ...formData, diasCredito: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
            min={0}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Límite de crédito</label>
          <input
            type="number"
            value={formData.limiteCredito || ''}
            onChange={(e) =>
              setFormData({ ...formData, limiteCredito: e.target.value ? parseFloat(e.target.value) : undefined })
            }
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
            placeholder="Sin límite"
            min={0}
          />
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          value={formData.notas || ''}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#BB0034] focus:border-[#BB0034] outline-none"
          rows={2}
          placeholder="Observaciones adicionales..."
        />
      </div>

      {/* Botones - sticky para siempre estar visibles */}
      <div className="flex justify-end gap-3 pt-4 border-t bg-white sticky bottom-0 -mx-6 px-6 pb-2 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          disabled={isLoading}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="px-6 py-2.5 bg-[#BB0034] text-white rounded-lg hover:bg-[#9a002b] disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
