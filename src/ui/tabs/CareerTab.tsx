import { Ticker } from '../components/Ticker';
import { CareerCard } from '../world/CareerCard';
import { Destinations } from '../world/Destinations';
import { LocationPanel } from '../world/LocationPanel';
import { WorldView } from '../world/WorldView';

/** Hauptbildschirm: Nachrichtenticker, begehbare Welt, Ziele, Karriere und Ort. */
export function CareerTab() {
  return (
    <>
      <Ticker />
      <WorldView />
      <Destinations />
      <CareerCard />
      <LocationPanel />
    </>
  );
}
