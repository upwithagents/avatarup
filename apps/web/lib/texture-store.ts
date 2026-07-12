import { createTextureStore, openTextureDb, type TextureStore } from '@avatarup/avatar-core';

// A single shared store/connection for the whole app (the panel writes
// uploads to it, the skin-texture resolver reads them back).
let store: TextureStore | null = null;

export function getTextureStore(): TextureStore {
  if (!store) store = createTextureStore(openTextureDb());
  return store;
}
