module.exports = {
  title: "",
  description:
    "The documentation of Mookme, a simple and easy-to-use, yet powerful and language agnostic git hook for monorepos.",
  head: [["link", { rel: "icon", href: "/favicon.ico" }]],
  smoothScroll: true,
  patterns: ["**/*.md", "**/*.vue"],
  themeConfig: {
    logo: "/logo.png",
    displayAllHeaders: true,
    sidebar: [
      "",
      "get-started/",
      "examples/",
      "references/"
    ],
    smoothScroll: true
  }
};
