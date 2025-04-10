import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import { FontAwesome } from "@expo/vector-icons";
import { useViewerSettings } from "../context/ViewerSettingsContext";
import SettingsModal from "./SettingsModal";

interface WebPreviewProps {
  uri: string;
  fileName: string;
  fileType: string;
}

export default function WebPreview({
  uri,
  fileName,
  fileType,
}: WebPreviewProps) {
  const { settings } = useViewerSettings();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [webViewSource, setWebViewSource] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);

  // 설정 모달 상태
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);

  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    prepareWebViewSource();
  }, [uri, fileType, settings.pdf]);

  const prepareWebViewSource = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 파일 존재 확인
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        setError("파일이 존재하지 않거나 접근할 수 없습니다");
        setIsLoading(false);
        return;
      }

      // PDF 파일인 경우
      if (fileType === "application/pdf") {
        if (Platform.OS === "ios") {
          // iOS에서는 file:// 프로토콜을 직접 사용
          setWebViewSource({
            uri: uri,
            headers: {
              "Cache-Control": "no-store",
            },
          });
        } else {
          // Android에서는 PDF를 표시하기 위한 HTML을 생성
          // PDF.js 또는 다른 방법으로 렌더링 고려
          const darkMode = settings.pdf.darkMode;
          const singlePageMode = settings.pdf.singlePageMode;

          const pdfHTML = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
              <style>
                body, html {
                  margin: 0;
                  padding: 0;
                  width: 100%;
                  height: 100%;
                  overflow: hidden;
                  background-color: ${darkMode ? "#333" : "#f5f5f5"};
                  color: ${darkMode ? "#fff" : "#000"};
                }
                #pdf-container {
                  width: 100%;
                  height: 100%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                iframe {
                  width: 100%;
                  height: 100%;
                  border: none;
                }
              </style>
            </head>
            <body>
              <div id="pdf-container">
                <iframe 
                  src="${uri}#zoom=${settings.pdf.defaultZoom * 100}${
            singlePageMode ? "&scrollbar=0&view=FitH" : ""
          }" 
                  allowfullscreen
                ></iframe>
              </div>
              <script>
                // PDF 페이지 변경 감지 및 메시지 전달
                document.addEventListener('message', function(e) {
                  if (e.data === 'GET_PAGE_INFO') {
                    try {
                      const iframe = document.querySelector('iframe');
                      const currentPage = iframe.contentWindow.PDFViewerApplication.page;
                      const totalPages = iframe.contentWindow.PDFViewerApplication.pagesCount;
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        currentPage,
                        totalPages
                      }));
                    } catch(err) {
                      console.error('Error getting page info:', err);
                    }
                  }
                });
              </script>
            </body>
            </html>
          `;
          setWebViewSource({ html: pdfHTML, baseUrl: "" });
        }
      }
      // EPUB 파일인 경우
      else if (fileType === "application/epub+zip") {
        setWebViewSource({ uri });
      }
      // HTML 파일인 경우
      else if (fileType === "text/html") {
        try {
          // HTML 파일 내용 직접 읽기
          const htmlContent = await FileSystem.readAsStringAsync(uri);
          setWebViewSource({ html: htmlContent, baseUrl: "" });
        } catch (error) {
          console.error("HTML 파일 읽기 오류:", error);
          // 직접 읽기 실패 시 URI로 시도
          setWebViewSource({ uri });
        }
      }
      // 지원하지 않는 유형
      else {
        setError(`지원하지 않는 파일 형식입니다: ${fileType}`);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("WebPreview 준비 오류:", error);
      setError(
        `파일을 불러오는 중 오류가 발생했습니다: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`
      );
      setIsLoading(false);
    }
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);

    // PDF 페이지 정보 요청 (PDF일 경우)
    if (fileType === "application/pdf" && Platform.OS === "android") {
      setTimeout(() => {
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            if (typeof PDFViewerApplication !== 'undefined') {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                currentPage: PDFViewerApplication.page,
                totalPages: PDFViewerApplication.pagesCount
              }));
            }
            true;
          `);
        }
      }, 1000);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.currentPage && data.totalPages) {
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
      }
    } catch (e) {
      console.error("Error parsing WebView message:", e);
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error("WebView 로드 오류:", nativeEvent);
    setError(
      `파일을 불러오는 중 오류가 발생했습니다: ${
        nativeEvent.description || "알 수 없는 오류"
      }`
    );
    setIsLoading(false);
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
          settings.pdf.darkMode && styles.darkContainer,
        ]}
      >
        <FontAwesome name="exclamation-circle" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!webViewSource) {
    return (
      <View
        style={[
          styles.centerContainer,
          settings.pdf.darkMode && styles.darkContainer,
        ]}
      >
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text
          style={[styles.loadingText, settings.pdf.darkMode && styles.darkText]}
        >
          파일 준비 중...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, settings.pdf.darkMode && styles.darkContainer]}
    >
      <WebView
        ref={webViewRef}
        source={webViewSource}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        mixedContentMode="always"
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onMessage={handleWebViewMessage}
        renderError={(errorDomain, errorCode, errorDesc) => (
          <View style={styles.centerContainer}>
            <FontAwesome name="exclamation-circle" size={60} color="#e74c3c" />
            <Text style={styles.errorText}>
              {`WebView 오류: ${errorDesc} (${errorCode})`}
            </Text>
          </View>
        )}
      />

      {isLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4a6da7" />
          <Text style={styles.loadingText}>
            {fileType === "application/pdf"
              ? "PDF 로딩 중..."
              : "문서 로딩 중..."}
          </Text>
        </View>
      )}

      {/* PDF 페이지 정보 및 설정 버튼 */}
      {fileType === "application/pdf" &&
        settings.pdf.showPageNumbers &&
        totalPages > 0 && (
          <View style={styles.pageInfoContainer}>
            <Text style={styles.pageInfoText}>
              {currentPage} / {totalPages}
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={openSettings}
            >
              <FontAwesome name="gear" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

      {/* 설정 버튼 (페이지 정보 표시가 꺼져있을 때) */}
      {fileType === "application/pdf" && !settings.pdf.showPageNumbers && (
        <TouchableOpacity
          style={styles.floatingSettingsButton}
          onPress={openSettings}
        >
          <FontAwesome name="gear" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* EPUB이나 HTML 파일일 때의 설정 버튼 */}
      {(fileType === "application/epub+zip" || fileType === "text/html") && (
        <TouchableOpacity
          style={styles.floatingSettingsButton}
          onPress={openSettings}
        >
          <FontAwesome name="gear" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* 설정 모달 */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        viewerType={fileType === "application/pdf" ? "pdf" : "text"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  darkContainer: {
    backgroundColor: "#222",
  },
  webview: {
    flex: 1,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
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
    marginTop: 15,
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
  },
  pageInfoContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 10,
  },
  pageInfoText: {
    color: "#fff",
    fontSize: 14,
  },
  settingsButton: {
    padding: 8,
  },
  floatingSettingsButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "rgba(74, 109, 167, 0.8)",
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
