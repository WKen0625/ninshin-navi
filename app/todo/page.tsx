import type { Metadata } from "next";
import { TodoList } from "@/components/TodoList";

export const metadata: Metadata = { title: "今週やること｜妊娠手続きNavi｜Tsugiraku" };

export default function TodoPage() {
  return <TodoList />;
}
