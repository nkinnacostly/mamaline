// Sets a health worker's PIN (stored only as a hash). Run while the server is stopped:
//   npm run set-pin -- chew-amina 4821
import { weakPin } from "../src/auth.js";
import { getHealthWorker, healthWorkers } from "../src/directory.js";
import { createStore } from "../src/store.js";

const [id, pin] = process.argv.slice(2);
if (!id || !pin) {
  console.error("Usage: npm run set-pin -- <health worker id> <4-digit PIN>");
  console.error(`Health workers: ${healthWorkers.map((w) => w.id).join(", ")}`);
  process.exit(1);
}
if (!getHealthWorker(id)) {
  console.error(`No health worker with id "${id}". Known ids: ${healthWorkers.map((w) => w.id).join(", ")}`);
  process.exit(1);
}
if (weakPin(pin)) {
  console.error("Use 4 digits that are not repeated or in a run (not 1111, 1234 or 9876).");
  process.exit(1);
}
createStore().setPin(id, pin);
console.log(`PIN set for ${getHealthWorker(id).name}. Ask them to change it with option 4 after first sign-in.`);
