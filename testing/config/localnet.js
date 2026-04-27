'use strict';

const NS  = '1220e2c67d34d1e650204b3a85417ebcbcc20c637e885be34f390d6aebbb1cd6d06e';
const PKG = 'ede21c7dd468efab3df48ff5638d165bd6a82f551f608ae19dbfecd21c3c6d84';

const config = {
  cantonUrl : process.env.CANTON_LEDGER_API_URL || 'http://localhost:7575',
  userId    : process.env.CANTON_USER_ID        || 'participant_admin',
  packageId : process.env.CANTON_PACKAGE_ID     || PKG,
  namespace : NS,

  parties: {
    Admin : `Admin::${NS}`,
    Alice : `Alice::${NS}`,
    Bob   : `Bob::${NS}`,
    Carol : `Carol::${NS}`,
  },

  thresholds: {
    minWithdraw    : 0.0001,
    poolTopUpAt    : 50,
    poolTopUpAmount: 10000,
  },
};

module.exports = config;
