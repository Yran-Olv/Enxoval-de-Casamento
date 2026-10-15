import test from "node:test";
import assert from "node:assert/strict";
import { getSaoPauloDateString } from "../server/notifications/email";

test("getSaoPauloDateString calcula corretamente a data no fuso de São Paulo (UTC-3)", () => {
  // Teste 1: 02:00 UTC do dia 16/10 é 23:00 do dia 15/10 em São Paulo
  const utcLate = new Date("2026-10-16T02:00:00Z");
  assert.equal(getSaoPauloDateString(utcLate), "2026-10-15");

  // Teste 2: 03:00 UTC do dia 16/10 é exatamente 00:00 do dia 16/10 em São Paulo
  const utcExactMidnight = new Date("2026-10-16T03:00:00Z");
  assert.equal(getSaoPauloDateString(utcExactMidnight), "2026-10-16");

  // Teste 3: Formato YYYY-MM-DD
  const today = getSaoPauloDateString();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});

test("simulação de limite diário de e-mails bloqueia quando atinge o teto e renova no dia seguinte", () => {
  const store = new Map<string, number>();
  const maxDaily = 3;

  function canSendAlert(todayStr: string): boolean {
    const current = store.get(todayStr) ?? 0;
    if (current >= maxDaily) {
      return false;
    }
    store.set(todayStr, current + 1);
    return true;
  }

  // Dia 1: pode enviar 3 vezes
  const day1 = "2026-10-15";
  assert.equal(canSendAlert(day1), true); // 1
  assert.equal(canSendAlert(day1), true); // 2
  assert.equal(canSendAlert(day1), true); // 3
  assert.equal(canSendAlert(day1), false); // 4 (bloqueado)
  assert.equal(canSendAlert(day1), false); // 5 (bloqueado)

  // Dia 2: renova o contador automaticamente
  const day2 = "2026-10-16";
  assert.equal(canSendAlert(day2), true); // 1 do novo dia
  assert.equal(canSendAlert(day2), true); // 2 do novo dia
  assert.equal(store.get(day1), 3);
  assert.equal(store.get(day2), 2);
});

test("idempotência da fila de mensagens impede duplicatas", async () => {
  const memoryQueue: any[] = [];

  function enqueueMock(input: { recipient: string; content: string; idempotencyKey?: string }) {
    if (input.idempotencyKey) {
      const existing = memoryQueue.find((m) => m.idempotencyKey === input.idempotencyKey);
      if (existing) return { item: existing, duplicated: true };
    }
    const item = {
      id: `msg-${memoryQueue.length + 1}`,
      recipient: input.recipient.replace(/\D/g, ""),
      content: input.content,
      status: "pending",
      idempotencyKey: input.idempotencyKey || null,
      attempts: 0,
    };
    memoryQueue.push(item);
    return { item, duplicated: false };
  }

  const res1 = enqueueMock({
    recipient: "(11) 98765-4321",
    content: "Convite especial para o casamento",
    idempotencyKey: "req-12345",
  });
  assert.equal(res1.duplicated, false);
  assert.equal(res1.item.id, "msg-1");
  assert.equal(res1.item.recipient, "11987654321");

  // Reenvio com a mesma chave de idempotência
  const res2 = enqueueMock({
    recipient: "(11) 98765-4321",
    content: "Convite especial para o casamento",
    idempotencyKey: "req-12345",
  });
  assert.equal(res2.duplicated, true);
  assert.equal(res2.item.id, "msg-1");
  assert.equal(memoryQueue.length, 1);
});

test("cálculo de backoff progressivo respeita tentativas e limites", () => {
  const baseBackoffMs = 5000;
  const maxAttempts = 5;

  function getBackoff(attempts: number): number {
    return baseBackoffMs * Math.pow(2, attempts - 1);
  }

  assert.equal(getBackoff(1), 5000);   // 5s
  assert.equal(getBackoff(2), 10000);  // 10s
  assert.equal(getBackoff(3), 20000);  // 20s
  assert.equal(getBackoff(4), 40000);  // 40s

  function evaluateAttempt(attempts: number): "failed_temp" | "failed_perm" {
    return attempts >= maxAttempts ? "failed_perm" : "failed_temp";
  }

  assert.equal(evaluateAttempt(1), "failed_temp");
  assert.equal(evaluateAttempt(4), "failed_temp");
  assert.equal(evaluateAttempt(5), "failed_perm");
  assert.equal(evaluateAttempt(6), "failed_perm");
});

test("tolerância de desconexão não dispara alerta de e-mail prematuramente", () => {
  const toleranceMinutes = 2;
  const toleranceMs = toleranceMinutes * 60 * 1000;

  function shouldSendDropAlert(disconnectedAt: Date, now: Date): boolean {
    const elapsed = now.getTime() - disconnectedAt.getTime();
    return elapsed >= toleranceMs;
  }

  const dropTime = new Date("2026-10-15T12:00:00Z");

  // 30 segundos após a queda: ainda não deve alertar (tolerância de 2 minutos)
  const at30s = new Date("2026-10-15T12:00:30Z");
  assert.equal(shouldSendDropAlert(dropTime, at30s), false);

  // 1 minuto e 59 segundos: ainda em tolerância
  const at1m59s = new Date("2026-10-15T12:01:59Z");
  assert.equal(shouldSendDropAlert(dropTime, at1m59s), false);

  // 2 minutos exatos: tolerância atingida, dispara alerta
  const at2m = new Date("2026-10-15T12:02:00Z");
  assert.equal(shouldSendDropAlert(dropTime, at2m), true);

  // 5 minutos: continua considerando queda relevante
  const at5m = new Date("2026-10-15T12:05:00Z");
  assert.equal(shouldSendDropAlert(dropTime, at5m), true);
});
