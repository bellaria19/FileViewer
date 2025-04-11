// types/fileManager.ts
export interface FileItem {
  id: string; // 고유 식별자
  name: string; // 파일 이름
  uri: string; // 파일 경로
  type: string; // MIME 타입
  size: number; // 파일 크기 (바이트)
  dateAdded: number; // 추가 날짜 (타임스탬프)
  parentId: string; // 상위 폴더 ID (루트는 'root')
  isDirectory: boolean; // 폴더 여부
  color?: string; // 폴더 색상 (폴더인 경우)
}

// 폴더 트리 구조를 위한 인터페이스
export interface FolderStructure {
  [key: string]: {
    info: FileItem;
    items: string[]; // 하위 항목의 ID 목록
  };
}

// 파일 정렬 옵션
export enum SortOption {
  NAME_ASC = "name_asc",
  NAME_DESC = "name_desc",
  DATE_ASC = "date_asc",
  DATE_DESC = "date_desc",
  SIZE_ASC = "size_asc",
  SIZE_DESC = "size_desc",
  TYPE_ASC = "type_asc",
  TYPE_DESC = "type_desc",
}

// 보기 모드
export enum ViewMode {
  LIST = "list",
  GRID = "grid",
}

// 파일 및 폴더 연산 상태
export interface FileOperationState {
  isImporting: boolean;
  isCreating: boolean;
  isMoving: boolean;
  isDeleting: boolean;
  progress: string;
  selectedItems: string[]; // 선택된 항목 ID 목록
}
