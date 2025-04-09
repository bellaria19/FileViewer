// utils/fileStorage.ts (fileCache.ts를 대체)
import * as FileSystem from "expo-file-system";

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
  } catch (error) {
    console.error("파일 저장소 초기화 오류:", error);
  }
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
    const timestamp = Date.now();
    const fileExt = fileName.includes(".") ? fileName.split(".").pop() : "";
    const fileNameWithoutExt = fileName.includes(".")
      ? fileName.substring(0, fileName.lastIndexOf("."))
      : fileName;
    const uniqueFileName = `${fileNameWithoutExt}_${timestamp}.${fileExt}`;

    const targetPath = `${FILES_DIR}${uniqueFileName}`;

    // 파일 복사
    await FileSystem.copyAsync({
      from: sourceUri,
      to: targetPath,
    });

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
      await FileSystem.deleteAsync(uri);
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
      const files = await FileSystem.readDirectoryAsync(FILES_DIR);

      // 각 파일 개별 삭제
      for (const file of files) {
        await FileSystem.deleteAsync(`${FILES_DIR}${file}`);
      }
    }
  } catch (error) {
    console.error("모든 파일 삭제 오류:", error);
  }
};
