/**
 * IndexedDB storage for TransFlow binary assets (Delivery proof photos, avatars).
 * Prevents localStorage quota exhaustion by keeping binary blobs in IndexedDB.
 */

const DB_NAME = "transflow_blobs_db";
const DB_VERSION = 1;
const STORE_NAME = "delivery_proofs";
const MAX_BLOB_SIZE_BYTES = 10 * 1024 * 1024; // 10MB safety cap

// In-memory fallback for private windows or SSR environments where IDB is unavailable
const memoryFallback = new Map<string, Blob>();

function isIdbSupported(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIdbSupported()) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

/**
 * Stores a Blob in IndexedDB by key.
 */
export async function saveBlob(key: string, blob: Blob): Promise<void> {
  if (blob.size > MAX_BLOB_SIZE_BYTES) {
    throw new Error(`Blob size exceeds 10MB limit: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
  }

  if (!isIdbSupported()) {
    memoryFallback.set(key, blob);
    return;
  }

  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("Failed to put blob into IndexedDB"));
    });
  } catch (err) {
    console.warn("IndexedDB save failed, falling back to in-memory store:", err);
    memoryFallback.set(key, blob);
  }
}

/**
 * Retrieves a Blob from IndexedDB by key.
 */
export async function getBlob(key: string): Promise<Blob | null> {
  if (memoryFallback.has(key)) {
    return memoryFallback.get(key) || null;
  }

  if (!isIdbSupported()) {
    return null;
  }

  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const result = req.result;
        if (result instanceof Blob) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error || new Error("Failed to read blob from IndexedDB"));
    });
  } catch (err) {
    console.warn("IndexedDB get failed:", err);
    return memoryFallback.get(key) || null;
  }
}

/**
 * Retrieves a Blob and converts to Object URL. Caller should revoke when done if appropriate.
 */
export async function getBlobUrl(key: string): Promise<string | null> {
  const blob = await getBlob(key);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/**
 * Converts a base64 data URL or string to Blob and saves to IndexedDB.
 */
export async function saveBase64AsBlob(key: string, base64Data: string, mimeType = "image/jpeg"): Promise<void> {
  let pureBase64 = base64Data;
  if (base64Data.includes(",")) {
    const parts = base64Data.split(",");
    const match = parts[0].match(/:(.*?);/);
    if (match) mimeType = match[1];
    pureBase64 = parts[1];
  }

  const byteCharacters = atob(pureBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  await saveBlob(key, blob);
}

/**
 * Removes a Blob from IndexedDB by key.
 */
export async function deleteBlob(key: string): Promise<void> {
  memoryFallback.delete(key);
  if (!isIdbSupported()) return;

  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("Failed to delete blob from IndexedDB"));
    });
  } catch (err) {
    console.warn("IndexedDB delete failed:", err);
  }
}

/**
 * Clears all stored binary proofs.
 */
export async function clearAllBlobs(): Promise<void> {
  memoryFallback.clear();
  if (!isIdbSupported()) return;

  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("Failed to clear IndexedDB"));
    });
  } catch (err) {
    console.warn("IndexedDB clear failed:", err);
  }
}
