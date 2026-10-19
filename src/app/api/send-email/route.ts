import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      host = 'smtp.gmail.com',
      port = 465,
      secure = true,
      username,
      password,
      senderName = 'Academic ERP',
      senderEmail,
      to,
      subject,
      text,
      html,
    } = body;

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Recipient email address ("to") is required.' },
        { status: 400 }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error:
            'SMTP credentials missing: Please provide your Gmail address and 16-character Google App Password in Email Gateway settings.',
        },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim().replace(/\s+/g, ''); // remove any spaces in 16-char app password
    const fromAddress = senderEmail ? String(senderEmail).trim() : cleanUsername;
    const cleanPort = Number(port) || 465;
    const isSecure = Boolean(secure) || cleanPort === 465;

    // Detect if connecting to Gmail
    const isGmail =
      cleanUsername.toLowerCase().endsWith('@gmail.com') ||
      String(host).toLowerCase().includes('gmail');

    const transportConfig: any = isGmail
      ? {
          service: 'gmail',
          auth: {
            user: cleanUsername,
            pass: cleanPassword,
          },
        }
      : {
          host: String(host).trim(),
          port: cleanPort,
          secure: isSecure,
          auth: {
            user: cleanUsername,
            pass: cleanPassword,
          },
          tls: {
            rejectUnauthorized: false,
          },
        };

    const transporter = nodemailer.createTransport(transportConfig);

    // Verify connection configuration
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"${senderName}" <${fromAddress}>`,
      to: String(to).trim(),
      subject: subject || 'Academic ERP Notification',
      text: text || '',
      html: html || text || '<p>Academic ERP Notification Delivery</p>',
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      message: `Email successfully delivered to ${to} via ${cleanUsername}`,
    });
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    let userFriendlyError = errorMessage;

    if (
      errorMessage.includes('535') ||
      errorMessage.includes('Invalid login') ||
      errorMessage.includes('Username and Password not accepted')
    ) {
      userFriendlyError =
        'Gmail Authentication Failed (535): Google requires a 16-character "App Password" instead of your normal Gmail password. Please visit https://myaccount.google.com/apppasswords to create one, then paste it in the SMTP Password field.';
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
      userFriendlyError = `Connection to SMTP server failed (${err.code}). Please verify the host, port, and network connection.`;
    }

    return NextResponse.json(
      {
        success: false,
        error: userFriendlyError,
        rawError: errorMessage,
      },
      { status: 500 }
    );
  }
}
