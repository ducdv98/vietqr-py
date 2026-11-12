// Runs once when the server starts (dev and `next start`): invalid env fails fast here.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getConfig } = await import("@/lib/config/server");
    getConfig();
  }
}
