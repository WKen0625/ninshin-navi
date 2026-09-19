import type { Metadata } from "next";
import { HospitalList } from "@/components/HospitalList";

export const metadata: Metadata = { title: "病院と締切｜妊娠手続きナビ（仮称）" };

export default function HospitalsPage() {
  return <HospitalList />;
}
