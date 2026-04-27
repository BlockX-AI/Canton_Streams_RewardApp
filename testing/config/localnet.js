'use strict';

const DEFAULT_NS  = '1220e2c67d34d1e650204b3a85417ebcbcc20c637e885be34f390d6aebbb1cd6d06e';
const DEFAULT_PKG = 'ede21c7dd468efab3df48ff5638d165bd6a82f551f608ae19dbfecd21c3c6d84';

const NS  = process.env.CANTON_NAMESPACE   || DEFAULT_NS;
const PKG = process.env.CANTON_PACKAGE_ID  || DEFAULT_PKG;

const config = {
  cantonUrl : process.env.CANTON_LEDGER_API_URL || 'http://localhost:7575',
  userId    : process.env.CANTON_USER_ID        || 'participant_admin',
  packageId : PKG,
  namespace : NS,

  parties: {
    Admin : process.env.CANTON_ADMIN_PARTY || `Admin::${NS}`,
    Alice : process.env.CANTON_ALICE_PARTY || `Alice::${NS}`,
    Bob   : process.env.CANTON_BOB_PARTY   || `Bob::${NS}`,
    Carol : process.env.CANTON_CAROL_PARTY || `Carol::${NS}`,
  },

  thresholds: {
    minWithdraw    : 0.0001,
    poolTopUpAt    : 50,
    poolTopUpAmount: 10000,
  },
};

module.exports = config;
