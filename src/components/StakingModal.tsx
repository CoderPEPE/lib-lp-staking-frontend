import { useEthersSigner } from '@/hooks/useEthersSigner';
import { useContract } from '@/providers/ContractProvider';
import { refetchAtom } from '@/store/refetch';
import { PairInfo, TokenInfo } from '@/types';
import { Button, Paper } from '@mui/material';
import { Box, Typography, Slider, Stack, DialogContent, Tab, Divider } from '@mui/material';
import { Dialog, Tabs, TextField } from '@mui/material';
import { ethers } from 'ethers';
import { useAtom } from 'jotai';
import { SetStateAction, useEffect, useState, useRef } from 'react';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CloseIcon from '@mui/icons-material/Close';
import StakeIcon from '@mui/icons-material/AddCircleOutline';
import UnstakeIcon from '@mui/icons-material/RemoveCircleOutline';
import RewardsIcon from '@mui/icons-material/LocalAtm';
import WalletIcon from '@mui/icons-material/AccountBalanceWallet';
import IconButton from '@mui/material/IconButton';

interface StakingModalProps {
  selectedPair: PairInfo | null;
  isModalOpen: boolean;
  setIsModalOpen: (value: boolean) => void;
  initialTab?: number;
}

const StakingModal: React.FC<StakingModalProps> = ({ selectedPair, isModalOpen, setIsModalOpen, initialTab = 0 }) => {
  const [tabValue, setTabValue] = useState(initialTab);
  const [stakePercent, setStakePercent] = useState<number>(100);
  const [unstakePercent, setUnstakePercent] = useState<number>(100);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [pendingRewardsInWei, setPendingRewardsInWei] = useState<bigint>(BigInt(0));
  const [userStakeInfo, setUserStakeInfo] = useState<{
    amount: bigint;
    pendingRewards: bigint;
    lastRewardTime: bigint;
  } | null>(null);
  const [, setRefetch] = useAtom(refetchAtom);
  const { stake, unstake, claimRewards, getTokenInfo, getERC20Balance, getPendingRewards, getUserStakeInfo } = useContract();
  const signer = useEthersSigner();

  // Add flags to track user interaction source
  const isStakeSliderChange = useRef(false);
  const isUnstakeSliderChange = useRef(false);

  const handleStake = async () => {
    if (!selectedPair) return;
    const amount = stakeAmount || ((stakePercent * balance) / 100).toString();
    if (Number(amount) === 0) return;
    await stake(selectedPair.lpToken, amount);
    setIsModalOpen(false);
    setRefetch(true);
  };

  const handleUnstake = async () => {
    if (!selectedPair || !signer) return;
    const stakedAmount = await getUserStakeInfo(signer.address, selectedPair.lpToken);
    const amount = unstakeAmount || ((unstakePercent * Number(stakedAmount.amount)) / 100).toString();
    if (Number(amount) === 0) return;
    await unstake(selectedPair.lpToken, amount);
    setIsModalOpen(false);
    setRefetch(true);
  };

  const handleWithdraw = async () => {
    if (!selectedPair) return;
    await claimRewards(selectedPair.lpToken);
    setIsModalOpen(false);
    setRefetch(true);
  };

  const handleStakeAmountChange = (value: string) => {
    isStakeSliderChange.current = false;
    if (!value) {
      setStakeAmount('');
      setStakePercent(0);
      return;
    }
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 0) return;
    if (numValue > balance) {
      setStakeAmount(balance.toString());
      setStakePercent(100);
      return;
    }
    setStakeAmount(value);
    setStakePercent((numValue * 100) / balance);
  };

  const handleUnstakeAmountChange = (value: string) => {
    isUnstakeSliderChange.current = false;
    if (!selectedPair || !userStakeInfo) return;
    if (!value) {
      setUnstakeAmount('');
      setUnstakePercent(0);
      return;
    }
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 0) return;
    const stakedAmount = Number(ethers.formatEther(userStakeInfo.amount));
    if (numValue > stakedAmount) {
      setUnstakeAmount(stakedAmount.toString());
      setUnstakePercent(100);
      return;
    }
    setUnstakeAmount(value);
    setUnstakePercent((numValue * 100) / stakedAmount);
  };

  useEffect(() => {
    async function fetchData() {
      if (!signer || !selectedPair) return;
      const tokenInfo = await getTokenInfo(selectedPair.lpToken);
      const tokenBalanceOfSigner = await getERC20Balance(signer.address, selectedPair.lpToken);
      const pendingRewardsInWei = await getPendingRewards(signer.address, selectedPair.lpToken);
      const userStakeInfo = await getUserStakeInfo(signer.address, selectedPair.lpToken);

      setTokenInfo(tokenInfo);
      setBalance(Number(ethers.formatUnits(tokenBalanceOfSigner, tokenInfo.decimals)));
      setPendingRewardsInWei(pendingRewardsInWei);
      setUserStakeInfo(userStakeInfo);
    }
    fetchData();
  }, [selectedPair, signer]);

  useEffect(() => {
    if (!balance || !isStakeSliderChange.current) return;
    setStakeAmount(((stakePercent * balance) / 100).toString());
  }, [stakePercent, balance]);

  useEffect(() => {
    if (!userStakeInfo || !isUnstakeSliderChange.current) return;
    const stakedAmount = Number(ethers.formatEther(userStakeInfo.amount));
    setUnstakeAmount(((unstakePercent * stakedAmount) / 100).toString());
  }, [unstakePercent, userStakeInfo]);

  useEffect(() => {
    if (isModalOpen) {
      setTabValue(initialTab);
    }
  }, [isModalOpen, initialTab]);

  if (!selectedPair || !tokenInfo) return null;

  return (
    <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth PaperProps={{ elevation: 0 }}>
      <DialogContent sx={{ p: 0 }}>
        <Paper sx={{ p: 4, borderRadius: 2, position: 'relative' }}>
          <IconButton onClick={() => setIsModalOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
            <SwapHorizIcon sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {selectedPair.pairName}
            </Typography>
          </Box>

          <Tabs
            value={tabValue}
            onChange={(_: any, newValue: SetStateAction<number>) => setTabValue(newValue)}
            centered
            sx={{
              mb: 4,
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px',
              },
            }}
          >
            <Tab icon={<StakeIcon />} label="Stake" sx={{ fontWeight: 500 }} />
            <Tab icon={<UnstakeIcon />} label="Unstake" sx={{ fontWeight: 500 }} />
            <Tab icon={<RewardsIcon />} label="Claim" sx={{ fontWeight: 500 }} />
          </Tabs>

          <Divider sx={{ mb: 4 }} />

          {tabValue === 0 && (
            <Stack spacing={4}>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={stakePercent}
                  onChange={(_: any, value: number | number[]) => {
                    isStakeSliderChange.current = true;
                    setStakePercent(value as number);
                  }}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => <div>{value}%</div>}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                    { value: 75, label: '75%' },
                    { value: 100, label: '100%' },
                  ]}
                  sx={{
                    '& .MuiSlider-thumb': {
                      width: 28,
                      height: 28,
                    },
                    '& .MuiSlider-mark': {
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                    },
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, mr: 2 }}>
                  <StakeIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <TextField
                    fullWidth
                    size="medium"
                    value={stakeAmount}
                    onChange={(e) => handleStakeAmountChange(e.target.value)}
                    placeholder="Enter amount"
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>{tokenInfo?.symbol}</Typography>,
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <WalletIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body1" color="text.secondary">
                    Balance: {balance.toFixed(4)} {tokenInfo?.symbol}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                onClick={handleStake}
                disabled={selectedPair?.weight === BigInt(0) || Number(stakeAmount) === 0}
                fullWidth
                size="large"
                startIcon={<StakeIcon />}
                sx={{
                  py: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1.2rem',
                  borderRadius: 2,
                }}
              >
                Stake Tokens
              </Button>
            </Stack>
          )}

          {tabValue === 1 && (
            <Stack spacing={4}>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={unstakePercent}
                  onChange={(_: any, value: number | number[]) => {
                    isUnstakeSliderChange.current = true;
                    setUnstakePercent(value as number);
                  }}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => <div>{value}%</div>}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                    { value: 75, label: '75%' },
                    { value: 100, label: '100%' },
                  ]}
                  sx={{
                    '& .MuiSlider-thumb': {
                      width: 28,
                      height: 28,
                    },
                    '& .MuiSlider-mark': {
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                    },
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, mr: 2 }}>
                  <UnstakeIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <TextField
                    fullWidth
                    size="medium"
                    value={unstakeAmount}
                    onChange={(e) => handleUnstakeAmountChange(e.target.value)}
                    placeholder="Enter amount"
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>{tokenInfo?.symbol}</Typography>,
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <WalletIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body1" color="text.secondary">
                    Staked: {Number(ethers.formatEther(userStakeInfo?.amount || 0n)).toFixed(4)} {tokenInfo?.symbol}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                onClick={handleUnstake}
                disabled={Number(unstakeAmount) === 0}
                fullWidth
                size="large"
                startIcon={<UnstakeIcon />}
                sx={{
                  py: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1.2rem',
                  borderRadius: 2,
                }}
              >
                Unstake Tokens
              </Button>
            </Stack>
          )}

          {tabValue === 2 && (
            <Stack spacing={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 4,
                  borderRadius: 2,
                  textAlign: 'center',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <AccountBalanceIcon sx={{ mr: 1, color: 'primary.main', fontSize: 32 }} />
                  <Typography variant="h5">Available Rewards</Typography>
                </Box>
                <Typography variant="h3" color="primary" sx={{ fontWeight: 600 }}>
                  {Number(ethers.formatEther(pendingRewardsInWei)).toFixed(4)} LIB
                </Typography>
              </Paper>
              <Button
                variant="contained"
                onClick={handleWithdraw}
                disabled={pendingRewardsInWei === BigInt(0)}
                fullWidth
                size="large"
                startIcon={<RewardsIcon />}
                sx={{
                  py: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1.2rem',
                  borderRadius: 2,
                }}
              >
                Claim Rewards
              </Button>
            </Stack>
          )}
        </Paper>
      </DialogContent>
    </Dialog>
  );
};

export default StakingModal;
