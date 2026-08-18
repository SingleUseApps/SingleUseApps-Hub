import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContactEmail({ typeLabel, appName, source, name, email, title, description }) {
  const from = process.env.RESEND_FROM || "Single Use Apps <support@dupsweep.com>";
  const to = process.env.CONTACT_TO || "singleuseapp@gmail.com";
  const text = `Type: ${typeLabel}
App: ${appName}
Source: ${source}
Name: ${name}
Email: ${email}

--- Description ---

${description}`;

  return resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `[${typeLabel}] ${title}`,
    text,
  });
}

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
