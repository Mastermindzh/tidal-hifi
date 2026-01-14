import { UI_SELECTORS } from "./constants";

/**
 * Get an element from the dom
 * @param key of the object selector
 */
export function get(key: keyof typeof UI_SELECTORS): HTMLElement {
  return globalThis.document.querySelector(UI_SELECTORS[key]);
}

/**
 * Shorthand function to get the text of a dom element
 * @param key of the object selector
 */
export function getText(key: keyof typeof UI_SELECTORS): string {
  const element = get(key);
  return element ? element.textContent : "";
}

/**
 * Shorthand function to click a dom element
 * @param key of the object selector
 */
export function click(key: keyof typeof UI_SELECTORS): void {
  get(key).click();
}

/**
 * Shorthand function to focus a dom element
 * @param key of the object selector
 */
export function focus(key: keyof typeof UI_SELECTORS): void {
  return get(key).focus();
}
