/**
 * Sent immediately after sign-up when the account is pending administrator approval.
 */
const APP_NAME = "Uganda Expressway Manual";
const SITE_URL = "https://uganda-expressway-manual.com";

export function waitingApprovalMessage(params: {
  email: string;
}): { text: string; html: string } {
  const { email } = params;

  const text = [
    "Thank you for registering with " + APP_NAME + ".",
    "",
    "Your registration has been received. Your account is pending approval by an administrator.",
    "",
    "You cannot sign in until your account has been approved. When a decision has been made, we will email you at:",
    "  " + email,
    "",
    "If your request is approved, you will receive further instructions (including how to access the service at " +
    SITE_URL +
    ").",
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
  <title>Registration pending approval</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:28px 32px 8px 32px;border-bottom:1px solid #e5e7eb;">
              <h1 style="margin:0;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:600;color:#111827;letter-spacing:-0.02em;">Registration pending approval</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px 32px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
              <p style="margin:0 0 16px 0;">Thank you for registering with <strong>${escapeHtml(
    APP_NAME
  )}</strong>.</p>
              <p style="margin:0 0 16px 0;">Your registration has been received. Your account is <strong>pending approval</strong> by an administrator.</p>
              <p style="margin:0 0 8px 0;">You cannot sign in until your account has been approved. We will notify you at the email address below once a decision has been made.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
                <tr>
                  <td style="padding:20px 24px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#1f2937;">
                    <p style="margin:0;"><span style="font-weight:700;color:#111827;min-width:100px;display:inline-block;">Email:</span><span style="color:#374151;"> ${escapeHtml(
    email
  )}</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px 32px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#6b7280;border-top:1px solid #f3f4f6;">
              <p style="margin:0 0 12px 0;">If your request is approved, you will receive another email with instructions to access the service at <a href="${safeUrl}" style="color:#1d4ed8;text-decoration:underline;word-break:break-all;">${safeUrl}</a>.</p>
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
