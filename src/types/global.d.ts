// Use type safe message keys with `next-intl`
type Messages = typeof import('../locales/en.json');

// eslint-disable-next-line ts/consistent-type-definitions
declare interface IntlMessages extends Messages {}

declare global {
  // Organization-related types removed as organization requirement is no longer needed
}
