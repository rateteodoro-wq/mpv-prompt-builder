export default async function handler(req, res) {
    // Configuração de CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const apiKey = process.env.API_KEY; // A chave da conta certa que você configurou
        
        if (!apiKey) {
            return res.status(500).json({ error: "API_KEY não encontrada na Vercel." });
        }

        const { system_instruction, contents, generationConfig } = req.body;

        // URL para o modelo mais atual em 2026 usando v1beta (para suportar system_instruction)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
            // Se der erro de cota ou modelo, o erro aparecerá detalhado aqui
            return res.status(response.status).json({ error: data.error?.message || "Erro na API" });
        }

        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: "Erro interno no servidor: " + error.message });
    }
}
