type MpesaReconciliationWakeListener = () => void;

let wakeListener: MpesaReconciliationWakeListener | undefined;

export function registerMpesaReconciliationWakeListener(listener: MpesaReconciliationWakeListener) {
  wakeListener = listener;

  return () => {
    if (wakeListener === listener) wakeListener = undefined;
  };
}

export function requestMpesaReconciliationWake() {
  wakeListener?.();
}
