import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "妊娠手続きNavi｜Tsugiraku",
    short_name: "Tsugiraku",
    start_url: "/navi",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d4ed8",
    lang: "ja",
  };
}
