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
    console.log("[FileStorage] 저장소 초기화 시작");
    console.log("[FileStorage] 문서 디렉토리:", FileSystem.documentDirectory);
    console.log("[FileStorage] 파일 디렉토리:", FILES_DIR);

    // 디렉토리 존재 여부 확인
    const dirInfo = await FileSystem.getInfoAsync(FILES_DIR);
    console.log("[FileStorage] 디렉토리 정보:", JSON.stringify(dirInfo));

    if (!dirInfo.exists) {
      console.log("[FileStorage] 디렉토리 생성 시작");
      await FileSystem.makeDirectoryAsync(FILES_DIR, { intermediates: true });
      console.log("[FileStorage] 디렉토리 생성 완료");

      // 생성 후 다시 확인
      const newDirInfo = await FileSystem.getInfoAsync(FILES_DIR);
      console.log(
        "[FileStorage] 새 디렉토리 정보:",
        JSON.stringify(newDirInfo)
      );
    }

    // 디렉토리 권한 검사 (iOS에서 중요)
    if (Platform.OS === "ios") {
      try {
        console.log("[FileStorage] iOS 권한 테스트 시작");
        // 테스트 파일을 생성하고 읽어서 권한 확인
        const testFile = `${FILES_DIR}test_permissions.txt`;
        console.log("[FileStorage] 테스트 파일 경로:", testFile);

        await FileSystem.writeAsStringAsync(testFile, "test");
        console.log("[FileStorage] 테스트 파일 쓰기 성공");

        const testContent = await FileSystem.readAsStringAsync(testFile);
        console.log("[FileStorage] 테스트 파일 읽기 성공:", testContent);

        await FileSystem.deleteAsync(testFile, { idempotent: true });
        console.log("[FileStorage] 테스트 파일 삭제 성공");
      } catch (err) {
        console.warn("[FileStorage] 디렉토리 권한 테스트 실패:", err);
        // iOS에서는 추가 권한 부여가 필요할 수 있음
      }
    }

    console.log("[FileStorage] 저장소 초기화 완료");
  } catch (error) {
    console.error("[FileStorage] 파일 저장소 초기화 오류:", error);
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
  const uniqueFileName = `${fileNameWithoutExt}_${timestamp}.${fileExt}`;
  console.log("[FileStorage] 원본 파일명:", fileName);
  console.log("[FileStorage] 고유 파일명 생성:", uniqueFileName);
  return uniqueFileName;
};

/**
 * 외부 파일을 앱 저장소로 가져오기
 */
export const importFile = async (
  sourceUri: string,
  fileName: string
): Promise<string> => {
  console.log("[FileStorage] 파일 가져오기 시작");
  console.log("[FileStorage] 소스 URI:", sourceUri);
  console.log("[FileStorage] 파일명:", fileName);
  console.log("[FileStorage] 플랫폼:", Platform.OS);

  try {
    await initializeFileStorage();

    // 고유한 파일명 생성 (중복 방지)
    const uniqueFileName = generateUniqueFileName(fileName);
    const targetPath = `${FILES_DIR}${uniqueFileName}`;
    console.log("[FileStorage] 대상 경로:", targetPath);

    // iOS에서는 파일 권한 문제가 있을 수 있으므로 캐시 디렉토리를 중간 단계로 사용
    if (Platform.OS === "ios") {
      console.log("[FileStorage] iOS 경로 처리 시작");
      const tempFile = `${FileSystem.cacheDirectory}${uniqueFileName}`;
      console.log("[FileStorage] iOS 임시 파일:", tempFile);

      // 먼저 캐시 디렉토리에 복사
      console.log("[FileStorage] 임시 디렉토리에 복사 시작");
      await FileSystem.copyAsync({
        from: sourceUri,
        to: tempFile,
      });
      console.log("[FileStorage] 임시 디렉토리에 복사 완료");

      // 임시 파일 정보 확인
      const tempFileInfo = await FileSystem.getInfoAsync(tempFile);
      console.log(
        "[FileStorage] 임시 파일 정보:",
        JSON.stringify(tempFileInfo)
      );

      // 권한 확인을 위한 테스트 읽기
      try {
        console.log("[FileStorage] 임시 파일 읽기 테스트");
        const testContent = await FileSystem.readAsStringAsync(tempFile, {
          length: 10,
        });
        console.log(
          "[FileStorage] 임시 파일 읽기 성공, 처음 10바이트:",
          testContent
        );
      } catch (err) {
        console.warn("[FileStorage] 임시 파일 읽기 권한 테스트 실패:", err);
      }

      // 캐시에서 최종 목적지로 복사
      console.log("[FileStorage] 최종 목적지로 복사 시작");
      await FileSystem.copyAsync({
        from: tempFile,
        to: targetPath,
      });
      console.log("[FileStorage] 최종 목적지로 복사 완료");

      // 임시 파일 삭제
      console.log("[FileStorage] 임시 파일 삭제 시작");
      await FileSystem.deleteAsync(tempFile, { idempotent: true });
      console.log("[FileStorage] 임시 파일 삭제 완료");
    } else {
      // Android에서는 직접 복사
      console.log("[FileStorage] Android 직접 복사 시작");
      await FileSystem.copyAsync({
        from: sourceUri,
        to: targetPath,
      });
      console.log("[FileStorage] Android 직접 복사 완료");
    }

    // 권한 테스트
    try {
      console.log("[FileStorage] 최종 파일 테스트 시작");
      const fileInfo = await FileSystem.getInfoAsync(targetPath);
      console.log("[FileStorage] 최종 파일 정보:", JSON.stringify(fileInfo));

      if (!fileInfo.exists) {
        console.error("[FileStorage] 파일이 존재하지 않음");
        throw new Error("파일이 제대로 복사되지 않았습니다");
      }

      // 파일 읽기 권한 테스트
      console.log("[FileStorage] 파일 읽기 권한 테스트");
      const testContent = await FileSystem.readAsStringAsync(targetPath, {
        length: 10,
      });
      console.log("[FileStorage] 파일 읽기 성공, 처음 10바이트:", testContent);
    } catch (err) {
      console.warn("[FileStorage] 가져온 파일 권한 테스트 실패:", err);

      // 최후의 수단: 파일 내용을 직접 읽고 새로 쓰기
      try {
        console.log("[FileStorage] 최후의 수단: 파일 다시 쓰기 시도");
        const content = await FileSystem.readAsStringAsync(sourceUri);
        console.log("[FileStorage] 원본 파일 읽기 성공, 크기:", content.length);

        await FileSystem.writeAsStringAsync(targetPath, content);
        console.log("[FileStorage] 파일 다시 쓰기 성공");

        // 다시 확인
        const finalCheck = await FileSystem.getInfoAsync(targetPath);
        console.log("[FileStorage] 최종 확인:", JSON.stringify(finalCheck));
      } catch (writeErr) {
        console.error("[FileStorage] 파일 쓰기 시도 실패:", writeErr);
      }
    }

    console.log("[FileStorage] 파일 가져오기 성공, 반환 경로:", targetPath);
    return targetPath;
  } catch (error) {
    console.error("[FileStorage] 파일 가져오기 오류:", error);
    console.log("[FileStorage] 실패 시 원본 URI 반환:", sourceUri);
    return sourceUri; // 실패 시 원본 URI 반환
  }
};

/**
 * 저장된 파일 목록 가져오기
 */
export const getStoredFiles = async (): Promise<string[]> => {
  console.log("[FileStorage] 저장된 파일 목록 가져오기 시작");
  try {
    await initializeFileStorage();
    const files = await FileSystem.readDirectoryAsync(FILES_DIR);
    console.log("[FileStorage] 파일 목록:", files);
    return files;
  } catch (error) {
    console.error("[FileStorage] 저장된 파일 목록 가져오기 오류:", error);
    return [];
  }
};

/**
 * 특정 파일 삭제
 */
export const deleteFile = async (uri: string): Promise<boolean> => {
  console.log("[FileStorage] 파일 삭제 시작:", uri);
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    console.log("[FileStorage] 삭제할 파일 정보:", JSON.stringify(fileInfo));
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      console.log("[FileStorage] 파일 삭제 완료");
      return true;
    }
    console.log("[FileStorage] 파일이 존재하지 않아 삭제하지 않음");
    return false;
  } catch (error) {
    console.error("[FileStorage] 파일 삭제 오류:", error);
    return false;
  }
};

/**
 * 모든 파일 삭제
 */
export const clearAllFiles = async (): Promise<void> => {
  console.log("[FileStorage] 모든 파일 삭제 시작");
  try {
    const dirInfo = await FileSystem.getInfoAsync(FILES_DIR);
    console.log("[FileStorage] 디렉토리 정보:", JSON.stringify(dirInfo));

    if (dirInfo.exists) {
      // 디렉토리 자체를 삭제하고 다시 생성하는 것이 더 효율적
      console.log("[FileStorage] 디렉토리 삭제 시작");
      await FileSystem.deleteAsync(FILES_DIR, { idempotent: true });
      console.log("[FileStorage] 디렉토리 삭제 완료");

      console.log("[FileStorage] 디렉토리 재생성 시작");
      await FileSystem.makeDirectoryAsync(FILES_DIR, { intermediates: true });
      console.log("[FileStorage] 디렉토리 재생성 완료");
    }
    console.log("[FileStorage] 모든 파일 삭제 완료");
  } catch (error) {
    console.error("[FileStorage] 모든 파일 삭제 오류:", error);
  }
};

/**
 * 파일 메타데이터 경로
 */
export const getMetadataPath = (): string => {
  const path = `${FileSystem.documentDirectory}files_metadata.json`;
  console.log("[FileStorage] 메타데이터 경로:", path);
  return path;
};
