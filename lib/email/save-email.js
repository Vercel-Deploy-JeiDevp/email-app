const fs = require("fs");
const path = require("path");

const emailsDir = path.join(__dirname, "../../emails");

function saveEmail(email) {
    if (!fs.existsSync(emailsDir)) {
        fs.mkdirSync(emailsDir, { recursive: true });
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const fileName = `${day}-${month}-${year}.txt`;
    const filePath = path.join(emailsDir, fileName);

    const line = `${now.toISOString()} | ${email}\n`;
    fs.appendFileSync(filePath, line, "utf8");

    return { fileName, filePath, email };
}

module.exports = saveEmail;