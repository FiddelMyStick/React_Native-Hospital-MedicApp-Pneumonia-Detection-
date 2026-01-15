import React from 'react';
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import styles from "../../styles/patientProfileStyles";
import { deletePatient, getPatientById, updatePatient, attachScanToPatient, getPatientScans } from "../../services/patientService";
import { API_URL } from '../../services/api';

export default function PatientProfile() {
  const { patientId, imageUri, diagnosis, confidence, model, pdf_base64 } = useLocalSearchParams();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState([]);
  const [attaching, setAttaching] = useState(false);

  // edit mode
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");

  const fillForm = (p) => {
    setFirstName(p?.FirstName ?? "");
    setLastName(p?.LastName ?? "");
    setAge(p?.Age != null ? String(p.Age) : "");
    setGender(p?.Gender ?? "");
    setPhone(p?.Phone ?? "");
  };

  const loadPatient = async () => {
    try {
      setLoading(true);
      const data = await getPatientById(patientId);
      setPatient(data);
      fillForm(data);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const attachedRef = useRef(false);

  useEffect(() => {
    if (patientId) {
      // load both in parallel to avoid blocking UI
      (async () => {
        setLoading(true);
        try {
          await Promise.all([loadPatient(), loadScans()]);
        } catch (err) {
          console.warn('Initial load failed', err);
        } finally {
          setLoading(false);
        }
      })();

      // If an imageUri was passed (attach mode), upload the scan once
      if (imageUri) {
        // reset attached flag for new imageUri
        attachedRef.current = false;
        // Clear the route param immediately to avoid re-triggering attach on remounts
        try {
          router.replace({ pathname: '/patientProfile', params: { patientId } });
        } catch (e) {
          console.warn('Could not clear imageUri param synchronously', e);
        }

        // Check if we recently attached a scan for this patient (avoid re-attach on quick remounts)
        (async () => {
          try {
            const last = await AsyncStorage.getItem(`lastAttach:${patientId}`);
            const now = Date.now();
            if (last && now - Number(last) < 15000) {
              console.log('Skipping attach: recently attached for patient', patientId);
              // refresh scans to ensure UI shows latest
              await loadScans();
              return;
            }
          } catch (e) {
            console.warn('Could not check lastAttach', e);
          }

          attachScanWorkflow();
        })();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, imageUri]);

  // Reload scans when this screen regains focus (so History reruns or deletes are reflected)
  useFocusEffect(
    React.useCallback(() => {
      loadScans().catch((e) => console.warn('focus loadScans failed', e));
    }, [patientId, loadScans])
  );

  const loadScans = async () => {
    try {
      const data = await getPatientScans(patientId);
      setScans(data);
    } catch (err) {
      console.warn('Load scans failed', err);
    }
  };

  const attachScanWorkflow = async () => {
    if (!imageUri) return;
    // Prevent duplicate and re-entrant attachments
    if (attaching || attachedRef.current) return;

    try {
      setAttaching(true);
      attachedRef.current = true;

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: 'scan.jpg',
        type: 'image/jpeg',
      });

      if (diagnosis) formData.append('prediction', diagnosis);
      if (confidence) formData.append('confidence', confidence);
      if (model) formData.append('model', model);
      if (pdf_base64) formData.append('pdf_base64', pdf_base64);

      // Server now returns the inserted scan row -> use it to update UI optimistically
      const created = await attachScanToPatient(patientId, formData);

      // Optimistically update UI so user sees result immediately (avoid duplicates)
      setScans((prev) => (prev && prev.some(s => s.Id === created.Id) ? prev : [created, ...(prev || [])]));
      Alert.alert('Scan attached', 'The scan was attached to the patient.');

      // record last attach time in AsyncStorage to avoid immediate re-attachments
      try {
        await AsyncStorage.setItem(`lastAttach:${patientId}`, String(Date.now()));
      } catch (e) {
        console.warn('Could not record lastAttach', e);
      }

      // Refresh patient data in background (no need to wait long)
      loadPatient().catch((e) => console.warn('refresh patient failed', e));

      // Remove imageUri param so it does not re-upload on refresh
      router.replace({ pathname: '/patientProfile', params: { patientId } });
    } catch (err) {
      // allow retries if it failed
      attachedRef.current = false;
      Alert.alert('Attach failed', err.message || String(err));
      console.warn('Attach failed', err);
    } finally {
      setAttaching(false);
    }
  };

  const handleStartEdit = () => {
    if (!patient) return;
    fillForm(patient);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    if (patient) fillForm(patient);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!firstName || !lastName || !age || !gender || !phone) {
      Alert.alert("Missing Info", "Please fill all fields.");
      return;
    }

    const ageInt = parseInt(age, 10);
    if (Number.isNaN(ageInt) || ageInt <= 0 || ageInt > 130) {
      Alert.alert("Invalid Age", "Please enter a valid age.");
      return;
    }

    try {
      setSaving(true);

      await updatePatient(patientId, {
        firstName,
        lastName,
        age: ageInt,
        gender,
        phone,
      });

      // refresh displayed data
      const updated = await getPatientById(patientId);
      setPatient(updated);
      fillForm(updated);

      setEditing(false);
      Alert.alert("Saved", "Patient updated successfully.");
    } catch (err) {
      Alert.alert("Save failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete patient",
      "Are you sure you want to delete this patient?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deletePatient(patientId);
              Alert.alert("Deleted", "Patient deleted successfully.");
              router.back();
            } catch (err) {
              Alert.alert("Delete failed", err.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const fullName = patient ? `${patient.FirstName} ${patient.LastName}` : "—";

  return (
<ScrollView
  style={styles.container}
  contentContainerStyle={styles.centerContent}
  showsVerticalScrollIndicator={false}
>
      {/* 👤 PATIENT INFO */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Patient Information</Text>

        {loading ? (
          <Text style={styles.infoText}>Loading...</Text>
        ) : !patient ? (
          <Text style={styles.infoText}>Patient not found.</Text>
        ) : (
          <>
            <Text style={styles.infoText}>ID: {patient.Id}</Text>

            {/* VIEW MODE */}
            {!editing ? (
              <>
                <Text style={styles.infoText}>Name: {fullName}</Text>
                <Text style={styles.infoText}>Age: {patient.Age}</Text>
                <Text style={styles.infoText}>Gender: {patient.Gender}</Text>
                <Text style={styles.infoText}>Phone: {patient.Phone}</Text>

                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 12 }]}
                  onPress={handleStartEdit}
                >
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 10, opacity: deleting ? 0.6 : 1 }]}
                  onPress={handleDelete}
                  disabled={deleting}
                >
                  <Text style={styles.secondaryButtonText}>
                    {deleting ? "Deleting..." : "Delete"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* EDIT MODE */
              <>
                <TextInput
                  placeholder="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Age"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <TextInput
                  placeholder="Gender"
                  value={gender}
                  onChangeText={setGender}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  style={styles.input}
                />

                <TouchableOpacity
                  style={[styles.primaryButton, { opacity: saving ? 0.6 : 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.primaryButtonText}>
                    {saving ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: 10 }]}
                  onPress={handleCancelEdit}
                  disabled={saving}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>

      {/* 📸 SCAN PREVIEW */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Latest Scan</Text>

        {attaching ? (
          <Text style={styles.infoText}>Attaching scan...</Text>
        ) : scans && scans.length > 0 ? (
          <Image source={{ uri: `${API_URL}${scans[0].ImagePath}` }} style={styles.scanPreview} />
        ) : imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.scanPreview} />
        ) : (
          <Text style={styles.emptyScanText}>No scans attached yet.</Text>
        )}
      </View>

      {/* 📂 SCAN HISTORY BUTTON */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() =>
          router.push({
            pathname: "/History",
            params: { patientId },
          })
        }
      >
        <Text style={styles.secondaryButtonText}>View Scan History</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}
