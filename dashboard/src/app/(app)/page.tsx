import { Suspense } from "react";
import { Skeleton } from "@/components/cards";
import { HomeScreen } from "@/components/screens/HomeScreen";

export default function HomePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HomeScreen />
    </Suspense>
  );
}
