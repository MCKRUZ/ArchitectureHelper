/**
 * Blank MSAL popup redirect page.
 * The parent window's MSAL instance polls this popup's URL,
 * reads the auth code from the hash, and closes the popup.
 * This page must NOT initialize MSAL or touch the URL hash.
 */
export default function AuthCallback() {
  return null;
}
