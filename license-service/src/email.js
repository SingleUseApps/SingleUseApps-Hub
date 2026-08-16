import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLicenseEmail({ name, email, appName, key }) {
  const from = process.env.RESEND_FROM || "Single Use Apps <support@singleuseapps.com>";
  const text = `Hello ${name},

Thank you for your purchase!

Your ${appName} Pro License Key is: ${key}

To activate:
1. Open the app.
2. Go to the menu > License Key...
3. Enter your email and this key.

Enjoy!
- The Single Use Apps Team`;

  return resend.emails.send({
    from,
    to: email,
    subject: `Your ${appName} License Key`,
    text,
  });
}
