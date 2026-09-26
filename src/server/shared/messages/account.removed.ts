/**
 * Email sent after an account is deleted (confirmation for the former user).
 */
const APP_NAME = "Uganda Expressway Manual";
const SITE_URL = "https://uganda-expressway-manual.com";

export function accountRemovedMessage(params: {
  email: string;
}): { text: string; html: string } {
  const { email } = params;

  const text = [
    "This message confirms that your " + APP_NAME + " account has been permanently removed from our system.",
    "",
    "Details of the closed account:",
    "  Email:    " + email,
    "",
    "You will no longer be able to sign in with these credentials. If you need access again in the future, you may register a new account at:",
    "  " + SITE_URL,
    "",
    "If you did not request this deletion, please contact support as soon as possible so we can review the activity on your account.",
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
  <title>Account removed</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:28px 32px 8px 32px;border-bottom:1px solid #e5e7eb;">
              <h1 style="margin:0;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:600;color:#111827;letter-spacing:-0.02em;">Account removed</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px 32px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
              <p style="margin:0 0 16px 0;">This message confirms that your <strong>${escapeHtml(
    APP_NAME
  )}</strong> account has been <strong>permanently removed</strong> from our system.</p>
              <p style="margin:0 0 16px 0;">The following sign-in details are <strong>no longer valid</strong>:</p>
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
              <p style="margin:0 0 12px 0;">To use the service again, you may create a new account at <a href="${safeUrl}" style="color:#1d4ed8;">${safeUrl}</a>.</p>
              <p style="margin:0 0 16px 0;">If you did <strong>not</strong> request this removal, contact support as soon as possible so we can review this activity.</p>
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
