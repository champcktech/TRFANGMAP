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
import { signInWithPopup, signOut } from 'firebase/auth';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { DiagramSheet, Transformer, SwitchNode, FeederPath, AnnotationLabel } from '../types';

export const SHARED_WORKSPACE_ID = 'pea-fang-shared';

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
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

/**
 * Saves all diagram sheets to Firestore under /sheets/{sheetId} in the shared workspace (no login required)
 */
export async function saveSheetsToCloudFirestore(sheets: DiagramSheet[]): Promise<number> {
  let savedCount = 0;

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const docId = sanitizeSheetId(`${SHARED_WORKSPACE_ID}_${sheet.id}`, i);
    const sheetPath = `sheets/${docId}`;
    const docRef = doc(db, 'sheets', docId);
    const baseData = buildValidatedSheetPayload(sheet);

    let exists = false;
    try {
      const existingSnap = await getDoc(docRef);
      exists = existingSnap.exists();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, sheetPath);
    }

    try {
      if (exists) {
        await updateDoc(docRef, {
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
        });
      } else {
        await setDoc(docRef, {
          ...baseData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      savedCount++;
    } catch (error) {
      handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, sheetPath);
    }
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
    const snapshot = await getDocs(q);
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
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Subscribes to real-time updates of the shared diagram sheets in Cloud Firestore
 */
export function subscribeToCloudSheets(
  onUpdate: (sheets: DiagramSheet[]) => void
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
      handleFirestoreError(error, OperationType.LIST, path);
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
