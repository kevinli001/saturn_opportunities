import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";
import { HeroBand } from "@/components/HeroBand";
import { OpportunitySections } from "@/components/OpportunitySections";
import { getOpportunities } from "@/lib/live-data";

export const metadata: Metadata = {
  title: "Opportunities — Saturn",
};

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities();

  return (
    <div>
      <NavBar />
      <HeroBand
        title="Saturn Opportunities"
        subtitle="Explore live yield across Saturn's ecosystem"
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <OpportunitySections opportunities={opportunities} />
      </div>
    </div>
  );
}
