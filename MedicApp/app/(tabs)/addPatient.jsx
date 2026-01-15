import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import styles from "../../styles/addPatientStyles";
import { createPatient } from "../../services/patientService";
import { router } from "expo-router";

export default function AddPatient() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!firstName || !lastName || !age || !gender || !phone) {
      Alert.alert("Missing Info", "Please fill all fields.");
      return;
    }

    try {
      setSaving(true);

      await createPatient({
        firstName,
        lastName,
        age: Number(age),
        gender,
        phone,
      });

      Alert.alert("Success", "Patient added successfully!");
      router.back(); // يرجّعك لصفحة اللائحة غالباً
    } catch (err) {
      Alert.alert("Save failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Add New Patient</Text>

      <View style={styles.card}>
        <TextInput placeholder="First Name" value={firstName} onChangeText={setFirstName} style={styles.input} />
        <TextInput placeholder="Last Name" value={lastName} onChangeText={setLastName} style={styles.input} />

        <TextInput
          placeholder="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Gender (e.g. Male/Female)"
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

        <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save Patient"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
