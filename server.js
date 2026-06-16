// server.js
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { getContentType } from "./contentType.js";
import { generateGoldPrice } from "./getGoldPrice.js";

const PORT = 8000;

// Keep ONE “current” price in memory so /api/price and /api/invest match
let currentPrice = generateGoldPrice();

// Update every ~3.5s to match your frontend polling interval
setInterval(() => {
    currentPrice = generateGoldPrice();
}, 3500);

const server = http.createServer(async (req, res) => {
    const __dirname = import.meta.dirname;
    const publicDir = path.join(__dirname, "public");

    // Parse URL safely (handles query strings)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // --------------------
    // API: /api/price
    // --------------------
    if (pathname === "/api/price") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ price: currentPrice }));
        return;
    }

    // --------------------
    // API: /api/invest?amount=...
    // --------------------
    if (pathname === "/api/invest") {
        const amountRaw = url.searchParams.get("amount");
        const amount = Number(amountRaw);

        if (!Number.isFinite(amount) || amount <= 0) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(
                JSON.stringify({
                    error: "Invalid amount. Use ?amount=NUMBER greater than 0.",
                })
            );
            return;
        }

        // IMPORTANT: buy at the SAME price the user sees
        const price = currentPrice;
        const ounces = Math.round((amount / price) * 10000) / 10000; // 4 decimals

        const receipt = {
            amount,
            price,
            ounces,
            timestamp: new Date().toISOString(),
        };

        // Log purchase (append one line)
        const logLine =
            `${receipt.timestamp} | amount=${receipt.amount} | ` +
            `price=${receipt.price} | ounces=${receipt.ounces}\n`;

        await fs.appendFile("purchases.txt", logLine);

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(receipt));
        return;
    }

    // Unknown API route
    if (pathname.startsWith("/api/")) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "API route not found" }));
        return;
    }

    // --------------------
    // Static files
    // --------------------
    const safePath = pathname === "/" ? "/index.html" : pathname;

    // Prevent ../ path traversal
    const filePath = path.normalize(path.join(publicDir, safePath));
    if (!filePath.startsWith(publicDir)) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "text/plain");
        res.end("Forbidden");
        return;
    }

    const ext = path.extname(filePath);
    const contentType = getContentType(ext);

    try {
        const content = await fs.readFile(filePath);
        res.statusCode = 200;
        res.setHeader("Content-Type", contentType);
        res.end(content);
    } catch (err) {
        if (err.code === "ENOENT") {
            const notFoundPage = await fs.readFile(path.join(publicDir, "404.html"));
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/html");
            res.end(notFoundPage);
            return;
        }

        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain");
        res.end("Server error");
    }
});

server.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
);