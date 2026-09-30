/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

/** Versionsnummer aus package.json, beim Build eingesetzt. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** '1' = Entwickler-Version mit unendlichen Ressourcen. */
  readonly VITE_DEV_EDITION?: string;
}
