import type { Metadata } from "next";
import { HospitalList } from "@/components/HospitalList";

export const metadata: Metadata = { title: "病院と締切｜Tsugiraku Navi" };

export default function HospitalsPage() {
  return <HospitalList />;
}
