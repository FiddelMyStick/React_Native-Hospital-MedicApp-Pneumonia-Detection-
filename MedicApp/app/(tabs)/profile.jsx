import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import styles from "../../styles/doctorProfileStyles";
import { getSpecialties } from "../../services/specialtiesService";
import { getMyProfile, updateMyProfile } from "../../services/doctorService";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export default function DoctorProfile() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(""); // read-only
  const [phone, setPhone] = useState("");

  const [specialties, setSpecialties] = useState([]);
  const [specialtyId, setSpecialtyId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      const [specs, profile] = await Promise.all([
        getSpecialties(),
        getMyProfile(),
      ]);

      setSpecialties(specs);

      setFirstName(profile.FirstName || "");
      setLastName(profile.LastName || "");
      setEmail(profile.Email || "");
      setPhone(profile.Phone || "");

      // SpecialtyId peut être null
      setSpecialtyId(profile.SpecialtyId ?? null);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (!firstName || !lastName || !phone) {
      Alert.alert("Missing Info", "Please fill First Name, Last Name and Phone.");
      return;
    }

    try {
      setSaving(true);

      await updateMyProfile({
        firstName,
        lastName,
        phone,
        specialtyId, // peut être null
      });

      Alert.alert("Saved", "Profile updated successfully.");
    } catch (err) {
      Alert.alert("Save failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Doctor Profile</Text>
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Doctor Profile</Text>

      <View style={styles.card}>
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

        {/* Email: read-only (tu peux le laisser editable si tu veux gérer update email) */}
        <TextInput
          placeholder="Email"
          value={email}
          editable={false}
          style={[styles.input, { opacity: 0.7 }]}
        />

        <TextInput
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />

        {/* Specialty Picker */}
        <View style={{ marginTop: 8, marginBottom: 8 }}>
          <Text style={{ marginBottom: 6, fontWeight: "600" }}>Specialty</Text>

          <View
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <Picker
              selectedValue={specialtyId}
              onValueChange={(val) => setSpecialtyId(val)}
            >
              <Picker.Item label="Select a specialty..." value={null} />
              {specialties.map((s) => (
                <Picker.Item key={s.Id} label={s.Name} value={s.Id} />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? "Saving..." : "Save Profile"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: '#c62828', marginTop: 12 }]}
          onPress={async () => {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('doctorId');
            router.replace('/(auth)/login');
          }}
        >
          <Text style={styles.primaryButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
