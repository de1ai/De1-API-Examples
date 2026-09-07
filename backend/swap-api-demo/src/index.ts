import { getGasPrice, getTokenList, getAllowance, quote } from "./lib"; // getGasPrice, getTokenList, getAllowance, approve, quote, swap
import { PrivateKey } from "./const";
import { ethers } from "ethers";

const chainId = '8453';
const inTokenAddress = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const account = new ethers.Wallet(PrivateKey).address;

// Test cases
async function runTests() {
  try {
    console.log('Starting tests...');

    console.log('\nTesting getGasPrice:');
    await getGasPrice(chainId);

    console.log('\nTesting getTokenList:');
    await getTokenList(chainId);

    console.log('\nTesting getAllowance:');
    await getAllowance(chainId, account, inTokenAddress);

    console.log('\nTesting approve (uncomment to run):');
    // await approve(chainId, inTokenAddress);

    console.log('\nTesting quote:');
    await quote(chainId);

    console.log('\nTesting swap:');
    // await swap(chainId);

    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

runTests();
