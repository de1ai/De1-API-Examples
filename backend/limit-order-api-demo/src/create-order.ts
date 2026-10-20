import axios from "axios";
import { ethers } from "ethers";
import { BaseUrl } from "./const";
import { getSigner, checkTokenApproval, utils } from "./utils";

// EIP-712 types for the limit order (openocean Limit Order Protocol v2)
const LIMIT_ORDER_EIP712_TYPES = {
  Order: [
    { name: "from", type: "address" },
    { name: "srcToken", type: "address" },
    { name: "dstToken", type: "address" },
    { name: "amountIn", type: "uint256" },
    { name: "minReturn", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

/**
 * Create limit order using Ethers.js
 * This function creates a limit order using a private key, mirroring the frontend LimitOrder flow.
 * @param chainId chain id
 * @param inToken in token info { address, decimals, symbol, amount }
 * @param outToken out token info { address, decimals, symbol, amount }
 * @param expireTime expire time (ms)
 * @returns order object
 */
export async function createEthers(
  chainId: string,
  inToken: { address: string; decimals: number; symbol: string; amount: number | string },
  outToken: { address: string; decimals: number; symbol: string; amount: number | string },
  expireTime: number
) {
  try {
    const { wallet, signer } = await getSigner(chainId);

    const contractAddress = utils.getLimitContractAddress("base");

    if (!utils.isNativeToken(inToken.address)) {
      const approvalAmount = BigInt(Number(inToken.amount));
      await checkTokenApproval(inToken.address, contractAddress, approvalAmount, wallet.address, signer);
    }

    const makerAmount = inToken.amount.toString();
    const takerAmount = outToken.amount.toString();

    // Sign the order with EIP-712 typed data
    const deadline = Math.floor(Date.now() / 1000) + Math.floor(Number(expireTime) / 1000);
    const domain = {
      name: "openocean Limit Order Protocol",
      version: "2",
      chainId: Number(chainId),
      verifyingContract: contractAddress,
    };
    const value = {
      from: wallet.address,
      srcToken: ethers.getAddress(inToken.address),
      dstToken: ethers.getAddress(outToken.address),
      amountIn: makerAmount,
      minReturn: takerAmount,
      deadline,
    };
    const orderHash = ethers.TypedDataEncoder.hash(domain, LIMIT_ORDER_EIP712_TYPES, value);
    const signature = await signer.signTypedData(domain, LIMIT_ORDER_EIP712_TYPES, value);

    const order = {
      makerAsset: inToken.address,
      takerAsset: outToken.address,
      makerAmount,
      takerAmount,
      orderMaker: wallet.address,
      expireTime,
      orderHash,
      deadline,
      signature,
      referrer: '',
      referrerFee: 0,
      enabledDexIds: '',
      disabledDexIds: ''
    };

    const result = await axios.post(
      `${BaseUrl}/v2/${chainId}/limit-order`,
      order,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('Ethers.js create order result:', result.data);
    return result.data;
  } catch (error) {
    console.error('Ethers.js create order failed:', error);
    throw error;
  }
}
