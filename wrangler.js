export default {
  name: "manolito-infinito",
  main: "src/index.js",
  compatibility_date: "2026-07-21",
  compatibility_flags: ["nodejs_compat"],
  assets: {
    directory: "./public",
    binding: "ASSETS",
    run_worker_first: ["/api/*"],
    not_found_handling: "single-page-application"
  }
};
