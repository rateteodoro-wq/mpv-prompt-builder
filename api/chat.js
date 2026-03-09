export default async function handler(req, res) {
    // Configuração de CORS para permitir que seu site fale com a API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responde rapidamente a requisições de pre-flight do navegador
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const apiKey = process.env.API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: "API_KEY não configurada no painel da Vercel." });
        }

        const { system_instruction, contents, generationConfig } = req.body;

        // Usando v1 e gemini-1.5-flash-latest para máxima compatibilidade
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
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
            // Captura o erro detalhado do Google para mostrar no seu chat
            const errorMessage = data.error?.message || "Erro desconhecido na API do Google";
            console.error("Erro Google:", errorMessage);
            return res.status(response.status).json({ error: errorMessage });
        }

        // Retorna o sucesso para o frontend
        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro Servidor:", error.message);
        return res.status(500).json({ error: "Erro interno no servidor: " + error.message });
    }
}
