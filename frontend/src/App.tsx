import { useMemo, useState } from 'react';
import { getAddress, signMessage, AddressPurpose, BitcoinNetworkType } from 'sats-connect';


export default function App() {
  const [file, setFile] = useState<File>();
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [trustSummary, setTrustSummary] = useState<string>("");
  const [decision, setDecision] = useState<string>("");
  const [chainrank, setChainrank] = useState<number | null>(null);
  const [wallet, setWallet] = useState('');
  const [btcPaymentAddress, setBtcPaymentAddress] = useState<string>("");
  const [btcOrdinalAddress, setBtcOrdinalAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const canDeposit = useMemo(() => decision === 'APPROVED' && !!wallet, [decision, wallet]);

  const handleUpload = async () => {
    setError("");
    if (!file) {
      setError('请先选择文件');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // 1) 调用后端 /validate
      const res = await fetch('http://localhost:3000/validate', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error(`/validate 请求失败: ${res.status}`);
      const { risk_score, trust_summary } = await res.json();
      setRiskScore(risk_score);
      setTrustSummary(trust_summary || '');

      // 2) 调用后端 /chainrank
      const res2 = await fetch('http://localhost:3000/chainrank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ risk_score })
      });
      if (!res2.ok) throw new Error(`/chainrank 请求失败: ${res2.status}`);
      const { chainrank: cr, decision: d } = await res2.json();
      setChainrank(cr);
      setDecision(d);
    } catch (e: any) {
      setError(e.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMockConnect = () => setWallet('bc1q...mock');
  const handleXverseConnect = async () => {
    try {
      await getAddress({
        payload: {
          purposes: [AddressPurpose.Payment, AddressPurpose.Ordinals],
          message: 'Connect Life++ RWA Vault (Testnet)',
          network: { type: BitcoinNetworkType.Testnet },
        },
        onFinish: (response) => {
          const payment = response.addresses.find((a) => a.purpose === AddressPurpose.Payment);
          const ordinals = response.addresses.find((a) => a.purpose === AddressPurpose.Ordinals);
          setBtcPaymentAddress(payment?.address || '');
          setBtcOrdinalAddress(ordinals?.address || '');
          setWallet(payment?.address || ordinals?.address || '');
        },
        onCancel: () => {
          setError('用户取消了钱包连接');
        },
      });
    } catch (e: any) {
      setError(e?.message || '连接钱包失败，请确认已安装 Xverse 并切换到 Testnet');
    }
  };
  const handleDeposit = async () => {
    if (!wallet) {
      setError('请先连接 Xverse 钱包');
      return;
    }
    try {
      await signMessage({
        payload: {
          network: { type: BitcoinNetworkType.Testnet },
          address: btcPaymentAddress || wallet,
          message: `Life++ RWA Vault deposit approval for riskScore=${riskScore} chainrank=${chainrank}`,
        },
        onFinish: (_response) => {
          alert('已通过 Xverse 完成消息签名 (Testnet)');
        },
        onCancel: () => setError('用户取消了签名'),
      });
    } catch (e: any) {
      setError(e?.message || '签名失败，请确认 Xverse 在测试网');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-4">
      <div>
        <input 
          type="file"
          onChange={(e) => setFile(e.target.files?.[0])}
          className="mb-2"
        />
        <button
          onClick={handleUpload}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? '分析中...' : '分析文档'}
        </button>
      </div>

      {error && (
        <div className="text-red-600">{error}</div>
      )}

      {riskScore !== null && (
        <div className="mt-2 p-4 border rounded space-y-2">
          <h3 className="text-xl">风险评分: {riskScore}</h3>
          {trustSummary && <p className="text-gray-700">{trustSummary}</p>}
        </div>
      )}

      {chainrank !== null && (
        <div className="p-4 border rounded space-y-2">
          <p>ChainRank: {chainrank}</p>
          <p>Decision: {decision}</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleXverseConnect}
              className="bg-gray-700 text-white px-3 py-2 rounded"
            >
              {wallet ? '已连接Xverse(Testnet)' : '连接Xverse钱包(Testnet)'}
            </button>
            <button
              onClick={handleDeposit}
              disabled={!canDeposit}
              className="bg-green-600 text-white px-3 py-2 rounded disabled:opacity-50"
            >
              Deposit & Mint (Mock)
            </button>
          </div>
          {wallet && (
            <div className="text-xs text-gray-600 mt-2 space-y-1">
              {btcPaymentAddress && <div>Payment: {btcPaymentAddress}</div>}
              {btcOrdinalAddress && <div>Ordinals: {btcOrdinalAddress}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}