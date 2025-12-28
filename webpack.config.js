const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    'background/service-worker': './src/background/service-worker.ts',
    'content/content-script': './src/content/content-script.ts',
    'options/options': './src/options/options.ts',
    'popup/popup': './src/popup/popup.ts',
    'onboarding/onboarding': './src/onboarding/onboarding.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/options/options.html', to: 'options/options.html' },
        { from: 'src/popup/popup.html', to: 'popup/popup.html' },
        { from: 'src/onboarding/onboarding.html', to: 'onboarding/onboarding.html' },
        { from: 'assets', to: 'assets' },
      ],
    }),
  ],
  optimization: {
    minimize: false,
  },
  devtool: 'source-map',
};
