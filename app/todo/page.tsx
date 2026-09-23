import type { Metadata } from "next";
import { TodoList } from "@/components/TodoList";

export const metadata: Metadata = { title: "今週やること｜Tsugiraku Navi" };

export default function TodoPage() {
  return <TodoList />;
}
