import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import styles from "../../styles/authStyles";
import { registerDoctor } from "../../services/authService";
import { Keyboard, TouchableWithoutFeedback } from "react-native";


export default function Register() {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = async () => {
  if (!firstname || !lastname || !phone || !email || !password || !confirmPassword) {
    Alert.alert("Missing Information", "Please fill all fields.");
    return;
  }

  if (password !== confirmPassword) {
    Alert.alert("Password Error", "Passwords do not match.");
    return;
  }

  try {
    await registerDoctor({
      firstName: firstname.trim(),
      lastName: lastname.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    Alert.alert("Success", "Account created successfully!");
    router.replace("/(tabs)/home");
  } catch (err) {
    Alert.alert("Register failed", err.message);
  }
};


  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={styles.containerCenter}>
      <View style={styles.card}>

        <Text style={styles.title}>Create Account</Text>

        <TextInput
          placeholder="First Name"
          value={firstname}
          onChangeText={setFirstname}
          style={styles.input}
        />

        <TextInput
          placeholder="Last Name"
          value={lastname}
          onChangeText={setLastname}
          style={styles.input}
        />

        <TextInput
          placeholder="Mobile Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />

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

        <TextInput
          placeholder="Confirm Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={styles.link} onPress={() => router.push("/login")}>
          Already have an account? Login
        </Text>

      </View>
    </View>
    </TouchableWithoutFeedback>
  );
}
