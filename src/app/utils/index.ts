/**
 * Utility functions for the app
 */

/**
 * Create a page URL/route
 * Since the app uses state-based routing, this just returns the page name
 */
export function createPageUrl(pageName: string): string {
  return pageName;
}

/**
 * Navigate to a page (for use with state-based routing)
 */
export function navigateToPage(pageName: string, setCurrentView: (view: string) => void): void {
  setCurrentView(pageName);
}
