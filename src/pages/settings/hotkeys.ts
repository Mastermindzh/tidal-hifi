import { ipcRenderer } from "electron";

import { globalEvents } from "../../constants/globalEvents";
import {
  DEFAULT_HOTKEY_ACTIONS,
  getCurrentHotkeyConfig,
  type HotkeyAction,
  isKeyInUse,
  resetHotkeyToDefault,
  setHotkeyForAction,
  validateKeyBinding,
} from "../../features/hotkeys";

let hotkeySearch: HTMLInputElement;
let hotkeysList: HTMLElement;
let isEventListenersInitialized = false;
let currentlyEditing: HTMLElement | null = null;

/**
 * Convert a key combination string to HTML display format
 */
function formatKeyForDisplay(key: string): string {
  const keyNameMap: Record<string, string> = {
    control: "Ctrl",
    ctrl: "Ctrl",
    alt: "Alt",
    shift: "Shift",
    meta: "Cmd",
    cmd: "Cmd",
    command: "Cmd",
    left: "←",
    right: "→",
    up: "↑",
    down: "↓",
    delete: "Delete",
    backspace: "Backspace",
    tab: "Tab",
    enter: "Enter",
    space: "Space",
  };

  return key
    .split("+")
    .map((part) => part.trim())
    .map((part) => {
      const keyName = part.toLowerCase();
      return keyNameMap[keyName] || part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .map((part) => `<kbd>${part}</kbd>`)
    .join(" + ");
}

/**
 * Escape HTML entities to prevent XSS attacks
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate HTML for a hotkey item
 */
function createHotkeyItemHTML(action: HotkeyAction, currentKey: string): string {
  const isDisabled = action.id === "deleteDisabled";
  const keyDisplay = formatKeyForDisplay(currentKey);

  // Sanitize all user-controlled content
  const safeName = escapeHtml(action.name);
  const safeDescription = escapeHtml(action.description);
  const safeActionId = escapeHtml(action.id);
  const safeSearchTerms = escapeHtml(
    `${action.name.toLowerCase()} ${action.description.toLowerCase()} ${currentKey.toLowerCase()}`,
  );

  return `
    <div class="hotkey-item" data-action-id="${safeActionId}" data-search-terms="${safeSearchTerms}">
      <div class="hotkey-description">
        <h4>${safeName}</h4>
        <p>${safeDescription}</p>
      </div>
      <div class="hotkey-controls">
        ${!isDisabled ? `<span class="hotkey-reset-btn" data-action-id="${safeActionId}" title="Reset to default" aria-label="Reset ${safeName} to default">↶</span>` : ""}
        <div class="hotkey-binding${isDisabled ? " disabled" : " editable"}" data-action-id="${safeActionId}" data-current-key="${escapeHtml(currentKey)}" tabindex="0">
          ${keyDisplay}
        </div>
      </div>
    </div>
  `;
}

/**
 * Repopulate the hotkeys list while preserving search filter
 */
function refreshHotkeysWithSearch(): void {
  const currentSearch = hotkeySearch?.value || "";
  populateHotkeysList();
  if (currentSearch) {
    hotkeySearch.value = currentSearch;
    filterHotkeys(currentSearch);
  }
}

/**
 * Populate the hotkeys list with current configuration
 */
function populateHotkeysList(): void {
  if (!hotkeysList) return;

  const hotkeyConfig = getCurrentHotkeyConfig();
  const hotkeyItems = DEFAULT_HOTKEY_ACTIONS.map((action) => {
    const currentKey = hotkeyConfig[action.id];
    return createHotkeyItemHTML(action, currentKey);
  });

  hotkeysList.innerHTML = hotkeyItems.join("");

  // Only initialize event listeners once
  if (!isEventListenersInitialized) {
    initializeHotkeyEditing();
    isEventListenersInitialized = true;
  }
}

/**
 * Handle hotkey editing - listening for key presses on editable hotkey bindings
 * Uses event delegation to avoid adding multiple listeners
 */
function initializeHotkeyEditing(): void {
  if (!hotkeysList) return;

  // Use event delegation on the hotkeys options container - this only gets called once
  const hotkeyOptions = document.getElementById("hotkeys__options");
  if (hotkeyOptions) {
    hotkeyOptions.addEventListener("click", handleHotkeyClick);
    hotkeyOptions.addEventListener("keydown", handleHotkeyKeydown);
  }
}

/**
 * Handle click events on hotkey elements
 */
function handleHotkeyClick(e: Event): void {
  const target = e.target as HTMLElement;

  // Handle individual reset button clicks
  if (target.closest(".hotkey-reset-btn")) {
    const resetBtn = target.closest(".hotkey-reset-btn") as HTMLElement;
    const actionId = resetBtn.dataset.actionId;
    if (actionId) {
      resetHotkeyToDefault(actionId);
      refreshHotkeysWithSearch();
      ipcRenderer.send(globalEvents.storeChanged);
    }
    return;
  }

  // Handle hotkey binding clicks (check if target or parent is a hotkey binding)
  const hotkeyBinding = target.closest(".hotkey-binding.editable") as HTMLElement;
  if (hotkeyBinding) {
    startEditingHotkey(hotkeyBinding);
  }
}

/**
 * Handle keydown events on hotkey elements
 */
function handleHotkeyKeydown(e: KeyboardEvent): void {
  const target = e.target as HTMLElement;
  const hotkeyBinding = target.closest(".hotkey-binding.editable") as HTMLElement;
  if (hotkeyBinding) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      startEditingHotkey(hotkeyBinding);
    }
  }
}

/**
 * Start editing a hotkey binding
 */
function startEditingHotkey(bindingElement: HTMLElement): void {
  const actionId = bindingElement.dataset.actionId;
  if (!actionId) return;

  // Prevent multiple simultaneous editing sessions
  if (currentlyEditing) {
    return;
  }

  currentlyEditing = bindingElement;

  // Mark as editing and show clear instruction
  bindingElement.classList.add("editing");
  bindingElement.innerHTML = `
    <div class="editing-content">
      <span class="editing-prompt">Press keys for new hotkey...</span>
      <small class="editing-help">(ESC to cancel)</small>
    </div>
  `;

  // Create a focused input element to capture key events reliably
  const keyCapture = document.createElement("input");
  keyCapture.type = "text";
  keyCapture.style.cssText = `
    position: absolute;
    left: -9999px;
    opacity: 0;
    pointer-events: none;
  `;
  keyCapture.setAttribute("autocomplete", "off");
  keyCapture.setAttribute("readonly", "true");

  document.body.appendChild(keyCapture);

  // Focus after a small delay to ensure proper setup
  setTimeout(() => {
    keyCapture.focus();
  }, 100);

  let capturedKeys: string[] = [];
  let isCapturing = true;

  const finishEditing = (success: boolean, newKey?: string) => {
    if (!isCapturing) return;
    isCapturing = false;

    currentlyEditing = null;
    clearTimeout(timeoutId);
    keyCapture.removeEventListener("keydown", handleKeyDown);

    // Clean up the capture element
    if (document.body.contains(keyCapture)) {
      document.body.removeChild(keyCapture);
    }

    bindingElement.classList.remove("editing");

    if (success && newKey) {
      const validation = validateKeyBinding(newKey);
      if (!validation.valid) {
        showHotkeyError(bindingElement, validation.error || "Invalid key combination");
        return;
      }

      const conflictingAction = isKeyInUse(newKey, actionId);
      if (conflictingAction) {
        showHotkeyError(bindingElement, `Key combination already used by: ${conflictingAction}`);
        return;
      }

      // Save the new hotkey and preserve search
      setHotkeyForAction(actionId, newKey);
      refreshHotkeysWithSearch();
      ipcRenderer.send(globalEvents.storeChanged);
    } else {
      // Restore original display and preserve search
      refreshHotkeysWithSearch();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isCapturing) return;
    e.preventDefault();
    e.stopPropagation();

    // Handle escape to cancel
    if (e.key === "Escape") {
      finishEditing(false);
      return;
    }

    // Build key combination
    capturedKeys = [];
    if (e.ctrlKey || e.metaKey) capturedKeys.push("control");
    if (e.altKey) capturedKeys.push("alt");
    if (e.shiftKey) capturedKeys.push("shift");

    // Add the main key (avoid modifier keys alone)
    if (
      !e.key.startsWith("Control") &&
      !e.key.startsWith("Alt") &&
      !e.key.startsWith("Shift") &&
      !e.key.startsWith("Meta")
    ) {
      // Map special keys to normalized names
      const specialKeyMap: Record<string, string> = {
        " ": "space",
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        Delete: "delete",
        Backspace: "backspace",
        Tab: "tab",
        Enter: "enter",
      };

      const mainKey = specialKeyMap[e.key] || e.key.toLowerCase();
      capturedKeys.push(mainKey);

      const newKey = capturedKeys.join("+");
      finishEditing(true, newKey);
    }
  };

  keyCapture.addEventListener("keydown", handleKeyDown);

  // Auto-cancel editing after 15 seconds as fallback
  const timeoutId = setTimeout(() => {
    if (isCapturing) {
      finishEditing(false);
    }
  }, 15000);
}

/**
 * Show an error message for hotkey editing
 */
function showHotkeyError(_bindingElement: HTMLElement, errorMessage: string): void {
  alert(errorMessage);
  refreshHotkeysWithSearch();
}

/**
 * Filter hotkeys based on search query
 */
function filterHotkeys(query: string): void {
  if (!hotkeysList) return;

  const items = hotkeysList.querySelectorAll(".hotkey-item") as NodeListOf<HTMLElement>;
  const searchTerms = query.toLowerCase().trim();

  items.forEach((item) => {
    const searchData = item.dataset.searchTerms || "";
    const matches = !searchTerms || searchData.includes(searchTerms);
    item.style.display = matches ? "" : "none";
  });
}

let isSearchListenerInitialized = false;

/**
 * Initialize hotkey search functionality
 */
function initializeHotkeySearch(): void {
  if (!hotkeySearch || isSearchListenerInitialized) return;

  hotkeySearch.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    filterHotkeys(target.value);
  });

  isSearchListenerInitialized = true;
}
/**
 * Initialize the hotkeys interface
 * @param hotkeySearchElement The search input element
 * @param hotkeysListElement The hotkeys list container element
 */
export function initializeHotkeys(
  hotkeySearchElement: HTMLInputElement,
  hotkeysListElement: HTMLElement,
): void {
  hotkeySearch = hotkeySearchElement;
  hotkeysList = hotkeysListElement;

  populateHotkeysList();
  initializeHotkeySearch();
}
