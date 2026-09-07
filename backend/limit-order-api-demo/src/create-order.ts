import axios from "axios";
import { BaseUrl } from "./const";
import { getSigner, checkTokenApproval, utils } from "./utils";

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

    if (!utils.isNativeToken(inToken.address)) {
      const contractAddress = utils.getLimitContractAddress("base");
      const approvalAmount = BigInt(Number(inToken.amount));
      await checkTokenApproval(inToken.address, contractAddress, approvalAmount, wallet.address, signer);
    }

    const makerAmount = inToken.amount.toString();
    const takerAmount = outToken.amount.toString();

    const message = `makerAsset:\n${inToken.address}\ntakerAsset:\n${outToken.address}\nmakerAmount:\n${makerAmount}\ntakerAmount:\n${takerAmount}\nexpireTime:\n${expireTime}`;
    const signature = await signer.signMessage(message);

    const order = {
      makerAsset: inToken.address,
      takerAsset: outToken.address,
      makerAmount,
      takerAmount,
      orderMaker: wallet.address,
      expireTime,
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
