import { NativeModules } from 'react-native'

const BibleDeptConfig = NativeModules.BibleDeptConfig.getConstants() as {
  application: {
    env: 'dev' | 'prod'
    name: string
    variant: 'bibledept'
    bundleId: {
      ios: string
      android: string
    }
    contactUrl: string
  }
  branchIO: {
    domains: string[]
    uriScheme: string
    testMode: boolean
    key: {
      live: string
      test: string
    }
  }
  codepush: { android: string; ios: string }
  segment: { key: string }
  bibleApi: { key: string; server: string; fumsServer: string }
  streamIO: { key: string; server: string }
  stripe: {
    merchant: string
  }
}

devLog('BibleDeptConfig: ', BibleDeptConfig)

const FEATURES_GATE = {
  SUPPORTED_LANGUAGES:
    BibleDeptConfig.application.env === 'dev'
      ? ['en', 'es', 'de', 'fr', 'nl', 'da', 'it', 'pt', 'id', 'ru', 'sv', 'uk', 'he', 'vi']
      : ['en', 'es'],
  BIBLE_API_ENABLED: true,
  // https://www.notion.so/Bible-Translations-6cc51ac7e91348ed933002dc90d72ebe
  BIBLE_WHITELIST: {
    en: ['ESV', 'KJV', 'NIV', 'ASV'],
    es: ['RVR09', 'BES'],
    de: ['ELBBK', 'L1912'],
    fr: [],
    nl: ['NLD1939'],
    da: [],
    it: [],
    pt: ['BLT'],
    id: ['TSI'],
    ru: [],
    sv: ['SKB'],
    uk: ['BHNY'],
    he: ['HDZP'],
    vi: ['OVCB', 'VIE1934'],
  },
}

const GIVE_URL = 'https://www.thebibledept.com/give'

export default {
  ENV: BibleDeptConfig.application.env,
  VARIANT: BibleDeptConfig.application.variant,
  APP_NAME: BibleDeptConfig.application.name,
  CONTACT_URL: BibleDeptConfig.application.contactUrl,
  BUNDLE_ID: {
    IOS: BibleDeptConfig.application.bundleId.ios,
    ANDROID: BibleDeptConfig.application.bundleId.android,
  },
  SEGMENT: {
    KEY: BibleDeptConfig.segment.key,
  },
  BRANCH: {
    DOMAIN: BibleDeptConfig.branchIO.domains,
  },
  STREAMIO: {
    KEY: BibleDeptConfig.streamIO.key,
    SERVER: BibleDeptConfig.streamIO.server,
  },
  CODEPUSH: {
    IOS: BibleDeptConfig.codepush.ios,
    ANDROID: BibleDeptConfig.codepush.android,
  },
  BIBLE_API: {
    KEY: BibleDeptConfig.bibleApi.key,
    SERVER: BibleDeptConfig.bibleApi.server,
    FUMS_SERVER: BibleDeptConfig.bibleApi.fumsServer,
  },
  FEATURES_GATE,
  SERVER: BibleDeptConfig.application.env === 'dev' ? '' : '',
  STRIPE:
    BibleDeptConfig.application.env === 'dev'
      ? {
          KEY: '',
          URL: '',
          MERCHANT: BibleDeptConfig.stripe.merchant,
        }
      : {
          KEY: '',
          URL: '',
          MERCHANT: BibleDeptConfig.stripe.merchant,
        },
  GIVE_URL,
  DASHBOARD_URL: BibleDeptConfig.application.env === 'dev' ? '' : '',
}
