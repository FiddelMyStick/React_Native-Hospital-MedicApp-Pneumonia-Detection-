import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import styles from "../../styles/scanStyles";

export default function Scan() {
  const [image, setImage] = useState(null);
  const [patientName, setPatientName] = useState("");

  // 📸 Take photo
  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // 🖼️ Pick from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // UPLOAD → AI RESULT SCREEN
  const uploadForAnalysis = () => {
    if (!patientName.trim()) {
      Alert.alert("Missing Info", "Please enter patient name.");
      return;
    }

    if (!image) {
      Alert.alert("No Scan", "Please select a scan first.");
      return;
    }

    // Pass params and then clear local state so the scan is not 'stuck'
    router.push({
      pathname: "/aiResult",
      params: {
        imageUri: image,
        patientName: patientName,
      },
    });

    // Clear local state immediately so the screen does not remember it
    setImage(null);
    setPatientName("");
  };

  // 📄 Generate PDF
  const generatePDF = async () => {
    const html = `
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h1>Medical Scan Report</h1>
          <p>Patient: ${patientName || "—"}</p>
          <p>Status: Waiting for AI analysis</p>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>New Scan</Text>

      {/* PATIENT NAME INPUT */}
      <View style={styles.inputBox}>
        <Text style={styles.inputLabel}>Patient Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter patient name"
          value={patientName}
          onChangeText={setPatientName}
        />
      </View>

      {/* SCAN PREVIEW */}
      {image ? (
        <Image source={{ uri: image }} style={styles.preview} />
      ) : (
        <View style={styles.previewPlaceholder}>
          <Text style={styles.previewText}>No scan selected</Text>
        </View>
      )}

      {/* CAMERA + GALLERY */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionCard} onPress={takePhoto}>
          <Text style={styles.actionText}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={pickImage}>
          <Text style={styles.actionText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* UPLOAD BUTTON */}
      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#032679' }]} onPress={uploadForAnalysis}>
        <Text style={styles.primaryText}>Upload for Analysis</Text>
      </TouchableOpacity>

      {/* Clear button to remove selected scan immediately */}
      <TouchableOpacity style={[styles.secondaryButton, { marginTop: 10 }]} onPress={() => { setImage(null); setPatientName(""); }}>
        <Text style={[styles.secondaryButtonText]}>Clear Scan</Text>
      </TouchableOpacity>

      {/* PDF BUTTON - hidden to avoid confusion (PDFs are generated after AI analysis) */}
      {/* <TouchableOpacity onPress={generatePDF}>
        <Text style={styles.pdfLink}>Generate PDF Report</Text>
      </TouchableOpacity> */}
    </ScrollView>
  );
}
