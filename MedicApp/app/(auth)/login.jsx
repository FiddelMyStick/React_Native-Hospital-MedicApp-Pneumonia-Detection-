import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "../../styles/authStyles";
import { loginDoctor } from "../../services/authService";
import { Keyboard, TouchableWithoutFeedback } from "react-native";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Information", "Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      const response = await loginDoctor({
        email,
        password,
      });

      // 🔐 save token
      await AsyncStorage.setItem("token", response.token);
      await AsyncStorage.setItem("doctorId", String(response.id));

      router.replace("/(tabs)/home");
    } catch (err) {
      Alert.alert("Login failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={styles.containerCenter}>
      <View style={styles.card}>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Login to your MedicApp account</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Connecting..." : "Access Account"}
          </Text>
        </TouchableOpacity>

        

        <Text style={styles.link} onPress={() => router.push("/register")}>
          Don’t have an account? Register
        </Text>

      </View>
    </View>
    </TouchableWithoutFeedback>
  );
}
