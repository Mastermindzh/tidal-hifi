const windowFunctions = {};

windowFunctions.setTitle = function(title) {
  window.document.title = title;
};

windowFunctions.getTitle = function() {
  return window.document.title;
};

module.exports = windowFunctions;
