export type SyncEventType =
  | "ORDER_CREATED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_ASSIGNED"
  | "INVITE_CREATED"
  | "INVITE_REDEEMED"
  | "INVITE_REVOKED"
  | "VEHICLE_ADDED"
  | "NOTIFICATION_CREATED"
  | "STORAGE_RESET";

export interface SyncMessage {
  type: SyncEventType;
  companyId?: string;
  orderId?: string;
  userId?: string;
  timestamp: number;
}

const CHANNEL_NAME = "tf_sync_channel";
const STORAGE_PING_KEY = "transflow_sync_ping";

type SyncListener = (msg: SyncMessage) => void;

class SyncChannelManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<SyncListener> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === "undefined" || this.isInitialized) return;
    this.isInitialized = true;

    // 1. Try BroadcastChannel
    if (typeof BroadcastChannel !== "undefined") {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (event.data && typeof event.data.type === "string") {
            this.notifyListeners(event.data as SyncMessage);
          }
        };
      } catch (err) {
        console.warn("BroadcastChannel initialization failed:", err);
      }
    }

    // 2. Storage event fallback for older browsers or cross-origin/worker limits
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_PING_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as SyncMessage;
          this.notifyListeners(parsed);
        } catch {
          // Ignore
        }
      }
    });
  }

  private notifyListeners(msg: SyncMessage) {
    for (const listener of this.listeners) {
      try {
        listener(msg);
      } catch (err) {
        console.error("Error in sync listener:", err);
      }
    }
  }

  public broadcast(type: SyncEventType, details?: Partial<SyncMessage>) {
    const message: SyncMessage = {
      type,
      ...details,
      timestamp: Date.now(),
    };

    // Send through BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn("Failed to post message on BroadcastChannel:", err);
      }
    }

    // Trigger storage event fallback in other tabs
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_PING_KEY, JSON.stringify(message));
      } catch {
        // Ignore
      }
    }

    // Also notify local listeners in the current tab
    this.notifyListeners(message);
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const syncChannel = new SyncChannelManager();
