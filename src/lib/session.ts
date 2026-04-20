const KEY = "fm-session-id";

const generate = () => {
  // 24-char base36 random id (>= 16 chars required by RLS)
  const a = crypto.getRandomValues(new Uint32Array(4));
  return Array.from(a).map((n) => n.toString(36)).join("").slice(0, 24).padEnd(16, "x");
};

export const getSessionId = (): string => {
  if (typeof window === "undefined") return "server-session-id-xxxxx";
  let id = localStorage.getItem(KEY);
  if (!id || id.length < 16) {
    id = generate();
    localStorage.setItem(KEY, id);
  }
  return id;
};
