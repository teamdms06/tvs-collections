/* global __APP_VERSION__ */

const CURRENT_APP_VERSION =
  typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "development";
const VERSION_CHECK_INTERVAL_MS = 60 * 1000;
const VERSION_RELOAD_STORAGE_KEY = "tvsLastVersionReloadAt";
const VERSION_RELOAD_COOLDOWN_MS = 30 * 1000;

function getVersionUrl() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  return `${baseUrl}version.json?t=${Date.now()}`;
}

function reloadForNewVersion() {
  const lastReloadAt = Number(
    window.sessionStorage.getItem(VERSION_RELOAD_STORAGE_KEY) || 0,
  );
  const now = Date.now();

  if (now - lastReloadAt < VERSION_RELOAD_COOLDOWN_MS) {
    return;
  }

  window.sessionStorage.setItem(VERSION_RELOAD_STORAGE_KEY, String(now));
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("appVersion", String(now));
  window.location.replace(nextUrl.toString());
}

export function startAppVersionCheck() {
  if (typeof window === "undefined" || CURRENT_APP_VERSION === "development") {
    return () => undefined;
  }

  let stopped = false;

  const checkVersion = async () => {
    try {
      const response = await fetch(getVersionUrl(), {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const deployedVersion = String(data.version || "");

      if (deployedVersion && deployedVersion !== CURRENT_APP_VERSION) {
        reloadForNewVersion();
      }
    } catch {
      // Ignore transient network errors. The next interval will check again.
    }
  };

  const intervalId = window.setInterval(() => {
    if (!stopped) {
      checkVersion();
    }
  }, VERSION_CHECK_INTERVAL_MS);

  checkVersion();

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
  };
}
