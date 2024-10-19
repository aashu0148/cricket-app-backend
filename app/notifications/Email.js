import nodemailer from "nodemailer";

import EmailSchema from "#app/emails/emailSchema.js";

import configs from "#utils/configs.js";

class Email {
  constructor() {
    // Create a transporter object using Gmail service
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: configs.GMAIL_MAIL,
        pass: configs.GMAIL_PASS,
      },
    });
  }

  async sendMail({
    type,
    sentToUserId,
    to,
    subject,
    text,
    html,
    metadata = {},
  }) {
    try {
      if (!type || !sentToUserId || !to || !subject) return;

      const info = await this.transporter.sendMail({
        from: configs.GMAIL_MAIL,
        to,
        subject,
        text,
        html,
      });

      const newEmail = new EmailSchema({
        sentTo: sentToUserId,
        from: configs.GMAIL_MAIL,
        to,
        subject,
        text,
        html,
        type,
        metadata,
      });
      await newEmail.save();

      console.log(
        `📧✔️ Email sent to ${to} | ${subject} | messageId: ${info.messageId}`
      );
      return info;
    } catch (error) {
      console.error("Error sending email: ", error);
      return false;
    }
  }
}

export default Email;
