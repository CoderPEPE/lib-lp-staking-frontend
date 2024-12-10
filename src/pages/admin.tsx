import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from 'ethers';
import { useAtom } from 'jotai';
import { userInfoAtom } from '@/store/userInfo';
import { useNavigate } from 'react-router-dom';
import { LPStaking, LPStaking__factory } from '@/typechain-types';

const STAKING_CONTRACT_ADDRESS = import.meta.env.STAKING_CONTRACT_ADDRESS as string;

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [stakingContract, setStakingContract] = useState<LPStaking | null>(null);
  const [newDailyRate, setNewDailyRate] = useState<string>('0');
  const [newPairAddress, setNewPairAddress] = useState<string>('');
  const [newPairPlatform, setNewPairPlatform] = useState<string>('');
  const [newPairWeight, setNewPairWeight] = useState<string>('0');
  const [actionId, setActionId] = useState<string>('');
  const [actionCounter, setActionCounter] = useState<bigint>();
  const [requiredApprovals, setRequiredApprovals] = useState<bigint>();
  const [actionDetails, setActionDetails] = useState<any>();
  const [userInfo, setUserInfo] = useAtom(userInfoAtom);

  useEffect(() => {
    async function init() {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);
        const signer = await provider.getSigner();
        const contract = LPStaking__factory.connect(STAKING_CONTRACT_ADDRESS, signer);
        setStakingContract(contract);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function loadContractData() {
      if (stakingContract) {
        const counter = await stakingContract.actionCounter();
        const approvals = await stakingContract.REQUIRED_APPROVALS();
        setActionCounter(counter);
        setRequiredApprovals(approvals);
      }
    }
    loadContractData();
  }, [stakingContract]);

  useEffect(() => {
    async function loadActionDetails() {
      if (stakingContract && actionId) {
        const details = await stakingContract.actions(BigInt(actionId));
        setActionDetails(details);
      }
    }
    loadActionDetails();
  }, [stakingContract, actionId]);

  if (!userInfo.isAdmin) {
    navigate('/');
    return null;
  }

  // Contract Write Functions
  const proposeSetDailyRewardRate = async (rate: bigint) => {
    if (!stakingContract) return;
    const tx = await stakingContract.proposeSetDailyRewardRate(rate);
    await tx.wait();
  };

  const proposeAddPair = async (lpToken: string, platform: string, weight: bigint) => {
    if (!stakingContract) return;
    const tx = await stakingContract.proposeAddPair(lpToken, platform, weight);
    await tx.wait();
  };

  const approveAction = async (actionId: bigint) => {
    if (!stakingContract) return;
    const tx = await stakingContract.approveAction(actionId);
    await tx.wait();
  };

  const executeAction = async (actionId: bigint) => {
    if (!stakingContract) return;
    const tx = await stakingContract.executeAction(actionId);
    await tx.wait();
  };

  // UI Functions
  const handleProposeDailyRate = async () => {
    if (newDailyRate !== '0') {
      try {
        await proposeSetDailyRewardRate(ethers.parseEther(newDailyRate));
      } catch (error) {
        console.error('Error proposing daily rate:', error);
      }
    }
  };

  const handleProposeAddPair = async () => {
    if (newPairAddress && newPairPlatform && newPairWeight !== '0') {
      try {
        await proposeAddPair(newPairAddress, newPairPlatform, ethers.parseEther(newPairWeight));
      } catch (error) {
        console.error('Error proposing new pair:', error);
      }
    }
  };

  const handleApproveAction = async () => {
    if (actionId) {
      try {
        await approveAction(BigInt(actionId));
      } catch (error) {
        console.error('Error approving action:', error);
      }
    }
  };

  const handleExecuteAction = async () => {
    if (actionId) {
      try {
        await executeAction(BigInt(actionId));
      } catch (error) {
        console.error('Error executing action:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">Admin Panel</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Set Daily Reward Rate</h2>
            <input
              type="number"
              value={newDailyRate}
              onChange={(e) => setNewDailyRate(e.target.value)}
              placeholder="New daily rate"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <button onClick={handleProposeDailyRate} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              Propose New Rate
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Add New Pair</h2>
            <input
              type="text"
              value={newPairAddress}
              onChange={(e) => setNewPairAddress(e.target.value)}
              placeholder="LP Token Address"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <input
              type="text"
              value={newPairPlatform}
              onChange={(e) => setNewPairPlatform(e.target.value)}
              placeholder="Platform Name"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <input
              type="number"
              value={newPairWeight}
              onChange={(e) => setNewPairWeight(e.target.value)}
              placeholder="Weight"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <button onClick={handleProposeAddPair} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              Propose New Pair
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Multi-Sig Actions</h2>
            <div className="mb-4">
              <p className="text-gray-600">Total Actions: {actionCounter?.toString()}</p>
              <p className="text-gray-600">Required Approvals: {requiredApprovals?.toString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  value={actionId}
                  onChange={(e) => setActionId(e.target.value)}
                  placeholder="Action ID"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                />
                {actionDetails && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <p>Action Type: {actionDetails.actionType}</p>
                    <p>Approvals: {actionDetails.approvals?.toString()}</p>
                    <p>Executed: {actionDetails.executed ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <button onClick={handleApproveAction} className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                  Approve Action
                </button>
                <button 
                  onClick={handleExecuteAction} 
                  disabled={!actionDetails || actionDetails.executed || actionDetails.approvals < (requiredApprovals || 0)}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400"
                >
                  Execute Action
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;