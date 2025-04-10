// app/index.tsx 수정
import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { getFileTypeInfo, formatFileSize } from "../utils/fileTypes";
import {
  initializeFileStorage,
  importFile,
  getMetadataPath,
} from "../utils/fileStorage";

interface FileItem {
  uri: string;
  name: string;
  type: string;
  size: number;
  dateAdded: number;
}

export default function Index() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<string>("");
  const router = useRouter();

  // 저장된 파일 메타데이터 경로
  const metadataPath = getMetadataPath();

  // 파일 메타데이터 저장
  const saveFilesMetadata = async (filesData: FileItem[]) => {
    try {
      await FileSystem.writeAsStringAsync(
        metadataPath,
        JSON.stringify(filesData)
      );
    } catch (error) {
      console.error("파일 메타데이터 저장 오류:", error);
    }
  };

  // 파일 메타데이터 로드
  const loadFilesMetadata = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(metadataPath);

      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(metadataPath);
        const filesData = JSON.parse(content) as FileItem[];

        // 파일이 실제로 존재하는지 확인
        const validFiles = [];
        for (const file of filesData) {
          const exists = await FileSystem.getInfoAsync(file.uri);
          if (exists.exists) {
            validFiles.push(file);
          }
        }

        setFiles(validFiles);
      }
    } catch (error) {
      console.error("파일 메타데이터 로드 오류:", error);
    }
  };

  // 앱 시작 시 저장소 초기화 및 파일 목록 로드
  useEffect(() => {
    initializeFileStorage().then(() => {
      loadFilesMetadata();
    });
  }, []);

  // 파일 선택 및 저장 (다중 선택 지원)
  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
        copyToCacheDirectory: true,
        multiple: true, // 다중 선택 활성화
      });

      if (result.canceled) {
        return;
      }

      // 선택된 파일이 있는지 확인
      if (result.assets.length === 0) {
        return;
      }

      // 가져오기 작업 시작
      setIsImporting(true);

      // 선택한 모든 파일들 가져오기
      const newFiles: FileItem[] = [];
      let importedCount = 0;
      let firstImportedFile: FileItem | null = null;

      for (const file of result.assets) {
        try {
          setImportProgress(
            `파일 가져오는 중... (${importedCount + 1}/${result.assets.length})`
          );

          // 파일 존재 확인
          const fileInfo = await FileSystem.getInfoAsync(file.uri);
          if (!fileInfo.exists) {
            console.warn(`파일이 존재하지 않음: ${file.name}`);
            continue;
          }

          // 앱 저장소로 파일 가져오기
          const storedUri = await importFile(file.uri, file.name);

          // 가져온 파일이 실제로 존재하는지 확인
          const storedFileInfo = await FileSystem.getInfoAsync(storedUri);
          if (!storedFileInfo.exists) {
            console.warn(`저장소에 파일을 가져올 수 없음: ${file.name}`);
            continue;
          }

          // 새 파일 항목 생성
          const newFile: FileItem = {
            uri: storedUri,
            name: file.name,
            type: file.mimeType,
            size: file.size,
            dateAdded: Date.now(),
          };

          // 첫 번째 가져온 파일 저장 (나중에 뷰어로 이동할 때 사용)
          if (importedCount === 0) {
            firstImportedFile = newFile;
          }

          newFiles.push(newFile);
          importedCount++;
        } catch (error) {
          console.error(`파일 가져오기 오류 (${file.name}):`, error);
        }
      }

      // 가져온 파일이 없는 경우
      if (newFiles.length === 0) {
        setIsImporting(false);
        Alert.alert("오류", "선택한 파일을 가져오는 데 실패했습니다.");
        return;
      }

      // 파일 목록 업데이트
      setFiles((prevFiles) => {
        // 기존 파일 목록과 새 파일 목록 병합
        // 이미 존재하는 파일은 새 버전으로 교체
        const updatedFiles = [...prevFiles];

        for (const newFile of newFiles) {
          const existingIndex = updatedFiles.findIndex(
            (f) => f.name === newFile.name
          );

          if (existingIndex >= 0) {
            updatedFiles[existingIndex] = newFile; // 기존 파일 업데이트
          } else {
            updatedFiles.unshift(newFile); // 새 파일은 목록 앞에 추가
          }
        }

        // 메타데이터 저장
        saveFilesMetadata(updatedFiles);
        return updatedFiles;
      });

      // 가져오기 작업 완료
      setIsImporting(false);

      // 가져온 파일이 한 개인 경우 즉시 뷰어로 이동
      if (newFiles.length === 1 && firstImportedFile) {
        router.push({
          pathname: "/viewer",
          params: {
            uri: firstImportedFile.uri,
            name: firstImportedFile.name,
            type: firstImportedFile.type,
          },
        });
      } else if (newFiles.length > 1) {
        // 여러 파일을 가져온 경우 결과 알림
        Alert.alert(
          "파일 가져오기 완료",
          `${newFiles.length}개의 파일을 성공적으로 가져왔습니다.`
        );
      }
    } catch (error) {
      console.error("파일 선택 오류:", error);
      Alert.alert("오류", "파일 선택 중 문제가 발생했습니다");
      setIsImporting(false);
    }
  };

  // 파일 열기
  const openFile = (file: FileItem) => {
    router.push({
      pathname: "/viewer",
      params: {
        uri: file.uri,
        name: file.name,
        type: file.type,
      },
    });
  };

  // 파일 삭제
  const deleteFile = async (fileToDelete: FileItem) => {
    try {
      Alert.alert(
        "파일 삭제",
        `"${fileToDelete.name}" 파일을 삭제하시겠습니까?`,
        [
          {
            text: "취소",
            style: "cancel",
          },
          {
            text: "삭제",
            style: "destructive",
            onPress: async () => {
              // 파일 삭제
              await FileSystem.deleteAsync(fileToDelete.uri, {
                idempotent: true,
              });

              // 목록에서 제거
              const updatedFiles = files.filter(
                (file) => file.uri !== fileToDelete.uri
              );
              setFiles(updatedFiles);

              // 메타데이터 업데이트
              saveFilesMetadata(updatedFiles);
            },
          },
        ]
      );
    } catch (error) {
      console.error("파일 삭제 오류:", error);
      Alert.alert("오류", "파일 삭제 중 문제가 발생했습니다");
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "File Viewer",
          headerShown: true,
          headerTintColor: "white",
          headerStyle: {
            backgroundColor: "#4a6da7",
          },
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 15 }}
              onPress={() => router.push("/settings")}
            >
              <FontAwesome name="gear" size={22} color="white" />
            </TouchableOpacity>
          ),
        }}
      />

      <TouchableOpacity
        style={[styles.pickButton, isImporting && styles.pickButtonDisabled]}
        onPress={pickDocuments}
        disabled={isImporting}
      >
        {isImporting ? (
          <>
            <ActivityIndicator
              size="small"
              color="white"
              style={{ marginRight: 10 }}
            />
            <Text style={styles.buttonText}>{importProgress}</Text>
          </>
        ) : (
          <>
            <FontAwesome name="plus" size={20} color="white" />
            <Text style={styles.buttonText}>여러 파일 선택</Text>
          </>
        )}
      </TouchableOpacity>

      {files.length > 0 ? (
        <View style={styles.filesContainer}>
          <Text style={styles.sectionTitle}>내 파일 ({files.length})</Text>
          <FlashList
            data={files}
            keyExtractor={(item) => item.uri}
            estimatedItemSize={80}
            renderItem={({ item }) => (
              <View style={styles.fileItem}>
                <TouchableOpacity
                  style={styles.fileContent}
                  onPress={() => openFile(item)}
                >
                  <FontAwesome
                    name={getFileTypeInfo(item.type).icon}
                    size={24}
                    color={getFileTypeInfo(item.type).color}
                    style={styles.fileIcon}
                  />
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.fileInfo}>
                      {formatFileSize(item.size)} •{" "}
                      {getFileTypeInfo(item.type).name}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteFile(item)}
                >
                  <FontAwesome name="trash-o" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <FontAwesome name="folder-open-o" size={60} color="#ccc" />
          <Text style={styles.emptyText}>파일이 없습니다</Text>
          <Text style={styles.emptySubtext}>
            "여러 파일 선택" 버튼을 눌러 파일을 추가하세요
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  pickButton: {
    flexDirection: "row",
    backgroundColor: "#4a6da7",
    padding: 15,
    borderRadius: 10,
    margin: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickButtonDisabled: {
    backgroundColor: "#8ba5c9",
  },
  buttonText: {
    color: "white",
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  filesContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
    height: "100%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  fileItem: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fileContent: {
    flex: 1,
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
  },
  fileIcon: {
    marginRight: 15,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  fileInfo: {
    fontSize: 13,
    color: "#888",
  },
  deleteButton: {
    padding: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#888",
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 8,
  },
});
