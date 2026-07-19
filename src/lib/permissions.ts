import { Platform, PermissionsAndroid, Permission } from "react-native";
import { safeRequireExpoLocation } from "./isExpoGo";
import { Camera } from "expo-camera";

/**
 * Prompts the user for all required sensor permissions (Location, Background Location, Camera, Microphone, Bluetooth, WiFi).
 * Complies with Google Play and Apple App Store guidelines by isolating OS-specific APIs.
 *
 * Deliberately does NOT request READ_PHONE_STATE / READ_CALL_LOG — these are
 * Google Play Restricted Permissions limited to default dialer/SMS-handler
 * apps and would block Play Store review for a field-agent/billing app with
 * no feature that actually needs call history or phone state.
 */
export async function requestAppPermissions() {
  const results = {
    locationForeground: false,
    locationBackground: false,
    camera: false,
    bluetooth: false,
    wifi: true,
  };

  try {
    // 1. Camera permission
    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    results.camera = cameraStatus.granted;

    // 2. Foreground Location
    const Location = safeRequireExpoLocation();
    if (Location) {
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      results.locationForeground = locationStatus.granted;

      // 3. Background Location (Only if foreground is granted)
      if (locationStatus.granted) {
        const bgLocationStatus = await Location.requestBackgroundPermissionsAsync();
        results.locationBackground = bgLocationStatus.granted;
      }
    }

    // 4. Android-Specific Sensor Permissions (Bluetooth)
    if (Platform.OS === "android") {
      const androidVersion = typeof Platform.Version === "string"
        ? parseInt(Platform.Version, 10)
        : Platform.Version;

      if (androidVersion >= 31) {
        const permissionsToRequest: Permission[] = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ];
        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
        results.bluetooth =
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        results.bluetooth = true;
      }
    } else {
      results.bluetooth = true;
    }
  } catch (e) {
    console.error("Error prompting sensor permissions:", e);
  }

  return results;
}
