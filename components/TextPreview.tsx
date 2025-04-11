import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
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
        console.log("[TextPreview] 파일 로딩 시작:", uri);
        setIsLoading(true);
        setError(null);

        // 파일 존재 여부 확인
        console.log("[TextPreview] 파일 존재 여부 확인 중...");
        const fileInfo = await FileSystem.getInfoAsync(uri);
        console.log("[TextPreview] 파일 정보:", JSON.stringify(fileInfo));

        if (!fileInfo.exists) {
          throw new Error("파일이 존재하지 않거나 접근할 수 없습니다");
        }

        // 여러 방법으로 파일 읽기 시도
        console.log("[TextPreview] 방법 1: 직접 읽기 시도...");
        try {
          // 방법 1: 직접 읽기 시도
          const content = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          console.log("[TextPreview] 방법 1 성공: 파일 크기", content.length);
          setTextContent(content);
          setIsLoading(false);
          return;
        } catch (error1) {
          console.log("[TextPreview] 방법 1 실패:", error1);

          try {
            console.log("[TextPreview] 방법 2: 임시 파일 생성 후 읽기 시도...");
            // 방법 2: 임시 파일 생성 후 읽기
            const tempDir = FileSystem.cacheDirectory + "temp/";
            console.log("[TextPreview] 임시 디렉토리:", tempDir);
            const tempDirInfo = await FileSystem.getInfoAsync(tempDir);
            console.log(
              "[TextPreview] 임시 디렉토리 정보:",
              JSON.stringify(tempDirInfo)
            );

            if (!tempDirInfo.exists) {
              console.log("[TextPreview] 임시 디렉토리 생성 중...");
              await FileSystem.makeDirectoryAsync(tempDir, {
                intermediates: true,
              });
            }

            const tempFilePath =
              tempDir + "temp_" + Date.now() + "_" + fileName;
            console.log("[TextPreview] 임시 파일 경로:", tempFilePath);

            // 파일 복사
            console.log("[TextPreview] 파일 복사 시작...");
            await FileSystem.copyAsync({
              from: uri,
              to: tempFilePath,
            });
            console.log("[TextPreview] 파일 복사 완료");

            // 복사된 파일 존재 확인
            const tempFileInfo = await FileSystem.getInfoAsync(tempFilePath);
            console.log(
              "[TextPreview] 임시 파일 정보:",
              JSON.stringify(tempFileInfo)
            );

            // 복사된 파일 읽기
            console.log("[TextPreview] 임시 파일 읽기 시도...");
            const content = await FileSystem.readAsStringAsync(tempFilePath, {
              encoding: FileSystem.EncodingType.UTF8,
            });
            console.log(
              "[TextPreview] 임시 파일 읽기 성공: 파일 크기",
              content.length
            );

            // 임시 파일 삭제
            console.log("[TextPreview] 임시 파일 삭제 중...");
            await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
            console.log("[TextPreview] 임시 파일 삭제 완료");

            setTextContent(content);
            setIsLoading(false);
            return;
          } catch (error2) {
            console.log("[TextPreview] 방법 2 실패:", error2);

            // 방법 3: 파일 읽기 대체 방법
            try {
              console.log(
                "[TextPreview] 방법 3: 파일을 작은 청크로 읽기 시도..."
              );
              // 파일을 작은 청크로 읽기
              let content = "";
              const fileSize = fileInfo.size || 0;
              console.log("[TextPreview] 파일 크기:", fileSize);
              const chunkSize = 1024; // 1KB 청크

              for (let offset = 0; offset < fileSize; offset += chunkSize) {
                console.log(`[TextPreview] 청크 읽기: ${offset}/${fileSize}`);
                try {
                  const chunk = await FileSystem.readAsStringAsync(uri, {
                    encoding: FileSystem.EncodingType.UTF8,
                    position: offset,
                    length: Math.min(chunkSize, fileSize - offset),
                  });
                  content += chunk;
                } catch (chunkError) {
                  console.log(
                    `[TextPreview] 청크 읽기 실패 (offset: ${offset}):`,
                    chunkError
                  );
                  throw chunkError;
                }
              }

              console.log(
                "[TextPreview] 방법 3 성공: 파일 크기",
                content.length
              );
              setTextContent(content);
              setIsLoading(false);
              return;
            } catch (error3) {
              console.log("[TextPreview] 방법 3 실패:", error3);

              // 방법 4: Base64로 파일 읽기 시도
              try {
                console.log("[TextPreview] 방법 4: Base64로 파일 읽기 시도...");
                const base64Content = await FileSystem.readAsStringAsync(uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                console.log(
                  "[TextPreview] Base64 데이터 받음: 길이",
                  base64Content.length
                );

                // Base64를 텍스트로 변환 (개선된 방법)
                try {
                  // 바이너리 데이터로 변환
                  const binaryString = Buffer.from(
                    base64Content,
                    "base64"
                  ).toString("binary");

                  // UTF-8 디코딩 (TextDecoder 사용)
                  // const decoder = new TextDecoder("utf-8");
                  const decoder = new TextDecoder("euc-kr"); // 한글 텍스트를 위한 EUC-KR 인코딩 시도
                  const uint8Array = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    uint8Array[i] = binaryString.charCodeAt(i);
                  }
                  const content = decoder.decode(uint8Array);

                  console.log(
                    "[TextPreview] Base64 디코딩 성공: 길이",
                    content.length
                  );
                  console.log(
                    "[TextPreview] 텍스트 샘플:",
                    content.substring(0, 100)
                  );

                  setTextContent(content);
                  setIsLoading(false);
                  return;
                } catch (decodeError) {
                  console.log("[TextPreview] Base64 디코딩 실패:", decodeError);

                  // 대안적인 방법: 직접 Base64 디코딩
                  try {
                    const bytes = base64Content
                      .split("")
                      .map((c) => c.charCodeAt(0));
                    const bytesArr = new Uint8Array(bytes);
                    const decodedContent = new TextDecoder("utf-8").decode(
                      bytesArr
                    );

                    console.log(
                      "[TextPreview] 대체 방법으로 디코딩 성공: 길이",
                      decodedContent.length
                    );
                    console.log(
                      "[TextPreview] 텍스트 샘플:",
                      decodedContent.substring(0, 100)
                    );

                    setTextContent(decodedContent);
                    setIsLoading(false);
                    return;
                  } catch (err) {
                    console.log("[TextPreview] 대체 디코딩 방법도 실패:", err);
                    throw decodeError;
                  }
                }
              } catch (error4) {
                console.log("[TextPreview] 방법 4 실패:", error4);
                throw new Error(
                  "여러 방법으로 파일 읽기를 시도했으나 모두 실패했습니다"
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("[TextPreview] 텍스트 파일 로딩 오류:", error);
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        setError(`텍스트 파일 로딩 실패: ${errorMessage}`);

        // 사용자에게 오류 정보 표시
        Alert.alert(
          "파일 읽기 오류",
          `파일을 읽는 중 오류가 발생했습니다: ${errorMessage}`,
          [{ text: "확인" }]
        );

        setIsLoading(false);
      }
    };

    loadTextContent();
  }, [uri, fileName]);

  // 설정 화면으로 이동
  const openSettings = () => {
    router.push({
      pathname: "/settings",
      params: { type: "text" },
    });
  };

  // 파일 다시 로드 시도
  const retryLoading = () => {
    setIsLoading(true);
    setError(null);
    setTextContent(null);
    // useEffect가 다시 실행되도록 의존성 배열의 변수를 변경하지 않고
    // 강제로 함수 호출
    loadTextContent();
  };

  // 파일 다시 로드 함수 - useEffect 외부에 정의
  const loadTextContent = async () => {
    try {
      console.log("[TextPreview] 파일 다시 로드 시작:", uri);
      setIsLoading(true);
      setError(null);

      // 파일 존재 여부 확인
      console.log("[TextPreview] 파일 존재 여부 확인 중...");
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log("[TextPreview] 파일 정보:", JSON.stringify(fileInfo));

      if (!fileInfo.exists) {
        throw new Error("파일이 존재하지 않거나 접근할 수 없습니다");
      }

      // 방법 1: 직접 읽기 시도
      console.log("[TextPreview] 방법 1: 직접 읽기 시도...");
      try {
        const content = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        console.log("[TextPreview] 방법 1 성공: 파일 크기", content.length);
        setTextContent(content);
        setIsLoading(false);
        return;
      } catch (error1) {
        console.log("[TextPreview] 방법 1 실패:", error1);

        try {
          console.log("[TextPreview] 방법 2: 임시 파일 생성 후 읽기 시도...");
          // 방법 2: 임시 파일 생성 후 읽기
          const tempDir = FileSystem.cacheDirectory + "temp/";
          console.log("[TextPreview] 임시 디렉토리:", tempDir);
          const tempDirInfo = await FileSystem.getInfoAsync(tempDir);
          console.log(
            "[TextPreview] 임시 디렉토리 정보:",
            JSON.stringify(tempDirInfo)
          );

          if (!tempDirInfo.exists) {
            console.log("[TextPreview] 임시 디렉토리 생성 중...");
            await FileSystem.makeDirectoryAsync(tempDir, {
              intermediates: true,
            });
          }

          const tempFilePath = tempDir + "temp_" + Date.now() + "_" + fileName;
          console.log("[TextPreview] 임시 파일 경로:", tempFilePath);

          // 파일 복사
          console.log("[TextPreview] 파일 복사 시작...");
          await FileSystem.copyAsync({
            from: uri,
            to: tempFilePath,
          });
          console.log("[TextPreview] 파일 복사 완료");

          // 복사된 파일 존재 확인
          const tempFileInfo = await FileSystem.getInfoAsync(tempFilePath);
          console.log(
            "[TextPreview] 임시 파일 정보:",
            JSON.stringify(tempFileInfo)
          );

          // 복사된 파일 읽기
          console.log("[TextPreview] 임시 파일 읽기 시도...");
          const content = await FileSystem.readAsStringAsync(tempFilePath, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          console.log(
            "[TextPreview] 임시 파일 읽기 성공: 파일 크기",
            content.length
          );

          // 임시 파일 삭제
          console.log("[TextPreview] 임시 파일 삭제 중...");
          await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
          console.log("[TextPreview] 임시 파일 삭제 완료");

          setTextContent(content);
          setIsLoading(false);
          return;
        } catch (error2) {
          console.log("[TextPreview] 방법 2 실패:", error2);
          throw error2;
        }
      }
    } catch (error) {
      console.error("[TextPreview] 텍스트 파일 다시 로드 오류:", error);
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      setError(`텍스트 파일 로딩 실패: ${errorMessage}`);
      setIsLoading(false);
    }
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

        {/* 다시 시도 버튼 추가 */}
        <TouchableOpacity style={styles.retryButton} onPress={retryLoading}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>

        {/* 파일 경로 표시 (디버깅용) */}
        <View style={styles.debugInfoContainer}>
          <Text style={styles.debugInfoTitle}>디버깅 정보:</Text>
          <Text style={styles.debugInfoText}>파일 경로: {uri}</Text>
          <Text style={styles.debugInfoText}>파일 이름: {fileName}</Text>
        </View>
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
    marginBottom: 20,
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
  retryButton: {
    backgroundColor: "#4a6da7",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  debugInfoContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 5,
    width: "100%",
  },
  debugInfoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#666",
  },
  debugInfoText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 3,
  },
});
