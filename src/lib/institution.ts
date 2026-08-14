/**
 * Institutional email checking.
 *
 * Deliberately NOT `.edu`-only. Most of the world's universities do not use
 * .edu — vit.ac.in, unam.mx, ox.ac.uk, u-tokyo.ac.jp, tum.de. So instead of
 * allow-listing academic suffixes we reject the consumer mail providers and
 * treat everything else as an institution.
 *
 * Wrong in the permissive direction on purpose: a student at an institution we
 * have never heard of gets in, and a campus is scoped by its own domain anyway.
 */

const CONSUMER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.co.uk",
  "ymail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "zoho.com",
  "gmx.com",
  "gmx.de",
  "mail.com",
  "mail.ru",
  "yandex.com",
  "yandex.ru",
  "qq.com",
  "163.com",
  "126.com",
  "naver.com",
  "hanmail.net",
  "daum.net",
  "rediffmail.com",
  "duck.com",
  "duckduckgo.com",
  "fastmail.com",
  "hey.com",
  "tutanota.com",
  "example.com",
]);

const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export type EmailCheck =
  | { ok: true; email: string; domain: string }
  | { ok: false; reason: string };

export function checkInstitutionalEmail(raw: string): EmailCheck {
  const email = raw.trim().toLowerCase();

  if (!EMAIL_SHAPE.test(email)) {
    return { ok: false, reason: "That doesn't look like an email address." };
  }

  const domain = email.split("@")[1];

  if (CONSUMER_DOMAINS.has(domain)) {
    return {
      ok: false,
      reason:
        "Use your university email, not a personal one. Any institution works — it doesn't have to end in .edu.",
    };
  }

  return { ok: true, email, domain };
}

/**
 * How an institution is shown in the UI. We only ever have the domain, so we
 * show the domain — no invented university names.
 */
export function institutionLabel(domain: string | null | undefined): string {
  if (!domain) return "Unknown institution";
  return domain;
}
