const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    "http": require.resolve("stream-http"),
    "zlib": require.resolve("browserify-zlib"),
    "https": require.resolve("https-browserify")
  };
  return config;
};
