import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { DiagramSheet, Transformer, SwitchNode, FeederPath, AnnotationLabel, TransformerDraft } from '../types';

export const SHARED_WORKSPACE_ID = 'pea-fang-shared';

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithEmail(email: string, pass: string) {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return result.user;
}

export async function registerWithEmail(email: string, pass: string, displayName?: string) {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName?.trim() && result.user) {
    await updateProfile(result.user, { displayName: displayName.trim() });
  }
  return result.user;
}

export async function signInAsGuest() {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function sendResetPassword(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutFromCloud() {
  await signOut(auth);
}

/**
 * Sanitizes an object recursively to remove undefined values (which Firestore rejects)
 */
function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(item => stripUndefined(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Ensures a sheet ID conforms to the strict regex ^[a-zA-Z0-9_\-]+$ and length 1..128
 */
function sanitizeSheetId(id: string, fallbackIndex: number): string {
  const cleaned = (id || `sheet-${fallbackIndex + 1}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, 128);
  return cleaned.length > 0 ? cleaned : `sheet-${fallbackIndex + 1}`;
}

/**
 * Enforces blueprint boundaries on a DiagramSheet before writing to Firestore
 */
function buildValidatedSheetPayload(sheet: DiagramSheet) {
  const sheetNo = String(sheet.sheetNo || '(1)').trim().slice(0, 32) || '(1)';
  const title = String(sheet.title || 'กฟส.ฝาง').trim().slice(0, 200) || 'กฟส.ฝาง';
  const feederCode = String(sheet.feederCode || '').trim().slice(0, 64);
  const substation = String(sheet.substation || '').trim().slice(0, 200);
  const description = String(sheet.description || '').trim().slice(0, 500);

  const transformers = stripUndefined((sheet.transformers || []).slice(0, 300));
  const switches = stripUndefined((sheet.switches || []).slice(0, 200));
  const feederPaths = stripUndefined((sheet.feederPaths || []).slice(0, 200));
  const annotations = stripUndefined((sheet.annotations || []).slice(0, 200));

  return {
    sheetNo,
    title,
    feederCode,
    substation,
    description,
    transformers,
    switches,
    feederPaths,
    annotations,
    workspaceId: SHARED_WORKSPACE_ID
  };
}

export const STORAGE_KEY_QUOTA_EXHAUSTED = 'pea_firestore_quota_exhausted_at';
export const STORAGE_KEY_LOCAL_DRAFTS = 'pea_local_transformer_drafts';
const QUOTA_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour circuit breaker cooldown

export function isCloudWriteQuotaExhausted(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUOTA_EXHAUSTED);
    if (!raw) return false;
    const timestamp = parseInt(raw, 10);
    if (isNaN(timestamp)) return false;
    if (Date.now() - timestamp > QUOTA_COOLDOWN_MS) {
      localStorage.removeItem(STORAGE_KEY_QUOTA_EXHAUSTED);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function recordQuotaExhausted(): void {
  try {
    localStorage.setItem(STORAGE_KEY_QUOTA_EXHAUSTED, Date.now().toString());
  } catch {}
}

export function resetQuotaExhausted(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_QUOTA_EXHAUSTED);
  } catch {}
}

export function getLocalDraftsFallback(): TransformerDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_DRAFTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalDraftFallback(draft: TransformerDraft): void {
  try {
    const list = getLocalDraftsFallback();
    const existingIdx = list.findIndex(d => d.id === draft.id);
    if (existingIdx >= 0) {
      list[existingIdx] = draft;
    } else {
      list.unshift(draft);
    }
    localStorage.setItem(STORAGE_KEY_LOCAL_DRAFTS, JSON.stringify(list));
  } catch {}
}

function updateLocalDraftStatus(
  draftId: string, 
  status: 'approved' | 'rejected', 
  reviewedBy: string, 
  reviewNote?: string
): void {
  try {
    const list = getLocalDraftsFallback();
    const item = list.find(d => d.id === draftId);
    if (item) {
      item.status = status;
      item.reviewedBy = reviewedBy;
      item.reviewNote = reviewNote;
      item.reviewedAt = new Date().toISOString();
      item.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_LOCAL_DRAFTS, JSON.stringify(list));
    }
  } catch {}
}

function removeLocalDraftFallback(draftId: string): void {
  try {
    const list = getLocalDraftsFallback().filter(d => d.id !== draftId);
    localStorage.setItem(STORAGE_KEY_LOCAL_DRAFTS, JSON.stringify(list));
  } catch {}
}

export function isQuotaError(err: any): boolean {
  const msg = (err?.message || String(err || '')).toLowerCase();
  const code = (err?.code || '').toLowerCase();
  return (
    code.includes('resource-exhausted') ||
    code.includes('resource_exhausted') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('free daily write units') ||
    msg.includes('free daily read units')
  );
}

export function withTimeout<T>(
  promise: Promise<T>, 
  ms = 5000, 
  errorMsg = 'หมดเวลาการเชื่อมต่อฐานข้อมูล Cloud (Timeout)'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(errorMsg)), ms);
    })
  ]);
}

/**
 * Saves all diagram sheets to Firestore under /sheets/{sheetId} in the shared workspace (no login required)
 */
export async function saveSheetsToCloudFirestore(
  sheets: DiagramSheet[],
  options?: { forceRetry?: boolean }
): Promise<number> {
  // If write quota is already known to be exhausted and user is not manually forcing a retry, bail out early
  if (!options?.forceRetry && isCloudWriteQuotaExhausted()) {
    throw new Error('โควตาการเขียนของ Firebase ประจำวันเต็ม (Quota exceeded) ระบบบันทึกข้อมูลทั้งหมดลงในเครื่อง (LocalStorage) เรียบร้อยแล้ว');
  }

  let savedCount = 0;

  try {
    // 1. Test write with the first sheet first to check connectivity & quota without hammering Firestore
    const firstSheet = sheets[0];
    if (firstSheet) {
      const docId = sanitizeSheetId(`${SHARED_WORKSPACE_ID}_${firstSheet.id}`, 0);
      const docRef = doc(db, 'sheets', docId);
      const baseData = buildValidatedSheetPayload(firstSheet);

      await withTimeout(
        setDoc(
          docRef,
          {
            ...baseData,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        ),
        5000
      );
      savedCount++;
      // If the write succeeded, clear any previous quota exhausted state
      resetQuotaExhausted();
    }

    // 2. Process remaining sheets in parallel
    if (sheets.length > 1) {
      const remainingPromises = sheets.slice(1).map(async (sheet, i) => {
        const docId = sanitizeSheetId(`${SHARED_WORKSPACE_ID}_${sheet.id}`, i + 1);
        const docRef = doc(db, 'sheets', docId);
        const baseData = buildValidatedSheetPayload(sheet);

        await withTimeout(
          setDoc(
            docRef,
            {
              ...baseData,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          ),
          5000
        );
        return true;
      });

      const results = await Promise.allSettled(remainingPromises);
      for (const res of results) {
        if (res.status === 'fulfilled') {
          savedCount++;
        } else if (isQuotaError(res.reason)) {
          recordQuotaExhausted();
          throw new Error('โควตาการเขียนของ Firebase ประจำวันเต็ม (Quota exceeded) ระบบบันทึกข้อมูลทั้งหมดลงในเครื่อง (LocalStorage) เรียบร้อยแล้ว');
        }
      }
    }
  } catch (err: any) {
    if (isQuotaError(err)) {
      recordQuotaExhausted();
      throw new Error('โควตาการเขียนของ Firebase ประจำวันเต็ม (Quota exceeded) ระบบได้บันทึกข้อมูลทั้งหมดลงในเครื่อง (LocalStorage) เรียบร้อยแล้ว');
    }
    throw err;
  }

  return savedCount;
}

/**
 * Saves a single diagram sheet to Firestore under /sheets/{sheetId} in the shared workspace (uses only 1 write operation)
 */
export async function saveSingleSheetToCloudFirestore(
  sheet: DiagramSheet,
  options?: { forceRetry?: boolean }
): Promise<void> {
  if (!sheet) return;
  if (!options?.forceRetry && isCloudWriteQuotaExhausted()) {
    throw new Error('โควตาการเขียนของ Firebase ประจำวันเต็ม (Quota exceeded) ระบบบันทึกข้อมูลหน้านี้ลงในเครื่อง (LocalStorage) เรียบร้อยแล้ว');
  }

  const docId = sanitizeSheetId(`${SHARED_WORKSPACE_ID}_${sheet.id}`, 0);
  const docRef = doc(db, 'sheets', docId);
  const baseData = buildValidatedSheetPayload(sheet);

  try {
    await withTimeout(
      setDoc(
        docRef,
        {
          ...baseData,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      ),
      5000
    );
    resetQuotaExhausted();
  } catch (err: any) {
    if (isQuotaError(err)) {
      recordQuotaExhausted();
      throw new Error('โควตาการเขียนของ Firebase ประจำวันเต็ม (Quota exceeded) ระบบได้บันทึกข้อมูลหน้านี้ลงในเครื่อง (LocalStorage) เรียบร้อยแล้ว');
    }
    throw err;
  }
}

/**
 * Saves specific selected diagram sheets to Firestore
 */
export async function saveSelectedSheetsToCloudFirestore(
  allSheets: DiagramSheet[],
  targetSheetIds: string[],
  options?: { forceRetry?: boolean }
): Promise<number> {
  const targetSheets = allSheets.filter(s => targetSheetIds.includes(s.id));
  if (targetSheets.length === 0) return 0;
  return saveSheetsToCloudFirestore(targetSheets, options);
}

/**
 * Fetches all shared diagram sheets from Firestore (no login required)
 */
export async function fetchSheetsFromCloudFirestore(): Promise<DiagramSheet[]> {
  const path = 'sheets';
  try {
    const q = query(collection(db, 'sheets'), where('workspaceId', '==', SHARED_WORKSPACE_ID));
    const snapshot = await withTimeout(getDocs(q), 7000, 'หมดเวลาดึงข้อมูลผังจาก Cloud');
    if (snapshot.empty) return [];

    const prefix = `${SHARED_WORKSPACE_ID}_`;
    const result: DiagramSheet[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const rawId = docSnap.id.startsWith(prefix) ? docSnap.id.slice(prefix.length) : docSnap.id;
      return {
        id: rawId,
        sheetNo: data.sheetNo || '(1)',
        title: data.title || 'กฟส.ฝาง',
        feederCode: data.feederCode || '',
        substation: data.substation || '',
        description: data.description || '',
        transformers: (data.transformers || []) as Transformer[],
        switches: (data.switches || []) as SwitchNode[],
        feederPaths: (data.feederPaths || []) as FeederPath[],
        annotations: (data.annotations || []) as AnnotationLabel[],
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
      };
    });

    return result.sort((a, b) => a.sheetNo.localeCompare(b.sheetNo, undefined, { numeric: true }));
  } catch (error) {
    if (isQuotaError(error)) {
      recordQuotaExhausted();
      console.warn('Firestore Quota exceeded on fetch, falling back to local data.');
      return [];
    }
    console.warn('Failed to fetch from Cloud Firestore, falling back to local storage:', error);
    return [];
  }
}

/**
 * Subscribes to real-time updates of the shared diagram sheets in Cloud Firestore
 */
export function subscribeToCloudSheets(
  onUpdate: (sheets: DiagramSheet[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = 'sheets';
  const q = query(collection(db, 'sheets'), where('workspaceId', '==', SHARED_WORKSPACE_ID));
  const prefix = `${SHARED_WORKSPACE_ID}_`;

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) return;
      const loaded: DiagramSheet[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const rawId = docSnap.id.startsWith(prefix) ? docSnap.id.slice(prefix.length) : docSnap.id;
        return {
          id: rawId,
          sheetNo: data.sheetNo || '(1)',
          title: data.title || 'กฟส.ฝาง',
          feederCode: data.feederCode || '',
          substation: data.substation || '',
          description: data.description || '',
          transformers: (data.transformers || []) as Transformer[],
          switches: (data.switches || []) as SwitchNode[],
          feederPaths: (data.feederPaths || []) as FeederPath[],
          annotations: (data.annotations || []) as AnnotationLabel[],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
        };
      });
      loaded.sort((a, b) => a.sheetNo.localeCompare(b.sheetNo, undefined, { numeric: true }));
      onUpdate(loaded);
    },
    (error) => {
      if (isQuotaError(error)) {
        recordQuotaExhausted();
      }
      console.warn('Real-time sheets subscription warning:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Deletes a sheet document from the shared Cloud Firestore workspace
 */
export async function deleteSheetFromCloudFirestore(sheetId: string): Promise<void> {
  if (isCloudWriteQuotaExhausted()) {
    console.warn('Skipping Firestore deleteSheet due to write quota exhaustion');
    return;
  }
  const docId = sanitizeSheetId(`${SHARED_WORKSPACE_ID}_${sheetId}`, 0);
  const path = `sheets/${docId}`;
  try {
    await deleteDoc(doc(db, 'sheets', docId));
  } catch (error) {
    if (isQuotaError(error)) {
      recordQuotaExhausted();
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Submits a new transformer draft (can be called by unauthenticated guests or operators)
 */
export async function submitTransformerDraft(params: {
  sheetId: string;
  actionType: 'create' | 'update';
  targetTransformerId?: string;
  transformerData: Partial<Transformer>;
  originalData?: Partial<Transformer>;
  requesterName: string;
  requesterContact?: string;
  requestNotes?: string;
}): Promise<string> {
  const rand = Math.random().toString(36).substring(2, 9);
  const draftId = `draft-${Date.now()}-${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  const path = `transformer_drafts/${draftId}`;
  const nowIso = new Date().toISOString();

  const localDraft: TransformerDraft = {
    id: draftId,
    sheetId: String(params.sheetId || 'sheet-1').slice(0, 128),
    actionType: params.actionType,
    targetTransformerId: params.targetTransformerId ? String(params.targetTransformerId).slice(0, 128) : undefined,
    transformerData: stripUndefined(params.transformerData || {}),
    originalData: params.originalData ? stripUndefined(params.originalData) : undefined,
    requesterName: String(params.requesterName || 'ผู้ใช้งานทั่วไป').trim().slice(0, 120) || 'ผู้ใช้งานทั่วไป',
    requesterContact: params.requesterContact?.trim().slice(0, 120),
    requestNotes: params.requestNotes?.trim().slice(0, 500),
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso
  };

  // If write quota is currently exhausted, save to local fallback storage immediately
  if (isCloudWriteQuotaExhausted()) {
    saveLocalDraftFallback(localDraft);
    return draftId;
  }

  const payload: Record<string, any> = {
    sheetId: localDraft.sheetId,
    actionType: localDraft.actionType,
    transformerData: localDraft.transformerData,
    requesterName: localDraft.requesterName,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (localDraft.targetTransformerId) payload.targetTransformerId = localDraft.targetTransformerId;
  if (localDraft.originalData) payload.originalData = localDraft.originalData;
  if (localDraft.requesterContact) payload.requesterContact = localDraft.requesterContact;
  if (localDraft.requestNotes) payload.requestNotes = localDraft.requestNotes;

  try {
    await setDoc(doc(db, 'transformer_drafts', draftId), payload);
    saveLocalDraftFallback(localDraft);
    return draftId;
  } catch (error) {
    if (isQuotaError(error)) {
      recordQuotaExhausted();
      saveLocalDraftFallback(localDraft);
      return draftId;
    }
    // Ensure draft is preserved in local fallback even if cloud rejected
    saveLocalDraftFallback(localDraft);
    return draftId;
  }
}

/**
 * Fetches all transformer drafts
 */
export async function fetchTransformerDrafts(): Promise<TransformerDraft[]> {
  const localDrafts = getLocalDraftsFallback();
  const path = 'transformer_drafts';

  try {
    const snapshot = await withTimeout(getDocs(collection(db, 'transformer_drafts')), 5000, 'หมดเวลาดึงข้อมูลแบบร่าง');
    if (snapshot.empty) return localDrafts;

    const cloudDrafts: TransformerDraft[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        sheetId: data.sheetId || '',
        actionType: data.actionType || 'create',
        targetTransformerId: data.targetTransformerId,
        transformerData: (data.transformerData || {}) as Partial<Transformer>,
        originalData: data.originalData as Partial<Transformer> | undefined,
        requesterName: data.requesterName || '',
        requesterContact: data.requesterContact,
        requestNotes: data.requestNotes,
        status: data.status || 'pending',
        reviewedBy: data.reviewedBy,
        reviewedAt: data.reviewedAt?.toDate ? data.reviewedAt.toDate().toISOString() : undefined,
        reviewNote: data.reviewNote,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
      };
    });

    // Merge: cloud drafts take priority, but keep local fallback drafts not yet in cloud
    const mergedMap = new Map<string, TransformerDraft>();
    for (const d of localDrafts) mergedMap.set(d.id, d);
    for (const d of cloudDrafts) mergedMap.set(d.id, d);

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    if (isQuotaError(error)) {
      recordQuotaExhausted();
      console.warn('Firestore Quota exceeded on fetchTransformerDrafts, using local drafts.');
    } else {
      console.warn('Notice fetching drafts from Cloud, using local drafts:', error);
    }
    return localDrafts;
  }
}

/**
 * Subscribes to real-time updates for transformer drafts
 */
export function subscribeToTransformerDrafts(
  onUpdate: (drafts: TransformerDraft[]) => void
): Unsubscribe {
  const path = 'transformer_drafts';
  return onSnapshot(
    collection(db, 'transformer_drafts'),
    (snapshot) => {
      const cloudDrafts: TransformerDraft[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          sheetId: data.sheetId || '',
          actionType: data.actionType || 'create',
          targetTransformerId: data.targetTransformerId,
          transformerData: (data.transformerData || {}) as Partial<Transformer>,
          originalData: data.originalData as Partial<Transformer> | undefined,
          requesterName: data.requesterName || '',
          requesterContact: data.requesterContact,
          requestNotes: data.requestNotes,
          status: data.status || 'pending',
          reviewedBy: data.reviewedBy,
          reviewedAt: data.reviewedAt?.toDate ? data.reviewedAt.toDate().toISOString() : undefined,
          reviewNote: data.reviewNote,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
        };
      });

      const localDrafts = getLocalDraftsFallback();
      const mergedMap = new Map<string, TransformerDraft>();
      for (const d of localDrafts) mergedMap.set(d.id, d);
      for (const d of cloudDrafts) mergedMap.set(d.id, d);

      const allDrafts = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onUpdate(allDrafts);
    },
    (error) => {
      if (isQuotaError(error)) {
        recordQuotaExhausted();
        console.warn('Transformer drafts subscription quota warning, using local drafts.');
      } else {
        console.warn('Transformer drafts subscription warning:', error);
      }
      onUpdate(getLocalDraftsFallback());
    }
  );
}

/**
 * Approves a transformer draft (Admins only)
 */
export async function approveTransformerDraft(
  draftId: string, 
  adminEmail: string,
  reviewNote?: string
): Promise<void> {
  updateLocalDraftStatus(draftId, 'approved', adminEmail, reviewNote);

  if (isCloudWriteQuotaExhausted()) {
    return;
  }

  const path = `transformer_drafts/${draftId}`;
  const updatePayload: Record<string, any> = {
    status: 'approved',
    reviewedBy: String(adminEmail || 'admin').slice(0, 120),
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  if (reviewNote?.trim()) {
    updatePayload.reviewNote = String(reviewNote).trim().slice(0, 500);
  }

  try {
    await updateDoc(doc(db, 'transformer_drafts', draftId), updatePayload);
  } catch (error) {
    if (isQuotaError(error)) {
      recordQuotaExhausted();
      return;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Rejects a transformer draft (Admins only)
 */
export async function rejectTransformerDraft(
  draftId: string,
  adminEmail: string,
  reviewNote?: string
): Promise<void> {
  updateLocalDraftStatus(draftId, 'rejected', adminEmail, reviewNote);

  if (isCloudWriteQuotaExhausted()) {
    return;
  }

  const path = `transformer_drafts/${draftId}`;
  const updatePayload: Record<string, any> = {
    status: 'rejected',
    reviewedBy: String(adminEmail || 'admin').slice(0, 120),
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  if (reviewNote?.trim()) {
    updatePayload.reviewNote = String(reviewNote).trim().slice(0, 500);
  }

  try {
    await updateDoc(doc(db, 'transformer_drafts', draftId), updatePayload);
  } catch (error) {
    if (isQuotaError(error)) {
      recordQuotaExhausted();
      return;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Deletes a transformer draft (Admins only)
 */
export async function deleteTransformerDraft(draftId: string): Promise<void> {
  removeLocalDraftFallback(draftId);

  if (isCloudWriteQuotaExhausted()) {
    return;
  }

  const path = `transformer_drafts/${draftId}`;
  try {
    await deleteDoc(doc(db, 'transformer_drafts', draftId));
  } catch (error) {
    if (isQuotaError(error)) {
      recordQuotaExhausted();
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

