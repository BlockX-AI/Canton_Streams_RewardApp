'use strict';

/**
 * Exact template paths from .daml source files.
 * Format: 'ModuleName:TemplateName'
 * The Canton client prepends the packageId.
 */
const T = {
  StreamAgreement  : 'StreamCore:StreamAgreement',
  StreamFactory    : 'StreamCore:StreamFactory',

  StreamPool       : 'StreamPool:StreamPool',
  PoolFactory      : 'StreamPool:PoolFactory',

  VestingStream    : 'VestingStream:VestingStream',
  VestingFactory   : 'VestingStream:VestingFactory',

  MilestoneStream  : 'MilestoneStream:MilestoneStream',
  MilestoneFactory : 'MilestoneStream:MilestoneFactory',

  GrowToken        : 'GrowToken:GrowToken',
  Faucet           : 'GrowToken:Faucet',
  Allowance        : 'GrowToken:Allowance',
};

module.exports = T;
