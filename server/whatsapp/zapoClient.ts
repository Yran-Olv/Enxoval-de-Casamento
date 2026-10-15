import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { WaClient, createStore, toUserJid } from "zapo-js";
import {
  openSqliteConnection,
  ensureSqliteMigrations,
  createSqliteStore,
} from "@zapo-js/store-sqlite";
import type { WhatsAppConnectionState, WhatsAppStatus } from "./types";

export interface ZapoClientEvents {
  onStateChange?: (state: WhatsAppConnectionState, reason?: string) => void;
  onConnected?: (phone: string | null) => void;
  onDisconnected?: (reason: string, isLogout: boolean) => void;
  onQrCode?: (qrDataUrl: string) => void;
}

export class ZapoWhatsAppService {
  private client: WaClient | null = null;
  private sqliteConn: any = null;
  private store: any = null;
  private state: WhatsAppConnectionState = "disconnected";
  private phone: string | null = null;
  private qrCodeDataUrl: string | null = null;
  private lastConnectedAt: Date | null = null;
  private lastDisconnectedAt: Date | null = null;
  private lastDisconnectReason: string | null = null;
  private requiresNewPairing = false;
  private isConnecting = false;
  private isDisconnecting = false;
  private connectedSince: Date | null = null;
  private sqlitePath: string;
  private listeners: ZapoClientEvents = {};

  constructor(customSqlitePath?: string) {
    this.sqlitePath = customSqlitePath || path.resolve(process.cwd(), "uploads", "zapo-session.sqlite");
  }

  setListeners(listeners: ZapoClientEvents) {
    this.listeners = { ...this.listeners, ...listeners };
  }

  getState(): WhatsAppConnectionState {
    return this.state;
  }

  getPhone(): string | null {
    return this.phone;
  }

  getQrCode(): string | null {
    return this.qrCodeDataUrl;
  }

  getLastConnectedAt(): Date | null {
    return this.lastConnectedAt;
  }

  getLastDisconnectedAt(): Date | null {
    return this.lastDisconnectedAt;
  }

  getLastDisconnectReason(): string | null {
    return this.lastDisconnectReason;
  }

  getRequiresNewPairing(): boolean {
    return this.requiresNewPairing;
  }

  getUptimeSeconds(): number | null {
    if (this.state === "connected" && this.connectedSince) {
      return Math.floor((Date.now() - this.connectedSince.getTime()) / 1000);
    }
    return null;
  }

  private setState(newState: WhatsAppConnectionState, reason?: string) {
    const oldState = this.state;
    this.state = newState;
    if (newState === "connected") {
      this.connectedSince = new Date();
      this.lastConnectedAt = new Date();
      this.qrCodeDataUrl = null;
      this.requiresNewPairing = false;
    } else if (newState === "disconnected" || newState === "auth_error") {
      this.connectedSince = null;
      this.lastDisconnectedAt = new Date();
      if (reason) this.lastDisconnectReason = reason;
    }

    if (oldState !== newState) {
      console.log(`[ZapoWhatsApp] Transição de estado: ${oldState} -> ${newState}${reason ? ` (${reason})` : ""}`);
      try {
        this.listeners.onStateChange?.(newState, reason);
      } catch (err) {
        console.error("[ZapoWhatsApp] Erro no listener onStateChange:", err);
      }
    }
  }

  /**
   * Inicializa o armazenamento SQLite e verifica se há sessão anterior.
   */
  async initStore(): Promise<boolean> {
    if (this.store) return true;

    try {
      const parentDir = path.dirname(this.sqlitePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      this.sqliteConn = await openSqliteConnection({
        path: this.sqlitePath,
        sessionId: "default",
      });
      await ensureSqliteMigrations(this.sqliteConn, [
        "auth",
        "signal",
        "senderKey",
        "appState",
        "privacyToken",
      ]);

      const sqliteBackend = createSqliteStore({ connection: this.sqliteConn });
      this.store = createStore({
        backends: { sqlite: sqliteBackend },
        providers: {
          auth: "sqlite",
          signal: "sqlite",
          preKey: "sqlite",
          session: "sqlite",
          identity: "sqlite",
          senderKey: "sqlite",
          appState: "sqlite",
          messages: "none",
          threads: "none",
          contacts: "none",
          privacyToken: "sqlite",
        },
      } as any);

      // Checa se já existem credenciais salvas
      const sess = this.store.session("default");
      const authData = await sess.auth.load();
      if (authData?.meJid) {
        const rawPhone = authData.meJid.split("@")[0].split(":")[0];
        this.phone = rawPhone;
        console.log(`[ZapoWhatsApp] Sessão existente identificada para número: ${this.phone}`);
        return true;
      }

      return false;
    } catch (err) {
      console.error("[ZapoWhatsApp] Falha ao inicializar SQLite store:", err);
      throw err;
    }
  }

  /**
   * Conecta ao WhatsApp usando o Zapo.
   */
  async connect(): Promise<void> {
    if (this.state === "connected") {
      console.log("[ZapoWhatsApp] Já está conectado.");
      return;
    }

    if (this.isConnecting) {
      console.log("[ZapoWhatsApp] Conexão já em andamento.");
      return;
    }

    this.isConnecting = true;
    this.setState("connecting");

    try {
      await this.initStore();

      if (this.client) {
        try {
          await this.client.disconnect();
        } catch {}
        this.client = null;
      }

      this.client = new WaClient({
        store: this.store,
        sessionId: "default",
      });

      this.setupClientEvents(this.client);

      console.log("[ZapoWhatsApp] Iniciando transporte socket...");
      // Inicia a conexão
      await this.client.connect();
    } catch (err: any) {
      console.error("[ZapoWhatsApp] Erro ao conectar:", err?.message || err);
      this.setState("disconnected", err?.message || "Falha na conexão");
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  private setupClientEvents(client: WaClient) {
    // 1. QR Code emitido para pareamento
    client.on("auth_qr", async (event) => {
      try {
        console.log("[ZapoWhatsApp] Novo QR Code gerado pelo Zapo.");
        const dataUrl = await QRCode.toDataURL(event.qr, {
          margin: 2,
          width: 320,
          color: {
            dark: "#1e293b",
            light: "#ffffff",
          },
        });
        this.qrCodeDataUrl = dataUrl;
        this.setState("pairing");
        this.listeners.onQrCode?.(dataUrl);
      } catch (err) {
        console.error("[ZapoWhatsApp] Erro ao gerar Data URL do QR code:", err);
      }
    });

    // 2. Pareamento concluído com sucesso
    client.on("auth_paired", (event) => {
      const meJid = event.credentials?.meJid;
      if (meJid) {
        this.phone = meJid.split("@")[0].split(":")[0];
      }
      this.qrCodeDataUrl = null;
      this.requiresNewPairing = false;
      console.log(`[ZapoWhatsApp] Pareamento realizado! Número: ${this.phone}`);
      this.listeners.onConnected?.(this.phone);
    });

    // 3. Evento de ciclo de vida de conexão
    client.on("connection", (event) => {
      console.log(`[ZapoWhatsApp] Evento connection recebido:`, {
        status: event.status,
        reason: (event as any).reason,
        isLogout: (event as any).isLogout,
      });

      if (event.status === "open") {
        this.qrCodeDataUrl = null;
        this.setState("connected");
        this.listeners.onConnected?.(this.phone);
      } else if (event.status === "close") {
        const isLogout = Boolean((event as any).isLogout);
        const reason = String((event as any).reason || "Conexão encerrada pelo servidor");

        if (isLogout) {
          this.requiresNewPairing = true;
          this.phone = null;
          this.setState("auth_error", `Sessão revogada pelo dispositivo (${reason})`);
        } else {
          this.setState("disconnected", reason);
        }

        this.listeners.onDisconnected?.(reason, isLogout);
      }
    });
  }

  /**
   * Envia uma mensagem via WhatsApp.
   */
  async sendMessage(
    recipient: string,
    text: string,
    options?: { id?: string }
  ): Promise<{ success: boolean; messageId: string; timestamp?: number }> {
    if (!this.client || this.state !== "connected") {
      throw new Error("WhatsApp não está conectado no momento.");
    }

    // Normalização do número de telefone brasileiro
    const cleanDigits = recipient.replace(/\D/g, "");
    if (!cleanDigits || cleanDigits.length < 8) {
      throw new Error(`Número de WhatsApp inválido: ${recipient}`);
    }

    const normalizedDigits =
      cleanDigits.length === 10 || cleanDigits.length === 11
        ? `55${cleanDigits}`
        : cleanDigits;

    const toJid = `${normalizedDigits}@s.whatsapp.net`;

    try {
      const result = await this.client.message.send(toJid, text, options);
      return {
        success: true,
        messageId: (result as any).id || (result as any).messageId || "",
        timestamp: (result as any).timestamp,
      };
    } catch (err: any) {
      console.error(`[ZapoWhatsApp] Erro ao enviar mensagem para ${toJid}:`, err?.message || err);
      throw err;
    }
  }

  /**
   * Desconecta graciosamente o cliente sem destruir as credenciais salvas.
   */
  async disconnect(): Promise<void> {
    if (this.isDisconnecting) return;
    this.isDisconnecting = true;

    try {
      if (this.client) {
        console.log("[ZapoWhatsApp] Desconectando cliente graciosamente...");
        await this.client.disconnect();
        this.client = null;
      }
      this.setState("disconnected", "Desconexão solicitada pelo usuário");
    } catch (err) {
      console.error("[ZapoWhatsApp] Erro ao desconectar:", err);
      this.setState("disconnected", "Erro na desconexão");
    } finally {
      this.isDisconnecting = false;
    }
  }

  /**
   * Desconecta e limpa as credenciais salvas, exigindo novo pareamento.
   */
  async logout(): Promise<void> {
    try {
      if (this.client) {
        try {
          await this.client.logout();
        } catch {}
        this.client = null;
      }
      if (this.store) {
        const sess = this.store.session("default");
        await sess.auth.clear();
      }
      this.phone = null;
      this.qrCodeDataUrl = null;
      this.requiresNewPairing = true;
      this.setState("disconnected", "Sessão deslogada com sucesso");
    } catch (err) {
      console.error("[ZapoWhatsApp] Erro no logout:", err);
      throw err;
    }
  }
}

// Singleton do serviço Zapo
export const zapoService = new ZapoWhatsAppService();
