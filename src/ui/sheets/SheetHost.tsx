import { useGame } from '../../store';
import { AutocracySheet } from './AutocracySheet';
import { CareerSheet } from './CareerSheet';
import { EventsSheet } from './EventsSheet';
import { EditorSheet, EmigrationSheet } from './ProfileSheets';
import { CountrySheet, GroupSheet, RegionSheet } from './RelationSheets';

/** Zeigt das vom Spieler geöffnete Fenster – nie gleichzeitig mit einem Dialog. */
export function SheetHost() {
  const sheet = useGame((s) => s.sheet);
  const blocked = useGame((s) => s.overlays.length > 0);
  if (!sheet || blocked) return null;
  switch (sheet.kind) {
    case 'events':
      return <EventsSheet />;
    case 'career':
      return <CareerSheet />;
    case 'autocracy':
      return <AutocracySheet />;
    case 'group':
      return <GroupSheet id={sheet.id} />;
    case 'country':
      return <CountrySheet id={sheet.id} />;
    case 'region':
      return <RegionSheet id={sheet.id} />;
    case 'emigration':
      return <EmigrationSheet />;
    case 'editor':
      return <EditorSheet />;
  }
}
