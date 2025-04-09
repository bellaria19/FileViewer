import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system";

interface TextPreviewProps {
  uri: string;
  fileName: string;
}

const TextPreview: React.FC<TextPreviewProps> = ({ uri, fileName }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTextContent = async () => {
      try {
        setIsLoading(true);

        // 파일 존재 여부 확인
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error("파일이 존재하지 않거나 접근할 수 없습니다");
        }

        // 파일 권한 확인 (읽기 가능한지 테스트)
        try {
          // 첫 1바이트만 읽어보기
          await FileSystem.readAsStringAsync(uri, { length: 1 });
        } catch (error) {
          console.error("파일 읽기 권한 테스트 실패:", error);

          // 원본 URI 직접 사용 시도 (캐시된 버전에 문제가 있을 경우)
          if (uri.includes("file_cache")) {
            const originalUri = uri.split("/").pop();
            if (originalUri) {
              const documentDir = FileSystem.documentDirectory;
              const tempPath = `${documentDir}${originalUri}`;
              await FileSystem.copyAsync({ from: uri, to: tempPath });

              // 새 경로에서 다시 읽기 시도
              const content = await FileSystem.readAsStringAsync(tempPath);
              setTextContent(content);
              setIsLoading(false);
              return;
            }
          }

          throw new Error("파일 읽기 권한이 없습니다");
        }

        // 파일 내용 읽기
        const content = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        setTextContent(content);
        setIsLoading(false);
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
  }, [uri]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>Loading text file...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.textContent}>{textContent}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    padding: 15,
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
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
  },
  textContent: {
    fontSize: 16,
    lineHeight: 24,
    color: "#2c3e50",
  },
});

export default TextPreview;
