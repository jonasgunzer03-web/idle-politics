/**
 * Entwickler-Version: eigener Build (VITE_DEV_EDITION=1) unter /dev/, mit Debug-Menü,
 * eigenem Spielstand und Ressourcen, die sich ständig wieder auffüllen.
 */
export const DEV_EDITION = import.meta.env.VITE_DEV_EDITION === '1';

/** Auf so viel werden in der Entwickler-Version alle Währungen immer wieder aufgefüllt. */
export const DEV_RESOURCE_FLOOR = 1e15;
