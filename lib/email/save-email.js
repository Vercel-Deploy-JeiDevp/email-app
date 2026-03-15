const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

async function saveEmail(email, sheetName) {

    try {
        const now = new Date().toISOString();

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `'${sheetName}'!A:B`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [[email, now]],
            },
        });
    } catch (error) {
        console.error("Error saving email to Google Sheets:", error);
    }

}

module.exports = saveEmail;