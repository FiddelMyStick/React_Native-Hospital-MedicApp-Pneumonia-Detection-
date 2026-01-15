import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import styles from "../../styles/authStyles";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const handleReset = () => {
    Alert.alert("Success", "Password reset link sent!");
  };

  return (
    <View style={styles.containerCenter}>
      <View style={styles.card}>

        <Text style={styles.title}>Reset Password</Text>

        <TextInput
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={styles.input}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
          <Text style={styles.primaryButtonText}>Send Reset Link</Text>
        </TouchableOpacity>

        <Text style={styles.link} onPress={() => router.push("/login")}>
          Back to Login
        </Text>

      </View>
    </View>
  );
}
