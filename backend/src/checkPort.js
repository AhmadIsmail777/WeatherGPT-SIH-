import net from "node:net";

import config from "./config.js";

const probe = net.createServer();

probe.once("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error("Port " + config.port + " is already in use. Stop the existing process or set another PORT in backend/.env.");
    process.exit(1);
  }
  console.error("Could not check port " + config.port + ": " + error.message);
  process.exit(1);
});

probe.listen(config.port, config.host, () => {
  probe.close(() => process.exit(0));
});
