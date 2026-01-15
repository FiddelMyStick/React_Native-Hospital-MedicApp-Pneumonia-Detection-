import { Modal, Text, TouchableOpacity, View } from "react-native";

export default function AddMenuModal({ visible, onClose, onScan, onAddPatient }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end",
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            paddingVertical: 22,
            paddingHorizontal: 20,
            gap: 18,
          }}
        >
          {/* ✅ New Scan */}
          <TouchableOpacity
            onPress={onScan}
            style={{
              backgroundColor: "#F1F5FF",
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#032679",
              }}
            >
              ➕ New Scan
            </Text>
          </TouchableOpacity>

          {/* ✅ Add Patient */}
          <TouchableOpacity
            onPress={onAddPatient}
            style={{
              backgroundColor: "#F1F5FF",
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#032679",
              }}
            >
              ➕ Add Patient
            </Text>
          </TouchableOpacity>

          {/* ✅ Cancel */}
          <TouchableOpacity onPress={onClose}>
            <Text
              style={{
                fontSize: 16,
                color: "red",
                textAlign: "center",
                marginTop: 10,
                fontWeight: "600",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
