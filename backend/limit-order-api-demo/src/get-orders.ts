import axios from "axios";
import { BaseUrl } from "./const";

/**
 * Get user's limit order list
 * Mirrors the frontend LimitOrder.js getLimitOrders query.
 * @param chainId chain id
 * @param address User wallet address
 * @returns Array of order objects
 */
export async function getOrderList(chainId: string, address: string) {
  try {
    const reqUrl = `${BaseUrl}/v2/${chainId}/limit-order/address/${address}?page=1&limit=100&statuses=[1,2,5]&sortBy=createDateTime&exclude=0`;
    const { data } = await axios.get(reqUrl);
    return data ? data.data : [];
  } catch (error) {
    console.error('Failed to get order list:', error);
    throw error;
  }
}
