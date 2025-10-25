import axios from 'axios';

function pickIdem(headers = {}) {
  return headers['idempotency-key']
      || headers['Idempotency-Key']
      || headers['x-idempotency-key']
      || headers['X-Idempotency-Key']
      || null;
}
function pickCorr(headers = {}) {
  return headers['x-correlation-id']
      || headers['X-Correlation-Id']
      || `corr-${Date.now()}`;
}

export async function createAndConfirmOrder(event) {
  const headers = event?.headers || {};
  const correlationId = pickCorr(headers);
  const idemKey = pickIdem(headers) || `idem-${Date.now()}`;

  let payload = {};
  try { payload = JSON.parse(event?.body || '{}'); } catch {}
  const customer_id = Number(payload.customer_id);
  const items = Array.isArray(payload.items) ? payload.items : [];

  const CUSTOMERS = process.env.CUSTOMERS_API_BASE || 'http://localhost:3001';
  const ORDERS    = process.env.ORDERS_API_BASE    || 'http://localhost:3002';
  const TOKEN     = process.env.SERVICE_TOKEN      || 'service-secret-123';

  if (!Number.isFinite(customer_id) || items.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId },
      body: JSON.stringify({ success:false, error:'bad_request' })
    };
  }

  try {
    // 1) Validar cliente (endpoint interno + token de servicio)
    const custRes = await axios.get(
      `${CUSTOMERS}/internal/customers/${customer_id}`,
      { headers: { 'Authorization': `Bearer ${TOKEN}`, 'X-Correlation-Id': correlationId } }
    );

    // 2) Crear orden
    const createRes = await axios.post(
      `${ORDERS}/orders`,
      { customer_id, items },
      { headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId } }
    );
    const orderId = createRes.data.id;

    // 3) Confirmar orden (idempotente)
    const confirmRes = await axios.post(
      `${ORDERS}/orders/${orderId}/confirm`,
      {},
      { headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Idempotency-Key': idemKey,
          'X-Correlation-Id': correlationId
        } }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId },
      body: JSON.stringify({
        success: true,
        correlation_id: correlationId,
        idempotency_key: idemKey,
        customer: custRes.data,
        order: confirmRes.data
      })
    };
  } catch (err) {
    const status = err.response?.status || 500;
    const data   = err.response?.data   || { message: err.message };
    const url    = err.config?.url;
    console.error('orchestrator_error', { url, status, data });
    return {
      statusCode: status,
      headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': correlationId },
      body: JSON.stringify({ success:false, error:'orchestrator_error', details:data })
    };
  }
}
