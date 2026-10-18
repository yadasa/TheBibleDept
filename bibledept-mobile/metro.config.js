const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Share the dependency-free brand palette with the existing native app.
config.watchFolders = [path.resolve(__dirname, '../bibledept-app/src/config/color')];
module.exports = config;
