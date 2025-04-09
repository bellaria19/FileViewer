// components/ZipPreview.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { FontAwesome } from "@expo/vector-icons";
import { getFileTypeInfo } from "../utils/fileTypes";

interface ZipPreviewProps {
  uri: string;
  fileName: string;
  onFileSelect?: (uri: string, fileName: string, mimeType: string) => void;
}

interface ZipEntry {
  name: string;
  size: number;
  isDirectory: boolean;
  path: string;
}

const ZipPreview: React.FC<ZipPreviewProps> = ({
  uri,
  fileName,
  onFileSelect,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEntries, setCurrentEntries] = useState<ZipEntry[]>([]);
  const [extractedPath, setExtractedPath] = useState<string | null>(null);

  useEffect(() => {
    extractZipAndLoadContents();

    // 컴포넌트 언마운트 시 임시 디렉토리 정리
    return () => {
      if (extractedPath) {
        FileSystem.deleteAsync(extractedPath, { idempotent: true }).catch(
          (err) => console.error("Error cleaning up temp directory:", err)
        );
      }
    };
  }, [uri]);

  const extractZipAndLoadContents = async () => {
    try {
      setIsLoading(true);

      // 임시 디렉토리 생성
      const tempDir = `${FileSystem.cacheDirectory}zip_viewer_${Date.now()}/`;
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

      // ZIP 파일 압축 해제 (Expo FileSystem에서는 압축 해제 API를 제공하지 않음)
      // 실제 구현에서는 native 모듈을 사용해야 함
      Alert.alert(
        "ZIP 파일 탐색",
        "ZIP 파일의 내용을 보기 위해 파일을 추출해야 합니다. 진행하시겠습니까?",
        [
          {
            text: "취소",
            style: "cancel",
            onPress: () => {
              setIsLoading(false);
              setError("ZIP 파일 탐색이 취소되었습니다.");
            },
          },
          {
            text: "확인",
            onPress: async () => {
              try {
                // 실제 앱에서는 여기서 네이티브 코드로 압축을 해제해야 함
                // 시뮬레이션: 임시 메시지만 보여줌
                setCurrentEntries([
                  {
                    name: "README.txt",
                    size: 1024,
                    isDirectory: false,
                    path: "README.txt",
                  },
                  {
                    name: "images",
                    size: 0,
                    isDirectory: true,
                    path: "images/",
                  },
                  {
                    name: "documents",
                    size: 0,
                    isDirectory: true,
                    path: "documents/",
                  },
                ]);
                setExtractedPath(tempDir);
                setIsLoading(false);
              } catch (err) {
                console.error("Error during extraction:", err);
                setError("ZIP 파일을 추출하는 데 실패했습니다.");
                setIsLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error with ZIP file:", error);
      setError("ZIP 파일을 처리하는 데 실패했습니다.");
      setIsLoading(false);
    }
  };

  const handleEntryPress = (entry: ZipEntry) => {
    if (entry.isDirectory) {
      Alert.alert("폴더", `${entry.name} 폴더를 열려고 시도합니다.`);
      // 실제 구현에서는 현재 디렉토리를 변경
    } else {
      Alert.alert("파일", `${entry.name} 파일을 열려고 시도합니다.`);
      // 실제 구현에서는 파일을 열기
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>ZIP 파일 처리 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <FontAwesome name="exclamation-circle" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            setError(null);
            extractZipAndLoadContents();
          }}
        >
          <Text style={styles.buttonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{fileName}</Text>
      </View>

      <FlatList
        data={currentEntries}
        keyExtractor={(item) => item.path}
        renderItem={({ item }) => {
          const fileTypeInfo = item.isDirectory
            ? { icon: "folder", color: "#f39c12" }
            : getFileTypeInfo(getFileType(item.name));

          return (
            <TouchableOpacity
              style={styles.entryItem}
              onPress={() => handleEntryPress(item)}
            >
              <FontAwesome
                name={fileTypeInfo.icon}
                size={24}
                color={fileTypeInfo.color}
                style={styles.entryIcon}
              />
              <View style={styles.entryDetails}>
                <Text style={styles.entryName} numberOfLines={1}>
                  {item.name}
                </Text>
                {!item.isDirectory && (
                  <Text style={styles.entryInfo}>
                    {formatFileSize(item.size)}
                  </Text>
                )}
              </View>
              {item.isDirectory && (
                <FontAwesome name="chevron-right" size={16} color="#999" />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="folder-open-o" size={50} color="#ccc" />
            <Text style={styles.emptyText}>ZIP 파일이 비어 있습니다</Text>
          </View>
        }
      />
    </View>
  );
};

// 파일 확장자로부터 MIME 타입 추론
const getFileType = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  switch (ext) {
    case "txt":
      return "text/plain";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "pdf":
      return "application/pdf";
    case "epub":
      return "application/epub+zip";
    case "html":
      return "text/html";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
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
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#4a6da7",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  entryItem: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  entryIcon: {
    marginRight: 15,
    width: 24,
    textAlign: "center",
  },
  entryDetails: {
    flex: 1,
  },
  entryName: {
    fontSize: 16,
    color: "#333",
  },
  entryInfo: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  emptyContainer: {
    padding: 50,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#999",
  },
});

export default ZipPreview;
