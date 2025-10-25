import axios from 'axios';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const getHeader = (h, n) => Object.keys(h||{}).find(k => k.toLowerCase()===n.toLowerCase())?.let?.() || (()=>{ const k=Object.keys(h||{}).find(k=>k.toLowerCase()===n.toLowerCase()); return k? h[k]:undefined; })();

export async function createAndConfirmOrder(event){
  const headers = event.headers || {};
  const correlationId = (Object.keys(headers).find(k=>k.toLowerCase()==='x-correlation-id') ? headers[Object.keys(headers).find(k=>k.toLowerCase()==='x-correlation-id')] : `corr-${Date.now()}`);

  const baseCustomers = process.env.CUSTOMERS_API_BASE || 'http://localhost:3001';
  const baseOrders    = process.env.ORDERS_API_BASE    || 'http://localhost:3002';
  const serviceToken  = process.env.SERVICE_TOKEN       || 'service-secret-123';

  let body;
  try {
    body = JSON.parse(event.body || '{}');
    if(typeof body.customer_id !== 'number' || !Array.isArray(body.items) || body.items.length===0){
      return { statusCode: 400, headers: { 'content-type': 'application/json', 'x-correlation-id': correlationId }, body: JSON.stringify({ success:false, error:'bad_request' }) };
    }
  } catch {
    return { statusCode: 400, headers: { 'content-type': 'application/json', 'x-correlation-id': correlationId }, body: JSON.stringify({ success:false, error:'bad_json' }) };
  }

  const http = axios.create({ timeout: 7000, headers: { 'x-correlation-id': correlationId } });

  try {
    // 1) Validar cliente
    const cust = await http.get(`${baseCustomers}/internal/customers/${body.customer_id}`, { headers: { Authorization: `Bearer ${serviceToken}` }});

    // 2) Crear orden
    const created = await http.post(`${baseOrders}/orders`, { customer_id: body.customer_id, items: body.items }, { headers: { Authorization: `Bearer ${serviceToken}` }});

    // 3) Confirmar con idempotencia
    const idemKey = (Object.keys(headers).find(k=>k.toLowerCase()==='idempotency-key') ? headers[Object.keys(headers).find(k=>k.toLowerCase()==='idempotency-key')] : (Object.keys(headers).find(k=>k.toLowerCase()==='x-idempotency-key') ? headers[Object.keys(headers).find(k=>k.toLowerCase()==='x-idempotency-key')] : `idem-${created.data.id}`));
    const confirmed = await http.post(`${baseOrders}/orders/${created.data.id}/confirm`, {}, { headers: { Authorization: `Bearer ${serviceToken}`, 'Idempotency-Key': idemKey }});

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'x-correlation-id': correlationId },
      body: JSON.stringify({ success:true, correlation_id: correlationId, idempotency_key: idemKey, customer: cust.data, order: confirmed.data })
    };
  } catch (err){
    const status = err?.response?.status || 502;
    const data   = err?.response?.data   || { error:'upstream_error' };
    logger.error({ status, data, correlationId }, 'orchestrator_error');
    const mapped = status===404?404: status===409?409: (status>=400&&status<500)?400:502;
    return { statusCode: mapped, headers: { 'content-type': 'application/json', 'x-correlation-id': correlationId }, body: JSON.stringify({ success:false, error: data.error || 'orchestrator_failed', details: data }) };
  }
}