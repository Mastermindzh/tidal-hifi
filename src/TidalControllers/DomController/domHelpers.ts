import { UI_SELECTORS } from "./constants";

/**
 * Get an element from the dom
 * @param key of the object selector
 */
export function getElement(key: keyof typeof UI_SELECTORS): HTMLElement {
  return globalThis.document.querySelector(UI_SELECTORS[key]);
}

/**
 * Shorthand function to get the text of a dom element
 * @param key of the object selector
 */
export function getElementText(key: keyof typeof UI_SELECTORS): string {
  const element = getElement(key);
  return element ? element.textContent : "";
}

/**
 * Shorthand function to get the attribute of a dom element
 * @param key of the object selector
 * @param attribute name of the attribute
 */
export function getElementAttribute(
  key: keyof typeof UI_SELECTORS,
  attribute: string,
): string | null {
  const element = getElement(key);
  return element ? element.getAttribute(attribute) : null;
}

/**
 * Shorthand function to click a dom element
 * @param key of the object selector
 */
export function clickElement(key: keyof typeof UI_SELECTORS): void {
  getElement(key).click();
}

/**
 * Shorthand function to focus a dom element
 * @param key of the object selector
 */
export function focusElement(key: keyof typeof UI_SELECTORS): void {
  getElement(key).focus();
}
