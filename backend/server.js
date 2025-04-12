import express from "express";
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import cors from 'cors';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'chunkindex', 'filename', 'totalchunks'],
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const uploadDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadDir);

// Endpoint to receive chunk
app.post('/upload-chunk', async (req, res) => {
  const { filename, chunkindex, totalChunks } = req.headers;

  const chunkData = [];

  req.on('data', chunk => chunkData.push(chunk));
  req.on('end', async () => {
    const buffer = Buffer.concat(chunkData);
    const chunkPath = path.join(uploadDir, `${filename}.part${chunkindex}`);
    await fs.writeFile(chunkPath, buffer);
    console.log(`Received chunk ${chunkindex} of ${filename}`);
    res.status(200).send('Chunk received');
  });
});

// Endpoint to merge chunks
app.post('/merge-chunks', async (req, res) => {
  const { filename, totalChunks } = req.body;
  const filePath = path.join(uploadDir, filename);
  const writeStream = fs.createWriteStream(filePath);

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(uploadDir, `${filename}.part${i}`);
    const data = await fs.readFile(chunkPath);
    writeStream.write(data);
    await fs.remove(chunkPath); // cleanup
  }

  writeStream.end();
  writeStream.on('finish', () => {
    res.status(200).send('File assembled');
    console.log(`✅ ${filename} assembled`);
  });
});

app.get('/', (req, res) => {
  res.send({
    message: 'File upload server is running',
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});