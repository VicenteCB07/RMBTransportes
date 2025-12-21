# Notas de Desarrollo - RMB Transportes

## Sesion 21 Dic 2025

### Trabajo realizado:
1. Plan de Trabajo PDF - Version operador (sin costos)
2. Plan de Trabajo PDF - Version administracion (con costos completos)
3. Servicio plantrabajo.service.ts para preparar datos
4. Botones de exportar PDF en pagina Rutas
5. Panel de optimizacion oculto por defecto en Planificador
6. Filtros de status corregidos en Viajes
7. Viajes completados/en curso bloqueados en Planificador
8. Iconos de tipo servicio en Planificador
9. Modal de reagendamiento para Flete en falso

### Archivos nuevos:
- `src/services/plantrabajo.service.ts`
- `src/components/pdf/PlanTrabajoOperadorPDF.tsx`
- `src/components/pdf/PlanTrabajoAdminPDF.tsx`

### Notas tecnicas:
- PDF usa @react-pdf/renderer (ya instalado)
- Exporta desde Rutas > Itinerario > seleccionar unidad > botones Operador/Admin
- Nombre archivo: plan-trabajo-{unidad}-{fecha}-{tipo}.pdf

---

## Sesion 17 Dic 2025

### Trabajo realizado:
1. Configuración CORS para Firebase Storage
2. Descarga de códigos postales de los 32 estados de México
3. Creación de 15 clientes con 30 obras (tipos reales)
4. Creación de 20 viajes respetando reglas de negocio
5. Fix: fechaCompromiso no se cargaba en edición
6. Fix: Tracto mostraba ID en lugar de número económico
7. Configuración de archivos CLAUDE.md, TODO.md, NOTES.md

### Descubrimientos:
- Solo 3 de 6 tractocamiones tienen operadores autorizados
- Solo hay 1 aditamento en catálogo (LB02)
- Scripts seed no pueden importar servicios con `import.meta.env`
- `gh` CLI no está instalado

### Decisiones técnicas:
- Scripts seed replican lógica del servicio
- Usar `null` en lugar de `undefined` para Firebase

---

## Comandos Útiles Claude Code
```
/memory   - Ver/editar memoria de sesión
/help     - Ver comandos disponibles
/clear    - Limpiar contexto
/compact  - Resumir conversación
```

---

## Ideas Futuro
- Integración GPS de unidades
- App móvil para operadores
- Portal clientes para seguimiento
- Integración facturación CFDI
