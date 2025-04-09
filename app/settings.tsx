// app/settings.tsx 수정
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { clearAllFiles } from "../utils/fileStorage";
import { StatusBar } from "expo-status-bar";

export default function Settings() {
  const [storageSize, setStorageSize] = useState<string>("계산 중...");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fileCount, setFileCount] = useState<number>(0);

  useEffect(() => {
    calculateStorageUsage();
  }, []);

  const calculateStorageUsage = async () => {
    try {
      const filesDir = `${FileSystem.documentDirectory}app_files/`;
      const dirInfo = await FileSystem.getInfoAsync(filesDir);

      if (!dirInfo.exists) {
        setStorageSize("0 B");
        setFileCount(0);
        return;
      }

      const files = await FileSystem.readDirectoryAsync(filesDir);
      setFileCount(files.length);

      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${filesDir}${file}`);
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
      }

      // 크기 포맷팅
      if (totalSize < 1024) {
        setStorageSize(`${totalSize} B`);
      } else if (totalSize < 1024 * 1024) {
        setStorageSize(`${(totalSize / 1024).toFixed(1)} KB`);
      } else {
        setStorageSize(`${(totalSize / (1024 * 1024)).toFixed(1)} MB`);
      }
    } catch (error) {
      console.error("저장공간 계산 오류:", error);
      setStorageSize("오류");
    }
  };

  const handleClearStorage = async () => {
    Alert.alert(
      "모든 파일 삭제",
      "저장된 모든 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await clearAllFiles();
              // 메타데이터 파일도 삭제
              const metadataPath = `${FileSystem.documentDirectory}files_metadata.json`;
              await FileSystem.deleteAsync(metadataPath, { idempotent: true });

              setStorageSize("0 B");
              setFileCount(0);
            } catch (error) {
              console.error("저장소 비우기 오류:", error);
              Alert.alert("오류", "저장소를 비우는 데 실패했습니다");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "설정",
          headerShown: true,
          headerTintColor: "white",
          headerStyle: {
            backgroundColor: "#4a6da7",
          },
        }}
      />
      <StatusBar style="light" />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>저장공간</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>저장공간 사용량</Text>
            <Text style={styles.settingValue}>
              {storageSize} (파일 {fileCount}개)
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={handleClearStorage}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.buttonText}>비우기</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>정보</Text>
        <View style={styles.aboutItem}>
          <FontAwesome
            name="file-o"
            size={20}
            color="#4a6da7"
            style={styles.aboutIcon}
          />
          <View>
            <Text style={styles.aboutTitle}>File Viewer</Text>
            <Text style={styles.aboutDescription}>버전 1.0.0</Text>
          </View>
        </View>
        <Text style={styles.copyright}>
          텍스트, 이미지, PDF, EPUB 파일을 볼 수 있는 간단한 파일 뷰어
        </Text>
      </View>
    </View>
  );
}

// 스타일은 기존과 동일하게 유지
const styles = StyleSheet.create({
  // 기존 스타일 그대로 유지
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  section: {
    backgroundColor: "white",
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    color: "#666",
  },
  settingDescription: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  button: {
    backgroundColor: "#4a6da7",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#a0b4d1",
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  aboutItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  aboutIcon: {
    marginRight: 16,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  aboutDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  copyright: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    padding: 16,
  },
});
