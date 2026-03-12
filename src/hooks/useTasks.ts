import { useState, useCallback, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { getCol, getDocRef } from '@/lib/firestore';
import type { Task, Subtask, TaskPriority } from '@/types';

export function useTasks() {
  const { environment } = useEnvironment();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(getCol(environment, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(d => d.data() as Task));
      setLoading(false);
    });
    return unsub;
  }, [environment]);

  const addTask = useCallback(async (title: string, description = '', priority: TaskPriority = 'none') => {
    const task: Task = {
      id: uuid(),
      title,
      description,
      completed: false,
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: tasks.length,
      subtasks: [],
      attachedDocumentIds: [],
    };
    await setDoc(getDocRef(environment, 'tasks', task.id), task);
    return task;
  }, [environment, tasks.length]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    await updateDoc(getDocRef(environment, 'tasks', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }, [environment]);

  const deleteTask = useCallback(async (id: string) => {
    await deleteDoc(getDocRef(environment, 'tasks', id));
  }, [environment]);

  const toggleTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await updateDoc(getDocRef(environment, 'tasks', id), {
      completed: !task.completed,
      updatedAt: new Date().toISOString(),
    });
  }, [environment, tasks]);

  const addSubtask = useCallback(async (taskId: string, title: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const subtask: Subtask = { id: uuid(), title, completed: false };
    await updateDoc(getDocRef(environment, 'tasks', taskId), {
      subtasks: [...task.subtasks, subtask],
      updatedAt: new Date().toISOString(),
    });
  }, [environment, tasks]);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await updateDoc(getDocRef(environment, 'tasks', taskId), {
      subtasks: task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s),
      updatedAt: new Date().toISOString(),
    });
  }, [environment, tasks]);

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await updateDoc(getDocRef(environment, 'tasks', taskId), {
      subtasks: task.subtasks.filter(s => s.id !== subtaskId),
      updatedAt: new Date().toISOString(),
    });
  }, [environment, tasks]);

  const reorderSubtasks = useCallback(async (taskId: string, reordered: Subtask[]) => {
    await updateDoc(getDocRef(environment, 'tasks', taskId), {
      subtasks: reordered,
      updatedAt: new Date().toISOString(),
    });
  }, [environment]);

  const reorderTasks = useCallback(async (reordered: Task[]) => {
    await Promise.all(
      reordered.map((t, i) =>
        updateDoc(getDocRef(environment, 'tasks', t.id), { order: i })
      )
    );
  }, [environment]);

  const activeTasks = tasks.filter(t => !t.completed).sort((a, b) => a.order - b.order);
  const completedTasks = tasks.filter(t => t.completed).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    tasks, activeTasks, completedTasks, loading,
    addTask, updateTask, deleteTask, toggleTask,
    addSubtask, toggleSubtask, deleteSubtask,
    reorderSubtasks, reorderTasks,
  };
}
