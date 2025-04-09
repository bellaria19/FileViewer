import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightIcon?: string;
  onRightPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  rightIcon,
  onRightPress,
}) => {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="chevron-left" size={16} color="white" />
          </TouchableOpacity>
        )}

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {rightIcon && (
          <TouchableOpacity style={styles.rightButton} onPress={onRightPress}>
            <FontAwesome name={rightIcon} size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#4a6da7",
    paddingTop: 50, // Adjust for status bar
    paddingBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  rightButton: {
    padding: 8,
    marginLeft: 10,
  },
});

export default Header;
