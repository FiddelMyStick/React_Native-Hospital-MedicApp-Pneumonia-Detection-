import { router } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";
import styles from "../styles/welcom";

export default function Welcome() {
  return (
    <View style={styles.welcomeContainer}>

      {/* WELCOME FIRST */}
      <Text style={styles.welcomeTitle}>Welcome</Text>

      {/* BIGGER LOGO AFTER */}
      <Image
        source={require("../assets/images/logo.png")}
        style={styles.welcomeIconBig}
      />

      {/* MESSAGE AFTER LOGO */}
      <Text style={styles.welcomeSubtitle}>
        Smart medical assistant
      </Text>

      {/* BUTTONS STAY AT BOTTOM */}
      <View style={styles.bottomButtons}>

        <TouchableOpacity
          style={styles.welcomeButton}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.welcomeButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.welcomeButton}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.welcomeButtonText}>Sign Up</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}
