/**
 * PDF Plan de Trabajo para Operador
 * Version sin costos - Solo informacion operativa
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { PlanTrabajoData } from '../../services/plantrabajo.service';
import { formatearFechaPDF } from '../../services/plantrabajo.service';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 15,
    borderBottom: '2 solid #BB0034',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#3D3D3D',
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 20,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
  },
  infoLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  section: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    padding: 6,
  },
  paradaCard: {
    marginBottom: 10,
    border: '1 solid #e0e0e0',
    borderRadius: 4,
    padding: 10,
  },
  paradaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottom: '1 solid #eee',
    paddingBottom: 6,
  },
  paradaNumero: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#BB0034',
  },
  paradaHora: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '4 8',
    borderRadius: 4,
  },
  paradaTipo: {
    fontSize: 9,
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '2 6',
    borderRadius: 3,
  },
  paradaCliente: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paradaDireccion: {
    fontSize: 9,
    color: '#444',
    marginBottom: 6,
  },
  paradaContacto: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 4,
  },
  contactoItem: {
    fontSize: 9,
    color: '#333',
  },
  contactoLabel: {
    fontWeight: 'bold',
    color: '#666',
  },
  paradaVentana: {
    fontSize: 9,
    color: '#1565c0',
    marginTop: 4,
  },
  ventanaOk: {
    color: '#2e7d32',
  },
  ventanaFail: {
    color: '#c62828',
  },
  paradaNotas: {
    marginTop: 6,
    padding: 6,
    backgroundColor: '#fff8e1',
    borderRadius: 3,
    fontSize: 8,
    color: '#795548',
  },
  regresaBase: {
    marginTop: 6,
    padding: 4,
    backgroundColor: '#e3f2fd',
    borderRadius: 3,
    fontSize: 8,
    color: '#1565c0',
    textAlign: 'center',
  },
  resumen: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  resumenLabel: {
    fontSize: 10,
    color: '#666',
  },
  resumenValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
    borderTop: '1 solid #eee',
    paddingTop: 8,
  },
  infoExtra: {
    fontSize: 8,
    color: '#666',
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
});

interface Props {
  data: PlanTrabajoData;
}

export default function PlanTrabajoOperadorPDF({ data }: Props) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Plan de Trabajo</Text>
          <Text style={styles.subtitle}>{formatearFechaPDF(data.fecha)}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>UNIDAD</Text>
              <Text style={styles.infoValue}>{data.unidad.numeroEconomico}</Text>
              <Text style={styles.infoExtra}>{data.unidad.marca} - {data.unidad.tipoUnidad}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>OPERADOR</Text>
              <Text style={styles.infoValue}>{data.operador.nombre}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>JORNADA</Text>
              <Text style={styles.infoValue}>{data.horaInicio} - {data.horaFin}</Text>
              <Text style={styles.infoExtra}>{Math.round(data.kmTotales)} km totales</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itinerario ({data.paradas.length} paradas)</Text>
          {data.paradas.map((parada) => (
            <View key={parada.folio} style={styles.paradaCard}>
              <View style={styles.paradaHeader}>
                <View style={styles.headerRow}>
                  <Text style={styles.paradaNumero}>#{parada.orden}</Text>
                  <Text style={styles.paradaTipo}>{parada.tipoServicio}</Text>
                </View>
                <Text style={styles.paradaHora}>{parada.horaEstimadaLlegada}</Text>
              </View>
              <Text style={styles.paradaCliente}>{parada.cliente}</Text>
              <Text style={styles.paradaDireccion}>
                {parada.direccion}
                {parada.municipio ? ', ' + parada.municipio : ''}
                {parada.estado ? ', ' + parada.estado : ''}
              </Text>
              {(parada.contactoNombre || parada.contactoTelefono) && (
                <View style={styles.paradaContacto}>
                  {parada.contactoNombre && (
                    <Text style={styles.contactoItem}>
                      <Text style={styles.contactoLabel}>Contacto: </Text>
                      {parada.contactoNombre}
                    </Text>
                  )}
                  {parada.contactoTelefono && (
                    <Text style={styles.contactoItem}>
                      <Text style={styles.contactoLabel}>Tel: </Text>
                      {parada.contactoTelefono}
                    </Text>
                  )}
                </View>
              )}
              {parada.ventanaRecepcion && (
                <Text style={[styles.paradaVentana, parada.cumpleVentana ? styles.ventanaOk : styles.ventanaFail]}>
                  Ventana de recepcion: {parada.ventanaRecepcion}
                  {parada.cumpleVentana === false ? ' (FUERA DE HORARIO)' : ''}
                </Text>
              )}
              {parada.notasAcceso && (
                <Text style={styles.paradaNotas}>Notas de acceso: {parada.notasAcceso}</Text>
              )}
              {parada.regresaABase && (
                <Text style={styles.regresaBase}>Regresa a base despues de esta parada</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.resumen}>
          <View style={styles.resumenRow}>
            <Text style={styles.resumenLabel}>Total de paradas:</Text>
            <Text style={styles.resumenValue}>{data.paradas.length}</Text>
          </View>
          <View style={styles.resumenRow}>
            <Text style={styles.resumenLabel}>Distancia total:</Text>
            <Text style={styles.resumenValue}>{Math.round(data.kmTotales)} km</Text>
          </View>
          <View style={styles.resumenRow}>
            <Text style={styles.resumenLabel}>Hora inicio:</Text>
            <Text style={styles.resumenValue}>{data.horaInicio}</Text>
          </View>
          <View style={styles.resumenRow}>
            <Text style={styles.resumenLabel}>Hora fin estimada:</Text>
            <Text style={styles.resumenValue}>{data.horaFin}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          RMB Transportes | Plan de Trabajo generado el {new Date().toLocaleDateString('es-MX')}
        </Text>
      </Page>
    </Document>
  );
}
