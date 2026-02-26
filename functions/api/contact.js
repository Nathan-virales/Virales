export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    const { type, name, email, phone, message, company, cnpj, city, item, qty } = body;

    if (!type || !name || !email || !phone || !message) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando." }), { status: 400 });
    }

    const subject =
      type === "assistencia"
        ? `VIRALES • Garantia/Assistência • ${name}`
        : `VIRALES • Solicitação de Cotação • ${name}`;

    const content = `
Tipo: ${type}
Nome: ${name}
Email: ${email}
Telefone: ${phone}
Empresa: ${company || ""}
CNPJ: ${cnpj || ""}
Cidade: ${city || ""}
Item: ${item || ""}
Quantidade: ${qty || ""}

Mensagem:
${message}
`;

    const mailResponse = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        personalizations: [
          { to: [{ email: env.TO_EMAIL }] }
        ],
        from: {
          email: env.FROM_EMAIL,
          name: "Virales Site"
        },
        reply_to: {
          email: email,
          name: name
        },
        subject: subject,
        content: [
          { type: "text/plain", value: content }
        ]
      })
    });

    if (!mailResponse.ok) {
      return new Response(JSON.stringify({ error: "Erro ao enviar email." }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro interno." }), { status: 500 });
  }
}
