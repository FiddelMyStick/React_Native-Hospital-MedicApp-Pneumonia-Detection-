import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import styles from "../../styles/patientsStyles";
import { getPatients } from "../../services/patientService";

export default function Patients() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  const { attachMode, imageUri } = useLocalSearchParams();

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ reload every time screen gets focus (back from add/delete/edit)
  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, [])
  );

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;

    return patients.filter((p) => {
      const full = `${p.FirstName ?? ""} ${p.LastName ?? ""}`.toLowerCase();
      return full.includes(q);
    });
  }, [patients, search]);

  const handleSelectPatient = (patientId) => {
    if (attachMode === "true") {
      router.push({
        pathname: "/patientProfile",
        params: { patientId, imageUri },
      });
    } else {
      router.push({
        pathname: "/patientProfile",
        params: { patientId },
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {attachMode === "true" ? "Select Patient" : "Patients"}
      </Text>

      <TextInput
        placeholder="Search patient..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
        placeholderTextColor="#64748B"
      />

      {loading ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#032679" />
        </View>
      ) : filteredPatients.length === 0 ? (
        <Text style={styles.emptyText}>
          {attachMode === "true"
            ? "No patients to attach this scan."
            : "No patients available yet."}
        </Text>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => String(item.Id)}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={styles.patientCard}
              onPress={() => handleSelectPatient(item.Id)}
            >
              <Text style={styles.patientName}>
                {item.FirstName} {item.LastName}
              </Text>
              <Text style={styles.patientInfo}>
                {item.Age} years • {item.Gender}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
