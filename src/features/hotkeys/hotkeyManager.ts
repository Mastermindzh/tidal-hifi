import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settings";
import { getDefaultHotkeyConfig, getHotkeyAction, type HotkeyConfig } from "./hotkeyConfig";

/**
 * Get the current hotkey configuration from settings store
 * Falls back to defaults if no custom configuration exists
 */
export function getCurrentHotkeyConfig(): HotkeyConfig {
  const storedConfig = settingsStore.get<string, HotkeyConfig>(settings.hotkeys.root);
  if (!storedConfig || Object.keys(storedConfig).length === 0) {
    return getDefaultHotkeyConfig();
  }

  // Merge with defaults to ensure all actions have keys
  const defaultConfig = getDefaultHotkeyConfig();
  return { ...defaultConfig, ...storedConfig };
}

/**
 * Set a hotkey configuration for a specific action
 */
export function setHotkeyForAction(actionId: string, key: string): void {
  const currentConfig = getCurrentHotkeyConfig();
  currentConfig[actionId] = key;
  settingsStore.set(settings.hotkeys.root, currentConfig);
}

/**
 * Reset a hotkey action to its default
 */
export function resetHotkeyToDefault(actionId: string): void {
  const action = getHotkeyAction(actionId);
  if (action) {
    setHotkeyForAction(actionId, action.defaultKey);
  }
}

/**
 * Reset all hotkeys to defaults
 */
export function resetAllHotkeysToDefaults(): void {
  settingsStore.set(settings.hotkeys.root, getDefaultHotkeyConfig());
}

/**
 * Get the current key binding for a specific action
 */
export function getKeyForAction(actionId: string): string {
  const config = getCurrentHotkeyConfig();
  return config[actionId];
}

/**
 * Check if a key combination is already in use by another action
 */
export function isKeyInUse(key: string, excludeActionId?: string): string | null {
  const config = getCurrentHotkeyConfig();

  for (const [actionId, actionKey] of Object.entries(config)) {
    if (actionKey.toLowerCase() === key.toLowerCase() && actionId !== excludeActionId) {
      const action = getHotkeyAction(actionId);
      return action ? action.name : actionId;
    }
  }

  return null;
}

/**
 * Validate a key combination string
 */
export function validateKeyBinding(key: string): { valid: boolean; error?: string } {
  if (!key || key.trim() === "") {
    return { valid: false, error: "Key binding cannot be empty" };
  }

  // Basic validation for common key patterns
  const validModifiers = new Set(["ctrl", "control", "alt", "shift", "meta", "cmd", "command"]);
  const parts = key
    .toLowerCase()
    .split("+")
    .map((part) => part.trim());

  if (parts.length === 0) {
    return { valid: false, error: "Invalid key combination format" };
  }

  // Check for valid modifiers
  const modifierParts = parts.slice(0, -1);
  const keyPart = parts[parts.length - 1];

  for (const modifier of modifierParts) {
    if (!validModifiers.has(modifier)) {
      return { valid: false, error: "Invalid modifier" };
    }
  }

  if (keyPart.length === 0) {
    return { valid: false, error: "Key combination must end with a key" };
  }

  return { valid: true };
}
