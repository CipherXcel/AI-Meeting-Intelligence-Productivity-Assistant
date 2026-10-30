import { query } from "./db.js";

export async function noteCount(user: string) {
  const [row] = await query(
    "SELECT COUNT(*) AS count FROM documents WHERE user_id=$1",
    [user],
  );
  return Number(row.count);
}

export async function listNotes(user: string, offset = 0, limit = 12) {
  const totalNotes = await noteCount(user);
  const docs = await query(
    "SELECT id,title,content,version FROM documents WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3",
    [user, limit, offset],
  );
  const nextOffset = offset + docs.length;
  return {
    mode: "browse",
    totalNotes,
    results: docs.map((d) => ({
      id: d.id,
      title: d.title,
      version: d.version,
      content: d.content.slice(0, 1200),
      totalCharacters: d.content.length,
      truncated: d.content.length > 1200,
    })),
    hasMore: nextOffset < totalNotes,
    nextOffset: nextOffset < totalNotes ? nextOffset : null,
  };
}

export async function searchNotes(user: string, search: string) {
  const words = [
    ...new Set(search.toLowerCase().match(/[\p{L}\p{N}\p{M}]+/gu) || []),
  ].slice(0, 20);
  // Empty and wildcard-only searches browse the user's notes instead of
  // treating zero search terms as proof that their library is empty.
  if (!words.length) return listNotes(user);
  const totalNotes = await noteCount(user);
  const matches = words.map(
    (_, i) => `(LOWER(title) LIKE $${i + 2} OR LOWER(content) LIKE $${i + 2})`,
  );
  const score = words
    .map(
      (_, i) =>
        `(CASE WHEN LOWER(title) LIKE $${i + 2} THEN 2 ELSE 0 END + CASE WHEN LOWER(content) LIKE $${i + 2} THEN 1 ELSE 0 END)`,
    )
    .join(" + ");
  // Filter before limiting: older notes must remain searchable too.
  const docs = await query(
    `SELECT id,title,content,version,(${score}) AS score FROM documents WHERE user_id=$1 AND (${matches.join(" OR ")}) ORDER BY score DESC,created_at DESC,id DESC LIMIT 7`,
    [user, ...words.map((word) => `%${word}%`)],
  );
  return {
    mode: "search",
    query: search,
    totalNotes,
    results: docs.slice(0, 6).map((d) => {
      const positions = words
        .map((word) => d.content.toLowerCase().indexOf(word))
        .filter((at) => at >= 0);
      const start = Math.max(
        0,
        (positions.length ? Math.min(...positions) : 0) - 200,
      );
      return {
        ...d,
        content: d.content.slice(start, start + 2500),
        excerptOffset: start,
        totalCharacters: d.content.length,
        truncated: start > 0 || d.content.length > 2500,
      };
    }),
    hasMore: docs.length > 6,
    guidance: docs.length
      ? "Use read_note for the full source before detailed analysis."
      : totalNotes
        ? "No keyword matches. Saved notes exist; use list_notes to browse them or try different keywords."
        : "This account has no saved notes.",
  };
}
