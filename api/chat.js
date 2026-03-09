export default async function handler(req, res) {
    // Configuração de CORS para o Frontend funcionar
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

        // O Gemini 3 brilha na v1beta
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

        const data = await response.json();

        if (!response.ok) {
            // Isso vai nos dizer se a cota do Gemini 3 está livre para sua chave
            return res.status(response.status).json({ error: data.error?.message || "Erro na API do Gemini 3" });
        }

        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: "Erro interno: " + error.message });
    }
}
