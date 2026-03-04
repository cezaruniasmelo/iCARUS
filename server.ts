import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL?.replace(/\/$/, "")}/auth/google/callback`
);

// --- Google OAuth Routes (for the specialist to connect their calendar) ---

app.get("/api/auth/google/url", (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(400).json({ 
        error: "Configuração ausente", 
        message: "Por favor, adicione GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nos Secrets do AI Studio." 
      });
    }

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.readonly"],
      prompt: "consent",
    });
    res.json({ url });
  } catch (error: any) {
    console.error("Error generating auth URL:", error);
    res.status(500).json({ error: "Erro interno", message: error.message });
  }
});

app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    // In a real app, you'd save this to a database. 
    // For this demo, we'll just show it so the user can add it to their .env
    res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #14b8a6;">Conexão Bem-sucedida!</h1>
          <p>Copie seu Refresh Token abaixo e adicione ao seu arquivo .env como <b>SPECIALIST_REFRESH_TOKEN</b>:</p>
          <code style="background: #f1f5f9; padding: 10px; border-radius: 5px; display: block; margin: 20px 0; word-break: break-all;">
            ${tokens.refresh_token}
          </code>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', refreshToken: '${tokens.refresh_token}' }, '*');
            }
          </script>
          <button onclick="window.close()" style="background: #0f172a; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Fechar Janela</button>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error exchanging code:", error);
    res.status(500).send("Authentication failed");
  }
});

// --- Calendar API Endpoints (used by the chatbot) ---

async function getCalendarClient() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({ refresh_token: process.env.SPECIALIST_REFRESH_TOKEN });
  return google.calendar({ version: "v3", auth: client });
}

app.get("/api/calendar/free-slots", async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    if (!process.env.SPECIALIST_REFRESH_TOKEN) {
      return res.status(400).json({ error: "Specialist calendar not connected" });
    }

    const calendar = await getCalendarClient();
    const startOfDay = new Date(`${date}T09:00:00Z`);
    const endOfDay = new Date(`${date}T17:00:00Z`);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        items: [{ id: "primary" }],
      },
    });

    const busy = response.data.calendars?.primary?.busy || [];
    // Simple logic: 1-hour slots from 09:00 to 17:00
    const slots = [];
    for (let h = 9; h < 17; h++) {
      const slotStart = new Date(`${date}T${h.toString().padStart(2, "0")}:00:00Z`);
      const slotEnd = new Date(`${date}T${(h + 1).toString().padStart(2, "0")}:00:00Z`);
      
      const isBusy = busy.some(b => {
        const bStart = new Date(b.start!);
        const bEnd = new Date(b.end!);
        return (slotStart < bEnd && slotEnd > bStart);
      });

      if (!isBusy) {
        slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
      }
    }

    res.json({ slots });
  } catch (error) {
    console.error("Calendar error:", error);
    res.status(500).json({ error: "Failed to fetch free slots" });
  }
});

app.post("/api/calendar/book", async (req, res) => {
  try {
    const { startTime, endTime, guestEmail, guestName } = req.body;
    const calendar = await getCalendarClient();

    const event = {
      summary: `Consultoria iCarus: ${guestName}`,
      description: `Reunião estratégica com especialista iCarus sobre o Project Mind Manager.`,
      start: { dateTime: startTime },
      end: { dateTime: endTime },
      attendees: [{ email: guestEmail }],
      reminders: { useDefault: true },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    res.json({ success: true, event: response.data });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ error: "Failed to book appointment" });
  }
});

// --- Vite Middleware ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile("dist/index.html", { root: "." }));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
