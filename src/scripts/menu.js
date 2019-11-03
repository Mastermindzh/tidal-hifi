const { Menu } = require("electron");
const { showSettingsWindow } = require("./settings");
const isMac = process.platform === "darwin";

const settingsMenuEntry = {
  label: "Settings",
  click() {
    showSettingsWindow();
  },
  accelerator: "Control+/",
};

const mainMenu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            settingsMenuEntry,
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideothers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : []),
  // { role: 'fileMenu' }
  {
    label: "File",
    submenu: [settingsMenuEntry, isMac ? { role: "close" } : { role: "quit" }],
  },
  // { role: 'editMenu' }
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...(isMac
        ? [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
              label: "Speech",
              submenu: [{ role: "startspeaking" }, { role: "stopspeaking" }],
            },
          ]
        : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
      { type: "separator" },
      settingsMenuEntry,
    ],
  },
  // { role: 'viewMenu' }
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forcereload" },
      { type: "separator" },
      { role: "resetzoom" },
      { role: "zoomin" },
      { role: "zoomout" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  },
  // { role: 'windowMenu' }
  {
    label: "Window",
    submenu: [
      { role: "minimize" },
      ...(isMac
        ? [{ type: "separator" }, { role: "front" }, { type: "separator" }, { role: "window" }]
        : [{ role: "close" }]),
    ],
  },
  settingsMenuEntry,
  {
    label: "About",
    click() {
      showSettingsWindow("tab3");
    },
  },
];

const menuModule = { mainMenu };

menuModule.getMenu = function() {
  return Menu.buildFromTemplate(mainMenu);
};

menuModule.addMenu = function() {
  Menu.setApplicationMenu(menuModule.getMenu());
};

module.exports = menuModule;
