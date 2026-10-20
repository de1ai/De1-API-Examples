export const RPCS = { '8453': 'https://mainnet.base.org' };

export const PrivateKey = 'your private key';

export const BaseUrl = 'https://open-api.de1.exchange';

export const NATIVE_TOKEN_ADDRESSES = [
  "0x0000000000000000000000000000000000000000",
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
];

export const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

export const PERMIT2_ABI = [
  "function permit2NextNonce(address owner) view returns (uint256)"
];

export const GASLESS_SPENDER = '0xB1DD8E9ebbF5F150B75642D1653dF0dacd0bfF47';

export const PERMIT2_ADDRESSES = {
  eth: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  arbitrum: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  base: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  bsc: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  sonic: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  sei: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  hyperevm: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  avax: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  uni: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
};

export const GASLESS_CHAINS = ['arbitrum', 'bsc', 'sonic', 'base', 'sei', 'eth', 'hyperevm', 'avax', 'uni'];
