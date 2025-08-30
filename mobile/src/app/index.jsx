import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { Check, Save, Download, Upload } from "lucide-react-native";

export default function Index() {
  const insets = useSafeAreaInsets();
  const [rowData, setRowData] = useState({});
  const [changedRows, setChangedRows] = useState(new Set());

  // Load saved data on app start
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem("lamis_data");
      if (savedData) {
        setRowData(JSON.parse(savedData));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const exportToClipboard = async () => {
    try {
      // Create filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD format
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS format
      const filename = `LAMIS_Data_${dateStr}_${timeStr}.json`;

      // Prepare export data with metadata
      const exportData = {
        exportDate: now.toISOString(),
        appVersion: "1.0",
        dataType: "LAMIS_CHECKBOX_DATA",
        totalRows: 60,
        filename: filename,
        data: rowData,
      };

      // Copy to clipboard as formatted JSON
      const jsonString = JSON.stringify(exportData, null, 2);
      await Clipboard.setStringAsync(jsonString);

      Alert.alert(
        "Exported to Clipboard! 📋",
        `Your LAMIS data has been copied to clipboard as ${filename}.\n\n✅ Next steps:\n1. Open any text app (Notes, Files, etc.)\n2. Paste the data\n3. Save as .json file to Downloads\n\nThe data is now in your clipboard!`,
        [
          {
            text: "Open Notes App",
            onPress: () => {
              // This will suggest opening notes but the user has to do it manually
              Alert.alert(
                "Manual Step",
                "Please manually open your Notes app or Files app and paste the data there.",
              );
            },
          },
          { text: "OK", style: "default" },
        ],
      );
    } catch (error) {
      console.error("Error exporting data:", error);
      Alert.alert("Export Error", "Failed to copy data to clipboard");
    }
  };

  const importFromClipboard = async () => {
    try {
      // Get data from clipboard
      const clipboardData = await Clipboard.getStringAsync();

      if (!clipboardData || clipboardData.trim() === "") {
        Alert.alert(
          "Import Error",
          "No data found in clipboard. Please copy LAMIS data first.",
        );
        return;
      }

      // Try to parse JSON
      let importData;
      try {
        importData = JSON.parse(clipboardData);
      } catch (parseError) {
        Alert.alert(
          "Import Error",
          "Invalid data format. Please copy valid LAMIS JSON data to clipboard.",
        );
        return;
      }

      // Validate data structure
      if (!importData.data || typeof importData.data !== "object") {
        Alert.alert(
          "Import Error",
          "Invalid LAMIS data format. Missing or invalid data field.",
        );
        return;
      }

      // Optional: Check if it's LAMIS data
      if (
        importData.dataType &&
        importData.dataType !== "LAMIS_CHECKBOX_DATA"
      ) {
        Alert.alert(
          "Import Error",
          "This doesn't appear to be LAMIS data. Please check your clipboard.",
        );
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        "Import LAMIS Data",
        `Found ${importData.filename || "LAMIS data"}.\n\n⚠️ This will replace all current data.\n\nContinue with import?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import",
            style: "destructive",
            onPress: () => performImport(importData.data),
          },
        ],
      );
    } catch (error) {
      console.error("Error importing data:", error);
      Alert.alert("Import Error", "Failed to import data from clipboard");
    }
  };

  const performImport = async (newData) => {
    try {
      // Update state with new data
      setRowData(newData);

      // Save to device storage
      await AsyncStorage.setItem("lamis_data", JSON.stringify(newData));

      // Clear any changed rows since we just imported fresh data
      setChangedRows(new Set());

      Alert.alert(
        "Import Successful! ✅",
        "Your LAMIS data has been imported and saved to your device.",
      );
    } catch (error) {
      console.error("Error performing import:", error);
      Alert.alert("Import Error", "Failed to save imported data");
    }
  };

  const saveRowData = async (rowNumber) => {
    try {
      const updatedData = { ...rowData };
      await AsyncStorage.setItem("lamis_data", JSON.stringify(updatedData));

      // Remove row from changed rows set
      const newChangedRows = new Set(changedRows);
      newChangedRows.delete(rowNumber);
      setChangedRows(newChangedRows);
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const saveAllRows = async () => {
    try {
      await AsyncStorage.setItem("lamis_data", JSON.stringify(rowData));
      // Clear all changed rows
      setChangedRows(new Set());
    } catch (error) {
      console.error("Error saving all data:", error);
    }
  };

  const toggleCheckbox = (rowNumber, column) => {
    const rowKey = `row_${rowNumber}`;
    const currentRow = rowData[rowKey] || {
      L: false,
      A: false,
      M: false,
      I: false,
      S: false,
    };

    const updatedRow = {
      ...currentRow,
      [column]: !currentRow[column],
    };

    setRowData((prev) => ({
      ...prev,
      [rowKey]: updatedRow,
    }));

    // Mark row as changed
    setChangedRows((prev) => new Set(prev).add(rowNumber));
  };

  const renderCheckbox = (rowNumber, column) => {
    const rowKey = `row_${rowNumber}`;
    const isChecked = rowData[rowKey]?.[column] || false;

    return (
      <TouchableOpacity
        key={column}
        style={{
          width: 40,
          height: 40,
          borderWidth: 2,
          borderColor: isChecked ? "#007AFF" : "#D1D5DB",
          backgroundColor: isChecked ? "#007AFF" : "transparent",
          borderRadius: 6,
          alignItems: "center",
          justifyContent: "center",
          marginHorizontal: 8,
        }}
        onPress={() => toggleCheckbox(rowNumber, column)}
      >
        {isChecked && <Check size={20} color="white" />}
      </TouchableOpacity>
    );
  };

  const renderRow = (rowNumber) => {
    const hasChanges = changedRows.has(rowNumber);

    return (
      <View
        key={rowNumber}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
          backgroundColor: "white",
        }}
      >
        {/* Row number */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#374151",
            width: 30,
            textAlign: "center",
          }}
        >
          {rowNumber}
        </Text>

        {/* Checkboxes */}
        <View
          style={{
            flexDirection: "row",
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {["L", "A", "M", "I", "S"].map((column) =>
            renderCheckbox(rowNumber, column),
          )}
        </View>

        {/* Save button */}
        <View style={{ width: 60, alignItems: "center" }}>
          {hasChanges && (
            <TouchableOpacity
              style={{
                backgroundColor: "#10B981",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
              onPress={() => saveRowData(rowNumber)}
            >
              <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
                Save
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: "#F9FAFB", paddingTop: insets.top }}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          backgroundColor: "white",
          paddingVertical: 20,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
            position: "relative",
          }}
        >
          {/* Export to Clipboard button */}
          <TouchableOpacity
            style={{
              position: "absolute",
              left: 0,
              top: -10,
              bottom: -10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: "#8B5CF6",
              zIndex: 10,
              justifyContent: "center",
              alignItems: "center",
              minWidth: 44,
              minHeight: 44,
            }}
            onPress={exportToClipboard}
            activeOpacity={0.7}
          >
            <Download size={20} color="white" />
          </TouchableOpacity>

          {/* Import from Clipboard button */}
          <TouchableOpacity
            style={{
              position: "absolute",
              left: 60,
              top: -10,
              bottom: -10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: "#F59E0B",
              zIndex: 10,
              justifyContent: "center",
              alignItems: "center",
              minWidth: 44,
              minHeight: 44,
            }}
            onPress={importFromClipboard}
            activeOpacity={0.7}
          >
            <Upload size={20} color="white" />
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              textAlign: "center",
              color: "#111827",
              letterSpacing: 2,
              flex: 1,
            }}
          >
            LAMIS
          </Text>
          {changedRows.size > 0 && (
            <TouchableOpacity
              style={{
                backgroundColor: "#3B82F6",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                position: "absolute",
                right: 0,
              }}
              onPress={saveAllRows}
            >
              <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                Save All ({changedRows.size})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Column headers */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 16,
          paddingHorizontal: 16,
          backgroundColor: "#F3F4F6",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        {/* Empty space for row number */}
        <View style={{ width: 30 }} />

        {/* Column headers */}
        <View
          style={{ flexDirection: "row", flex: 1, justifyContent: "center" }}
        >
          {["L", "A", "M", "I", "S"].map((letter) => (
            <Text
              key={letter}
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#374151",
                width: 56,
                textAlign: "center",
              }}
            >
              {letter}
            </Text>
          ))}
        </View>

        {/* Empty space for save button */}
        <View style={{ width: 60 }} />
      </View>

      {/* Scrollable rows */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: 60 }, (_, index) => renderRow(index + 1))}
      </ScrollView>
    </View>
  );
}
