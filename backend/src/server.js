import app from "./app.js";
import config from "./config.js";
import { connectDatabase } from "./db.js";
import { seedAlerts } from "./services/alertService.js";

try {
  await connectDatabase();
  await seedAlerts();
  const server = app.listen(config.port, config.host, () => console.log(`WeatherGPT MERN API listening on http://localhost:${config.port}`));
  server.on("error", (error) => {
    console.error(`HTTP server error: ${error.message}`);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
