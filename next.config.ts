import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next dev が CLAUDE.md に自動で追記するのを止める（CLAUDE.md はこのプロジェクトの指針で、人が管理する）
  agentRules: false,
  // Supabase 未設定のときは data/ のYAMLを直接読むので、サーバー側の成果物に含める
  outputFileTracingIncludes: {
    "/api/**": ["./data/**"],
    "/": ["./data/service-area.yaml", "./content/articles/**"],
    "/navi": ["./data/service-area.yaml"],
    "/en": ["./data/service-area.yaml", "./content/articles/**"],
    "/contact": ["./data/service-area.yaml"],
    "/articles": ["./content/articles/**"],
    "/articles/[slug]": ["./content/articles/**"],
    "/terms": ["./content/legal/**"],
    "/policy": ["./content/legal/**"],
  },
};

export default nextConfig;
