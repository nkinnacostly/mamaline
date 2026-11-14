// Sends SMS through Africa's Talking when credentials are set; otherwise records the
// message in the store's outbox so the simulator can show it as a received SMS.
// API reference: https://developers.africastalking.com/docs/sms/sending

export function smsMode() {
  return process.env.AT_API_KEY && process.env.AT_USERNAME ? "africastalking" : "simulated";
}

// Sample and demo records use +2348000000xxx; never send real SMS to that range.
const DEMO_RANGE = "+2348000000";

export async function sendSms(store, { to, message, kind = "info" }) {
  if (smsMode() !== "africastalking" || to.startsWith(DEMO_RANGE)) {
    console.log(`[sms -> ${to}] ${message}`);
    return store.addOutbox({ to, message, kind, status: "simulated" });
  }
  const record = store.addOutbox({ to, message, kind, status: "queued" });

  const sandbox = (process.env.AT_ENV ?? "sandbox") === "sandbox";
  const url = sandbox
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";
  const body = new URLSearchParams({ username: process.env.AT_USERNAME, to, message });
  if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apiKey: process.env.AT_API_KEY,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    store.updateOutbox(record.id, { status: res.ok ? "sent" : `failed (${res.status})` });
    if (!res.ok) console.error(`[sms] Africa's Talking returned ${res.status}: ${await res.text()}`);
  } catch (error) {
    store.updateOutbox(record.id, { status: "failed (network)" });
    console.error(`[sms] ${error.message}`);
  }
  return record;
}
