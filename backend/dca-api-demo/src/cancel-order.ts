import axios from "axios";
import { BaseUrl } from "./const";
import { getSigner } from "./utils";

/**
 * Cancel DCA order using Ethers.js
 * Mirrors the frontend Dca.js cancelOrder flow (with private key instead of wallet popup).
 * @param chainId chain id
 * @param orderHash order hash string
 */
export async function cancelEthers(chainId: string, orderHash: string) {
  try {
    const { signer } = await getSigner(chainId);
    const message = `orderHash:\n${orderHash}`;
    const signature = await signer.signMessage(message);

    const result = await axios.post(
      `${BaseUrl}/v2/${chainId}/dca/cancel`,
      { orderHash, signature }
    );

    console.log('Ethers.js cancel order result:', result.data?.data);
    return result.data;
  } catch (error) {
    console.error('Ethers.js cancel order failed:', error);
    throw error;
  }
}
