require("dotenv").config();
const nodemailer = require("nodemailer");
const mustache = require("mustache");
const fs = require("fs");
const saveEmail = require("./save-email");

module.exports = async function sendEmail(data) {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const templateContent = fs.readFileSync(data.template, "utf-8");
        saveEmail(data.to, data.sheetName);
        const mailOptions = {
            from: `"${data.title}" <${process.env.SENDER_EMAIL_USER}>`,
            to: data.to,
            subject: data.subject,
            html: mustache.render(templateContent, data.payload || {})
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("Correo enviado:", info);

    } catch (error) {

        console.log("Error enviando correo:", error);

    }

}