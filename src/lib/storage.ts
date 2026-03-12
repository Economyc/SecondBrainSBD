import type { Environment, Task, DocFolder, DocFile, Transaction, NotePage } from '@/types';

function getKey(env: Environment, module: string): string {
  return `secondbrain:${env}:${module}`;
}

function read<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Tasks
export function getTasks(env: Environment): Task[] {
  return read<Task>(getKey(env, 'tasks'));
}

export function saveTasks(env: Environment, tasks: Task[]): void {
  write(getKey(env, 'tasks'), tasks);
}

// Folders
export function getFolders(env: Environment): DocFolder[] {
  return read<DocFolder>(getKey(env, 'folders'));
}

export function saveFolders(env: Environment, folders: DocFolder[]): void {
  write(getKey(env, 'folders'), folders);
}

// Files
export function getFiles(env: Environment): DocFile[] {
  return read<DocFile>(getKey(env, 'files'));
}

export function saveFiles(env: Environment, files: DocFile[]): void {
  write(getKey(env, 'files'), files);
}

// Transactions
export function getTransactions(env: Environment): Transaction[] {
  return read<Transaction>(getKey(env, 'transactions'));
}

export function saveTransactions(env: Environment, transactions: Transaction[]): void {
  write(getKey(env, 'transactions'), transactions);
}

// Pages
export function getPages(env: Environment): NotePage[] {
  return read<NotePage>(getKey(env, 'pages'));
}

export function savePages(env: Environment, pages: NotePage[]): void {
  write(getKey(env, 'pages'), pages);
}
