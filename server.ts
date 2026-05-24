import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initSocketIO } from "./src/lib/socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling request", err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = initSocketIO(httpServer);
  console.log("[Socket.io] Initialized on HTTP server");

  httpServer.listen(port, hostname, () => {
    console.log(`✓ Prowider server ready at http://${hostname}:${port}`);
    console.log(`✓ Socket.io listening on /api/socket`);
  });
});