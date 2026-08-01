const KEY = "fm-session-id";
const MIN_LEN = 32;

const generate = () => {
  // 43-char cryptographically random id (>= 32 chars required by RLS, ~256 bits entropy)
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id || id.length < MIN_LEN) {
    id = generate();
    localStorage.setItem(KEY, id);
  }
  return id;
};

