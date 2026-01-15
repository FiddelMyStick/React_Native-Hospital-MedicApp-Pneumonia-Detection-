import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Image, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { getPatientScans, updateScan, deleteScan, rerunScan } from "../../services/patientService";
import styles from "../../styles/scanHistoryStyles";
import { API_URL } from '../../services/api';


export default function ScanHistory() {
  const { patientId } = useLocalSearchParams();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPatientScans(patientId);
      setScans(data || []);
    } catch (err) {
      console.warn('Load scan history failed', err);
      Alert.alert('Error', err.message || 'Failed to load scan history');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    load();
  }, [patientId, load]);

  if (!patientId) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Scan History</Text>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Please open a patient profile to view its scan history.</Text>
          <Text style={styles.emptySubText}>Go to Patients and select the patient you want to inspect.</Text>
        </View>
      </ScrollView>
    );
  }



  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Scan History</Text>

      <View style={styles.subtitleBox}>
        <Text style={styles.subtitle}>Patient ID: {patientId || "—"}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : scans.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No scans available yet.</Text>
          <Text style={styles.emptySubText}>
            Once scans are uploaded and analyzed, they will appear here.
          </Text>
        </View>
      ) : (
        scans.map((scan) => (
          <View key={scan.Id} style={styles.scanCard}>
            <Text style={styles.scanTitle}>Scan #{scan.Id}</Text>
            <Text style={styles.scanDate}>{new Date(scan.CreatedAt).toLocaleString()}</Text>

            {scan.ImagePath ? (
              <Image source={{ uri: `${API_URL}${scan.ImagePath}` }} style={styles.scanImage} />
            ) : null}

            <Text style={styles.scanInfo}>Prediction: {scan.Prediction || 'Not available'}{scan._rerunning ? ' (running...)' : ''}</Text>
            <Text style={styles.scanInfo}>Confidence: {scan.Confidence || 'Not available'}</Text>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.scanInfo}>Report: {scan.PdfPath ? 'Available' : 'None'}</Text>
            </View>

            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#c62828', marginRight: 8 }]} onPress={async () => {
                // Delete using native Alert confirmation
                Alert.alert(
                  'Delete scan',
                  'Are you sure you want to delete this scan?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => {
                        try {
                          await deleteScan(patientId, scan.Id);
                          setScans(prev => prev.filter(s => s.Id !== scan.Id));
                        } catch (e) {
                          console.warn('Delete scan failed', e);
                          Alert.alert('Delete failed', e.message || 'Could not delete scan');
                        }
                      }
                    }
                  ]
                );
              }}>
                <Text style={styles.smallButtonText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#032679', marginRight: 8 }]} onPress={async () => {
                // Fill placeholder values using service helper
                try {
                  const resp = await updateScan(patientId, scan.Id, { prediction: 'Not analyzed', confidence: '—' });
                  setScans(prev => prev.map(s => s.Id === resp.Id ? resp : s));
                } catch (e) {
                  console.warn('Fill failed', e);
                  Alert.alert('Fill failed', e.message || 'Could not update scan');
                }
              }}>
                <Text style={styles.smallButtonText}>Fill</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#0b6b0b' }]} onPress={async () => {
                // Re-run analysis
                try {
                  // Show temporary in-line loading by replacing the scan with a copy including a _rerunning flag
                  setScans(prev => prev.map(s => s.Id === scan.Id ? { ...s, _rerunning: true } : s));
                  const resp = await rerunScan(patientId, scan.Id);
                  setScans(prev => prev.map(s => s.Id === resp.Id ? resp : s));
                  Alert.alert('Rerun complete', `Prediction: ${resp.Prediction || '—'}`);
                } catch (e) {
                  console.warn('Rerun failed', e);
                  Alert.alert('Rerun failed', e.message || 'Could not re-run analysis');
                }
              }}>
                <Text style={styles.smallButtonText}>Re-run</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
