// utils/fileManager.ts
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { generateUUID } from "./uuid";
import { FileItem, FolderStructure, SortOption } from "../types/fileManager";

// 앱의 문서 디렉토리를 기본 저장소로 사용
const FILES_DIR = `${FileSystem.documentDirectory}app_files/`;
const METADATA_PATH = `${FileSystem.documentDirectory}file_structure.json`;

/**
 * 파일 시스템 초기화
 */
export const initializeFileSystem = async (): Promise<void> => {
  try {
    console.log("[FileManager] 파일 시스템 초기화 시작");

    // 디렉토리 존재 여부 확인
    const dirInfo = await FileSystem.getInfoAsync(FILES_DIR);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(FILES_DIR, { intermediates: true });
    }

    // 메타데이터 파일 존재 여부 확인
    const metadataInfo = await FileSystem.getInfoAsync(METADATA_PATH);

    // 메타데이터 파일이 없는 경우 초기화
    if (!metadataInfo.exists) {
      // 기본 루트 폴더 생성
      const rootFolder: FileItem = {
        id: "root",
        name: "내 파일",
        uri: FILES_DIR,
        type: "folder",
        size: 0,
        dateAdded: Date.now(),
        parentId: "",
        isDirectory: true,
      };

      // 초기 폴더 구조 설정
      const initialStructure: FolderStructure = {
        root: {
          info: rootFolder,
          items: [],
        },
      };

      // 메타데이터 저장
      await saveFileStructure(initialStructure);
    }

    console.log("[FileManager] 파일 시스템 초기화 완료");
  } catch (error) {
    console.error("[FileManager] 파일 시스템 초기화 오류:", error);
  }
};

/**
 * 파일 구조 저장
 */
export const saveFileStructure = async (
  structure: FolderStructure
): Promise<void> => {
  try {
    await FileSystem.writeAsStringAsync(
      METADATA_PATH,
      JSON.stringify(structure)
    );
  } catch (error) {
    console.error("[FileManager] 파일 구조 저장 오류:", error);
  }
};

/**
 * 파일 구조 불러오기
 */
export const loadFileStructure = async (): Promise<FolderStructure> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(METADATA_PATH);

    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(METADATA_PATH);
      return JSON.parse(content) as FolderStructure;
    }

    // 파일이 없는 경우 초기화
    await initializeFileSystem();
    return loadFileStructure();
  } catch (error) {
    console.error("[FileManager] 파일 구조 로드 오류:", error);

    // 오류 발생 시 초기화
    await initializeFileSystem();
    return loadFileStructure();
  }
};

/**
 * 폴더 생성
 */
export const createFolder = async (
  name: string,
  parentId: string,
  color?: string
): Promise<FileItem | null> => {
  try {
    const structure = await loadFileStructure();

    // 상위 폴더가 존재하는지 확인
    if (!structure[parentId]) {
      console.error("[FileManager] 상위 폴더가 존재하지 않음:", parentId);
      return null;
    }

    // 같은 이름의 폴더가 있는지 확인
    const hasSameName = structure[parentId].items.some((itemId) => {
      const item = findItemById(structure, itemId);
      return item && item.isDirectory && item.name === name;
    });

    if (hasSameName) {
      console.error("[FileManager] 같은 이름의 폴더가 이미 존재함:", name);
      return null;
    }

    // 새 폴더 ID 생성
    const folderId = generateUUID();

    // 새 폴더 메타데이터 생성
    const newFolder: FileItem = {
      id: folderId,
      name,
      uri: `${FILES_DIR}${folderId}/`,
      type: "folder",
      size: 0,
      dateAdded: Date.now(),
      parentId,
      isDirectory: true,
      color,
    };

    // 실제 디렉토리 생성
    await FileSystem.makeDirectoryAsync(`${FILES_DIR}${folderId}`, {
      intermediates: true,
    });

    // 구조에 폴더 추가
    structure[folderId] = {
      info: newFolder,
      items: [],
    };

    // 상위 폴더의 items에 추가
    structure[parentId].items.push(folderId);

    // 구조 저장
    await saveFileStructure(structure);

    return newFolder;
  } catch (error) {
    console.error("[FileManager] 폴더 생성 오류:", error);
    return null;
  }
};

/**
 * 파일 가져오기
 */
export const importFile = async (
  sourceUri: string,
  fileName: string,
  mimeType: string,
  parentId: string
): Promise<FileItem | null> => {
  try {
    const structure = await loadFileStructure();

    // 상위 폴더가 존재하는지 확인
    if (!structure[parentId]) {
      console.error("[FileManager] 상위 폴더가 존재하지 않음:", parentId);
      return null;
    }

    // 파일 ID 생성
    const fileId = generateUUID();

    // 파일 확장자 추출
    const fileExt = fileName.includes(".")
      ? fileName.split(".").pop() || ""
      : "";

    // 저장 경로 생성
    const filePath = `${FILES_DIR}${fileId}${fileExt ? "." + fileExt : ""}`;

    // 파일 복사
    await FileSystem.copyAsync({
      from: sourceUri,
      to: filePath,
    });

    // 파일 정보 가져오기
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    if (!fileInfo.exists) {
      throw new Error("파일 복사에 실패했습니다.");
    }

    // 새 파일 메타데이터 생성
    const newFile: FileItem = {
      id: fileId,
      name: fileName,
      uri: filePath,
      type: mimeType || "application/octet-stream",
      size: fileInfo.size || 0,
      dateAdded: Date.now(),
      parentId,
      isDirectory: false,
    };

    // 구조에 파일 추가
    structure[fileId] = {
      info: newFile,
      items: [],
    };

    // 상위 폴더의 items에 추가
    structure[parentId].items.push(fileId);

    // 구조 저장
    await saveFileStructure(structure);

    return newFile;
  } catch (error) {
    console.error("[FileManager] 파일 가져오기 오류:", error);
    return null;
  }
};

/**
 * 항목 삭제 (파일 또는 폴더 재귀적 삭제)
 */
export const deleteItem = async (itemId: string): Promise<boolean> => {
  try {
    const structure = await loadFileStructure();

    // 항목이 존재하는지 확인
    if (!structure[itemId]) {
      console.error("[FileManager] 항목이 존재하지 않음:", itemId);
      return false;
    }

    // 항목 정보 가져오기
    const item = structure[itemId].info;

    // 재귀적으로 하위 항목 삭제 (폴더인 경우)
    if (item.isDirectory) {
      for (const childId of structure[itemId].items) {
        await deleteItem(childId);
      }

      // 폴더 삭제
      await FileSystem.deleteAsync(item.uri, { idempotent: true });
    } else {
      // 파일 삭제
      await FileSystem.deleteAsync(item.uri, { idempotent: true });
    }

    // 상위 폴더의 items에서 제거
    if (item.parentId && structure[item.parentId]) {
      structure[item.parentId].items = structure[item.parentId].items.filter(
        (id) => id !== itemId
      );
    }

    // 구조에서 항목 제거
    delete structure[itemId];

    // 구조 저장
    await saveFileStructure(structure);

    return true;
  } catch (error) {
    console.error("[FileManager] 항목 삭제 오류:", error);
    return false;
  }
};

/**
 * 항목 이동
 */
export const moveItem = async (
  itemId: string,
  newParentId: string
): Promise<boolean> => {
  try {
    const structure = await loadFileStructure();

    // 항목과 대상 폴더가 존재하는지 확인
    if (!structure[itemId] || !structure[newParentId]) {
      console.error("[FileManager] 항목 또는 대상 폴더가 존재하지 않음");
      return false;
    }

    // 항목 정보 가져오기
    const item = structure[itemId].info;
    const oldParentId = item.parentId;

    // 같은 이름의 항목이 있는지 확인
    const hasSameName = structure[newParentId].items.some((id) => {
      const existingItem = structure[id].info;
      return existingItem.name === item.name;
    });

    if (hasSameName) {
      console.error("[FileManager] 대상 폴더에 같은 이름의 항목이 이미 존재함");
      return false;
    }

    // 기존 상위 폴더의 items에서 제거
    if (oldParentId && structure[oldParentId]) {
      structure[oldParentId].items = structure[oldParentId].items.filter(
        (id) => id !== itemId
      );
    }

    // 새 상위 폴더의 items에 추가
    structure[newParentId].items.push(itemId);

    // 항목의 parentId 업데이트
    structure[itemId].info.parentId = newParentId;

    // 구조 저장
    await saveFileStructure(structure);

    return true;
  } catch (error) {
    console.error("[FileManager] 항목 이동 오류:", error);
    return false;
  }
};

/**
 * 항목 이름 변경
 */
export const renameItem = async (
  itemId: string,
  newName: string
): Promise<boolean> => {
  try {
    const structure = await loadFileStructure();

    // 항목이 존재하는지 확인
    if (!structure[itemId]) {
      console.error("[FileManager] 항목이 존재하지 않음:", itemId);
      return false;
    }

    // 항목 정보 가져오기
    const item = structure[itemId].info;
    const parentId = item.parentId;

    // 같은 이름의 항목이 있는지 확인
    if (parentId) {
      const hasSameName = structure[parentId].items.some((id) => {
        const existingItem = structure[id].info;
        return id !== itemId && existingItem.name === newName;
      });

      if (hasSameName) {
        console.error("[FileManager] 같은 이름의 항목이 이미 존재함:", newName);
        return false;
      }
    }

    // 항목 이름 업데이트
    structure[itemId].info.name = newName;

    // 구조 저장
    await saveFileStructure(structure);

    return true;
  } catch (error) {
    console.error("[FileManager] 항목 이름 변경 오류:", error);
    return false;
  }
};

/**
 * ID로 항목 찾기
 */
export const findItemById = (
  structure: FolderStructure,
  itemId: string
): FileItem | null => {
  if (structure[itemId]) {
    return structure[itemId].info;
  }
  return null;
};

/**
 * 폴더 내 항목 가져오기
 */
export const getFolderContents = (
  structure: FolderStructure,
  folderId: string,
  sortOption: SortOption = SortOption.NAME_ASC
): FileItem[] => {
  // 폴더가 존재하는지 확인
  if (!structure[folderId]) {
    console.error("[FileManager] 폴더가 존재하지 않음:", folderId);
    return [];
  }

  // 폴더 내 항목 ID 목록
  const itemIds = structure[folderId].items;

  // 항목 목록 가져오기
  const items = itemIds
    .map((id) => structure[id]?.info)
    .filter((item) => item !== undefined) as FileItem[];

  // 정렬
  return sortItems(items, sortOption);
};

/**
 * 항목 정렬
 */
export const sortItems = (
  items: FileItem[],
  sortOption: SortOption
): FileItem[] => {
  // 항상 폴더를 먼저 표시
  const folders = items.filter((item) => item.isDirectory);
  const files = items.filter((item) => !item.isDirectory);

  // 정렬 옵션에 따라 정렬
  switch (sortOption) {
    case SortOption.NAME_ASC:
      folders.sort((a, b) => a.name.localeCompare(b.name));
      files.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case SortOption.NAME_DESC:
      folders.sort((a, b) => b.name.localeCompare(a.name));
      files.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case SortOption.DATE_ASC:
      folders.sort((a, b) => a.dateAdded - b.dateAdded);
      files.sort((a, b) => a.dateAdded - b.dateAdded);
      break;
    case SortOption.DATE_DESC:
      folders.sort((a, b) => b.dateAdded - a.dateAdded);
      files.sort((a, b) => b.dateAdded - a.dateAdded);
      break;
    case SortOption.SIZE_ASC:
      folders.sort((a, b) => a.size - b.size);
      files.sort((a, b) => a.size - b.size);
      break;
    case SortOption.SIZE_DESC:
      folders.sort((a, b) => b.size - a.size);
      files.sort((a, b) => b.size - a.size);
      break;
    case SortOption.TYPE_ASC:
      folders.sort((a, b) => a.name.localeCompare(b.name));
      files.sort(
        (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
      );
      break;
    case SortOption.TYPE_DESC:
      folders.sort((a, b) => a.name.localeCompare(b.name));
      files.sort(
        (a, b) => b.type.localeCompare(a.type) || a.name.localeCompare(b.name)
      );
      break;
  }

  // 폴더와 파일 합치기
  return [...folders, ...files];
};

/**
 * 경로 정보 가져오기 (탐색 경로용)
 */
export const getPathInfo = (
  structure: FolderStructure,
  folderId: string
): FileItem[] => {
  const path: FileItem[] = [];
  let currentId = folderId;

  // 루트 폴더까지 올라가면서 경로 구성
  while (currentId && structure[currentId]) {
    const item = structure[currentId].info;
    path.unshift(item);
    currentId = item.parentId;
  }

  return path;
};

/**
 * 폴더 크기 업데이트 (하위 항목 크기 합산)
 */
export const updateFolderSize = async (folderId: string): Promise<number> => {
  try {
    const structure = await loadFileStructure();

    // 폴더가 존재하는지 확인
    if (!structure[folderId]) {
      console.error("[FileManager] 폴더가 존재하지 않음:", folderId);
      return 0;
    }

    // 폴더 내 항목 ID 목록
    const itemIds = structure[folderId].items;
    let totalSize = 0;

    // 하위 항목 크기 합산
    for (const itemId of itemIds) {
      const item = structure[itemId]?.info;

      if (item) {
        if (item.isDirectory) {
          // 재귀적으로 하위 폴더 크기 계산
          const folderSize = await updateFolderSize(itemId);
          totalSize += folderSize;
        } else {
          // 파일 크기 합산
          totalSize += item.size;
        }
      }
    }

    // 폴더 크기 업데이트
    structure[folderId].info.size = totalSize;

    // 구조 저장
    await saveFileStructure(structure);

    return totalSize;
  } catch (error) {
    console.error("[FileManager] 폴더 크기 업데이트 오류:", error);
    return 0;
  }
};
