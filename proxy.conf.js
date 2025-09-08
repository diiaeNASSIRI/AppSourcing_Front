module.exports = [
  {
    context: [
      "/auth",
      "/admin",
      "/besoins",
      "/candidats",
      "/propositions"
    ],
    target: "http://localhost:8081",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function (req, res, proxyOptions) {
      if (req && req.headers && req.headers.accept && req.headers.accept.includes("text/html")) {
        // Serve SPA index.html on navigations; don't proxy to backend
        return req.url;
      }
    }
  }
];

