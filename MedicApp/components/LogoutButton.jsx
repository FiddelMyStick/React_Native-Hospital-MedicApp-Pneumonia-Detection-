import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('doctorId');
    router.replace('/(auth)/login');
  };

  return (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 12 }}>
      <Ionicons name="log-out" size={22} color="#c62828" />
    </TouchableOpacity>
  );
}
