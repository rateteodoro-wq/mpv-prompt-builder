export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const apiKey = process.env.API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: "API_KEY não configurada na Vercel." });
        }

        const { system_instruction, contents, generationConfig } = req.body;

        // Voltamos para v1beta porque ela aceita o campo "system_instruction"
        // E usamos o nome de modelo "gemini-1.5-flash" (sem o -latest aqui)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || "Erro na API" });
        }

        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: "Erro interno: " + error.message });
    }
}
