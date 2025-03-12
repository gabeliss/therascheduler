import { useState } from 'react';

interface DialogState<T = any> {
  isOpen: boolean;
  data: T | null;
}

export function useDialogState<T = any>(initialState: boolean = false) {
  const [state, setState] = useState<DialogState<T>>({
    isOpen: initialState,
    data: null,
  });

  const openDialog = (data: T | null = null) => {
    setState({
      isOpen: true,
      data,
    });
  };

  const closeDialog = () => {
    setState({
      isOpen: false,
      data: null,
    });
  };

  const setDialogData = (data: T | null) => {
    setState(prev => ({
      ...prev,
      data,
    }));
  };

  return {
    isOpen: state.isOpen,
    data: state.data,
    openDialog,
    closeDialog,
    setDialogData,
  };
} 