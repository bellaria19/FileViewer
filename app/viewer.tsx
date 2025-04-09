import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Share,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { FontAwesome } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native-gesture-handler";
import { getFileTypeInfo } from "@/utils/fileTypes";

// Import preview components
import TextPreview from "@/components/TextPreview";
import ImagePreview from "@/components/ImagePreview";
import WebPreview from "@/components/WebPreview";
import ZipPreview from "@/components/ZipPreview";

export default function Viewer() {
  const { uri, name, type } = useLocalSearchParams<{
    uri: string;
    name: string;
    type: string;
  }>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Function to share the current file
  const shareFile = async () => {
    if (!uri || !name) {
      Alert.alert("Error", "Cannot share this file");
      return;
    }

    try {
      const result = await Share.share({
        url: uri,
        title: name,
        message: `Check out this file: ${name}`,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log(`Shared via ${result.activityType}`);
        } else {
          console.log("Shared successfully");
        }
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error) {
      console.error("Error sharing file:", error);
      Alert.alert("Error", "Failed to share this file");
    }
  };

  // Check if we have a valid URI
  if (!uri) {
    setError("No file URI provided");
  }

  const renderFileContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4a6da7" />
          <Text style={styles.loadingText}>Loading file...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <FontAwesome name="exclamation-circle" size={60} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    // Get file type information
    const fileTypeInfo = getFileTypeInfo(type || null);

    // Handle different file types using our specialized components
    if (type?.startsWith("image/")) {
      return <ImagePreview uri={uri} fileName={name || "Image"} />;
    } else if (type === "text/plain") {
      return <TextPreview uri={uri} fileName={name || "Text File"} />;
    } else if (
      type === "application/zip" ||
      type === "application/x-zip-compressed"
    ) {
      return (
        <ZipPreview
          uri={uri}
          fileName={name || "Archive.zip"}
          onFileSelect={(fileUri, fileName, mimeType) => {
            router.push({
              pathname: "/viewer",
              params: {
                uri: fileUri,
                name: fileName,
                type: mimeType,
              },
            });
          }}
        />
      );
    } else if (
      ["application/pdf", "application/epub+zip", "text/html"].includes(
        type || ""
      )
    ) {
      return (
        <WebPreview
          uri={uri}
          fileName={name || "Document"}
          fileType={type || ""}
        />
      );
    } else {
      return (
        <View style={styles.centerContainer}>
          <FontAwesome
            name={fileTypeInfo.icon}
            size={60}
            color={fileTypeInfo.color}
          />
          <Text style={styles.unsupportedText}>
            {fileTypeInfo.canPreview
              ? `Loading ${fileTypeInfo.name} file...`
              : `Unsupported file type: ${fileTypeInfo.name}`}
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={shareFile}>
            <FontAwesome
              name="share-alt"
              size={16}
              color="white"
              style={styles.actionButtonIcon}
            />
            <Text style={styles.actionButtonText}>Share File</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: name || "File Viewer",
          headerShown: true,
          headerBackTitle: "Back",
          headerTintColor: "white",
          headerStyle: {
            backgroundColor: "#4a6da7",
          },
          headerTitleStyle: {
            fontSize: 18,
          },
          headerRight: () => (
            <TouchableOpacity style={{ marginRight: 15 }} onPress={shareFile}>
              <FontAwesome name="share-alt" size={22} color="white" />
            </TouchableOpacity>
          ),
        }}
      />
      <StatusBar style="light" />

      {renderFileContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#7f8c8d",
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
  },
  unsupportedText: {
    marginTop: 15,
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    maxWidth: "80%",
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: "#4a6da7",
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  actionButtonIcon: {
    marginRight: 8,
  },
});
