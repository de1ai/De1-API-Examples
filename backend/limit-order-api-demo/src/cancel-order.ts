import axios from "axios";
import { BaseUrl } from "./const";
import { getSigner } from "./utils";

/**
 * Cancel limit order using Ethers.js
 * This function cancels a limit order using a private key, mirroring the frontend cancel flow.
 * @param chainId chain id
 * @param orderHash order hash string
 * @returns 'success'
 */
export async function cancelEthers(chainId: string, orderHash: string) {
  try {
    const { signer } = await getSigner(chainId);
    const message = `orderHash:\n${orderHash}`;
    const signature = await signer.signMessage(message);

    const result = await axios.post(
      `${BaseUrl}/v2/${chainId}/limit-order/cancelLimitOrder`,
      { orderHash, signature }
    );

    console.log('Ethers.js cancel order result:', result.data?.data);
    return result.data;
  } catch (error) {
    console.error('Ethers.js cancel order failed:', error);
    throw error;
  }
}
