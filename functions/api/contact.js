export async function onRequest(context) {
  const { request, env } = context;

  // Headers padrão (JSON + CORS básico)
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "https://virales.com.br",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    }); 
  }

  try {
    // Lê o body 1x (JSON)
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "JSON inválido no body." }), {
        status: 400,
        headers,
      });
    }

    const {
      type,
      name,
      email,
      phone,
      message,
      company,
      cnpj,
      city,
      item,
      qty,
    } = body || {};

    // Normaliza strings (evita undefined quebrar)
    const _type = String(type ?? "").trim();
    const _name = String(name ?? "").trim();
    const _email = String(email ?? "").trim();
    const _phone = String(phone ?? "").trim();
    const _message = String(message ?? "").trim();
    const _company = String(company ?? "").trim();
    const _cnpj = String(cnpj ?? "").trim();
    const _city = String(city ?? "").trim();
    const _item = String(item ?? "").trim();
    const _qty = String(qty ?? "").trim();

    // Validação mínima
    if (!_type || !_name || !_email || !_phone || !_message) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando." }), {
        status: 400,
        headers,
      });
    }

    // Valida env (muito comum falhar aqui)
    if (!env?.TO_EMAIL || !env?.FROM_EMAIL) {
      console.error("ENV_MISSING", {
        hasTO: Boolean(env?.TO_EMAIL),
        hasFROM: Boolean(env?.FROM_EMAIL),
      });
      return new Response(
        JSON.stringify({ error: "Configuração de e-mail ausente (env)." }),
        { status: 500, headers }
      );
    }

    const subject =
      _type === "assistencia"
        ? `VIRALES • Garantia/Assistência • ${_name}`
        : `VIRALES • Solicitação de Cotação • ${_name}`;

    const content = `Tipo: ${_type}
Nome: ${_name}
Email: ${_email}
Telefone: ${_phone}
Empresa: ${_company}
CNPJ: ${_cnpj}
Cidade: ${_city}
Item: ${_item}
Quantidade: ${_qty}

Mensagem:
${_message}
`;

    const payload = {
      personalizations: [{ to: [{ email: env.TO_EMAIL }] }],
      from: { email: env.FROM_EMAIL, name: "Virales Site" },
      reply_to: { email: _email, name: _name },
      subject,
      content: [{ type: "text/plain", value: content }],
    };

    const mailResponse = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Log completo do Mailchannels (isso vai aparecer no Real-time Logs)
    const respText = await mailResponse.text();
    console.log("MAILCHANNELS_STATUS", mailResponse.status);
    console.log("MAILCHANNELS_RESPONSE", respText);

    if (!mailResponse.ok) {
      // Retorna erro com status e um resumo (sem expor payload)
      return new Response(
        JSON.stringify({
          error: "Erro ao enviar email.",
          provider_status: mailResponse.status,
        }),
        { status: 500, headers }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("CONTACT_INTERNAL_ERROR", error?.stack || error);
    return new Response(JSON.stringify({ error: "Erro interno." }), {
      status: 500,
      headers,
    });
  }
}
