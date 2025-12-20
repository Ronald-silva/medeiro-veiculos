import { sql } from '@vercel/postgres';

// POST - Criar novo lead
export async function POST(request) {
  try {
    const leadData = await request.json();

    const result = await sql`
      INSERT INTO leads (
        conversation_id,
        nome,
        whatsapp,
        email,
        orcamento,
        tipo_carro,
        forma_pagamento,
        urgencia,
        veiculos_interesse,
        observacoes,
        score,
        status,
        created_at
      ) VALUES (
        ${leadData.conversationId || crypto.randomUUID()},
        ${leadData.nome},
        ${leadData.whatsapp},
        ${leadData.email || null},
        ${leadData.orcamento || ''},
        ${leadData.tipoCarro || ''},
        ${leadData.formaPagamento || ''},
        ${leadData.urgencia || 'media'},
        ${JSON.stringify(leadData.veiculosInteresse || [])},
        ${leadData.observacoes || ''},
        ${leadData.score || 50},
        'novo',
        NOW()
      )
      RETURNING *
    `;

    return new Response(
      JSON.stringify({ success: true, lead: result.rows[0] }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating lead:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// GET - Listar leads (com paginação e filtros)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const status = searchParams.get('status');
    const minScore = parseInt(searchParams.get('minScore')) || 0;

    const offset = (page - 1) * limit;

    let query = sql`
      SELECT *
      FROM leads
      WHERE score >= ${minScore}
    `;

    if (status) {
      query = sql`${query} AND status = ${status}`;
    }

    query = sql`
      ${query}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const result = await query;

    // Conta total para paginação
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM leads
      WHERE score >= ${minScore}
      ${status ? sql`AND status = ${status}` : sql``}
    `;

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return new Response(
      JSON.stringify({
        success: true,
        leads: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching leads:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
