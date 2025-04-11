// app/index.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter, Stack, useFocusEffect } from "expo-router";
import { getFileTypeInfo, formatFileSize } from "../utils/fileTypes";
import {
  initializeFileSystem,
  loadFileStructure,
  getFolderContents,
  createFolder,
  importFile,
  renameItem,
  deleteItem,
  getPathInfo,
  updateFolderSize,
} from "../utils/fileManager";
import {
  FileItem,
  FolderStructure,
  SortOption,
  ViewMode,
} from "../types/fileManager";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 최근 파일 저장 키
const RECENT_FILES_KEY = "@RecentFiles";

// 탭 정의
enum TabType {
  RECENT = "recent",
  ALL_FILES = "all_files",
}

export default function FileManagerScreen() {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>(TabType.ALL_FILES);

  // 기본 상태 관리
  const [structure, setStructure] = useState<FolderStructure>({});
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [currentItems, setCurrentItems] = useState<FileItem[]>([]);
  const [pathItems, setPathItems] = useState<FileItem[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.NAME_ASC);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LIST);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>("");

  // 최근 파일 및 전체 파일 상태
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);

  // 폴더 생성 모달 상태
  const [folderModalVisible, setFolderModalVisible] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [folderColor, setFolderColor] = useState<string>("#4a6da7");

  // 이름 변경 모달 상태
  const [renameModalVisible, setRenameModalVisible] = useState<boolean>(false);
  const [renameItemId, setRenameItemId] = useState<string>("");
  const [renameText, setRenameText] = useState<string>("");

  // 정렬 모달 상태
  const [sortModalVisible, setSortModalVisible] = useState<boolean>(false);

  const router = useRouter();

  // 컬러 팔레트
  const colorPalette = [
    "#4a6da7", // 기본 파란색
    "#e74c3c", // 빨간색
    "#2ecc71", // 녹색
    "#f39c12", // 주황색
    "#9b59b6", // 보라색
    "#1abc9c", // 청록색
    "#34495e", // 네이비
    "#7f8c8d", // 회색
  ];

  // 화면이 포커스될 때마다 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // 초기 데이터 로드
  useEffect(() => {
    initializeAndLoadData();
  }, []);

  // 현재 폴더 ID가 변경될 때마다 폴더 내용 업데이트
  useEffect(() => {
    updateCurrentFolder();
  }, [currentFolderId, structure, sortOption]);

  // 파일 시스템 초기화 및 데이터 로드
  const initializeAndLoadData = async () => {
    setIsLoading(true);
    await initializeFileSystem();
    await loadData();
    await loadRecentFiles();
    await updateAllFiles();
    setIsLoading(false);
  };

  // 데이터 로드
  const loadData = async () => {
    try {
      const fileStructure = await loadFileStructure();
      setStructure(fileStructure);
    } catch (error) {
      console.error("데이터 로드 오류:", error);
      Alert.alert("오류", "파일 데이터를 불러오는 데 실패했습니다.");
    }
  };

  // 현재 폴더 내용 업데이트
  const updateCurrentFolder = () => {
    if (Object.keys(structure).length === 0) return;

    // 현재 폴더 내용 가져오기
    const items = getFolderContents(structure, currentFolderId, sortOption);
    setCurrentItems(items);

    // 경로 정보 가져오기
    const path = getPathInfo(structure, currentFolderId);
    setPathItems(path);
  };

  // 최근 파일 로드
  const loadRecentFiles = async () => {
    try {
      const recentFilesJson = await AsyncStorage.getItem(RECENT_FILES_KEY);
      if (recentFilesJson) {
        const files = JSON.parse(recentFilesJson) as FileItem[];

        // 파일이 실제로 존재하는지 확인
        const validFiles = [];
        for (const file of files) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(file.uri);
            if (fileInfo.exists) {
              validFiles.push(file);
            }
          } catch (error) {
            console.error("파일 존재 확인 오류:", error);
          }
        }

        setRecentFiles(validFiles);
      }
    } catch (error) {
      console.error("최근 파일 로드 오류:", error);
    }
  };

  // 최근 파일에 추가
  const addToRecentFiles = async (file: FileItem) => {
    try {
      // 기존 최근 파일 목록 가져오기
      const recentFilesJson = await AsyncStorage.getItem(RECENT_FILES_KEY);
      let recentFiles: FileItem[] = recentFilesJson
        ? JSON.parse(recentFilesJson)
        : [];

      // 이미 목록에 있으면 제거 (맨 앞으로 이동하기 위해)
      recentFiles = recentFiles.filter((item) => item.id !== file.id);

      // 맨 앞에 추가
      recentFiles.unshift(file);

      // 최대 10개만 유지
      if (recentFiles.length > 10) {
        recentFiles = recentFiles.slice(0, 10);
      }

      // 저장
      await AsyncStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recentFiles));

      // 상태 업데이트
      setRecentFiles(recentFiles);
    } catch (error) {
      console.error("최근 파일 추가 오류:", error);
    }
  };

  // 전체 파일 및 폴더 업데이트
  const updateAllFiles = async () => {
    if (Object.keys(structure).length === 0) return;

    // 현재 폴더에 있는 항목들만 표시
    const items = getFolderContents(structure, currentFolderId, sortOption);
    setAllFiles(items);
  };

  // 새로고침
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    await loadRecentFiles();
    await updateAllFiles();
    setIsRefreshing(false);
  };

  // 항목 선택
  const toggleSelectItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  // 모든 항목 선택/해제
  const toggleSelectAll = () => {
    if (activeTab === TabType.RECENT) {
      if (selectedItems.length === recentFiles.length) {
        setSelectedItems([]);
      } else {
        setSelectedItems(recentFiles.map((item) => item.id));
      }
    } else {
      // ALL_FILES
      if (selectedItems.length === allFiles.length) {
        setSelectedItems([]);
      } else {
        setSelectedItems(allFiles.map((item) => item.id));
      }
    }
  };

  // 폴더 열기 (전체 파일 탭에서만 작동)
  const openFolder = (folderId: string) => {
    if (activeTab === TabType.ALL_FILES) {
      setCurrentFolderId(folderId);
      setSelectedItems([]);
      updateAllFiles();
    }
  };

  // 상위 폴더로 이동 (전체 파일 탭에서만 작동)
  const navigateUp = () => {
    if (pathItems.length > 1 && activeTab === TabType.ALL_FILES) {
      const parentItem = pathItems[pathItems.length - 2];
      setCurrentFolderId(parentItem.id);
      setSelectedItems([]);
      updateAllFiles();
    }
  };

  // 파일 선택 및 가져오기
  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) return;
      if (result.assets.length === 0) return;

      setIsImporting(true);
      let importCount = 0;

      for (const asset of result.assets) {
        try {
          setImportProgress(
            `파일 가져오는 중... (${importCount + 1}/${result.assets.length})`
          );

          // 파일 가져오기 (현재 폴더에 추가)
          const importedFile = await importFile(
            asset.uri,
            asset.name,
            asset.mimeType || "application/octet-stream",
            currentFolderId
          );

          if (importedFile) {
            importCount++;
          }
        } catch (error) {
          console.error("파일 가져오기 오류:", error);
        }
      }

      // 구조 다시 로드
      await loadData();

      // 폴더 크기 업데이트
      await updateFolderSize(currentFolderId);

      // 구조 다시 로드
      await loadData();

      // 전체 파일 목록 업데이트
      await updateAllFiles();

      setIsImporting(false);

      if (importCount > 0) {
        Alert.alert(
          "가져오기 완료",
          `${importCount}개 파일을 성공적으로 가져왔습니다.`
        );
      } else {
        Alert.alert("오류", "파일을 가져오지 못했습니다.");
      }
    } catch (error) {
      console.error("문서 선택 오류:", error);
      setIsImporting(false);
      Alert.alert("오류", "파일을 선택하는 중 문제가 발생했습니다.");
    }
  };

  // 새 폴더 생성 (전체 파일 탭에서만 작동)
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert("오류", "폴더 이름을 입력해주세요.");
      return;
    }

    try {
      const folder = await createFolder(
        newFolderName.trim(),
        currentFolderId,
        folderColor
      );

      if (folder) {
        // 구조 다시 로드
        await loadData();
        // 전체 파일 목록 업데이트
        await updateAllFiles();

        setFolderModalVisible(false);
        setNewFolderName("");
      } else {
        Alert.alert("오류", "같은 이름의 폴더가 이미 존재합니다.");
      }
    } catch (error) {
      console.error("폴더 생성 오류:", error);
      Alert.alert("오류", "폴더를 생성하는 중 문제가 발생했습니다.");
    }
  };

  // 항목 삭제
  const handleDeleteItems = async () => {
    if (selectedItems.length === 0) return;

    const itemsToDelete = selectedItems.length;

    Alert.alert(
      "항목 삭제",
      `선택한 ${itemsToDelete}개 항목을 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            let deleteCount = 0;

            for (const itemId of selectedItems) {
              const result = await deleteItem(itemId);
              if (result) deleteCount++;
            }

            // 구조 다시 로드
            await loadData();

            // 폴더 크기 업데이트
            if (pathItems.length > 1) {
              const parentItem = pathItems[pathItems.length - 2];
              await updateFolderSize(parentItem.id);
            }

            // 구조 다시 로드
            await loadData();

            // 최근 파일과 전체 파일 목록 업데이트
            await loadRecentFiles();
            await updateAllFiles();

            setSelectedItems([]);
            setIsLoading(false);

            Alert.alert("삭제 완료", `${deleteCount}개 항목을 삭제했습니다.`);
          },
        },
      ]
    );
  };

  // 항목 이름 변경
  const handleRenameItem = async () => {
    if (!renameText.trim() || !renameItemId) {
      Alert.alert("오류", "이름을 입력해주세요.");
      return;
    }

    try {
      const result = await renameItem(renameItemId, renameText.trim());

      if (result) {
        // 구조 다시 로드
        await loadData();
        // 최근 파일과 전체 파일 목록 업데이트
        await loadRecentFiles();
        await updateAllFiles();

        setRenameModalVisible(false);
        setRenameItemId("");
        setRenameText("");
      } else {
        Alert.alert("오류", "같은 이름의 항목이 이미 존재합니다.");
      }
    } catch (error) {
      console.error("이름 변경 오류:", error);
      Alert.alert("오류", "이름을 변경하는 중 문제가 발생했습니다.");
    }
  };

  // 항목 열기
  const openItem = (item: FileItem) => {
    if (item.isDirectory) {
      openFolder(item.id);
    } else {
      // 최근 파일에 추가
      addToRecentFiles(item);

      // 파일 열기
      router.push({
        pathname: "/viewer",
        params: {
          uri: item.uri,
          name: item.name,
          type: item.type,
        },
      });
    }
  };

  // 항목 컨텍스트 메뉴
  const showItemContextMenu = (item: FileItem) => {
    Alert.alert(item.name, "작업을 선택해주세요", [
      { text: "취소", style: "cancel" },
      {
        text: "열기",
        onPress: () => openItem(item),
      },
      {
        text: "이름 변경",
        onPress: () => {
          setRenameItemId(item.id);
          setRenameText(item.name);
          setRenameModalVisible(true);
        },
      },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          Alert.alert("항목 삭제", `"${item.name}"을(를) 삭제하시겠습니까?`, [
            { text: "취소", style: "cancel" },
            {
              text: "삭제",
              style: "destructive",
              onPress: async () => {
                setIsLoading(true);
                await deleteItem(item.id);

                // 구조 다시 로드
                await loadData();

                // 폴더 크기 업데이트
                if (pathItems.length > 1) {
                  const parentItem = pathItems[pathItems.length - 2];
                  await updateFolderSize(parentItem.id);
                }

                // 구조 다시 로드
                await loadData();

                // 최근 파일과 전체 파일 목록 업데이트
                await loadRecentFiles();
                await updateAllFiles();

                setIsLoading(false);
              },
            },
          ]);
        },
      },
    ]);
  };

  // 정렬 변경
  const changeSort = (option: SortOption) => {
    setSortOption(option);
    setSortModalVisible(false);

    // 전체 파일 탭에서도 정렬 변경 반영
    updateAllFiles();
  };

  // 보기 모드 변경
  const toggleViewMode = () => {
    setViewMode((prevMode) =>
      prevMode === ViewMode.LIST ? ViewMode.GRID : ViewMode.LIST
    );
  };

  // 폴더 아이콘 렌더링
  const renderFolderIcon = (item: FileItem) => {
    if (!item.isDirectory) return null;

    return (
      <View
        style={[
          styles.folderIcon,
          { backgroundColor: item.color || "#4a6da7" },
        ]}
      >
        <FontAwesome name="folder" size={24} color="white" />
      </View>
    );
  };

  // 파일 아이콘 렌더링
  const renderFileIcon = (item: FileItem) => {
    if (item.isDirectory) return null;

    const fileTypeInfo = getFileTypeInfo(item.type);

    return (
      <View style={styles.fileIcon}>
        <FontAwesome
          name={fileTypeInfo.icon}
          size={24}
          color={fileTypeInfo.color}
        />
      </View>
    );
  };

  // 탭 네비게이션 렌더링
  const renderTabNavigation = () => {
    return (
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === TabType.ALL_FILES && styles.activeTab,
          ]}
          onPress={() => {
            setActiveTab(TabType.ALL_FILES);
            updateAllFiles();
          }}
        >
          <FontAwesome
            name="folder"
            size={16}
            color={activeTab === TabType.ALL_FILES ? "#4a6da7" : "#888"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === TabType.ALL_FILES && styles.activeTabText,
            ]}
          >
            전체 파일
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === TabType.RECENT && styles.activeTab]}
          onPress={() => setActiveTab(TabType.RECENT)}
        >
          <FontAwesome
            name="clock-o"
            size={16}
            color={activeTab === TabType.RECENT ? "#4a6da7" : "#888"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === TabType.RECENT && styles.activeTabText,
            ]}
          >
            최근 파일
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 경로 표시 바 렌더링 (전체 파일 탭에서만 표시)
  const renderPathBar = () => {
    if (activeTab !== TabType.ALL_FILES) return null;

    return (
      <View style={styles.pathBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pathContent}
        >
          {pathItems.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <Text style={styles.pathSeparator}>/</Text>}
              <TouchableOpacity
                style={[
                  styles.pathItem,
                  index === pathItems.length - 1 && styles.currentPathItem,
                ]}
                onPress={() => {
                  setCurrentFolderId(item.id);
                  updateAllFiles();
                }}
              >
                <Text
                  style={[
                    styles.pathText,
                    index === pathItems.length - 1 && styles.currentPathText,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </ScrollView>
      </View>
    );
  };

  // 툴바 렌더링
  const renderToolbar = () => {
    const hasSelection = selectedItems.length > 0;
    const currentTabItems =
      activeTab === TabType.RECENT ? recentFiles : allFiles;

    return (
      <View style={styles.toolbar}>
        {hasSelection ? (
          <>
            <View style={styles.toolbarLeft}>
              <Text style={styles.selectionText}>
                {selectedItems.length}개 선택됨
              </Text>
            </View>
            <View style={styles.toolbarRight}>
              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={toggleSelectAll}
              >
                <FontAwesome name="check-square-o" size={20} color="#4a6da7" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={handleDeleteItems}
              >
                <FontAwesome name="trash-o" size={20} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.toolbarLeft}>
              {activeTab === TabType.ALL_FILES &&
                currentFolderId !== "root" && (
                  <TouchableOpacity
                    style={styles.toolbarButton}
                    onPress={navigateUp}
                  >
                    <FontAwesome name="arrow-up" size={20} color="#4a6da7" />
                  </TouchableOpacity>
                )}
              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={handleRefresh}
              >
                <FontAwesome name="refresh" size={20} color="#4a6da7" />
              </TouchableOpacity>
            </View>
            <View style={styles.toolbarRight}>
              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={toggleViewMode}
              >
                <FontAwesome
                  name={viewMode === ViewMode.LIST ? "th-large" : "list"}
                  size={20}
                  color="#4a6da7"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={() => setSortModalVisible(true)}
              >
                <FontAwesome name="sort" size={20} color="#4a6da7" />
              </TouchableOpacity>
              {activeTab === TabType.ALL_FILES && (
                <TouchableOpacity
                  style={styles.toolbarButton}
                  onPress={() => setFolderModalVisible(true)}
                >
                  <FontAwesome name="folder" size={20} color="#4a6da7" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={pickDocuments}
                disabled={isImporting}
              >
                <FontAwesome name="plus" size={20} color="#4a6da7" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  // 항목 렌더링 (리스트 모드)
  const renderListItem = ({ item }: { item: FileItem }) => {
    const isSelected = selectedItems.includes(item.id);
    const lastModified = new Date(item.dateAdded).toLocaleString();

    return (
      <TouchableOpacity
        style={[styles.listItem, isSelected && styles.selectedItem]}
        onPress={() => openItem(item)}
        onLongPress={() => showItemContextMenu(item)}
        delayLongPress={500}
      >
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => toggleSelectItem(item.id)}
        >
          <FontAwesome
            name={isSelected ? "check-square-o" : "square-o"}
            size={24}
            color={isSelected ? "#4a6da7" : "#999"}
          />
        </TouchableOpacity>

        {item.isDirectory ? renderFolderIcon(item) : renderFileIcon(item)}

        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.itemInfo}>
            {item.isDirectory
              ? `${structure[item.id]?.items.length || 0}개 항목`
              : formatFileSize(item.size)}{" "}
            • {lastModified}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.itemMenu}
          onPress={() => showItemContextMenu(item)}
        >
          <FontAwesome name="ellipsis-v" size={20} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // 항목 렌더링 (그리드 모드)
  const renderGridItem = ({ item }: { item: FileItem }) => {
    const isSelected = selectedItems.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.gridItem, isSelected && styles.selectedGridItem]}
        onPress={() => openItem(item)}
        onLongPress={() => showItemContextMenu(item)}
        delayLongPress={500}
      >
        <View style={styles.gridItemContent}>
          <TouchableOpacity
            style={styles.gridSelectButton}
            onPress={() => toggleSelectItem(item.id)}
          >
            <FontAwesome
              name={isSelected ? "check-square-o" : "square-o"}
              size={18}
              color={isSelected ? "#4a6da7" : "#999"}
            />
          </TouchableOpacity>

          <View style={styles.gridIconContainer}>
            {item.isDirectory ? (
              <View
                style={[
                  styles.gridFolderIcon,
                  { backgroundColor: item.color || "#4a6da7" },
                ]}
              >
                <FontAwesome name="folder" size={40} color="white" />
              </View>
            ) : (
              <View style={styles.gridFileIcon}>
                <FontAwesome
                  name={getFileTypeInfo(item.type).icon}
                  size={40}
                  color={getFileTypeInfo(item.type).color}
                />
              </View>
            )}
          </View>

          <Text style={styles.gridItemName} numberOfLines={2}>
            {item.name}
          </Text>

          <Text style={styles.gridItemInfo}>
            {item.isDirectory
              ? `${structure[item.id]?.items.length || 0}개 항목`
              : formatFileSize(item.size)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // 현재 탭에 따른 콘텐츠 렌더링
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4a6da7" />
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      );
    }

    if (isImporting) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4a6da7" />
          <Text style={styles.loadingText}>{importProgress}</Text>
        </View>
      );
    }

    // 최근 파일과 전체 파일 목록 업데이트
    if (activeTab === TabType.RECENT) {
      if (recentFiles.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <FontAwesome name="clock-o" size={70} color="#ccc" />
            <Text style={styles.emptyText}>최근 파일이 없습니다</Text>
            <Text style={styles.emptySubtext}>
              파일을 열면 여기에 표시됩니다
            </Text>
          </View>
        );
      }

      return (
        <FlatList
          data={recentFiles}
          renderItem={
            viewMode === ViewMode.LIST ? renderListItem : renderGridItem
          }
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#4a6da7"]}
            />
          }
          numColumns={viewMode === ViewMode.GRID ? 2 : 1}
          key={`recent-${viewMode}`}
          contentContainerStyle={
            viewMode === ViewMode.GRID
              ? styles.gridContainer
              : styles.listContainer
          }
        />
      );
    }

    // 전체 파일 탭
    if (activeTab === TabType.ALL_FILES) {
      if (allFiles.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <FontAwesome name="folder-open-o" size={70} color="#ccc" />
            <Text style={styles.emptyText}>폴더가 비어 있습니다</Text>
            <Text style={styles.emptySubtext}>
              파일을 가져오거나 새 폴더를 만드세요
            </Text>
          </View>
        );
      }

      return (
        <FlatList
          data={allFiles}
          renderItem={
            viewMode === ViewMode.LIST ? renderListItem : renderGridItem
          }
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#4a6da7"]}
            />
          }
          numColumns={viewMode === ViewMode.GRID ? 2 : 1}
          key={`all-${viewMode}`}
          contentContainerStyle={
            viewMode === ViewMode.GRID
              ? styles.gridContainer
              : styles.listContainer
          }
        />
      );
    }
  };

  // 렌더링
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "파일 매니저",
          headerShown: true,
          headerTintColor: "white",
          headerBackTitleVisible: false,
          headerStyle: {
            backgroundColor: "#4a6da7",
          },
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 15 }}
              onPress={() => router.push("/settings")}
            >
              <FontAwesome name="gear" size={22} color="white" />
            </TouchableOpacity>
          ),
        }}
      />
      <StatusBar style="light" />

      {renderTabNavigation()}
      {renderPathBar()}
      {renderToolbar()}
      {renderContent()}

      {/* 새 폴더 생성 모달 */}
      <Modal
        visible={folderModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFolderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>새 폴더</Text>

            <TextInput
              style={styles.textInput}
              placeholder="폴더 이름"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus={true}
            />

            <Text style={styles.colorTitle}>폴더 색상</Text>
            <View style={styles.colorPalette}>
              {colorPalette.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    folderColor === color && styles.selectedColor,
                  ]}
                  onPress={() => setFolderColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setFolderModalVisible(false);
                  setNewFolderName("");
                }}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleCreateFolder}
              >
                <Text style={styles.confirmButtonText}>생성</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 이름 변경 모달 */}
      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>이름 변경</Text>

            <TextInput
              style={styles.textInput}
              placeholder="새 이름"
              value={renameText}
              onChangeText={setRenameText}
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setRenameModalVisible(false);
                  setRenameItemId("");
                  setRenameText("");
                }}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleRenameItem}
              >
                <Text style={styles.confirmButtonText}>변경</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 정렬 모달 */}
      <Modal
        visible={sortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>정렬 방식</Text>

            <TouchableOpacity
              style={styles.sortOption}
              onPress={() => changeSort(SortOption.NAME_ASC)}
            >
              <FontAwesome
                name="sort-alpha-asc"
                size={20}
                color="#4a6da7"
                style={styles.sortIcon}
              />
              <Text style={styles.sortText}>이름 (오름차순)</Text>
              {sortOption === SortOption.NAME_ASC && (
                <FontAwesome name="check" size={20} color="#4a6da7" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortOption}
              onPress={() => changeSort(SortOption.NAME_DESC)}
            >
              <FontAwesome
                name="sort-alpha-desc"
                size={20}
                color="#4a6da7"
                style={styles.sortIcon}
              />
              <Text style={styles.sortText}>이름 (내림차순)</Text>
              {sortOption === SortOption.NAME_DESC && (
                <FontAwesome name="check" size={20} color="#4a6da7" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortOption}
              onPress={() => changeSort(SortOption.DATE_DESC)}
            >
              <FontAwesome
                name="clock-o"
                size={20}
                color="#4a6da7"
                style={styles.sortIcon}
              />
              <Text style={styles.sortText}>날짜 (최신순)</Text>
              {sortOption === SortOption.DATE_DESC && (
                <FontAwesome name="check" size={20} color="#4a6da7" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortOption}
              onPress={() => changeSort(SortOption.DATE_ASC)}
            >
              <FontAwesome
                name="clock-o"
                size={20}
                color="#4a6da7"
                style={styles.sortIcon}
              />
              <Text style={styles.sortText}>날짜 (오래된순)</Text>
              {sortOption === SortOption.DATE_ASC && (
                <FontAwesome name="check" size={20} color="#4a6da7" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortOption}
              onPress={() => changeSort(SortOption.SIZE_DESC)}
            >
              <FontAwesome
                name="sort-amount-desc"
                size={20}
                color="#4a6da7"
                style={styles.sortIcon}
              />
              <Text style={styles.sortText}>크기 (큰순)</Text>
              {sortOption === SortOption.SIZE_DESC && (
                <FontAwesome name="check" size={20} color="#4a6da7" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortOption}
              onPress={() => changeSort(SortOption.SIZE_ASC)}
            >
              <FontAwesome
                name="sort-amount-asc"
                size={20}
                color="#4a6da7"
                style={styles.sortIcon}
              />
              <Text style={styles.sortText}>크기 (작은순)</Text>
              {sortOption === SortOption.SIZE_ASC && (
                <FontAwesome name="check" size={20} color="#4a6da7" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButtonFull}
              onPress={() => setSortModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#888",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "500",
    color: "#888",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
  },

  // 탭 네비게이션
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#4a6da7",
  },
  tabText: {
    marginLeft: 5,
    fontSize: 12,
    color: "#888",
  },
  activeTabText: {
    color: "#4a6da7",
    fontWeight: "500",
  },

  // 경로 표시 바
  pathBar: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pathContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  pathItem: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  pathText: {
    fontSize: 14,
    color: "#666",
  },
  currentPathItem: {
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
  },
  currentPathText: {
    color: "#4a6da7",
    fontWeight: "500",
  },
  pathSeparator: {
    fontSize: 14,
    color: "#999",
    marginHorizontal: 2,
  },

  // 툴바
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  toolbarLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  toolbarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  toolbarButton: {
    padding: 8,
    marginHorizontal: 2,
  },
  selectionText: {
    fontSize: 14,
    color: "#4a6da7",
    fontWeight: "500",
  },

  // 리스트 뷰
  listContainer: {
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    marginTop: 1,
  },
  selectedItem: {
    backgroundColor: "#e6f0ff",
  },
  selectButton: {
    padding: 8,
  },
  folderIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  fileIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: "#333",
  },
  itemInfo: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  itemMenu: {
    padding: 8,
  },

  // 그리드 뷰
  gridContainer: {
    padding: 10,
  },
  gridItem: {
    flex: 1,
    margin: 5,
    backgroundColor: "white",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  selectedGridItem: {
    backgroundColor: "#e6f0ff",
  },
  gridItemContent: {
    padding: 10,
    alignItems: "center",
  },
  gridSelectButton: {
    position: "absolute",
    top: 5,
    right: 5,
    zIndex: 10,
  },
  gridIconContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  gridFolderIcon: {
    width: 80,
    height: 80,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  gridFileIcon: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  gridItemName: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    marginTop: 10,
  },
  gridItemInfo: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 4,
  },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 15,
  },
  colorTitle: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
  },
  colorPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: 20,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    margin: 5,
  },
  selectedColor: {
    borderWidth: 2,
    borderColor: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancelButton: {
    padding: 10,
    marginRight: 10,
  },
  cancelButtonText: {
    color: "#999",
    fontSize: 16,
  },
  confirmButton: {
    padding: 10,
    backgroundColor: "#4a6da7",
    borderRadius: 5,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
  },
  cancelButtonFull: {
    padding: 10,
    alignItems: "center",
    marginTop: 10,
  },

  // 정렬 옵션
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sortIcon: {
    marginRight: 15,
    width: 20,
    textAlign: "center",
  },
  sortText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
});
