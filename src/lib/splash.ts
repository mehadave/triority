const KEY = 'triority:intro-seen';

/**
 * The loading screen is static markup in index.html so it can start drawing before
 * the app script arrives. It plays in full once per session (about 2s, never longer);
 * on later loads it is cleared as soon as the app is ready.
 */
export function dismissSplash(): void {
  const splash = document.getElementById('splash');
  if (!splash) return;
  let seen = false;
  try {
    seen = sessionStorage.getItem(KEY) === '1';
    sessionStorage.setItem(KEY, '1');
  } catch {
    seen = true;
  }
  const remove = () => splash.remove();
  if (seen) {
    splash.classList.add('is-done');
    window.setTimeout(remove, 200);
    return;
  }
  splash.addEventListener('click', () => splash.classList.add('is-done'));
  window.setTimeout(remove, 2200);
}
