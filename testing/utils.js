'use strict';

const N = v => parseFloat(String(v ?? 0)) || 0;
const S = v => String(v ?? '');

function shortId(cid) { return cid ? cid.slice(0, 16) + '…' : '(none)'; }

function isoNow() { return new Date().toISOString(); }

module.exports = { N, S, shortId, isoNow };
