import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure the server can read the .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Main Gemini API handler
app.post('/api/chat', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;

        if (!apiKey) {
            console.error("API_KEY not found in environment variables.");
            return res.status(500).json({ error: "API_KEY não configurada no servidor." });
        }

        const { system_instruction, contents, generationConfig } = req.body;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction,
                    contents,
                    generationConfig
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            return res.status(response.status).json({ error: errorData.error?.message || "Erro na API do Gemini" });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Internal Server Error:", error);
        res.status(500).json({ error: "Erro interno do servidor ao conectar com Gemini." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
});
