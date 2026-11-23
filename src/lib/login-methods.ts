/**
 * Every way a learner can get in. The login screen reads this list, so turning
 * a method on later is a one-word change here (plus its wiring).
 *
 * live  = works today, shown as a real option
 * soon  = shown as a "coming soon" chip
 * off   = built or planned but hidden (for example SMS codes, off by default per client)
 */
export type LoginMethodStatus = "live" | "soon" | "off";

export type LoginMethod = {
  id: "pin" | "qr" | "email-password" | "email-link" | "google" | "apple" | "passkey" | "sms";
  label: string;
  status: LoginMethodStatus;
};

export const LOGIN_METHODS: LoginMethod[] = [
  { id: "pin", label: "Team code + PIN", status: "live" },
  { id: "qr", label: "Scan my QR badge", status: "live" },
  { id: "email-password", label: "Email + password", status: "soon" },
  { id: "email-link", label: "Email me a link", status: "soon" },
  { id: "google", label: "Google", status: "soon" },
  { id: "apple", label: "Apple", status: "soon" },
  { id: "passkey", label: "Face ID / passkey", status: "soon" },
  { id: "sms", label: "Text me a code", status: "off" },
];

export const comingSoonMethods = () => LOGIN_METHODS.filter((m) => m.status === "soon");
