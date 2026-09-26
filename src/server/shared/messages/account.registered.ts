/**
 * HTML + plain-text content for the post-registration email.
 * Inline styles are used for broad client support (Gmail, Outlook, etc.).
 */
const APP_NAME = "Uganda Expressway Manual";
const SITE_URL = "https://uganda-expressway-manual.com";

export function localRegistrationMessage(params: {
  email: string;
  password: string;
}): { text: string; html: string } {
  const { email, password } = params;

  const text = [
    "Thank you for registering with " + APP_NAME + ".",
    "",
    "Your account has been approved. You may sign in at:",
    "  " + SITE_URL,
    "",
    "Use the following credentials:",
    "",
    "  Email:     " + email,
    "  Password:  " + password,
    "",
    "For your security, we recommend changing your password after you first sign in, particularly if you use a shared or public device.",
    "",
    "If you did not create this account, you may ignore this message.",
    "",
    "Sincerely,",
    APP_NAME,
  ].join("\n");

  const safeUrl = escapeHtml(SITE_URL);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Registration confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:28px 32px 8px 32px;border-bottom:1px solid #e5e7eb;">
              <h1 style="margin:0;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:600;color:#111827;letter-spacing:-0.02em;">Registration confirmed</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px 32px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
              <p style="margin:0 0 16px 0;">Thank you for registering with <strong>${escapeHtml(
    APP_NAME
  )}</strong>.</p>
              <p style="margin:0 0 8px 0;">Your account is active. You may sign in at:</p>
              <p style="margin:0 0 16px 0;"><a href="${safeUrl}" style="color:#1d4ed8;text-decoration:underline;word-break:break-all;">${safeUrl}</a></p>
              <p style="margin:0 0 16px 0;">Use the credentials below to sign in.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
                <tr>
                  <td style="padding:20px 24px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#1f2937;">
                    <p style="margin:0 0 12px 0;"><span style="font-weight:700;color:#111827;min-width:100px;display:inline-block;">Email:</span><span style="color:#374151;"> ${escapeHtml(
    email
  )}</span></p>
                    <p style="margin:0 0 12px 0;"><span style="font-weight:700;color:#111827;min-width:100px;display:inline-block;">Password:</span><span style="color:#374151;word-break:break-all;"> ${escapeHtml(
    password
  )}</span></p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px 32px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#6b7280;border-top:1px solid #f3f4f6;">
              <p style="margin:0 0 12px 0;">For your security, we recommend changing your password after you first sign in, especially on a shared or public device.</p>
              <p style="margin:0 0 16px 0;">If you did not create this account, you may ignore this message.</p>
              <p style="margin:0;font-size:13px;color:#9ca3af;">Sincerely,<br /><span style="color:#4b5563;">${escapeHtml(
    APP_NAME
  )}</span></p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#9ca3af;">This is an automated message. Please do not reply to this email.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { text, html };
}


export function googleRegistrationMessage(params: {
  email: string;
}): { text: string; html: string } {
  const { email } = params;

  const text = [
    "Thank you for registering with " + APP_NAME + ".",
    "",
    "Your account has been approved. Sign in with Google using:",
    "  " + email,
    "",
    "If you did not create this account, you may ignore this message.",
    "",
    "Sincerely,",
    APP_NAME,
  ].join("\n");

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Registration confirmed</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <tr>
              <td style="padding:28px 32px 8px 32px;border-bottom:1px solid #e5e7eb;">
                <h1 style="margin:0;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:600;color:#111827;letter-spacing:-0.02em;">Registration confirmed</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px 32px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
                <p style="margin:0 0 16px 0;">Thank you for registering with <strong>${escapeHtml(
    APP_NAME
  )}</strong>.</p>
                <p style="margin:0 0 16px 0;">Your account has been approved. Sign in with Google using <strong>${escapeHtml(
    email
  )}</strong>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
                  <tr>
                    <td style="padding:20px 24px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#1f2937;">
                      <p style="margin:0 0 12px 0;"><span style="font-weight:700;color:#111827;min-width:100px;display:inline-block;">Email:</span><span style="color:#374151;"> ${escapeHtml(
    email
  )}</span></p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px 32px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#6b7280;border-top:1px solid #f3f4f6;">
                <p style="margin:0 0 12px 0;">If you did not create this account, you may ignore this message.</p>
                <p style="margin:0 0 16px 0;">Sincerely,<br /><span style="color:#4b5563;">${escapeHtml(
    APP_NAME
  )}</span></p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#9ca3af;">This is an automated message. Please do not reply to this email.</p>
        </td>
      </table>
    </body>
  </html>`;

  return { text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
