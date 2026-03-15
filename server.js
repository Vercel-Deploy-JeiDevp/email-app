require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const sendEmail = require("./lib/email/nodemailer");
const data = require("./data-email");

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: Dominio no permitido: ${origin}`));
            }
        },
    })
);

app.use(express.json());

app.use("/", express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.send("Servidor funcionando");
});


app.post("/subscribe", async (req, res) => {

    try {
        const { id, email } = req.body;
        const emailData = data[id];

        if (!emailData) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await sendEmail({
            to: email,
            subject: emailData.subject,
            template: `${__dirname}/templates/${emailData.rootPath}/${emailData.template}`,
            title: emailData.title,
            sheetName: emailData.sheetName,
            payload: {
                ...(emailData.payload || {}),
                year: new Date().getFullYear(),
            },
        });

        res.json({ success: true });

    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(9090, () => {
    console.log("Servidor corriendo en puerto 9090");
});