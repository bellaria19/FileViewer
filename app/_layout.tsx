import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ViewerSettingsProvider } from "../context/ViewerSettingsContext";

export default function RootLayout() {
  return (
    <ViewerSettingsProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: "#4a6da7",
            },
            headerBackTitleVisible: false,
            headerTintColor: "white",
            headerTitleStyle: {
              fontWeight: "bold",
            },
            headerShown: false,
          }}
        />
      </GestureHandlerRootView>
    </ViewerSettingsProvider>
  );
}

const styles = {
  container: {
    flex: 1,
  },
};
