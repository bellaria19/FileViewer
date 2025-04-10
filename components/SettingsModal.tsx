import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
  Dimensions,
} from "react-native";
import Slider from "@react-native-community/slider"; // 올바른 Slider 임포트
import { FontAwesome } from "@expo/vector-icons";
import { useViewerSettings } from "../context/ViewerSettingsContext";
import { router } from "expo-router";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  viewerType: "image" | "pdf" | "text";
}

export default function SettingsModal({
  visible,
  onClose,
  viewerType,
}: SettingsModalProps) {
  const {
    settings,
    updateImageSettings,
    updatePDFSettings,
    updateTextSettings,
  } = useViewerSettings();

  // 전체 설정 화면으로 이동
  const navigateToFullSettings = () => {
    router.push({
      pathname: "/settings",
      params: { activeTab: viewerType },
    });
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {viewerType === "image"
                ? "이미지 설정"
                : viewerType === "pdf"
                ? "PDF 설정"
                : "텍스트 설정"}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <FontAwesome name="times" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* 이미지 뷰어 설정 */}
            {viewerType === "image" && (
              <>
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
                <View style={styles.settingSlider}>
                  <Text style={styles.settingLabel}>
                    기본 줌 레벨: {Math.round(settings.image.defaultZoom * 100)}
                    %
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
              </>
            )}

            {/* PDF 뷰어 설정 */}
            {viewerType === "pdf" && (
              <>
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
              </>
            )}

            {/* 텍스트 뷰어 설정 */}
            {viewerType === "text" && (
              <>
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
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.fullSettingsButton}
            onPress={navigateToFullSettings}
          >
            <Text style={styles.fullSettingsText}>전체 설정 보기</Text>
            <FontAwesome name="arrow-right" size={14} color="#4a6da7" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 15,
    width: width * 0.85,
    maxHeight: height * 0.7,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    padding: 20,
    maxHeight: height * 0.5,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingLabel: {
    fontSize: 16,
    color: "#333",
  },
  settingSlider: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  fullSettingsButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  fullSettingsText: {
    color: "#4a6da7",
    fontSize: 16,
    fontWeight: "500",
    marginRight: 8,
  },
});
