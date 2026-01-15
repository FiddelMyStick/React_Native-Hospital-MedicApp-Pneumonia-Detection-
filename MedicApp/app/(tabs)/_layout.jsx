import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import FloatingButton from "../components/FloatingButton";

import LogoutButton from "../../components/LogoutButton";

export default function TabsLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: 'white' },
          headerRight: () => <LogoutButton />, // logout in top-right across tabs
          tabBarStyle: {
            backgroundColor: "#032679",
            borderTopWidth: 0,
            height: 70,
          },
          tabBarShowLabel: false,
          tabBarActiveTintColor: "white",
          tabBarInactiveTintColor: "#A5B4FC",
        }}
      >
        {/* ✅ HOME */}
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={24} color={color} />
            ),
          }}
        />

        {/* ✅ PATIENTS */}
        <Tabs.Screen
          name="patients"
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="people" size={24} color={color} />
            ),
          }}
        />

        {/* ✅ HISTORY */}
        <Tabs.Screen
          name="History"
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="pulse" size={24} color={color} />
            ),
          }}
        />

        {/* ✅ PROFILE */}
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ color }) => (
              <Ionicons name="person" size={24} color={color} />
            ),
          }}
        />

        {/* 🚫 HIDDEN SCREENS (NO TAB ICONS) */}
        <Tabs.Screen name="addPatient" options={{ href: null }} />
        <Tabs.Screen name="scan" options={{ href: null }} />
        <Tabs.Screen name="aiResult" options={{ href: null }} />
        <Tabs.Screen name="patientProfile" options={{ href: null }} />
      </Tabs>

      {/* ✅ FLOATING + BUTTON STAYS */}
      <FloatingButton />
    </>
  );
}
