import "dotenv/config";
import { pool, schema } from "./db.js";
await pool.query(schema);
await pool.end();
console.log("Schema ready");
