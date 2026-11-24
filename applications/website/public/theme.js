const root = document.documentElement;
const preference = window.matchMedia('(prefers-color-scheme: light)');
const themeColors = { dark: '#0b0d10', light: '#f6f8f9' };
let themeButton = null;

function setTheme(theme) {
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme]);
  if (themeButton) {
    const label = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`;
    themeButton.setAttribute('aria-label', label);
    themeButton.title = label;
  }
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

function connect() {
  themeButton = document.querySelector('.theme');
  if (!themeButton) return;
  setTheme(root.dataset.theme);
  themeButton.addEventListener('click', () => {
    followsSystem = false;
    const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => setTheme(theme));
    } else {
      setTheme(theme);
    }
    try {
      localStorage.setItem('raksent-theme', theme);
    } catch {
      // The selected theme still applies to the current page.
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', connect);
} else {
  connect();
}
