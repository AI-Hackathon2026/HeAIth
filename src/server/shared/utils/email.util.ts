import nodemailer from "nodemailer";
import { IConfigUtil } from "./config.util";
import { IEmailUtil } from "../../application/port/managers/I.email.util";
import { TechnicalException, TechnicalExceptionType } from "../exceptions/technical.exception";

/** Sends mail through Gmail SMTP when EMAIL_USER/EMAIL_PASSWORD are set; otherwise logs and skips. */
export class EmailUtil implements IEmailUtil {
    private transporter: nodemailer.Transporter | null;

    constructor(private config: IConfigUtil) {
        const { EMAIL_USER, EMAIL_PASSWORD } = this.config.parsed();
        this.transporter =
            EMAIL_USER && EMAIL_PASSWORD
                ? nodemailer.createTransport({
                      service: "gmail",
                      auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
                  })
                : null;
    }

    async sendEmail(params: { to: string; subject: string; text: string; html?: string }) {
        if (!this.transporter) {
            console.info(`[email] SMTP not configured; skipped "${params.subject}" to ${params.to}`);
            return;
        }
        try {
            await this.transporter.sendMail({
                from: this.config.parsed().EMAIL_USER,
                to: params.to,
                subject: params.subject,
                text: params.text,
                ...(params.html ? { html: params.html } : {}),
            });
        } catch (err) {
            console.error("Failed to send email:", err);
            throw new TechnicalException({ type: TechnicalExceptionType.EMAIL_SEND_FAILED });
        }
    }
}
