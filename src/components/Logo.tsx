import { SaturnMark } from "./AssetBadge";

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-7 w-7 overflow-hidden rounded">
        <SaturnMark color="#000000" />
      </span>
      <span className="text-lg font-bold text-foreground">Saturn</span>
    </span>
  );
}
