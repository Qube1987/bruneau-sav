import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
    question: string;
    system_brand?: string;
    system_model?: string;
    system_type?: string;
    problem_desc?: string;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 200,
            headers: corsHeaders,
        });
    }

    try {
        const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

        if (!anthropicApiKey) {
            throw new Error("ANTHROPIC_API_KEY is not configured");
        }

        const { question, system_brand, system_model, system_type, problem_desc }: RequestBody = await req.json();

        if (!question || question.trim() === "") {
            return new Response(
                JSON.stringify({ error: "La question est vide" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Build context about the system
        let systemContext = "";
        if (system_brand || system_model) {
            systemContext = `Centrale/Système : ${[system_brand, system_model].filter(Boolean).join(" ")}`;
        }
        if (system_type) {
            const typeLabels: Record<string, string> = {
                ssi: "Alarme incendie type SSI",
                type4: "Alarme évacuation type 4",
                intrusion: "Alarme intrusion",
                video: "Vidéosurveillance",
                controle_acces: "Contrôle d'accès",
                interphone: "Interphone",
                portail: "Portail",
                autre: "Autre",
            };
            systemContext += `\nType de système : ${typeLabels[system_type] || system_type}`;
        }
        if (problem_desc) {
            systemContext += `\nDescription du problème initial : ${problem_desc}`;
        }

        const systemPrompt = `Tu es un expert technique en systèmes de sécurité électronique (alarme intrusion, alarme incendie SSI, vidéosurveillance, contrôle d'accès, interphone, portail automatique, domotique).

Tu aides les techniciens de terrain à résoudre leurs problèmes techniques.

Tes réponses doivent être :
- Précises et concrètes (étapes à suivre, codes de programmation, manipulations)
- Adaptées au matériel mentionné (marque, modèle)
- Pratiques et orientées terrain
- Concises mais complètes
- En français

Si tu ne connais pas la réponse exacte pour un modèle spécifique, donne des pistes générales et recommande de consulter la documentation constructeur.

${systemContext ? `\nContexte du SAV :\n${systemContext}` : ""}`;

        const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "x-api-key": anthropicApiKey,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 2000,
                system: systemPrompt,
                messages: [
                    {
                        role: "user",
                        content: question,
                    },
                ],
            }),
        });

        if (!anthropicResponse.ok) {
            const errorText = await anthropicResponse.text();
            console.error("Anthropic API error - Status:", anthropicResponse.status);
            console.error("Anthropic API error - Response:", errorText);
            throw new Error(`Erreur Anthropic (${anthropicResponse.status}): ${errorText}`);
        }

        const data = await anthropicResponse.json();
        const answer = data.content?.[0]?.text?.trim();

        if (!answer) {
            throw new Error("Aucune réponse générée par l'IA");
        }

        return new Response(
            JSON.stringify({ answer }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (error) {
        console.error("Error in ai-technical-assistant function:", error);

        return new Response(
            JSON.stringify({
                error: "L'assistant IA n'a pas pu répondre. Merci de réessayer.",
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
