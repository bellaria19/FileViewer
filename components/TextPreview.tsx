import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { FontAwesome } from "@expo/vector-icons";
import { useViewerSettings } from "../context/ViewerSettingsContext";
import { router } from "expo-router";

interface TextPreviewProps {
  uri: string;
  fileName: string;
}

export default function TextPreview({ uri, fileName }: TextPreviewProps) {
  const { settings } = useViewerSettings();
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTextContent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 파일 존재 여부 확인
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error("파일이 존재하지 않거나 접근할 수 없습니다");
        }

        // 여러 방법으로 파일 읽기 시도
        try {
          // 방법 1: 직접 읽기 시도
          const content = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          setTextContent(content);
          setIsLoading(false);
          return;
        } catch (error1) {
          console.log("첫 번째 읽기 방법 실패:", error1);

          try {
            // 방법 2: 임시 파일 생성 후 읽기
            const tempDir = FileSystem.cacheDirectory + "temp/";
            const tempDirInfo = await FileSystem.getInfoAsync(tempDir);

            if (!tempDirInfo.exists) {
              await FileSystem.makeDirectoryAsync(tempDir, {
                intermediates: true,
              });
            }

            const tempFilePath =
              tempDir + "temp_" + Date.now() + "_" + fileName;

            // 파일 복사
            await FileSystem.copyAsync({
              from: uri,
              to: tempFilePath,
            });

            // 복사된 파일 읽기
            const content = await FileSystem.readAsStringAsync(tempFilePath, {
              encoding: FileSystem.EncodingType.UTF8,
            });

            // 임시 파일 삭제
            await FileSystem.deleteAsync(tempFilePath, { idempotent: true });

            setTextContent(content);
            setIsLoading(false);
            return;
          } catch (error2) {
            console.log("두 번째 읽기 방법 실패:", error2);

            // 방법 3: 파일 읽기 대체 방법
            try {
              // 파일을 작은 청크로 읽기
              let content = "";
              const fileSize = fileInfo.size || 0;
              const chunkSize = 1024; // 1KB 청크

              for (let offset = 0; offset < fileSize; offset += chunkSize) {
                const chunk = await FileSystem.readAsStringAsync(uri, {
                  encoding: FileSystem.EncodingType.UTF8,
                  position: offset,
                  length: Math.min(chunkSize, fileSize - offset),
                });
                content += chunk;
              }

              setTextContent(content);
              setIsLoading(false);
              return;
            } catch (error3) {
              console.log("세 번째 읽기 방법 실패:", error3);
              throw new Error(
                "여러 방법으로 파일 읽기를 시도했으나 모두 실패했습니다"
              );
            }
          }
        }
      } catch (error) {
        console.error("텍스트 파일 로딩 오류:", error);
        setError(
          `텍스트 파일 로딩 실패: ${
            error instanceof Error ? error.message : "알 수 없는 오류"
          }`
        );
        setIsLoading(false);
      }
    };

    loadTextContent();
  }, [uri, fileName]);

  // 설정 화면으로 이동
  const openSettings = () => {
    router.push({
      pathname: "/viewer-settings",
      params: { type: "text" },
    });
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.centerContainer,
          settings.text.darkMode && styles.darkContainer,
        ]}
      >
        <ActivityIndicator
          size="large"
          color={settings.text.darkMode ? "#fff" : "#4a6da7"}
        />
        <Text
          style={[
            styles.loadingText,
            settings.text.darkMode && styles.darkText,
          ]}
        >
          텍스트 파일 로딩 중...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.centerContainer,
          settings.text.darkMode && styles.darkContainer,
        ]}
      >
        <FontAwesome name="exclamation-circle" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        settings.text.darkMode ? styles.darkContainer : styles.lightContainer,
      ]}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{
          paddingHorizontal: 15,
          paddingVertical: 20,
          flexWrap: settings.text.wordWrap ? "wrap" : "nowrap",
        }}
      >
        <Text
          style={[
            styles.textContent,
            settings.text.darkMode && styles.darkText,
            {
              fontSize: settings.text.fontSize,
              lineHeight: settings.text.fontSize * settings.text.lineHeight,
              fontFamily: settings.text.fontFamily,
            },
          ]}
        >
          {textContent}
        </Text>
      </ScrollView>

      {/* 설정 버튼 */}
      <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
        <FontAwesome
          name="gear"
          size={20}
          color={settings.text.darkMode ? "#fff" : "#4a6da7"}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightContainer: {
    backgroundColor: "white",
  },
  darkContainer: {
    backgroundColor: "#222",
  },
  scrollContainer: {
    flex: 1,
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
  darkText: {
    color: "#f5f5f5",
  },
  errorText: {
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
    marginTop: 10,
  },
  textContent: {
    color: "#2c3e50",
  },
  settingsButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "rgba(200, 200, 200, 0.5)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
