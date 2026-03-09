export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) return res.status(500).json({ error: "API_KEY não configurada." });

        const { system_instruction, contents, generationConfig } = req.body;

        // ESTRATÉGIA COMPATÍVEL:
        // Se houver uma instrução de sistema, nós a colocamos como a primeira mensagem 
        // para que a versão 'v1' da API aceite sem reclamar de "Unknown field".
        const finalContents = [...contents];
        if (system_instruction && system_instruction.parts) {
            finalContents.unshift({
                role: "user",
                parts: [{ text: `INSTRUÇÕES DE SISTEMA: ${system_instruction.parts[0].text}` }]
            });
            finalContents.splice(1, 0, {
                role: "model",
                parts: [{ text: "Entendido. Seguirei essas instruções rigorosamente." }]
            });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    contents: finalContents, 
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
