import { useCallback, useMemo, useState } from "react";
import { FlatList, ScrollView, Text, TextInput, View, Pressable, Alert } from "react-native";
import { useFocusEffect, router } from "expo-router";
import styles from "../../styles/homeStyles";
import { getHomePatients } from "../../services/patientService";

export default function Home() {
  const [patients, setPatients] = useState(0);
  const [scans, setScans] = useState(0);

  const [recentPatients, setRecentPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getHomePatients();
      setPatients(data.patientsCount ?? 0);
      setScans(data.scansCount ?? 0);
      setRecentPatients(data.recentPatients ?? []);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const filteredRecentPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recentPatients;
    return recentPatients.filter((p) => {
      const full = `${p.FirstName ?? ""} ${p.LastName ?? ""}`.toLowerCase();
      return full.includes(q);
    });
  }, [recentPatients, search]);

  return (
    <View style={styles.container}>
      {/* 🔵 HEADER */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi Doctor 👋</Text>
        <Text style={styles.subGreeting}>{loading ? "Loading..." : "Good morning"}</Text>

        <TextInput
          placeholder="Search patients..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* ⚪ BODY */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* ✅ WELCOME */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome!</Text>
          <Text style={styles.welcomeText}>
            Caring for your patients, one scan at a time.
          </Text>
        </View>

        {/* ✅ STATS */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{patients}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{scans}</Text>
            <Text style={styles.statLabel}>Scans</Text>
          </View>
        </View>

        {/* 🔄 RECENT PATIENTS */}
        <Text style={styles.previewTitle}>Recent Patients</Text>

        {filteredRecentPatients.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {search ? "No matching patients." : "No recent patients yet."}
            </Text>
          </View>
        ) : (
          <FlatList
            horizontal
            data={filteredRecentPatients}
            keyExtractor={(item) => String(item.Id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewList}
            renderItem={({ item }) => (
              <Pressable
                style={styles.previewCard}
                onPress={() =>
                  router.push({
                    pathname: "/patientProfile",
                    params: { patientId: item.Id },
                  })
                }
              >
                <Text style={styles.previewName}>
                  {item.FirstName} {item.LastName}
                </Text>
                <Text style={styles.previewInfo}>{item.Age} years</Text>
              </Pressable>
            )}
          />
        )}



        <View style={{ height: 140 }} />
      </ScrollView>
    </View>
  );
}
