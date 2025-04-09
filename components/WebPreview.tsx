import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

interface WebPreviewProps {
  uri: string;
  fileName: string;
  fileType: string;
}

const WebPreview: React.FC<WebPreviewProps> = ({ uri, fileName, fileType }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getHtml = () => {
    // For PDF files, we'll use a simple PDF viewer
    if (fileType === "application/pdf") {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            body, html {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
            }
            iframe {
              width: 100%;
              height: 100%;
              border: none;
            }
          </style>
        </head>
        <body>
          <iframe src="${uri}" allowfullscreen></iframe>
        </body>
        </html>
      `;
    }

    // For EPUB files, we'll just load them directly
    // Note: In a real app, you might want to use a dedicated EPUB reader library
    return null;
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <WebView
        source={getHtml() ? { html: getHtml()! } : { uri }}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#4a6da7" />
          </View>
        )}
      />

      {isLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4a6da7" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webview: {
    flex: 1,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
});

export default WebPreview;
