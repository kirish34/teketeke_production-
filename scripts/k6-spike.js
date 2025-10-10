import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';
const AUTH_TOKEN  = __ENV.AUTH_TOKEN  || ''; // optional Bearer for /u/*

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // ramp up
        { duration: '60s', target: 100 },  // push
        { duration: '30s', target: 100 },  // hold
        { duration: '30s', target: 0 },    // ramp down
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],    // allow up to 2% during spike
    http_req_duration: ['p(95)<800'],  // 95% under 800ms under load
  },
};

const t_health = new Trend('t_health');
const t_public = new Trend('t_public');
const t_admin  = new Trend('t_admin');
const t_member = new Trend('t_member');
const errRate  = new Rate('errors');

function jget(path, headers = {}) {
  return http.get(`${BASE_URL}${path}`, { headers });
}

export default function () {
  // health probes
  let r = jget('/ping');
  t_health.add(r.timings.duration);
  check(r, { 'ping 200': (res) => res.status === 200 && String(res.body || '').includes('pong') }) || errRate.add(1);

  r = jget('/__version');
  t_health.add(r.timings.duration);
  check(r, { 'version 200': (res) => res.status === 200 && res.json('name') && res.json('version') }) || errRate.add(1);

  // public
  r = jget('/api/public/saccos');
  t_public.add(r.timings.duration);
  check(r, { 'public saccos 200': (res) => res.status === 200 }) || errRate.add(1);

  // admin (requires x-admin-token)
  if (ADMIN_TOKEN) {
    r = jget('/api/admin/saccos?limit=5', { 'x-admin-token': ADMIN_TOKEN });
    t_admin.add(r.timings.duration);
    check(r, { 'admin saccos 200': (res) => res.status === 200 }) || errRate.add(1);
  }

  // member (/u/*) (requires bearer)
  if (AUTH_TOKEN) {
    r = jget('/u/my-saccos', { Authorization: `Bearer ${AUTH_TOKEN}` });
    t_member.add(r.timings.duration);
    const ok = r.status === 200;
    check(r, { 'u/my-saccos 200': () => ok }) || errRate.add(1);

    if (ok) {
      const items = r.json('items') || [];
      if (items.length) {
        const saccoId = items[0].sacco_id || items[0].id;
        const s = jget(`/u/sacco/${saccoId}/summary?date=${new Date().toISOString().slice(0,10)}`, { Authorization: `Bearer ${AUTH_TOKEN}` });
        t_member.add(s.timings.duration);
        check(s, { 'u summary 200': () => s.status === 200 }) || errRate.add(1);
      }
    }
  }

  // light pause keeps requests rolling without perfect sync
  sleep(Math.random() * 0.3);
}

