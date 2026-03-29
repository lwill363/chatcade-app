import "@testing-library/jest-dom";

// jsdom doesn't enable localStorage without a proper URL origin.
// Provide a simple in-memory stub so modules that read localStorage at
// initialization time (e.g. authSlice) don't throw.
const localStorageStore: Record<string, string> = {};
const localStorageStub: Storage = {
  getItem: (key) => localStorageStore[key] ?? null,
  setItem: (key, value) => { localStorageStore[key] = String(value); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]); },
  key: (index) => Object.keys(localStorageStore)[index] ?? null,
  get length() { return Object.keys(localStorageStore).length; },
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageStub, writable: true });
