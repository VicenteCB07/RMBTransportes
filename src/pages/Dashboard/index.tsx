/**
 * Dashboard Principal - KPIs en tiempo real
 * Integrado con todos los módulos de la plataforma
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Wrench,
  MapPin,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  Fuel,
  CreditCard,
  ClipboardList,
  Radio,
  ArrowRight,
  RefreshCw,
  Activity,
  Navigation,
} from 'lucide-react';
import { obtenerEstadisticasViajes } from '../../services/trip.service';
import { calcularKPIs } from '../../services/fuel.service';
import { obtenerEstadisticasCasetas } from '../../services/toll.service';
import { obtenerDashboardTelemetria } from '../../services/telemetry.service';

// Componente de tarjeta de estadística
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
  trend?: { value: number; positive: boolean };
}) {
  const colorClasses: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600' },
    red: { bg: 'bg-red-50', icon: 'text-red-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
  };

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-3 h-3 ${trend.positive ? '' : 'rotate-180'}`} />
              {trend.value}% vs mes anterior
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]?.bg || 'bg-gray-50'}`}>
          <Icon className={`w-6 h-6 ${colorClasses[color]?.icon || 'text-gray-600'}`} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    viajes: {
      totalViajes: 0,
      viajesCompletados: 0,
      viajesCancelados: 0,
      ingresoTotal: 0,
      costoTotal: 0,
      utilidadTotal: 0,
      margenPromedio: 0,
      kmTotales: 0,
    },
    combustible: {
      rendimientoFlota: 0,
      litrosTotales: 0,
      costoTotal: 0,
      precioPromedio: 0,
    },
    casetas: {
      totalCruces: 0,
      gastoTotal: 0,
      gastoPromedioDiario: 0,
    },
    telemetria: {
      vehiculosActivos: 0,
      alertasCriticas: 0,
    },
  });

  const [alertas, setAlertas] = useState<any[]>([]);

  useEffect(() => {
    cargarKPIs();
  }, []);

  async function cargarKPIs() {
    setLoading(true);
    try {
      // Calcular fechas del mes actual
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const [viajesStats, fuelKPIs, casetasStats, telemetriaData] = await Promise.all([
        obtenerEstadisticasViajes(inicioMes).catch(() => ({
          totalViajes: 0,
          viajesCompletados: 0,
          viajesCancelados: 0,
          ingresoTotal: 0,
          costoTotal: 0,
          utilidadTotal: 0,
          margenPromedio: 0,
          kmTotales: 0,
        })),
        calcularKPIs(inicioMes).catch(() => null),
        obtenerEstadisticasCasetas(inicioMes).catch(() => ({
          totalCruces: 0,
          gastoTotal: 0,
          gastoPromedioDiario: 0,
        })),
        obtenerDashboardTelemetria().catch(() => ({
          estadisticasHoy: { vehiculosActivos: 0, alertasCriticas: 0 },
          alertasActivas: [],
        })),
      ]);

      setKpis({
        viajes: viajesStats,
        combustible: {
          rendimientoFlota: fuelKPIs?.rendimientoPromedioFlota || 0,
          litrosTotales: fuelKPIs?.litrosTotalMes || 0,
          costoTotal: fuelKPIs?.gastoTotalMes || 0,
          precioPromedio: fuelKPIs?.costoPromedioLitro || 25.70,
        },
        casetas: {
          totalCruces: casetasStats.totalCruces,
          gastoTotal: casetasStats.gastoTotal,
          gastoPromedioDiario: casetasStats.gastoPromedioDiario,
        },
        telemetria: {
          vehiculosActivos: telemetriaData.estadisticasHoy?.vehiculosActivos || 0,
          alertasCriticas: telemetriaData.estadisticasHoy?.alertasCriticas || 0,
        },
      });

      // Alertas del sistema
      const alertasActivas = telemetriaData.alertasActivas || [];
      setAlertas(alertasActivas.slice(0, 5).map((a: any) => ({
        tipo: 'telemetria',
        mensaje: `${a.alias}: ${a.tipoAlerta}`,
        fecha: a.timestamp ? new Date(a.timestamp).toLocaleString('es-MX') : 'Reciente',
      })));

    } catch (error) {
      console.error('Error al cargar KPIs:', error);
    } finally {
      setLoading(false);
    }
  }

  // Datos de ejemplo para viajes recientes (en producción vendría de la API)
  const viajesEjemplo = [
    { id: 1, folio: '151225-EN-T08-1', destino: 'TIZAYUCA', cliente: 'CORPORACION MACIO', status: 'completado' },
    { id: 2, folio: '151225-RE-T09-1', destino: 'TEOTIHUACAN', cliente: 'GRUPO SPI', status: 'en_curso' },
    { id: 3, folio: '151225-EN-T11-1', destino: 'ECATEPEC', cliente: 'NEON', status: 'programado' },
  ];

  const getEstadoBadge = (estado: string) => {
    const estilos: Record<string, string> = {
      en_curso: 'bg-blue-100 text-blue-700',
      completado: 'bg-green-100 text-green-700',
      programado: 'bg-amber-100 text-amber-700',
      cancelado: 'bg-red-100 text-red-700',
      en_destino: 'bg-purple-100 text-purple-700',
    };
    const etiquetas: Record<string, string> = {
      en_curso: 'En Curso',
      completado: 'Completado',
      programado: 'Programado',
      cancelado: 'Cancelado',
      en_destino: 'En Destino',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${estilos[estado] || 'bg-gray-100'}`}>
        {etiquetas[estado] || estado}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Resumen general de operaciones - {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</p>
        </div>
        <button
          onClick={cargarKPIs}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard
          title="Viajes del Mes"
          value={kpis.viajes.totalViajes}
          icon={ClipboardList}
          color="blue"
        />
        <StatCard
          title="Completados"
          value={kpis.viajes.viajesCompletados}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Km Recorridos"
          value={kpis.viajes.kmTotales.toLocaleString()}
          icon={Navigation}
          color="purple"
        />
        <StatCard
          title="Vehículos Activos"
          value={kpis.telemetria.vehiculosActivos || 6}
          icon={Truck}
          color="blue"
        />
        <StatCard
          title="Ingresos"
          value={`$${(kpis.viajes.ingresoTotal / 1000).toFixed(0)}k`}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Costos"
          value={`$${(kpis.viajes.costoTotal / 1000).toFixed(0)}k`}
          icon={DollarSign}
          color="red"
        />
        <StatCard
          title="Utilidad"
          value={`$${(kpis.viajes.utilidadTotal / 1000).toFixed(0)}k`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Margen"
          value={`${kpis.viajes.margenPromedio.toFixed(1)}%`}
          icon={Activity}
          color="amber"
        />
      </div>

      {/* Segunda fila de KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Combustible"
          value={`${kpis.combustible.litrosTotales.toLocaleString()} L`}
          icon={Fuel}
          color="amber"
          subtitle={`$${kpis.combustible.costoTotal.toLocaleString()} total`}
        />
        <StatCard
          title="Rendimiento Flota"
          value={`${kpis.combustible.rendimientoFlota.toFixed(2)} km/L`}
          icon={Fuel}
          color="green"
        />
        <StatCard
          title="Casetas"
          value={`$${kpis.casetas.gastoTotal.toLocaleString()}`}
          icon={CreditCard}
          color="purple"
          subtitle={`${kpis.casetas.totalCruces.toLocaleString()} cruces`}
        />
        <StatCard
          title="Alertas"
          value={kpis.telemetria.alertasCriticas}
          icon={AlertTriangle}
          color={kpis.telemetria.alertasCriticas > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Viajes recientes */}
        <div className="lg:col-span-2 bg-white rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Viajes Recientes
            </h2>
            <Link to="/viajes" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y">
            {viajesEjemplo.map((viaje) => (
              <div key={viaje.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <MapPin size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{viaje.folio}</p>
                      <p className="text-sm text-gray-500">
                        {viaje.destino} • {viaje.cliente}
                      </p>
                    </div>
                  </div>
                  {getEstadoBadge(viaje.status)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Alertas */}
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Alertas Activas
              </h2>
            </div>
            <div className="divide-y">
              {alertas.length > 0 ? alertas.map((alerta, i) => (
                <div key={i} className="p-3 hover:bg-gray-50">
                  <div className="flex gap-3">
                    <div className="p-1.5 bg-red-100 rounded h-fit">
                      <AlertTriangle size={14} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">{alerta.mensaje}</p>
                      <p className="text-xs text-gray-400 mt-1">{alerta.fecha}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-6 text-center text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">Sin alertas activas</p>
                </div>
              )}
            </div>
          </div>

          {/* Accesos rápidos */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Accesos Rápidos</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/viajes" className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">Nuevo Viaje</span>
              </Link>
              <Link to="/rutas" className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <MapPin className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">Planificar Ruta</span>
              </Link>
              <Link to="/combustible" className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Fuel className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium">Cargar Combustible</span>
              </Link>
              <Link to="/telemetria" className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Radio className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium">Ver Flota GPS</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Estado de la flota */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Estado de la Flota
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <CheckCircle className="mx-auto text-green-600 mb-2" size={32} />
            <p className="text-2xl font-bold text-green-700">4</p>
            <p className="text-sm text-green-600">Disponibles</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <MapPin className="mx-auto text-blue-600 mb-2" size={32} />
            <p className="text-2xl font-bold text-blue-700">2</p>
            <p className="text-sm text-blue-600">En Ruta</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-xl">
            <Wrench className="mx-auto text-amber-600 mb-2" size={32} />
            <p className="text-2xl font-bold text-amber-700">0</p>
            <p className="text-sm text-amber-600">Mantenimiento</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <Clock className="mx-auto text-gray-600 mb-2" size={32} />
            <p className="text-2xl font-bold text-gray-700">0</p>
            <p className="text-sm text-gray-600">Fuera de Servicio</p>
          </div>
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
        <h2 className="font-semibold mb-4">Resumen Financiero del Mes</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <p className="text-gray-400 text-sm">Ingresos por Fletes</p>
            <p className="text-2xl font-bold">${kpis.viajes.ingresoTotal.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Costo Combustible</p>
            <p className="text-2xl font-bold text-amber-400">${kpis.combustible.costoTotal.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Gasto Casetas</p>
            <p className="text-2xl font-bold text-purple-400">${kpis.casetas.gastoTotal.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Otros Costos</p>
            <p className="text-2xl font-bold text-red-400">
              ${(kpis.viajes.costoTotal - kpis.combustible.costoTotal - kpis.casetas.gastoTotal).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Utilidad Neta</p>
            <p className={`text-2xl font-bold ${kpis.viajes.utilidadTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${kpis.viajes.utilidadTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
