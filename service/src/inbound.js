// Reads a mother's SMS reply to the consent request, or a STOP at any time.
// Includes common words for yes and no in Pidgin, Hausa (Eh / A'a), Yoruba (Beeni / Rara)
// and Igbo (Ee / Mba). Anything else is ignored rather than guessed.
const YES = new Set(["yes", "y", "yeah", "yep", "ok", "okay", "agree", "1", "eh", "ee", "ii", "beeni", "bee"]);
const NO = new Set(["no", "n", "2", "stop", "quit", "cancel", "unsubscribe", "end", "aa", "rara", "mba"]);

export function parseReply(text) {
  const word = String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)[0];
  if (!word) return null;
  if (YES.has(word) || (word === "i" && /agree/i.test(text))) return "yes";
  if (NO.has(word)) return "no";
  return null;
}

// Decides what an inbound SMS means for this sender. Returns an action for runActions, or null.
export function inboundAction({ from, text }, { store }) {
  const mother = store.findMother(from);
  const answer = parseReply(text);
  if (!mother || !answer) return null;
  const pending = mother.consent?.status === "pending";
  if (answer === "yes" && !pending) return null; // already agreed
  return { type: "consent", phone: from, answer, channel: "sms" };
}
