(() => {
  let theme = "dark";
  try {
    if (localStorage.getItem("tab-brain-theme") === "light") theme = "light";
  } catch {
    // Use the default when browser storage is unavailable.
  }
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#141c17" : "#f2f5f5");
})();
