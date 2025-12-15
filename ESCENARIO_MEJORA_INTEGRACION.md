# Escenario de Mejora: Integración Excel → Plataforma RMB Transportes

## Análisis del Sistema Actual

### Estructura del Archivo "Archivo de control - RTR.xlsm"

| Hoja | Registros | Función Principal |
|------|-----------|-------------------|
| **Bitacora** | 645 viajes | Control maestro de operaciones |
| **Casetas** | 10,632 cruces | Registro de peajes |
| **Combustibles** | Por vehículo | Cargas y rendimiento |
| **Recorridos** | +1,000,000 | Telemetría GPS |
| **Catalogos** | Múltiple | Catálogos maestros |

### Datos Clave Identificados

**Flota Operativa:**
- TRC02 (5-6 ejes), TRC07, TRC08, TRC09, TRC10, TRC11
- Seguro diario: $87 - $696 según unidad

**Operadores Activos:**
- Kevin Cristian Hernández, Moisés Ortiz, Luis Rojas, Celso Néstor
- Sueldo diario: $315 - $559

**Clientes:** 297 únicos
**Destinos:** 130 ubicaciones frecuentes
**Período de datos:** Jul 2025 - Dic 2025

---

## Problemas del Sistema Actual

### 1. Fragmentación de Datos
- Información dispersa en 9 hojas de Excel
- Relaciones manuales entre hojas (Folio como clave)
- Riesgo de inconsistencias al actualizar

### 2. Procesos Manuales
- Cálculo manual de costos totales por viaje
- Correlación manual casetas ↔ viaje
- Sin validación automática de datos

### 3. Limitaciones de Análisis
- Difícil obtener KPIs en tiempo real
- Gráficas estáticas en hoja separada
- Sin alertas automáticas

### 4. Acceso y Colaboración
- Archivo local (riesgo de pérdida)
- Un solo usuario puede editar
- Sin acceso móvil en campo

### 5. Telemetría Desaprovechada
- +1M de registros GPS sin integración
- Sin correlación automática con viajes
- Eventos de conducción no analizados

---

## Mapeo de Migración: Excel → Plataforma RMB

### BITÁCORA → Módulo de Rutas + Viajes

| Campo Excel | Campo Plataforma | Módulo |
|-------------|------------------|--------|
| Folio | `viajeId` (auto) | Rutas |
| Fecha | `fechaInicio` | Rutas |
| HR_Inicio/Llegada/Partida/Final | `tiempos.*` | Rutas |
| Tracto | `vehiculoId` | Rutas (rel. Flota) |
| Operador | `operadorId` | Rutas (rel. Usuarios) |
| Cliente | `clienteId` | Rutas (nuevo: Clientes) |
| Destino | `destino.direccion` | Rutas (geocodificado) |
| Distancia | `distanciaKm` | Rutas (calculado) |
| Tipo | `tipoServicio` | Rutas |
| Sueldos/Seguros/Casetas/Combustible | `costos.*` | Finanzas |
| Precio del flete | `ingresos.flete` | Finanzas |
| Resultado | `utilidad` (calculado) | Finanzas |

### CASETAS → Módulo de Rutas (Peajes)

| Campo Excel | Campo Plataforma | Integración |
|-------------|------------------|-------------|
| No.Economico | `vehiculoId` | Relación automática |
| Fecha/Hora | `timestamp` | Correlación con viaje |
| Caseta | `nombreCaseta` | Catálogo de casetas |
| Importe | `costo` | Acumulado en viaje |

**Mejora:** Correlación automática caseta → viaje activo por vehículo y timestamp.

### COMBUSTIBLES → Módulo de Combustible (YA IMPLEMENTADO)

| Campo Excel | Campo Plataforma | Estado |
|-------------|------------------|--------|
| Fecha de ultima carga | `fecha` | ✅ Listo |
| $ carga | `costoTotal` | ✅ Listo |
| Litros cargados | `litros` | ✅ Listo |
| Km final | `odometro` | ✅ Listo |
| Rendimiento | `rendimientoKmL` (auto) | ✅ Listo |

### CATÁLOGOS → Módulos Existentes

| Catálogo Excel | Módulo Plataforma | Estado |
|----------------|-------------------|--------|
| Tractos | Flota | ✅ Parcial |
| Operadores | Usuarios | ✅ Parcial |
| Cajas | Flota (remolques) | ⚠️ Ampliar |
| Maniobristas | Usuarios (rol) | ⚠️ Agregar rol |

### RECORRIDOS → Nuevo: Módulo de Telemetría

| Campo Excel | Funcionalidad Propuesta |
|-------------|------------------------|
| Fecha/Hora | Timeline de eventos |
| Alias (vehículo) | Tracking por unidad |
| Odometro | Validación automática |
| Evento | Dashboard de conducción |

---

## Arquitectura de Mejora Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATAFORMA RMB TRANSPORTES               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   FLOTA     │  │  USUARIOS   │  │      CLIENTES       │ │
│  │  Vehículos  │  │  Operadores │  │  297 empresas       │ │
│  │  Remolques  │  │  Maniobristas│  │  Contactos          │ │
│  │  Seguros/día│  │  Sueldos/día│  │  Direcciones        │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│         └────────────────┼─────────────────────┘            │
│                          │                                  │
│                    ┌─────┴─────┐                           │
│                    │   RUTAS   │◄──── Mapbox Integration   │
│                    │           │                           │
│                    │ • Origen: Tecámac (default)          │
│                    │ • Destinos: 130 frecuentes           │
│                    │ • Optimización multi-parada          │
│                    │ • Restricciones: Hoy No Circula      │
│                    │ • Tiempos estimados vs reales        │
│                    └─────┬─────┘                           │
│                          │                                  │
│         ┌────────────────┼────────────────┐                │
│         │                │                │                │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐       │
│  │ COMBUSTIBLE │  │   CASETAS   │  │ TELEMETRÍA  │       │
│  │             │  │             │  │             │       │
│  │ ✅ Cargas   │  │ Auto-import │  │ GPS Events  │       │
│  │ ✅ Rendim.  │  │ Correlación │  │ Conducción  │       │
│  │ ✅ KPIs     │  │ viaje       │  │ Alertas     │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                │                │                │
│         └────────────────┼────────────────┘                │
│                          │                                  │
│                    ┌─────┴─────┐                           │
│                    │ FINANZAS  │                           │
│                    │           │                           │
│                    │ • Costos automáticos                 │
│                    │ • Ingresos por flete                 │
│                    │ • Utilidad por viaje                 │
│                    │ • Reportes exportables               │
│                    └───────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Plan de Implementación

### Fase 1: Catálogos Base (Prioridad Alta)

1. **Ampliar módulo Flota**
   - Agregar campos: seguro/día, código, configuración de ejes
   - Migrar 8 tractocamiones del catálogo

2. **Ampliar módulo Usuarios**
   - Agregar roles: operador, maniobrista, asesor
   - Campos: sueldo/día, seguro IMSS, estatus activo
   - Migrar 12 operadores del catálogo

3. **Crear módulo Clientes**
   - Datos: nombre, contacto, dirección (geocodificada)
   - Migrar 297 clientes únicos
   - Historial de servicios

### Fase 2: Viajes y Operación

4. **Crear sistema de Viajes**
   - Integrar con módulo Rutas existente
   - Tiempos: inicio, llegada, espera, partida, final
   - Cálculo automático de tiempo muerto
   - Folio auto-generado con formato: `DDMMYY-TIPO-UNIDAD-#`

5. **Integrar costos automáticos**
   - Sueldo = tarifa operador × días
   - Seguro = tarifa vehículo × días
   - Combustible = km × rendimiento real × precio/L
   - Casetas = correlación automática

### Fase 3: Automatizaciones

6. **Módulo de Casetas**
   - Importación de movimientos IAVE/TAG
   - Correlación automática con viaje activo
   - Detección de anomalías

7. **Módulo de Telemetría**
   - Integración con proveedor GPS actual
   - Dashboard de eventos de conducción
   - Validación de odómetros

### Fase 4: Inteligencia de Negocio

8. **Dashboard Ejecutivo**
   - KPIs en tiempo real
   - Comparativos vs período anterior
   - Alertas proactivas

9. **Reportería Avanzada**
   - Exportación PDF/Excel
   - Reportes programados
   - Análisis de rentabilidad por cliente/ruta

---

## Beneficios Esperados

| Aspecto | Actual (Excel) | Plataforma RMB |
|---------|---------------|----------------|
| **Acceso** | Local, 1 usuario | Multi-usuario, móvil |
| **Consistencia** | Manual | Validación automática |
| **Costos** | Cálculo manual | Auto-calculado |
| **KPIs** | Gráficas estáticas | Tiempo real |
| **Casetas** | 10K registros sin correlación | Auto-correlación |
| **GPS** | 1M registros sin usar | Dashboard activo |
| **Respaldo** | Riesgo de pérdida | Cloud automático |
| **Análisis** | Horas de trabajo | Instantáneo |

---

## Próximos Pasos Inmediatos

1. **Importador de Datos**
   - Crear script de migración Excel → Firebase
   - Validar integridad de datos
   - Ejecutar migración inicial

2. **Completar Catálogos**
   - Formularios de alta para clientes
   - Edición de vehículos con nuevos campos
   - Gestión de operadores

3. **Módulo de Viajes**
   - UI para registro de nuevo viaje
   - Integración con planificador de rutas
   - Cálculo automático de costos

---

*Documento generado: Diciembre 2025*
*Análisis basado en: Archivo de control - RTR.xlsm (645 viajes, Jul-Dic 2025)*
