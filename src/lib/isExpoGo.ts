import Constants, { ExecutionEnvironment } from "expo-constants";
import type * as LocationTypes from "expo-location";
import type * as TaskManagerTypes from "expo-task-manager";

// Detect Expo Go robustly: `executionEnvironment` is the modern API, but
// `appOwnership` is the older/more universally-populated field across SDK
// versions — check both so a change in either API surface can't silently
// break detection (which previously let a native-module require() through
// and crashed the whole app). This flag alone is still only a best-effort
// signal, which is why every native-module require() below is ALSO wrapped
// in try/catch.
export const isExpoGo: boolean =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Metro's bundler statically analyzes require() calls and requires a
// string literal argument — a generic `require(moduleName: string)` helper
// breaks bundling entirely (not just at runtime). So each native module
// used anywhere in this app gets its own named safe-require function here,
// with the literal string inline.

export function safeRequireExpoLocation(): typeof LocationTypes | null {
  if (isExpoGo) return null;
  try {
    return require("expo-location");
  } catch (e) {
    console.warn('[isExpoGo] Native module "expo-location" unavailable:', e);
    return null;
  }
}

export function safeRequireExpoTaskManager(): typeof TaskManagerTypes | null {
  if (isExpoGo) return null;
  try {
    return require("expo-task-manager");
  } catch (e) {
    console.warn('[isExpoGo] Native module "expo-task-manager" unavailable:', e);
    return null;
  }
}
