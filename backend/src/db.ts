import pg from "pg";
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
// Idle connection failures must not terminate unrelated HTTP requests.
// pg-pool removes the failed client and opens a replacement when needed.
pool.on("error", () => {
  console.warn("An idle database connection closed; it will be replaced on demand.");
});
export const schema = `
CREATE TABLE IF NOT EXISTS users(id UUID PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,name TEXT NOT NULL,timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',duration INTEGER NOT NULL DEFAULT 30);
CREATE TABLE IF NOT EXISTS sessions(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,hash TEXT UNIQUE NOT NULL,expires TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS diary_vaults(user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,salt TEXT NOT NULL,wrapped_key TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS diary_grants(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,vault_salt TEXT NOT NULL,token_hash TEXT NOT NULL,key_box TEXT NOT NULL,remember BOOLEAN NOT NULL DEFAULT FALSE,ai_allowed BOOLEAN NOT NULL DEFAULT FALSE,expires TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS diary_entries(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,payload TEXT NOT NULL,trashed BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS diary_owner ON diary_entries(user_id);
CREATE TABLE IF NOT EXISTS threads(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,summary TEXT NOT NULL DEFAULT '',summary_count INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS messages(id UUID PRIMARY KEY,thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,role TEXT NOT NULL,content TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS connections(user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,tokens TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS oauth_states(state TEXT PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,verifier TEXT NOT NULL,expires TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS documents(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,content TEXT NOT NULL,storage_key TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,version INTEGER NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS document_folders(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW(),UNIQUE(user_id,name));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS tasks(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'todo',due DATE,source_id UUID REFERENCES documents(id) ON DELETE SET NULL,created_at TIMESTAMPTZ DEFAULT NOW());
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS details TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS note_ids UUID[] NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS proposals(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,payload JSONB NOT NULL,status TEXT NOT NULL DEFAULT 'pending',result JSONB,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS tool_runs(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,tool TEXT NOT NULL,args JSONB NOT NULL,result JSONB NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS focus_sessions(id UUID PRIMARY KEY,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,goal_minutes INTEGER NOT NULL,save_task BOOLEAN NOT NULL DEFAULT FALSE,started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),ended_at TIMESTAMPTZ,task_id UUID REFERENCES tasks(id) ON DELETE SET NULL);
ALTER TABLE focus_sessions ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'timed';
CREATE UNIQUE INDEX IF NOT EXISTS one_active_focus_per_user ON focus_sessions(user_id) WHERE ended_at IS NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}';
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES threads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS proposals_thread_owner ON proposals(user_id,thread_id);
`;
export async function query(sql: string, args: unknown[] = []) {
  return (await pool.query(sql, args)).rows;
}
export async function owned(
  table: "threads" | "documents" | "proposals" | "tasks",
  id: string,
  user: string,
) {
  const [row] = await query(
    `SELECT * FROM ${table} WHERE id=$1 AND user_id=$2`,
    [id, user],
  );
  if (!row) throw Object.assign(new Error("Not found"), { status: 404 });
  return row;
}
