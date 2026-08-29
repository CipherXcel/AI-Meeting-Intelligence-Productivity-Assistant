import "dotenv/config";
import cors from "cors";
import express from "express";
import { getPool } from "./db/pool.js";
import { connectionRouter } from "./routes/connection.routes.js";
import { agentRoutes } from "./routes/agent.routes.js";
import storageRoutes from "./routes/storage.routes.js";
import { mountMcpServer } from "./mcp/mount.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const appOrigin = process.env.APP_URL ?? "http://localhost:3000";

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl) or matching APP_URL / EC2 IPs
      if (!origin || origin === appOrigin || origin.includes("13.201.189.129") || origin.includes("sslip.io") || origin.includes("localhost")) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  }),
);

app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

const handleHealth = async (_req: express.Request, res: express.Response) => {
  try {
    await getPool().query("SELECT 1");
    res.json({ status: "ok", service: "meetagent-backend", database: "up" });
  } catch {
    res.status(503).json({
      status: "error",
      service: "meetagent-backend",
      database: "down",
    });
  }
};

app.get("/health", handleHealth);
app.get("/api/health", handleHealth);

app.use("/api/connections", connectionRouter);
app.use("/api/agent", agentRoutes);
app.use("/api/storage", storageRoutes);

mountMcpServer(app);

app.listen(port, () => {
  console.log(`Agentic Calendar App is running on port: ${port}`);
});
