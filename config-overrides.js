const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    "http": require.resolve("stream-http"),
    "zlib": require.resolve("browserify-zlib")
  };
  return config;
};
