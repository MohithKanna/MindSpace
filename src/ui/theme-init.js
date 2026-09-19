(() => {
  try {
    const prefs = JSON.parse(localStorage.getItem("editor_prefs") || "{}");
    document.documentElement.dataset.theme = prefs.darkMode ? "dark" : "light";
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
