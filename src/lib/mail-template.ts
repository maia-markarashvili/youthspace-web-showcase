import "server-only";

/**
 * ბრენდული HTML გარსი ადმინის უბრალო ტექსტისთვის (§2.3) — ერთი ფიქსირებული
 * შაბლონი, ადმინის დამატებითი ჩარევის გარეშე. Inline სტილები მხოლოდ (Outlook/
 * Gmail <style>-ს ხშირად აჭრის), სურათის გარეშე (image-blocking default-ია),
 * ცენტრირებული <table> (Outlook max-width-ს div-ზე არ იჭერს).
 *
 * ფერები globals.css-ის იმავე ტოკენებია: green-dark #2f5e34, cream #eef3ec,
 * ink #1f2421, ink-muted #55605a, line #dde6da.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** ტექსტი → HTML: escape, \n\n → პარაგრაფი, \n → <br>, https://… → ბმული */
function bodyToHtml(body: string): string {
  const escaped = escapeHtml(body.trim());
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) =>
      `<a href="${url}" style="color:#2f5e34;text-decoration:underline;">${url}</a>`,
  );
  const paragraphs = linked
    .split(/\n{2,}/)
    .map((part) => part.replace(/\n/g, "<br>"))
    .map((part) => `<p style="margin:0 0 16px;">${part}</p>`)
    .join("");
  return paragraphs;
}

/** ბრენდის ზოლისა და სათაურის საერთო სტილი — ერთი წყარო, რომ სათაური
 *  ზუსტად იმავე ფონტით გამოიყოს ტექსტისგან (მფლობელის მოთხოვნა) */
const MARK_STYLE =
  "font-size:20px;font-weight:700;letter-spacing:0.02em;color:#2f5e34;";

export function renderEmailHtml(params: {
  body: string;
  siteUrl: string;
  footer: string;
  /** ზედა ზოლი; default „სივრცე" — დაგზავნაში „სივრცის სიახლეები" */
  brand?: string;
  /** ტექსტის თავზე გამოყოფილი სათაური (დაგზავნის ჩანაწერის სახელი) */
  heading?: string;
  /** დაგზავნის წერილებში — ფუტერში ცალკე ხაზად; ტრანზაქციულში არ გადმოეცემა */
  unsubscribeUrl?: string;
}): string {
  const unsubscribeRow = params.unsubscribeUrl
    ? `<br><a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#55605a;">გამოწერის გაუქმება</a>`
    : "";
  const headingRow = params.heading
    ? `<p style="margin:0 0 16px;${MARK_STYLE}line-height:1.4;">${escapeHtml(params.heading)}</p>`
    : "";

  return `<!doctype html>
<html lang="ka">
<body style="margin:0;padding:0;background-color:#eef3ec;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef3ec;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #dde6da;border-radius:20px;">
          <tr>
            <td style="padding:32px 32px 8px;">
              <span style="${MARK_STYLE}">${escapeHtml(params.brand ?? "სივრცე")}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;font-size:16px;line-height:1.6;color:#1f2421;">
              ${headingRow}${bodyToHtml(params.body)}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px;border-top:1px solid #dde6da;font-size:12px;line-height:1.6;color:#55605a;">
              ${escapeHtml(params.footer)}<br>
              <a href="${params.siteUrl}" style="color:#55605a;">${params.siteUrl}</a>${unsubscribeRow}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
