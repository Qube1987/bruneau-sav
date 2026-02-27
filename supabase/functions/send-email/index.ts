import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  attachmentBase64?: string;
  attachmentName?: string;
  signatureBase64?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, subject, body, attachmentBase64, attachmentName, signatureBase64 }: EmailRequest = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "Email service not configured. Please add RESEND_API_KEY to Edge Functions secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Convert line breaks to HTML <br> tags
    const bodyWithBreaks = body.replace(/\n/g, '<br>');

    // Prepare HTML email with signature
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div>${bodyWithBreaks}</div>
          ${signatureBase64 ? `<img src="data:image/png;base64,${signatureBase64}" alt="Signature" style="max-width: 300px; margin-top: 20px;" />` : ""}
        </body>
      </html>
    `;

    // Prepare Resend API request
    let fromEmail = Deno.env.get("RESEND_FROM_EMAIL")?.trim() || "";

    // Validate email format - must be "email@domain.com" or "Name <email@domain.com>"
    const emailRegex = /^([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|.+<[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}>)$/;

    if (!fromEmail || !emailRegex.test(fromEmail)) {
      console.log(`Invalid RESEND_FROM_EMAIL: "${fromEmail}". Using default.`);
      fromEmail = "Bruneau Protection <info@bruneau27.com>";
    }

    console.log("Using from email:", fromEmail);

    const resendPayload: any = {
      from: fromEmail,
      to: [to],
      cc: ["info@bruneau27.com"],
      subject: subject,
      html: htmlBody,
    };

    // Add PDF attachment if provided
    if (attachmentBase64 && attachmentName) {
      resendPayload.attachments = [
        {
          filename: attachmentName,
          content: attachmentBase64,
        },
      ];
    }

    console.log("Sending email to:", to);
    console.log("Email payload size:", JSON.stringify(resendPayload).length, "bytes");
    console.log("Attachment size:", attachmentBase64 ? attachmentBase64.length : 0, "bytes");

    // Send email via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error status:", resendResponse.status);
      console.error("Resend API error data:", JSON.stringify(resendData, null, 2));

      let errorMessage = "Failed to send email";

      if (resendResponse.status === 403 && resendData.message?.includes("testing emails")) {
        errorMessage = "Resend est en mode test. Pour envoyer des emails à des clients, vous devez :\n\n" +
          "1. Vérifier un domaine sur resend.com/domains\n" +
          "2. Configurer RESEND_FROM_EMAIL avec une adresse de ce domaine\n\n" +
          "Pour tester maintenant, envoyez uniquement à : quentin@bruneau27.com";
      } else if (resendResponse.status === 422) {
        if (resendData.message) {
          errorMessage = `Erreur de validation: ${resendData.message}`;
        } else {
          errorMessage = "Validation échouée. Vérifiez l'adresse email et la taille de la pièce jointe.";
        }
      } else if (resendData.message) {
        errorMessage = resendData.message;
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          details: resendData,
          status: resendResponse.status,
        }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Email sent successfully:", resendData);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: resendData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});