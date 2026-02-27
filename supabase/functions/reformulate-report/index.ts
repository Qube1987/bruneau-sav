import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  rapport_brut: string;
  type?: 'rapport' | 'description';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { rapport_brut, type = 'rapport' }: RequestBody = await req.json();

    if (!rapport_brut || rapport_brut.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Le rapport brut est vide" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let prompt: string;

    if (type === 'description') {
      prompt = `Tu es un technicien expert en systèmes de sécurité
(alarme intrusion, vidéosurveillance, contrôle d'accès, domotique).

Ta mission est de reformuler la description du problème ci-dessous pour qu'elle soit :
- professionnelle
- claire
- précise
- sans fautes d'orthographe ou de grammaire
- rédigée à l'infinitif ou au présent (pas au passé)
- factuelle et neutre
- axée sur le problème à résoudre (pas sur l'intervention effectuée)

Contraintes absolues :
- Ne rajoute aucune information
- Ne supprime aucune information
- Ne fais aucune conclusion commerciale
- Ne fais aucune supposition
- Respecte strictement les faits décrits
- Garde la forme infinitive ou présent (ex: "Remplacer la pile", "Le clavier ne fonctionne plus")
- NE TRANSFORME PAS en passé (évite "a été remplacé", "a été fait", etc.)
- Ne rajoute rien devant la description. Tu ne réponds que par la description reformulée, rien d'autre.

Description du problème :
"""
${rapport_brut}
"""`;
    } else {
      prompt = `Tu es un technicien expert en systèmes de sécurité
(alarme intrusion, vidéosurveillance, contrôle d'accès, domotique).

Ta mission est de reformuler le rapport ci-dessous pour qu'il soit :
- professionnel
- clair
- précis
- sans fautes d'orthographe ou de grammaire
- juridiquement exploitable
- rédigé au vouvoiement
- factuel et neutre

Contraintes absolues :
- Ne rajoute aucune information
- Ne supprime aucune information
- Ne fais aucune conclusion commerciale
- Ne fais aucune supposition
- Respecte strictement les faits décrits
- Ne rajoute rien devant le rapport. Tu ne réponds que par le rapport reformulé, rien d'autre.

Rapport brut :
"""
${rapport_brut}
"""`;
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Tu es un assistant expert en reformulation de rapports techniques pour le secteur de la sécurité électronique."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error - Status:", openaiResponse.status);
      console.error("OpenAI API error - Response:", errorText);
      throw new Error(`Erreur OpenAI (${openaiResponse.status}): ${errorText}`);
    }

    const data = await openaiResponse.json();
    const rapport_reformule = data.choices[0]?.message?.content?.trim();

    if (!rapport_reformule) {
      throw new Error("Aucune réponse générée par l'IA");
    }

    return new Response(
      JSON.stringify({ rapport_reformule }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in reformulate-report function:", error);
    
    return new Response(
      JSON.stringify({
        error: "La reformulation n'a pas pu être effectuée. Merci de réessayer."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});