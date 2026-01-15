import { router } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import AddMenuModal from "./AddMenuModal";

export default function FloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AddMenuModal
        visible={open}
        onClose={() => setOpen(false)}
        onScan={() => {
          setOpen(false);
          router.push("/(tabs)/scan");
        }}
        onAddPatient={() => {
          setOpen(false);
          router.push("/(tabs)/addPatient");
        }}
      />

      <View
        style={{
          position: "absolute",
          bottom: 70,
          alignSelf: "center",
          zIndex: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => setOpen(true)}
          activeOpacity={0.8}
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: "#0A84FF",
            justifyContent: "center",
            alignItems: "center",

            // ✅ PREMIUM SHADOW
            shadowColor: "#0A84FF",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 10,
            elevation: 15,
          }}
        >
          <Text
            style={{
              fontSize: 40,
              color: "white",
              fontWeight: "700",
              marginTop: -2,
            }}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
