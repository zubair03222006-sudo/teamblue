import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Custom plugin to save generated images and data to the local file system
const localDataPlugin = () => ({
  name: 'local-data-plugin',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      // Endpoint to save generated Lookbook outfit (downloads image from URL)
      if (req.url === '/api/save-local-lookbook' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            let image_url = null;

            if (data.imageUrl) {
              const fetch = (await import('node-fetch')).default || globalThis.fetch;
              const imgRes = await fetch(data.imageUrl);
              const buffer = Buffer.from(await imgRes.arrayBuffer());
              
              const publicDir = path.resolve(__dirname, 'public/generated');
              if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
              
              const filename = `lookbook-${Date.now()}.png`;
              fs.writeFileSync(path.join(publicDir, filename), buffer);
              image_url = `/generated/${filename}`;
            }

            const dataFile = path.resolve(__dirname, `src/data/local-lookbook.json`);
            let items = [];
            if (fs.existsSync(dataFile)) {
              items = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
            }
            
            const newItem = {
              id: Date.now().toString(),
              name: `${data.occasion || 'Outfit'} - ${data.season || ''}`,
              occasion: data.occasion,
              season: data.season,
              palette: data.palette,
              vibe: data.vibe,
              ai_generated_text: data.text,
              image_url,
              created_at: new Date().toISOString()
            };
            
            items.unshift(newItem);
            fs.writeFileSync(dataFile, JSON.stringify(items, null, 2));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, item: newItem }));
          } catch (e) {
            console.error(e);
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }
      
      // Endpoint to upload local image to Wardrobe
      if (req.url === '/api/save-local-wardrobe' && req.method === 'POST') {
        // Handle form data manually or just use simple JSON if image is base64
        // To keep it simple, let's assume the frontend sends the image as a base64 string
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            let image_url = null;

            if (data.imageBase64) {
              const base64Data = data.imageBase64.replace(/^data:image\/\w+;base64,/, "");
              const buffer = Buffer.from(base64Data, 'base64');
              
              const publicDir = path.resolve(__dirname, 'public/generated');
              if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
              
              const filename = `wardrobe-${Date.now()}.png`;
              fs.writeFileSync(path.join(publicDir, filename), buffer);
              image_url = `/generated/${filename}`;
            }

            const dataFile = path.resolve(__dirname, `src/data/local-wardrobe.json`);
            let items = [];
            if (fs.existsSync(dataFile)) {
              items = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
            }
            
            const newItem = {
              id: Date.now().toString(),
              name: data.name,
              category: data.category,
              color: data.color,
              brand: data.brand,
              season: data.season,
              notes: data.notes,
              image_url,
              tags: [],
              favorite: false,
              created_at: new Date().toISOString()
            };
            
            items.unshift(newItem);
            fs.writeFileSync(dataFile, JSON.stringify(items, null, 2));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, item: newItem }));
          } catch (e) {
            console.error(e);
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }
      next();
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), localDataPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
