/**
 * Every way a learner can get in, for reference.
 *
 * PIN, QR badge, email + password, email link and Face ID / passkeys work on
 * every deploy. Google, Apple and text codes need provider setup first and
 * are switched on with the AUTH_GOOGLE, AUTH_APPLE and AUTH_SMS environment
 * variables (set to "on"). Each team can also turn any method off in
 * Team settings (organizations.login_settings); text codes start off.
 */
export const LOGIN_METHODS = [
  { id: "pin", label: "Team code + PIN" },
  { id: "qr", label: "Scan my QR badge" },
  { id: "email_password", label: "Email + password" },
  { id: "email_link", label: "Email me a link" },
  { id: "passkey", label: "Face ID / fingerprint" },
  { id: "google", label: "Google", env: "AUTH_GOOGLE" },
  { id: "apple", label: "Apple", env: "AUTH_APPLE" },
  { id: "sms", label: "Text me a code", env: "AUTH_SMS" },
  { id: "tablet", label: "Shared tablet: pick your name + PIN" },
] as const;
