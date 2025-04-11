// utils/uuid.ts

/**
 * UUID v4 생성 함수
 * RFC4122 버전 4 규격의 UUID를 생성합니다.
 */
export const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * 짧은 UUID 생성 함수
 * 더 짧은 형태의 고유 ID를 생성합니다.
 */
export const generateShortId = (): string => {
  return "xxxxxxxxxxxx".replace(/[x]/g, () => {
    return Math.floor(Math.random() * 16).toString(16);
  });
};
