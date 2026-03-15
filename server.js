require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const sendEmail = require("./lib/email/nodemailer");
const data = require("./data-email");

const app = express();
const emailsDirectory = path.join(__dirname, "emails");
const emailsBasicAuthUser = process.env.EMAILS_BASIC_AUTH_USER;
const emailsBasicAuthPass = process.env.EMAILS_BASIC_AUTH_PASS;

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

function unauthorizedResponse(res) {
    res.set("WWW-Authenticate", 'Basic realm="emails"');
    return res.status(401).json({ error: "Unauthorized" });
}

function basicAuth(req, res, next) {
    if (!emailsBasicAuthUser || !emailsBasicAuthPass) {
        return res.status(500).json({ error: "Basic auth is not configured" });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
        return unauthorizedResponse(res);
    }

    const encodedCredentials = authHeader.split(" ")[1];
    const decodedCredentials = Buffer.from(encodedCredentials, "base64").toString("utf8");
    const separatorIndex = decodedCredentials.indexOf(":");

    if (separatorIndex === -1) {
        return unauthorizedResponse(res);
    }

    const username = decodedCredentials.slice(0, separatorIndex);
    const password = decodedCredentials.slice(separatorIndex + 1);

    if (username !== emailsBasicAuthUser || password !== emailsBasicAuthPass) {
        return unauthorizedResponse(res);
    }

    next();
}

function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function isPathInsideRoot(rootPath, targetPath) {
    const relative = path.relative(rootPath, targetPath);
    return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function toRoutePath(relativePath) {
    if (!relativePath) {
        return "/emails";
    }

    const normalized = relativePath.split(path.sep).join("/").split("/").filter(Boolean);
    const encoded = normalized.map((segment) => encodeURIComponent(segment));
    return `/emails/${encoded.join("/")}`;
}

function renderDirectoryPage(currentRelativePath, entries) {
    const breadcrumbs = ["emails", ...currentRelativePath.split(path.sep).filter(Boolean)];
    const titlePath = breadcrumbs.join("/");

    const parentRelativePath = currentRelativePath
        ? path.dirname(currentRelativePath) === "."
            ? ""
            : path.dirname(currentRelativePath)
        : null;

    const parentLink = parentRelativePath !== null
        ? `<li><a href="${toRoutePath(parentRelativePath)}">../</a></li>`
        : "";

    const items = entries
        .map((entry) => {
            const entryRelativePath = currentRelativePath
                ? path.join(currentRelativePath, entry.name)
                : entry.name;

            const href = toRoutePath(entryRelativePath);
            const suffix = entry.isDirectory() ? "/" : "";
            return `<li><a href="${href}">${escapeHtml(entry.name)}${suffix}</a></li>`;
        })
        .join("\n");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(titlePath)}</title>
  <style>
    body { font-family: sans-serif; padding: 24px; line-height: 1.5; }
    h1 { margin-top: 0; font-size: 20px; }
    ul { list-style: none; padding-left: 0; }
    li { margin: 6px 0; }
    a { text-decoration: none; color: #0b57d0; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>/${escapeHtml(titlePath)}</h1>
  <ul>
    ${parentLink}
    ${items}
  </ul>
</body>
</html>`;
}

app.get("/", (req, res) => {
    res.send("Servidor funcionando");
});

app.get(/^\/emails(?:\/(.*))?$/, basicAuth, (req, res) => {
    if (!fs.existsSync(emailsDirectory)) {
        return res.status(404).json({ error: "Emails directory not found" });
    }

    const requestedPath = req.params[0] ? decodeURIComponent(req.params[0]) : "";
    const normalizedPath = path.normalize(requestedPath);
    const fullPath = path.resolve(emailsDirectory, normalizedPath);

    if (!isPathInsideRoot(emailsDirectory, fullPath) && fullPath !== emailsDirectory) {
        return res.status(400).json({ error: "Invalid path" });
    }

    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "Path not found" });
    }

    const stat = fs.statSync(fullPath);

    if (stat.isFile()) {
        return res.sendFile(fullPath);
    }

    const directoryEntries = fs
        .readdirSync(fullPath, { withFileTypes: true })
        .sort((a, b) => {
            if (a.isDirectory() !== b.isDirectory()) {
                return a.isDirectory() ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

    const relativePath = path.relative(emailsDirectory, fullPath) === "."
        ? ""
        : path.relative(emailsDirectory, fullPath);

    return res.status(200).send(renderDirectoryPage(relativePath, directoryEntries));
});

app.post("/send-email", async (req, res) => {

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