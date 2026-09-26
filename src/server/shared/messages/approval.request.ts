/**
 * Notifies administrators that a new user has signed up and needs approval.
 */
const APP_NAME = "Uganda Expressway Manual";
const SITE_URL = "https://uganda-expressway-manual.com";

export function approvalRequestMessage(params: {
  applicantEmail: string;
  registeredAt: string;
}): { text: string; html: string } {
  const { applicantEmail, registeredAt } = params;

  const lines = [
    "A new user has registered with " + APP_NAME + " and is waiting for approval.",
    "",
    "Applicant email:",
    "  " + applicantEmail,
  ];
  lines.push("", "Registered at:", "  " + registeredAt);
  lines.push(
    "",
    "Please review this request in your administrator dashboard and approve or reject the account.",
    "  " + SITE_URL,
    "",
    "Sincerely,",
    APP_NAME + " (automated notification)",
  );

  const text = lines.join("\n");

  const safeReviewUrl = escapeHtml(SITE_URL);
  const registeredBlock = `<p style="margin:0 0 12px 0;"><span style="font-weight:700;color:#111827;min-width:120px;display:inline-block;">Registered:</span><span style="color:#374151;"> ${escapeHtml(
    registeredAt
  )}</span></p>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New registration awaiting approval</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:28px 32px 8px 32px;border-bottom:1px solid #e5e7eb;">
              <h1 style="margin:0;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:600;color:#111827;letter-spacing:-0.02em;">New registration awaiting approval</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px 32px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
              <p style="margin:0 0 16px 0;">Someone has registered for <strong>${escapeHtml(
    APP_NAME
  )}</strong> and their account is <strong>pending your approval</strong>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
                <tr>
                  <td style="padding:20px 24px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#1f2937;">
                    <p style="margin:0 0 12px 0;"><span style="font-weight:700;color:#111827;min-width:120px;display:inline-block;">Applicant email:</span><span style="color:#374151;"> ${escapeHtml(
    applicantEmail
  )}</span></p>
                    ${registeredBlock}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px 32px;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#6b7280;border-top:1px solid #f3f4f6;">
              <p style="margin:0 0 16px 0;">Open your administrator dashboard to approve or reject this user.</p>
              <p style="margin:0 0 16px 0;"><a href="${safeReviewUrl}" style="color:#1d4ed8;text-decoration:underline;word-break:break-all;">${safeReviewUrl}</a></p>
              <p style="margin:0;font-size:13px;color:#9ca3af;">${escapeHtml(
    APP_NAME
  )} · automated administrator notification</p>
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
