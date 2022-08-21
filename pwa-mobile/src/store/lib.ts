import { AtomEffect, DefaultValue } from "recoil";

export const persist =
  <T>(key: string): AtomEffect<T> =>
  ({ setSelf, onSet }) => {
    const savedValue = localStorage.getItem("recoil-" + key);
    const value =
      savedValue !== null ? JSON.parse(savedValue) : new DefaultValue(); // Abort initialization if no value was stored
    setSelf(value);

    // Subscribe to state changes and persist them to localForage
    onSet((newValue, _, isReset) => {
      isReset
        ? localStorage.getItem("recoil-" + key)
        : localStorage.setItem("recoil-" + key, JSON.stringify(newValue));
    });
  };
