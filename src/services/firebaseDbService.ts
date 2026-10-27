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

let lastQuotaExceededWarningTime = 0;

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
  ms = 6000, 
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
export async function saveSheetsToCloudFirestore(sheets: DiagramSheet[]): Promise<number> {
  // If quota was already detected recently (within last 3 minutes), avoid freezing the UI with retries
  if (Date.now() - lastQuotaExceededWarningTime < 3 * 60 * 1000) {
    throw new Error('โควตาการเขียนของ Firebase ประจำวันเต็ม (Quota exceeded) ระบบได้บันทึกข้อมูลทั้งหมดลงในเครื่อง (LocalStorage) เรียบร้อยแล้ว');
  }

  let savedCount = 0;

  try {
    // Process sheets with timeout to prevent hanging when backend is exhausted or throttling
    const savePromises = sheets.map(async (sheet, i) => {
      const docId = sanitizeSheetId(`${SHARED_WORKSPACE_ID}_${sheet.id}`, i);
      const sheetPath = `sheets/${docId}`;
      const docRef = doc(db, 'sheets', docId);
      const baseData = buildValidatedSheetPayload(sheet);

      let exists = false;
      try {
        const existingSnap = await withTimeout(getDoc(docRef), 5000);
        exists = existingSnap.exists();
      } catch (error) {
        if (isQuotaError(error)) {
          lastQuotaExceededWarningTime = Date.now();
          throw error;
        }
      }

      if (exists) {
        await withTimeout(
          updateDoc(docRef, {
            sheetNo: baseData.sheetNo,
            title: baseData.title,
            feederCode: baseData.feederCode,
            substation: baseData.substation,
            description: baseData.description,
            transformers: baseData.transformers,
            switches: baseData.switches,
            feederPaths: baseData.feederPaths,
            annotations: baseData.annotations,
            updatedAt: serverTimestamp()
          }),
          6000
        );
      } else {
        await withTimeout(
          setDoc(docRef, {
            ...baseData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }),
          6000
        );
      }
      return true;
    });

    const results = await Promise.allSettled(savePromises);
    for (const res of results) {
      if (res.status === 'fulfilled') {
        savedCount++;
      } else {
        if (isQuotaError(res.reason)) {
          lastQuotaExceededWarningTime = Date.now();
          throw new Error('โควตาการเขียนของ Firebase ประจำวันเต็ม (Quota exceeded) ระบบได้บันทึกข้อมูลทั้งหมดลงในเครื่อง (LocalStorage) เรียบร้อยแล้ว');
        }
      }
    }
  } catch (err: any) {
    if (isQuotaError(err)) {
      lastQuotaExceededWarningTime = Date.now();
      throw new Error('โควตาการเขียนของ Firebase ประจำวันเต็ม (Quota exceeded) ระบบได้บันทึกข้อมูลทั้งหมดลงในเครื่อง (LocalStorage) เรียบร้อยแล้ว');
    }
    throw err;
  }

  return savedCount;
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
      lastQuotaExceededWarningTime = Date.now();
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
      console.warn('Real-time sheets subscription warning:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Deletes a sheet document from the shared Cloud Firestore workspace
 */
export async function deleteSheetFromCloudFirestore(sheetId: string): Promise<void> {
  const docId = sanitizeSheetId(`${SHARED_WORKSPACE_ID}_${sheetId}`, 0);
  const path = `sheets/${docId}`;
  try {
    await deleteDoc(doc(db, 'sheets', docId));
  } catch (error) {
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

  const payload: Record<string, any> = {
    sheetId: String(params.sheetId || 'sheet-1').slice(0, 128),
    actionType: params.actionType,
    transformerData: stripUndefined(params.transformerData || {}),
    requesterName: String(params.requesterName || 'ผู้ใช้งานทั่วไป').trim().slice(0, 120) || 'ผู้ใช้งานทั่วไป',
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (params.targetTransformerId) {
    payload.targetTransformerId = String(params.targetTransformerId).slice(0, 128);
  }
  if (params.originalData) {
    payload.originalData = stripUndefined(params.originalData);
  }
  if (params.requesterContact?.trim()) {
    payload.requesterContact = String(params.requesterContact).trim().slice(0, 120);
  }
  if (params.requestNotes?.trim()) {
    payload.requestNotes = String(params.requestNotes).trim().slice(0, 500);
  }

  try {
    await setDoc(doc(db, 'transformer_drafts', draftId), payload);
    return draftId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Fetches all transformer drafts
 */
export async function fetchTransformerDrafts(): Promise<TransformerDraft[]> {
  const path = 'transformer_drafts';
  try {
    const snapshot = await getDocs(collection(db, 'transformer_drafts'));
    if (snapshot.empty) return [];

    const drafts: TransformerDraft[] = snapshot.docs.map(docSnap => {
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

    return drafts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
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
      const drafts: TransformerDraft[] = snapshot.docs.map(docSnap => {
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

      drafts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(drafts);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
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
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Deletes a transformer draft (Admins only)
 */
export async function deleteTransformerDraft(draftId: string): Promise<void> {
  const path = `transformer_drafts/${draftId}`;
  try {
    await deleteDoc(doc(db, 'transformer_drafts', draftId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

