import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

interface ImagePreviewProps {
  uri: string;
  fileName: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ uri, fileName }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError("Failed to load image");
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <FontAwesome name="exclamation-circle" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        maximumZoomScale={3.0}
        minimumZoomScale={0.5}
      >
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="contain"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />

        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </ScrollView>

      <View style={styles.infoBar}>
        <Text style={styles.infoText} numberOfLines={1}>
          {fileName}
        </Text>
        {imageSize && (
          <Text style={styles.infoText}>
            {imageSize.width} × {imageSize.height}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#222",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
  },
  image: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height - 150,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#222",
    padding: 20,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
  },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 10,
    paddingHorizontal: 15,
  },
  infoText: {
    color: "#fff",
    fontSize: 14,
  },
});

export default ImagePreview;
