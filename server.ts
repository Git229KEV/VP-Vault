import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route: Scrape Metadata
  app.post("/api/scrape", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const { data: html } = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        timeout: 8000,
      });

      const $ = cheerio.load(html);

      // Extract Title
      const title =
        $('meta[property="og:title"]').attr("content") ||
        $('meta[name="twitter:title"]').attr("content") ||
        $('meta[property="og:site_name"]').attr("content") ||
        $("title").text() ||
        url;

      // Extract Image (Thumbnail)
      let image =
        $('meta[property="og:image:secure_url"]').attr("content") ||
        $('meta[property="og:image"]').attr("content") ||
        $('meta[name="twitter:image"]').attr("content") ||
        $('meta[property="og:video:thumbnail"]').attr("content") ||
        $('meta[name="thumbnail"]').attr("content") ||
        $('link[rel="image_src"]').attr("href");

      // If no OG image, try to find a large enough image in the body
      if (!image) {
        const potentialImages: string[] = [];
        $("img").each((_, el) => {
          const src = $(el).attr("src");
          if (src && (src.startsWith("http") || src.startsWith("//"))) {
            potentialImages.push(src.startsWith("//") ? `https:${src}` : src);
          }
        });
        image = potentialImages[0] || "";
      }

      // Ensure relative paths are handled
      if (image && !image.startsWith("http") && !image.startsWith("//")) {
         try {
           const baseUrl = new URL(url);
           image = new URL(image, baseUrl.origin).href;
         } catch(e) {}
      }

      res.json({
        title: title.trim(),
        image,
        url,
      });
    } catch (error: any) {
      console.warn("Scraping partially failed for:", url, error.message);
      // Return a graceful fallback instead of 500
      res.json({ 
        title: url, 
        image: `https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=600&h=400`,
        url,
        isFallback: true
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
