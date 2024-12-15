import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useEthersProvider } from '@/hooks/useEthersProvider';
import LPStaking_ABI from '@/assets/abi/LPStaking.json';
import UNIV2_ABI from '@/assets/abi/UNI-V2.json';
import LIBERC20_ABI from '@/assets/abi/LIBERC20.json';
import { useEthersSigner } from '@/hooks/useEthersSigner';
import { SCPairData, TokenInfo } from '@/types';
import { useAtom } from 'jotai';
import { rewardTokenAtom } from '@/store/rewardToken';
import ERC20_ABI from '@/assets/abi/ERC20.json';
import { notificationAtom } from '@/store/notification';

const STAKING_CONTRACT_ADDRESS = import.meta.env.VITE_STAKING_CONTRACT_ADDRESS as string;
const REWARD_TOKEN_ADDRESS = import.meta.env.VITE_REWARD_TOKEN_ADDRESS as string;

interface ContractContextType {
  contract: ethers.Contract | null;
  isLoading: boolean;
  error: Error | null;
  // Core staking functions
  stake: (lpToken: string, amount: string) => Promise<void>;
  unstake: (lpToken: string, amount: string) => Promise<void>;
  claimRewards: (lpToken: string) => Promise<void>;

  // Propose functions
  proposeSetDailyRewardRate: (newRate: string) => Promise<void>;
  proposeUpdatePairWeights: (lpTokens: string[], weights: string[]) => Promise<void>;
  proposeAddPair: (lpToken: string, pairName: string, platform: string, weight: string) => Promise<void>;
  approveAction: (actionId: number) => Promise<void>;
  executeAction: (actionId: number) => Promise<void>;

  // User info
  getUserStakeInfo: (
    userAddress: string,
    lpToken: string
  ) => Promise<{
    amount: bigint;
    pendingRewards: bigint;
    lastRewardTime: bigint;
  }>;

  // Pair info
  getPairInfo: (lpToken: string) => Promise<{
    token: string;
    platform: string;
    weight: bigint;
    isActive: boolean;
  }>;
  getPairs: () => Promise<SCPairData[]>;

  // Contract state
  getDailyRewardRate: () => Promise<bigint>;
  getTotalWeight: () => Promise<bigint>;
  getRewardToken: () => Promise<string>;
  getSigners: () => Promise<string[]>;
  getActionCounter: () => Promise<bigint>;
  getTVL: (lpToken: string) => Promise<bigint>;

  // Token info
  getTokenInfo: (address: string) => Promise<TokenInfo>;
  getERC20Balance: (address: string, tokenAddress: string) => Promise<bigint>;
}

const ContractContext = createContext<ContractContextType>({
  contract: null,
  isLoading: true,
  error: null,
  stake: async () => {},
  unstake: async () => {},
  claimRewards: async () => {},
  proposeSetDailyRewardRate: async () => {},
  proposeUpdatePairWeights: async () => {},
  proposeAddPair: async () => {},
  approveAction: async () => {},
  executeAction: async () => {},
  getUserStakeInfo: async () => ({ amount: BigInt(0), pendingRewards: BigInt(0), lastRewardTime: BigInt(0) }),
  getPairInfo: async () => ({ token: '', platform: '', weight: BigInt(0), isActive: false }),
  getPairs: async () => [],
  getDailyRewardRate: async () => BigInt(0),
  getTotalWeight: async () => BigInt(0),
  getRewardToken: async () => '',
  getSigners: async () => [],
  getActionCounter: async () => BigInt(0),
  getTVL: async () => BigInt(0),
  getTokenInfo: async () => ({ address: '', symbol: '', decimals: 0 }),
  getERC20Balance: async () => BigInt(0),
});

export const useContract = () => useContext(ContractContext);

interface ContractProviderProps {
  children: ReactNode;
}

export const ContractProvider = ({ children }: ContractProviderProps) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [rewardTokenContract, setRewardTokenContract] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [rewardToken, setRewardToken] = useAtom(rewardTokenAtom);

  const [, setNotification] = useAtom(notificationAtom);

  const provider = useEthersProvider();
  const signer = useEthersSigner();

  useEffect(() => {
    setNotification({
      message: error?.message || '',
      severity: 'error',
      variant: 'filled',
      duration: 6000,
    });
  }, [JSON.stringify(error)]);

  useEffect(() => {
    const initContract = async () => {
      if (!provider || !signer) {
        setIsLoading(false);
        return;
      }

      try {
        const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, LPStaking_ABI, provider);
        const rewardTokenContract = new ethers.Contract(REWARD_TOKEN_ADDRESS, LIBERC20_ABI, provider);
        setContract(stakingContract.connect(signer) as ethers.Contract);
        setRewardTokenContract(rewardTokenContract.connect(signer) as ethers.Contract);
        setError(null);
      } catch (err) {
        setError(new Error('Failed to initialize contract'));
      } finally {
        setIsLoading(false);
      }
    };

    initContract();
  }, [provider, signer]);

  useEffect(() => {
    const getRewardToken = async () => {
      const symbol = await rewardTokenContract?.symbol();
      const decimals = await rewardTokenContract?.decimals();
      setRewardToken({
        address: REWARD_TOKEN_ADDRESS,
        symbol: symbol,
        decimals: decimals,
      });
    };
    getRewardToken();
  }, [rewardTokenContract]);

  // Core staking functions
  const stake = async (lpToken: string, amount: string) => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      const tx = await contract.stake(lpToken, ethers.parseEther(amount));
      await tx.wait();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to stake'));
    }
  };

  const unstake = async (lpToken: string, amount: string) => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      const tx = await contract.unstake(lpToken, ethers.parseEther(amount));
      await tx.wait();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to unstake'));
    }
  };

  const claimRewards = async (lpToken: string) => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      const tx = await contract.claimRewards(lpToken);
      await tx.wait();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to claim rewards'));
    }
  };

  // Propose functions
  const proposeSetDailyRewardRate = async (newRate: string) => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      const tx = await contract.proposeSetDailyRewardRate(ethers.parseEther(newRate));
      await tx.wait();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to propose set daily reward rate'));
    }
  };

  const proposeUpdatePairWeights = async (lpTokens: string[], weights: string[]) => {
    if (!contract) throw new Error('Contract not initialized');
    const weightsInWei = weights.map((w) => ethers.parseEther(w));
    try {
      const tx = await contract.proposeUpdatePairWeights(lpTokens, weightsInWei);
      await tx.wait();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to propose update pair weights'));
    }
  };

  const proposeAddPair = async (lpToken: string, pairName: string, platform: string, weight: string) => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      const tx = await contract.proposeAddPair(lpToken, pairName, platform, ethers.parseEther(weight));
      await tx.wait();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to propose add pair'));
    }
  };

  const approveAction = async (actionId: number) => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      const tx = await contract.approveAction(actionId);
      await tx.wait();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to approve action'));
    }
  };

  const executeAction = async (actionId: number) => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      const tx = await contract.executeAction(actionId);
      await tx.wait();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to execute action'));
    }
  };

  // User info
  const getUserStakeInfo = async (userAddress: string, lpToken: string) => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      const [amount, pendingRewards, lastRewardTime] = await contract.userStakes(userAddress, lpToken);
      return { amount, pendingRewards, lastRewardTime };
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to get user stake info'));
      return { amount: BigInt(0), pendingRewards: BigInt(0), lastRewardTime: BigInt(0) };
    }
  };

  // Pair info
  const getPairInfo = async (lpToken: string) => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      const [token, platform, weight, isActive] = await contract.pairs(lpToken);
      return { token, platform, weight, isActive };
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to get pair info'));
      return { token: '', platform: '', weight: BigInt(0), isActive: false };
    }
  };

  const getPairs = async () => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      return await contract.getPairs();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to get pairs'));
      return [];
    }
  };

  // Contract state
  const getDailyRewardRate = async () => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      return await contract.dailyRewardRate();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to get daily reward rate'));
      return BigInt(0);
    }
  };

  const getTotalWeight = async () => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      return await contract.totalWeight();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to get total weight'));
      return BigInt(0);
    }
  };

  const getRewardToken = async () => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      return await contract.rewardToken();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to get reward token'));
      return '';
    }
  };

  const getSigners = async () => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      return await contract.signers();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to get signers'));
      return [];
    }
  };

  const getActionCounter = async () => {
    if (!contract) throw new Error('Contract not initialized');
    try {
      return await contract.actionCounter();
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to get action counter'));
      return BigInt(0);
    }
  };

  const getTVL = async (lpToken: string) => {
    if (!contract || !provider) throw new Error('Contract not initialized');
    try {
      const univ2Contract = new ethers.Contract(lpToken, UNIV2_ABI, provider);
      const balance = await univ2Contract.balanceOf(STAKING_CONTRACT_ADDRESS);
      return balance;
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to get TVL'));
      return BigInt(0);
    }
  };

  const getMyShare = async (address: string) => {};

  const getERC20Balance = async (address: string, tokenAddress: string) => {
    if (!provider) throw new Error('Provider not initialized');
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await tokenContract.balanceOf(address);
      return balance;
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to get ERC20 balance'));
      return BigInt(0);
    }
  };

  const getTokenInfo = async (address: string) => {
    if (!provider) throw new Error('Provider not initialized');
    try {
      const tokenContract = new ethers.Contract(address, ERC20_ABI, provider);
      const symbol = await tokenContract.symbol();
      const decimals = await tokenContract.decimals();
      return { address, symbol, decimals };
    } catch (err) {
      console.log(err);
      setError(new Error('Failed to get token info'));
      return { address: '', symbol: '', decimals: 0 };
    }
  };

  return (
    <ContractContext.Provider
      value={{
        contract,
        isLoading,
        error,
        // Core staking functions
        stake,
        unstake,
        claimRewards,
        // Propose functions
        proposeSetDailyRewardRate,
        proposeUpdatePairWeights,
        proposeAddPair,
        approveAction,
        executeAction,
        // User info
        getUserStakeInfo,
        // Pair info
        getPairInfo,
        getPairs,
        // Contract state
        getDailyRewardRate,
        getTotalWeight,
        getRewardToken,
        getSigners,
        getActionCounter,
        getTVL,
        // Token info
        getTokenInfo,
        getERC20Balance,
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};
