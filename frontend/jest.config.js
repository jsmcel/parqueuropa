module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  // setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'], // Commented out due to deprecation of @testing-library/jest-native
  // @testing-library/react-native v12.4+ includes built-in matchers.
  // If specific matchers from jest-native are found to be missing, this line can be revisited.
};
