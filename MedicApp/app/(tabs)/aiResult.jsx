import { router, useLocalSearchParams } from "expo-router";
import { Alert, Image, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useState } from "react";
import styles from "../../styles/aiResultStyles";
import { api } from "../../services/api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function AIResult() {
  const { imageUri, patientName } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [model, setModel] = useState("resnet"); // resnet | densenet

  const runAnalysis = async () => {
    if (!imageUri) {
      Alert.alert("Error", "No image to analyze.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // ensure user is logged in
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Not authenticated', 'Please login before running analysis.');
        router.push('/(auth)/login');
        return;
      }

      const formData = new FormData();
      formData.append("image", {
        uri: imageUri,
        name: "scan.jpg",
        type: "image/jpeg",
      });

      // include patient name if available
      if (patientName) formData.append("patientName", patientName);

      // Call our Node.js Backend Proxy
      // POST /api/predict/:model
      const response = await api.post(`/api/predict/${model}`, formData);

      // If the response includes a base64 PDF, attach it to the result for UI actions
      if (response?.pdf_base64) {
        response._pdf_base64 = response.pdf_base64;

        // On web open in new tab immediately
        try {
          if (typeof window !== 'undefined' && window?.open) {
            const pdfData = `data:application/pdf;base64,${response.pdf_base64}`;
            window.open(pdfData);
          }
        } catch (e) {
          console.warn('Could not auto-open PDF on web:', e);
        }
      }

      setResult(response);
    } catch (error) {
      console.error("Analysis Error:", error);
      const msg = error?.message || JSON.stringify(error) || "Could not connect to server.";
      Alert.alert("Analysis Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const attachToPatient = () => {
    if (!imageUri) return;
    router.push({
      pathname: "/patients",
      params: {
        attachMode: "true",
        imageUri: imageUri,
        diagnosis: result?.prediction || "Pending",
        confidence: result?.confidence || null,
        model: result?.model || model,
        pdf_base64: result?._pdf_base64 || null,
      },
    });
  };

  // Save base64 PDF to file and open/share it (works on Expo native)
  const downloadPdf = async (base64) => {
    if (!base64) return Alert.alert('No PDF available');
    try {
      const filename = `report-${Date.now()}.pdf`;
      const fileUri = FileSystem.cacheDirectory + filename;

      // Handle environments where EncodingType may be undefined
      const encoding = (FileSystem && FileSystem.EncodingType && FileSystem.EncodingType.Base64) ? FileSystem.EncodingType.Base64 : 'base64';

      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Report saved', `Saved to: ${fileUri}`);
      }
    } catch (e) {
      console.warn('Error saving PDF:', e);
      // Try fallback write using 'base64' encoding string directly
      try {
        const filename = `report-${Date.now()}-fallback.pdf`;
        const fileUri = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) await Sharing.shareAsync(fileUri);
        else Alert.alert('Report saved (fallback)', `Saved to: ${fileUri}`);
      } catch (e2) {
        console.warn('Fallback save failed:', e2);
        Alert.alert('Save failed', e.message || 'Could not save PDF');
      }
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>AI Diagnosis Result</Text>
      <Text style={{ textAlign: 'center', color: '#666', marginBottom: 10 }}>Patient: {patientName}</Text>

      {/* ✅ SCAN PREVIEW */}
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      ) : (
        <View style={styles.resultCard}>
          <Text style={styles.emptyText}>No scan found.</Text>
        </View>
      )}

      {/* MODEL SELECTION */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10 }}>
        <TouchableOpacity
          onPress={() => setModel("resnet")}
          style={{
            padding: 10,
            backgroundColor: model === "resnet" ? "#032679" : "#eee",
            borderRadius: 8,
            marginRight: 10
          }}
        >
          <Text style={{ color: model === "resnet" ? "white" : "black", fontWeight: 'bold' }}>ResNet50</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setModel("densenet")}
          style={{
            padding: 10,
            backgroundColor: model === "densenet" ? "#032679" : "#eee",
            borderRadius: 8
          }}
        >
          <Text style={{ color: model === "densenet" ? "white" : "black", fontWeight: 'bold' }}>DenseNet</Text>
        </TouchableOpacity>
      </View>

      {/* ANALYSIS BUTTON */}
      {!result && !loading && (
        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 10, marginBottom: 20 }]}
          onPress={runAnalysis}
        >
          <Text style={styles.primaryButtonText}>Run {model === "resnet" ? "ResNet" : "DenseNet"} Analysis</Text>
        </TouchableOpacity>
      )}

      {/* LOADING */}
      {loading && <ActivityIndicator size="large" color="#032679" style={{ marginVertical: 20 }} />}

      {/* ✅ RESULTS */}
      {result && (
        <View style={[styles.resultCard, { backgroundColor: result.prediction === "PNEUMONIA" ? "#ffebee" : "#e8f5e9" }]}>
          <Text style={[styles.emptyText, { fontSize: 24, color: result.prediction === "PNEUMONIA" ? "#c62828" : "#2e7d32" }]}>
            {result.prediction}
          </Text>
          <Text style={styles.emptySubText}>
            Confidence: {result.confidence}
          </Text>
          <Text style={{ textAlign: 'center', marginTop: 5, color: '#555' }}>
            Model: {result.model}
          </Text>
        </View>
      )}

      {/* ✅ ATTACH FLOW */}
      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#032679', marginTop: 20 }]} onPress={attachToPatient}>
        <Text style={styles.primaryButtonText}>Attach to Patient Record</Text>
      </TouchableOpacity>

      {/* RESET for additional scans */}
      <TouchableOpacity style={[styles.secondaryButton, { marginTop: 12 }]} onPress={() => { setResult(null); setModel('resnet'); }}>
        <Text style={styles.secondaryButtonText}>Reset</Text>
      </TouchableOpacity>

      {/* DOWNLOAD / VIEW REPORT */}
      {result?._pdf_base64 && (
        <TouchableOpacity style={[styles.primaryButton, { marginTop: 12 }]} onPress={() => downloadPdf(result._pdf_base64)}>
          <Text style={styles.primaryButtonText}>Download Report (PDF)</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={() => router.back()}>
        <Text style={{ color: '#032679' }}>Back to Scan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
