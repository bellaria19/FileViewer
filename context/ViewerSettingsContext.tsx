import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 이미지 뷰어 설정 타입
interface ImageViewerSettings {
  defaultZoom: number; // 기본 줌 레벨 (1 = 100%)
  showImageInfo: boolean; // 이미지 정보 표시 여부
  darkMode: boolean; // 다크 모드 사용 여부
  maxZoom: number; // 최대 줌 레벨
  minZoom: number; // 최소 줌 레벨
}

// PDF 뷰어 설정 타입
interface PDFViewerSettings {
  defaultZoom: number; // 기본 줌 레벨
  showPageNumbers: boolean; // 페이지 번호 표시 여부
  darkMode: boolean; // 다크 모드 사용 여부
  singlePageMode: boolean; // 한 페이지씩 보기 모드 활성화 여부
}

// 텍스트 뷰어 설정 타입
interface TextViewerSettings {
  fontSize: number; // 폰트 크기 (16 = 기본값)
  fontFamily: string; // 폰트 패밀리
  lineHeight: number; // 줄 간격 (1.5 = 기본값)
  darkMode: boolean; // 다크 모드 사용 여부
  wordWrap: boolean; // 자동 줄바꿈 여부
}

// 전체 뷰어 설정 타입
interface ViewerSettings {
  image: ImageViewerSettings;
  pdf: PDFViewerSettings;
  text: TextViewerSettings;
}

// 기본 설정값
const defaultSettings: ViewerSettings = {
  image: {
    defaultZoom: 1,
    showImageInfo: true,
    darkMode: true,
    maxZoom: 3,
    minZoom: 0.5,
  },
  pdf: {
    defaultZoom: 1,
    showPageNumbers: true,
    darkMode: false,
    singlePageMode: false,
  },
  text: {
    fontSize: 16,
    fontFamily: "System",
    lineHeight: 1.5,
    darkMode: false,
    wordWrap: true,
  },
};

// 컨텍스트 타입 정의
interface ViewerSettingsContextType {
  settings: ViewerSettings;
  updateImageSettings: (settings: Partial<ImageViewerSettings>) => void;
  updatePDFSettings: (settings: Partial<PDFViewerSettings>) => void;
  updateTextSettings: (settings: Partial<TextViewerSettings>) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

// Context 생성
const ViewerSettingsContext = createContext<
  ViewerSettingsContextType | undefined
>(undefined);

// AsyncStorage 키
const STORAGE_KEY = "@ViewerSettings";

// Provider 컴포넌트
export const ViewerSettingsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [settings, setSettings] = useState<ViewerSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시 저장된 설정 불러오기
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        }
      } catch (error) {
        console.error("설정 불러오기 오류:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 설정 저장 함수
  const saveSettings = async (newSettings: ViewerSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("설정 저장 오류:", error);
    }
  };

  // 이미지 뷰어 설정 업데이트
  const updateImageSettings = (newSettings: Partial<ImageViewerSettings>) => {
    const updatedSettings = {
      ...settings,
      image: { ...settings.image, ...newSettings },
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  // PDF 뷰어 설정 업데이트
  const updatePDFSettings = (newSettings: Partial<PDFViewerSettings>) => {
    const updatedSettings = {
      ...settings,
      pdf: { ...settings.pdf, ...newSettings },
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  // 텍스트 뷰어 설정 업데이트
  const updateTextSettings = (newSettings: Partial<TextViewerSettings>) => {
    const updatedSettings = {
      ...settings,
      text: { ...settings.text, ...newSettings },
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  // 모든 설정 초기화
  const resetSettings = () => {
    setSettings(defaultSettings);
    saveSettings(defaultSettings);
  };

  return (
    <ViewerSettingsContext.Provider
      value={{
        settings,
        updateImageSettings,
        updatePDFSettings,
        updateTextSettings,
        resetSettings,
        isLoading,
      }}
    >
      {children}
    </ViewerSettingsContext.Provider>
  );
};

// 커스텀 훅으로 컨텍스트 사용 간소화
export const useViewerSettings = () => {
  const context = useContext(ViewerSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useViewerSettings는 ViewerSettingsProvider 내에서 사용해야 합니다"
    );
  }
  return context;
};
