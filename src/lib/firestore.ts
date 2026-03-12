import { collection, doc } from 'firebase/firestore';
import type { Environment } from '@/types';
import { db } from './firebase';

/** Returns CollectionReference for a module within an environment */
export function getCol(env: Environment, module: string) {
  return collection(db, 'environments', env, module);
}

/** Returns DocumentReference for a specific document */
export function getDocRef(env: Environment, module: string, id: string) {
  return doc(db, 'environments', env, module, id);
}
