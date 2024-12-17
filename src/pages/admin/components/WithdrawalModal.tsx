import { Button, CardActions, Card, TextField, CardContent, Modal, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useContract } from '@/providers/ContractProvider';
import ModalBox from '@/components/ModalBox';
import { ethers } from 'ethers';

const REWARD_TOKEN_ADDRESS = import.meta.env.VITE_REWARD_TOKEN_ADDRESS;

interface WithdrawalModalProps {
  open: boolean;
  onClose: () => void;
}

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ open, onClose }) => {
  const [recipient, setRecipient] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const { contract, proposeWithdrawRewards, getERC20Balance, getTokenInfo } = useContract();

  useEffect(() => {
    const fetchBalance = async () => {
      if (!contract) return;
      const balance = await getERC20Balance(await contract.getAddress(), REWARD_TOKEN_ADDRESS);
      const tokenInfo = await getTokenInfo(REWARD_TOKEN_ADDRESS);

      setBalance(Number(ethers.formatUnits(balance, tokenInfo.decimals)));
    };
    fetchBalance();
  }, [contract]);

  const handleProposeWithdrawal = async () => {
    if (!contract) return;
    await proposeWithdrawRewards(recipient, withdrawAmount);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalBox>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
            Withdrawal
          </Typography>
          <TextField fullWidth value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient Address" margin="normal" />
          <TextField fullWidth value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Withdrawal Amount" margin="normal" />
          <Typography variant="body2" gutterBottom sx={{ textAlign: 'right' }}>
              Balance: {balance.toLocaleString()}
            </Typography>
          </CardContent>
          <CardActions>
            <Button fullWidth variant="contained" color="warning" onClick={handleProposeWithdrawal} disabled={!recipient || !withdrawAmount}>
            Propose Withdrawal
          </Button>
        </CardActions>
        </Card>
      </ModalBox>
    </Modal>
  );
};

export default WithdrawalModal;