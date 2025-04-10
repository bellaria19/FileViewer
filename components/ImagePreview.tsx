import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import {
  PinchGestureHandler,
  State,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useViewerSettings } from "../context/ViewerSettingsContext";
import SettingsModal from "./SettingsModal";

interface ImagePreviewProps {
  uri: string;
  fileName: string;
}

export default function ImagePreview({ uri, fileName }: ImagePreviewProps) {
  const { settings } = useViewerSettings();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(settings.image.defaultZoom);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
    verticalPadding: number;
  } | null>(null);

  // 설정 모달 상태
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  // 하단 인포바 높이 (패딩 계산에 사용)
  const infoBarHeight = 44;

  // 이미지 크기 정보 가져오기
  useEffect(() => {
    Image.getSize(
      uri,
      (width, height) => {
        // 화면 크기에 맞게 이미지 크기 계산
        const screenRatio = windowWidth / windowHeight;
        const imageRatio = width / height;

        let newWidth, newHeight, verticalPadding;

        if (imageRatio > screenRatio) {
          // 이미지가 가로로 더 길면 너비에 맞춤
          newWidth = windowWidth;
          newHeight = windowWidth / imageRatio;

          // 남은 세로 공간 계산해서 위아래 패딩 동일하게
          const availableHeight = windowHeight - infoBarHeight;
          verticalPadding = (availableHeight - newHeight) / 2;
        } else {
          // 이미지가 세로로 더 길면 높이에 맞춤 (위아래 여백 고려)
          const availableHeight = windowHeight - infoBarHeight;
          newHeight = availableHeight * 0.8; // 전체 높이의 80%만 사용하여 여백 확보
          newWidth = newHeight * imageRatio;

          // 위아래 패딩 계산
          verticalPadding = (availableHeight - newHeight) / 2;
        }

        setImageSize({
          width: newWidth,
          height: newHeight,
          originalWidth: width,
          originalHeight: height,
          verticalPadding: Math.max(0, verticalPadding), // 음수 패딩 방지
        });
      },
      (error) => {
        console.error("이미지 크기를 가져오는 데 실패했습니다", error);
        setError("이미지 로드 실패");
      }
    );
  }, [uri, windowWidth, windowHeight]);

  // 핀치 줌 처리
  const onPinchGestureEvent = ({ nativeEvent }: { nativeEvent: any }) => {
    const newScale = nativeEvent.scale;
    if (
      newScale >= settings.image.minZoom &&
      newScale <= settings.image.maxZoom
    ) {
      setScale(newScale);
    }
  };

  const onPinchHandlerStateChange = ({ nativeEvent }: { nativeEvent: any }) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      // 제스처가 끝나면 현재 스케일 유지
      let finalScale = nativeEvent.scale;

      // 최소/최대 스케일 제한
      if (finalScale < settings.image.minZoom)
        finalScale = settings.image.minZoom;
      if (finalScale > settings.image.maxZoom)
        finalScale = settings.image.maxZoom;

      setScale(finalScale);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError("이미지를 불러올 수 없습니다");
  };

  // 이미지 초기화 (줌 리셋)
  const resetZoom = () => {
    setScale(settings.image.defaultZoom);
  };

  // 설정 모달 열기
  const openSettings = () => {
    setSettingsVisible(true);
  };

  if (error) {
    return (
      <View
        style={[
          styles.centerContainer,
          settings.image.darkMode && styles.darkContainer,
        ]}
      >
        <FontAwesome name="exclamation-circle" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={[
        styles.container,
        settings.image.darkMode ? styles.darkContainer : styles.lightContainer,
      ]}
    >
      <PinchGestureHandler
        onGestureEvent={onPinchGestureEvent}
        onHandlerStateChange={onPinchHandlerStateChange}
      >
        <ScrollView
          ref={scrollViewRef}
          style={[
            styles.scrollView,
            settings.image.darkMode
              ? styles.darkScrollView
              : styles.lightScrollView,
          ]}
          contentContainerStyle={[
            styles.scrollViewContent,
            {
              width: imageSize?.width ? imageSize.width * scale : windowWidth,
              height: imageSize?.height
                ? imageSize.height * scale + imageSize.verticalPadding * 2
                : windowHeight - infoBarHeight,
              paddingTop: imageSize?.verticalPadding || 0,
              paddingBottom: imageSize?.verticalPadding || 0,
            },
          ]}
          scrollEnabled={scale > 1} // 확대된 경우에만 스크롤 활성화
          maximumZoomScale={settings.image.maxZoom}
          minimumZoomScale={settings.image.minZoom}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          {imageSize && (
            <Image
              source={{ uri }}
              style={{
                width: imageSize.width * scale,
                height: imageSize.height * scale,
              }}
              resizeMode="contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}

          {isLoading && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
        </ScrollView>
      </PinchGestureHandler>

      {settings.image.showImageInfo && (
        <View style={styles.infoBar}>
          <Text style={styles.infoText} numberOfLines={1}>
            {fileName}
          </Text>
          <View style={styles.infoRightSection}>
            {imageSize && (
              <TouchableOpacity onPress={resetZoom}>
                <Text style={styles.infoText}>
                  {Math.round(scale * 100)}% | {imageSize.originalWidth} ×{" "}
                  {imageSize.originalHeight}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={openSettings}
            >
              <FontAwesome name="gear" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 이미지 정보가 표시되지 않을 때 설정 버튼 */}
      {!settings.image.showImageInfo && (
        <TouchableOpacity
          style={styles.floatingSettingsButton}
          onPress={openSettings}
        >
          <FontAwesome
            name="gear"
            size={22}
            color={settings.image.darkMode ? "#fff" : "#4a6da7"}
          />
        </TouchableOpacity>
      )}

      {/* 설정 모달 */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        viewerType="image"
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightContainer: {
    backgroundColor: "#f5f5f5",
  },
  darkContainer: {
    backgroundColor: "#222",
  },
  scrollView: {
    flex: 1,
  },
  lightScrollView: {
    backgroundColor: "#f5f5f5",
  },
  darkScrollView: {
    backgroundColor: "#222",
  },
  scrollViewContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
  },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 10,
    paddingHorizontal: 15,
    height: 44, // 고정 높이 설정
  },
  infoRightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    color: "#fff",
    fontSize: 14,
  },
  settingsButton: {
    marginLeft: 12,
    padding: 4,
  },
  floatingSettingsButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
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
