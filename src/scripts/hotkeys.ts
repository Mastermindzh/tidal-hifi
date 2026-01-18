import hotkeyjs, { type HotkeysEvent } from "hotkeys-js";

export const addHotkey = (
  keys: string,
  func: (event?: KeyboardEvent, args?: HotkeysEvent) => void,
) => {
  hotkeyjs(keys, (event, args) => {
    event.preventDefault();
    func(event, args);
  });
};
