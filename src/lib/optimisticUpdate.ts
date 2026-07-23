import { useCallback, useRef } from "react";

interface OptimisticState<T> {
  data: T;
  prevData: T;
  committed: boolean;
}

export function useOptimisticMutation<T>(
  setData: React.Dispatch<React.SetStateAction<T>>
) {
  const stateRef = useRef<OptimisticState<T> | null>(null);

  const mutate = useCallback(
    async <R>(
      optimisticUpdate: (prev: T) => T,
      mutation: () => Promise<R>
    ): Promise<{ data: R | null; error: unknown }> => {
      let prevData: T | null = null;

      setData((current) => {
        prevData = current;
        const optimistic = optimisticUpdate(current);
        stateRef.current = { data: optimistic, prevData, committed: false };
        return optimistic;
      });

      try {
        const result = await mutation();
        if (stateRef.current) {
          stateRef.current.committed = true;
        }
        return { data: result, error: null };
      } catch (error) {
        if (stateRef.current && !stateRef.current.committed) {
          setData(() => stateRef.current!.prevData as T);
        }
        stateRef.current = null;
        return { data: null, error };
      }
    },
    [setData]
  );

  return mutate;
}

export async function optimisticMutate<T, R>(
  currentData: T,
  optimisticUpdate: (prev: T) => T,
  mutation: () => Promise<R>,
  rollback: () => void
): Promise<{ data: R | null; error: unknown }> {
  try {
    const result = await mutation();
    return { data: result, error: null };
  } catch (error) {
    rollback();
    return { data: null, error };
  }
}
