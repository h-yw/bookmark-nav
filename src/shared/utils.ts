export function simplifyUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function openUrl(url: string): void {
  try {
    chrome.tabs.update({ url });
  } catch {
    window.open(url, '_blank');
  }
}
