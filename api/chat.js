export default async function handler(req, res) {
    // CORS - Essencial para a Vercel não bloquear o seu Frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const apiKey = process.env.API_KEY; 
        
        if (!apiKey) {
            return res.status(500).json({ error: "API_KEY não configurada no painel da Vercel." });
        }

        const { system_instruction, contents, generationConfig } = req.body;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
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
            console.error("Erro retornado pelo Google:", data);
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error("Erro interno na função:", error.message);
        return res.status(500).json({ error: "Erro na API: " + error.message });
    }
}
