const themeButton = document.querySelector('.theme');
const preference = window.matchMedia('(prefers-color-scheme: light)');
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === 'light' ? 'Dark mode' : 'Light mode';
}
let savedTheme;
try {
  savedTheme = localStorage.getItem('raksent-theme');
} catch {
  // The system preference is available when storage is restricted.
}
let followsSystem = !['light', 'dark'].includes(savedTheme);
setTheme(followsSystem ? preference.matches ? 'light' : 'dark' : savedTheme);
preference.addEventListener('change', event => {
  if (followsSystem) setTheme(event.matches ? 'light' : 'dark');
});
themeButton.hidden = false;
themeButton.addEventListener('click', () => {
  followsSystem = false;
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  setTheme(theme);
  try {
    localStorage.setItem('raksent-theme', theme);
  } catch {
    // The selected theme still applies to the current page.
  }
});
