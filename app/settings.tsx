// app/settings.tsx - 통합된 설정 화면
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Slider from "@react-native-community/slider"; // 올바른 Slider 임포트
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { clearAllFiles } from "../utils/fileStorage";
import { StatusBar } from "expo-status-bar";
import { useViewerSettings } from "../context/ViewerSettingsContext";

export default function Settings() {
  const {
    settings,
    updateImageSettings,
    updatePDFSettings,
    updateTextSettings,
    resetSettings,
    isLoading,
  } = useViewerSettings();
  const params = useLocalSearchParams<{ activeTab?: string }>();
  const router = useRouter();

  // 상태 관리
  const [storageSize, setStorageSize] = useState<string>("계산 중...");
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [fileCount, setFileCount] = useState<number>(0);

  // 탭 관리 상태
  const [activeTab, setActiveTab] = useState<string>(
    params.activeTab || "storage"
  );

  useEffect(() => {
    calculateStorageUsage();

    // URL 파라미터로 activeTab이 전달되면 해당 탭으로 설정
    if (params.activeTab) {
      setActiveTab(params.activeTab);
    }
  }, [params.activeTab]);

  const calculateStorageUsage = async () => {
    try {
      setIsCalculating(true);
      const filesDir = `${FileSystem.documentDirectory}app_files/`;
      const dirInfo = await FileSystem.getInfoAsync(filesDir);

      if (!dirInfo.exists) {
        setStorageSize("0 B");
        setFileCount(0);
        setIsCalculating(false);
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
      setIsCalculating(false);
    } catch (error) {
      console.error("저장공간 계산 오류:", error);
      setStorageSize("오류");
      setIsCalculating(false);
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
            setIsCalculating(true);
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
              setIsCalculating(false);
            }
          },
        },
      ]
    );
  };

  // 설정 초기화 확인
  const confirmResetSettings = () => {
    Alert.alert(
      "설정 초기화",
      "모든 뷰어 설정을 기본값으로 되돌리시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "초기화",
          style: "destructive",
          onPress: resetSettings,
        },
      ]
    );
  };

  // 로딩 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>설정 불러오는 중...</Text>
      </View>
    );
  }

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

      {/* 탭 네비게이션 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "storage" && styles.activeTab]}
          onPress={() => setActiveTab("storage")}
        >
          <FontAwesome
            name="hdd-o"
            size={16}
            color={activeTab === "storage" ? "#4a6da7" : "#888"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "storage" && styles.activeTabText,
            ]}
          >
            저장소
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "image" && styles.activeTab]}
          onPress={() => setActiveTab("image")}
        >
          <FontAwesome
            name="image"
            size={16}
            color={activeTab === "image" ? "#4a6da7" : "#888"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "image" && styles.activeTabText,
            ]}
          >
            이미지
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "pdf" && styles.activeTab]}
          onPress={() => setActiveTab("pdf")}
        >
          <FontAwesome
            name="file-pdf-o"
            size={16}
            color={activeTab === "pdf" ? "#4a6da7" : "#888"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "pdf" && styles.activeTabText,
            ]}
          >
            PDF
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "text" && styles.activeTab]}
          onPress={() => setActiveTab("text")}
        >
          <FontAwesome
            name="file-text-o"
            size={16}
            color={activeTab === "text" ? "#4a6da7" : "#888"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "text" && styles.activeTabText,
            ]}
          >
            텍스트
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "info" && styles.activeTab]}
          onPress={() => setActiveTab("info")}
        >
          <FontAwesome
            name="info-circle"
            size={16}
            color={activeTab === "info" ? "#4a6da7" : "#888"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "info" && styles.activeTabText,
            ]}
          >
            정보
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* 저장소 설정 탭 */}
        {activeTab === "storage" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>저장공간</Text>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>저장공간 사용량</Text>
                <Text style={styles.settingValue}>
                  {isCalculating
                    ? "계산 중..."
                    : `${storageSize} (파일 ${fileCount}개)`}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.button, isCalculating && styles.disabledButton]}
                onPress={handleClearStorage}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.buttonText}>비우기</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={calculateStorageUsage}
              disabled={isCalculating}
            >
              <FontAwesome
                name="refresh"
                size={14}
                color="#4a6da7"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.refreshButtonText}>사용량 다시 계산</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 이미지 뷰어 설정 탭 */}
        {activeTab === "image" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>이미지 뷰어 설정</Text>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>이미지 정보 표시</Text>
              <Switch
                value={settings.image.showImageInfo}
                onValueChange={(value) =>
                  updateImageSettings({ showImageInfo: value })
                }
                trackColor={{ false: "#d3d3d3", true: "#4a6da7" }}
                thumbColor={"#f4f3f4"}
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>다크 모드</Text>
              <Switch
                value={settings.image.darkMode}
                onValueChange={(value) =>
                  updateImageSettings({ darkMode: value })
                }
                trackColor={{ false: "#d3d3d3", true: "#4a6da7" }}
                thumbColor={"#f4f3f4"}
              />
            </View>

            <View style={styles.settingSlider}>
              <Text style={styles.settingLabel}>
                기본 줌 레벨: {Math.round(settings.image.defaultZoom * 100)}%
              </Text>
              <Slider
                minimumValue={0.5}
                maximumValue={2}
                step={0.1}
                value={settings.image.defaultZoom}
                onValueChange={(value) =>
                  updateImageSettings({ defaultZoom: value })
                }
                minimumTrackTintColor="#4a6da7"
                maximumTrackTintColor="#d3d3d3"
              />
            </View>

            <View style={styles.settingSlider}>
              <Text style={styles.settingLabel}>
                최대 줌 레벨: {settings.image.maxZoom}x
              </Text>
              <Slider
                minimumValue={2}
                maximumValue={5}
                step={0.5}
                value={settings.image.maxZoom}
                onValueChange={(value) =>
                  updateImageSettings({ maxZoom: value })
                }
                minimumTrackTintColor="#4a6da7"
                maximumTrackTintColor="#d3d3d3"
              />
            </View>

            <View style={styles.settingSlider}>
              <Text style={styles.settingLabel}>
                최소 줌 레벨: {settings.image.minZoom}x
              </Text>
              <Slider
                minimumValue={0.1}
                maximumValue={0.9}
                step={0.1}
                value={settings.image.minZoom}
                onValueChange={(value) =>
                  updateImageSettings({ minZoom: value })
                }
                minimumTrackTintColor="#4a6da7"
                maximumTrackTintColor="#d3d3d3"
              />
            </View>
          </View>
        )}

        {/* PDF 뷰어 설정 탭 */}
        {activeTab === "pdf" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PDF 뷰어 설정</Text>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>페이지 번호 표시</Text>
              <Switch
                value={settings.pdf.showPageNumbers}
                onValueChange={(value) =>
                  updatePDFSettings({ showPageNumbers: value })
                }
                trackColor={{ false: "#d3d3d3", true: "#4a6da7" }}
                thumbColor={"#f4f3f4"}
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>다크 모드</Text>
              <Switch
                value={settings.pdf.darkMode}
                onValueChange={(value) =>
                  updatePDFSettings({ darkMode: value })
                }
                trackColor={{ false: "#d3d3d3", true: "#4a6da7" }}
                thumbColor={"#f4f3f4"}
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>한 페이지씩 보기</Text>
              <Switch
                value={settings.pdf.singlePageMode}
                onValueChange={(value) =>
                  updatePDFSettings({ singlePageMode: value })
                }
                trackColor={{ false: "#d3d3d3", true: "#4a6da7" }}
                thumbColor={"#f4f3f4"}
              />
            </View>

            <View style={styles.settingSlider}>
              <Text style={styles.settingLabel}>
                기본 줌 레벨: {Math.round(settings.pdf.defaultZoom * 100)}%
              </Text>
              <Slider
                minimumValue={0.5}
                maximumValue={2}
                step={0.1}
                value={settings.pdf.defaultZoom}
                onValueChange={(value) =>
                  updatePDFSettings({ defaultZoom: value })
                }
                minimumTrackTintColor="#4a6da7"
                maximumTrackTintColor="#d3d3d3"
              />
            </View>
          </View>
        )}

        {/* 텍스트 뷰어 설정 탭 */}
        {activeTab === "text" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>텍스트 뷰어 설정</Text>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>다크 모드</Text>
              <Switch
                value={settings.text.darkMode}
                onValueChange={(value) =>
                  updateTextSettings({ darkMode: value })
                }
                trackColor={{ false: "#d3d3d3", true: "#4a6da7" }}
                thumbColor={"#f4f3f4"}
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>자동 줄바꿈</Text>
              <Switch
                value={settings.text.wordWrap}
                onValueChange={(value) =>
                  updateTextSettings({ wordWrap: value })
                }
                trackColor={{ false: "#d3d3d3", true: "#4a6da7" }}
                thumbColor={"#f4f3f4"}
              />
            </View>

            <View style={styles.settingSlider}>
              <Text style={styles.settingLabel}>
                글자 크기: {settings.text.fontSize}px
              </Text>
              <Slider
                minimumValue={12}
                maximumValue={24}
                step={1}
                value={settings.text.fontSize}
                onValueChange={(value) =>
                  updateTextSettings({ fontSize: value })
                }
                minimumTrackTintColor="#4a6da7"
                maximumTrackTintColor="#d3d3d3"
              />
            </View>

            <View style={styles.settingSlider}>
              <Text style={styles.settingLabel}>
                줄 간격: {settings.text.lineHeight}
              </Text>
              <Slider
                minimumValue={1}
                maximumValue={2.5}
                step={0.1}
                value={settings.text.lineHeight}
                onValueChange={(value) =>
                  updateTextSettings({ lineHeight: value })
                }
                minimumTrackTintColor="#4a6da7"
                maximumTrackTintColor="#d3d3d3"
              />
            </View>

            {/* 폰트 선택 (간단한 예시) */}
            <View style={styles.setting}>
              <Text style={styles.settingLabel}>폰트</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[
                    styles.fontButton,
                    settings.text.fontFamily === "System" &&
                      styles.selectedFont,
                  ]}
                  onPress={() => updateTextSettings({ fontFamily: "System" })}
                >
                  <Text style={styles.fontButtonText}>기본</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fontButton,
                    settings.text.fontFamily === "monospace" &&
                      styles.selectedFont,
                  ]}
                  onPress={() =>
                    updateTextSettings({ fontFamily: "monospace" })
                  }
                >
                  <Text
                    style={[styles.fontButtonText, { fontFamily: "monospace" }]}
                  >
                    고정폭
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* 정보 탭 */}
        {activeTab === "info" && (
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
        )}

        {/* 모든 설정 초기화 버튼 - 이미지/PDF/텍스트 탭에서만 표시 */}
        {(activeTab === "image" ||
          activeTab === "pdf" ||
          activeTab === "text") && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={confirmResetSettings}
          >
            <Text style={styles.resetButtonText}>모든 설정 초기화</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#4a6da7",
  },
  tabText: {
    marginLeft: 5,
    fontSize: 12,
    color: "#888",
  },
  activeTabText: {
    color: "#4a6da7",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: "#333",
  },
  settingValue: {
    fontSize: 14,
    color: "#666",
  },
  settingSlider: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  setting: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
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
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 8,
  },
  refreshButtonText: {
    color: "#4a6da7",
    fontSize: 14,
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
  buttonGroup: {
    flexDirection: "row",
    marginTop: 8,
  },
  fontButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  selectedFont: {
    backgroundColor: "#4a6da7",
  },
  fontButtonText: {
    fontSize: 14,
    color: "#333",
  },
  resetButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginVertical: 16,
  },
  resetButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
});
