import hotkeyjs, { HotkeysEvent } from "hotkeys-js";

export const addHotkey = function (
  keys: string,
  func: (event?: KeyboardEvent, args?: HotkeysEvent) => void
) {
  hotkeyjs(keys, function (event, args) {
    event.preventDefault();
    func(event, args);
  });
};
