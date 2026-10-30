import "dotenv/config";
import { app } from "./app.js";
import { pool, schema } from "./db.js";
import { secret } from "./security.js";
secret();
if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is required");
if (
  process.env.NODE_ENV === "production" &&
  !process.env.PUBLIC_URL?.startsWith("https://")
)
  throw Error("PUBLIC_URL must use HTTPS in production");
await pool.query(schema);
const server = app.listen(Number(process.env.PORT) || 4000, () =>
  console.log("MeetAgent ready"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(async () => {
      await pool.end();
      process.exit(0);
    }),
  );
