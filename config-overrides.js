const webpack = require('webpack');

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    "http": require.resolve("stream-http"),
    "zlib": require.resolve("browserify-zlib"),
    "https": require.resolve("https-browserify"),
    "url": require.resolve("url/"),
    "stream": require.resolve("stream-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "vm": require.resolve("vm-browserify"),
    "buffer": require.resolve("buffer/"),
    "process": require.resolve("process/browser")
  });
  config.resolve.fallback = fallback;
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ]);
  return config;
};
