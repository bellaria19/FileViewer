// utils/fileStorage.ts
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

// 앱의 문서 디렉토리를 기본 저장소로 사용
const FILES_DIR = `${FileSystem.documentDirectory}app_files/`;

/**
 * 파일 저장소 초기화
 */
export const initializeFileStorage = async (): Promise<void> => {
  try {
    // 디렉토리 존재 여부 확인
    const dirInfo = await FileSystem.getInfoAsync(FILES_DIR);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(FILES_DIR, { intermediates: true });
    }

    // 디렉토리 권한 검사 (iOS에서 중요)
    if (Platform.OS === "ios") {
      try {
        // 테스트 파일을 생성하고 읽어서 권한 확인
        const testFile = `${FILES_DIR}test_permissions.txt`;
        await FileSystem.writeAsStringAsync(testFile, "test");
        await FileSystem.readAsStringAsync(testFile);
        await FileSystem.deleteAsync(testFile, { idempotent: true });
      } catch (err) {
        console.warn("디렉토리 권한 테스트 실패:", err);
        // iOS에서는 추가 권한 부여가 필요할 수 있음
      }
    }
  } catch (error) {
    console.error("파일 저장소 초기화 오류:", error);
  }
};

/**
 * 파일명 중복 방지를 위한 고유 파일명 생성
 */
export const generateUniqueFileName = (fileName: string): string => {
  const timestamp = Date.now();
  const fileExt = fileName.includes(".") ? fileName.split(".").pop() : "";
  const fileNameWithoutExt = fileName.includes(".")
    ? fileName.substring(0, fileName.lastIndexOf("."))
    : fileName;
  return `${fileNameWithoutExt}_${timestamp}.${fileExt}`;
};

/**
 * 외부 파일을 앱 저장소로 가져오기
 */
export const importFile = async (
  sourceUri: string,
  fileName: string
): Promise<string> => {
  try {
    await initializeFileStorage();

    // 고유한 파일명 생성 (중복 방지)
    const uniqueFileName = generateUniqueFileName(fileName);
    const targetPath = `${FILES_DIR}${uniqueFileName}`;

    // iOS에서는 파일 권한 문제가 있을 수 있으므로 캐시 디렉토리를 중간 단계로 사용
    if (Platform.OS === "ios") {
      const tempFile = `${FileSystem.cacheDirectory}${uniqueFileName}`;

      // 먼저 캐시 디렉토리에 복사
      await FileSystem.copyAsync({
        from: sourceUri,
        to: tempFile,
      });

      // 권한 확인을 위한 테스트 읽기
      try {
        await FileSystem.readAsStringAsync(tempFile, { length: 1 });
      } catch (err) {
        console.warn("임시 파일 읽기 권한 테스트 실패:", err);
      }

      // 캐시에서 최종 목적지로 복사
      await FileSystem.copyAsync({
        from: tempFile,
        to: targetPath,
      });

      // 임시 파일 삭제
      await FileSystem.deleteAsync(tempFile, { idempotent: true });
    } else {
      // Android에서는 직접 복사
      await FileSystem.copyAsync({
        from: sourceUri,
        to: targetPath,
      });
    }

    // 권한 테스트
    try {
      const fileInfo = await FileSystem.getInfoAsync(targetPath);
      if (!fileInfo.exists) {
        throw new Error("파일이 제대로 복사되지 않았습니다");
      }

      // 파일 읽기 권한 테스트
      await FileSystem.readAsStringAsync(targetPath, { length: 1 });
    } catch (err) {
      console.warn("가져온 파일 권한 테스트 실패:", err);

      // 최후의 수단: 파일 내용을 직접 읽고 새로 쓰기
      try {
        const content = await FileSystem.readAsStringAsync(sourceUri);
        await FileSystem.writeAsStringAsync(targetPath, content);
      } catch (writeErr) {
        console.error("파일 쓰기 시도 실패:", writeErr);
      }
    }

    return targetPath;
  } catch (error) {
    console.error("파일 가져오기 오류:", error);
    return sourceUri; // 실패 시 원본 URI 반환
  }
};

/**
 * 저장된 파일 목록 가져오기
 */
export const getStoredFiles = async (): Promise<string[]> => {
  try {
    await initializeFileStorage();
    return await FileSystem.readDirectoryAsync(FILES_DIR);
  } catch (error) {
    console.error("저장된 파일 목록 가져오기 오류:", error);
    return [];
  }
};

/**
 * 특정 파일 삭제
 */
export const deleteFile = async (uri: string): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return true;
    }
    return false;
  } catch (error) {
    console.error("파일 삭제 오류:", error);
    return false;
  }
};

/**
 * 모든 파일 삭제
 */
export const clearAllFiles = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(FILES_DIR);
    if (dirInfo.exists) {
      // 디렉토리 자체를 삭제하고 다시 생성하는 것이 더 효율적
      await FileSystem.deleteAsync(FILES_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(FILES_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error("모든 파일 삭제 오류:", error);
  }
};

/**
 * 파일 메타데이터 경로
 */
export const getMetadataPath = (): string => {
  return `${FileSystem.documentDirectory}files_metadata.json`;
};
