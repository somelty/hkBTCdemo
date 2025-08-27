// Minimal Xverse (sats-connect) integration for plain HTML pages
// Usage in your HTML:
// <button id="xverse-connect">连接 Xverse(Testnet)</button>
// <div id="xverse-status"></div>
// <script type="module" src="/xverse.js"></script>

import {
  getAddress,
  signMessage,
  AddressPurpose,
  BitcoinNetworkType,
} from "https://esm.sh/sats-connect@1.1.0";

async function connectXverse() {
  const statusEl = document.getElementById("xverse-status");
  try {
    let got = { payment: "", ordinals: "" };
    // Primary: sats-connect
    await getAddress({
      payload: {
        purposes: [AddressPurpose.Payment, AddressPurpose.Ordinals],
        message: "Connect Life++ RWA Vault (Testnet)",
        network: { type: BitcoinNetworkType.Testnet },
      },
      onFinish: (response) => {
        const payment = response.addresses.find(
          (a) => a.purpose === AddressPurpose.Payment
        );
        const ordinals = response.addresses.find(
          (a) => a.purpose === AddressPurpose.Ordinals
        );
        got.payment = payment?.address || "";
        got.ordinals = ordinals?.address || "";
      },
      onCancel: () => {
        throw new Error("用户取消连接");
      },
    });

    // Fallback: legacy window.btc provider if sats-connect yielded no address
    if (!got.payment && !got.ordinals && window.btc?.request) {
      try {
        const resp = await window.btc.request("getAddresses", {
          purposes: ["payment", "ordinals"],
          message: "Connect Life++ RWA Vault (Testnet)",
          network: "testnet",
          allowMultiple: true,
        });
        const payment = resp?.result?.find?.(
          (a) => (a.purpose || a.type) === "payment"
        );
        const ordinals = resp?.result?.find?.(
          (a) => (a.purpose || a.type) === "ordinals"
        );
        got.payment = payment?.address || "";
        got.ordinals = ordinals?.address || "";
      } catch (e) {
        // try alternative shape
        const resp2 = await window.btc.request("getAddresses", {
          purposes: ["ordinals", "payment"],
          message: "Connect Life++ RWA Vault (Testnet)",
          network: { type: "Testnet" },
        });
        const payment2 = resp2?.addresses?.find?.(
          (a) => a.purpose === "payment"
        );
        const ordinals2 = resp2?.addresses?.find?.(
          (a) => a.purpose === "ordinals"
        );
        got.payment = payment2?.address || "";
        got.ordinals = ordinals2?.address || "";
      }
    }

    if (!got.payment && !got.ordinals) {
      throw new Error("Xverse 未返回地址，请确认已解锁并切换 Testnet");
    }

    window.__xverse = { payment: got.payment, ordinals: got.ordinals };
    const addr = got.payment || got.ordinals;
    if (statusEl) statusEl.textContent = `已连接: ${addr}`;
  } catch (e) {
    if (statusEl)
      statusEl.textContent =
        e?.message || "连接钱包失败，请确认已安装 Xverse 并切换到 Testnet";
    // Offer extension landing link if provider missing
    if (!window.btc && statusEl) {
      const a = document.createElement("a");
      a.href =
        "chrome-extension://idnnbdplmphpflfnlkomgpfbpcgelopg/options.html#/landing";
      a.textContent = "打开 Xverse 扩展";
      a.target = "_blank";
      a.rel = "noreferrer";
      statusEl.appendChild(document.createTextNode(" "));
      statusEl.appendChild(a);
    }
  }
}

async function signApprovalMessage({ riskScore = 0, chainrank = 0 } = {}) {
  const statusEl = document.getElementById("xverse-status");
  try {
    const address = window.__xverse?.payment || window.__xverse?.ordinals;
    if (!address) throw new Error("请先连接 Xverse 钱包");
    let ok = false;
    try {
      await signMessage({
        payload: {
          network: { type: BitcoinNetworkType.Testnet },
          address,
          message: `Life++ RWA Vault deposit approval: risk=${riskScore} chainrank=${chainrank}`,
        },
        onFinish: () => {
          ok = true;
        },
        onCancel: () => {
          throw new Error("用户取消签名");
        },
      });
    } catch (_) {
      // Fallback via window.btc
      if (window.btc?.request) {
        await window.btc.request("signMessage", {
          address,
          message: `Life++ RWA Vault deposit approval: risk=${riskScore} chainrank=${chainrank}`,
          network: "testnet",
        });
        ok = true;
      } else {
        throw _;
      }
    }
    if (ok && statusEl) statusEl.textContent = "已完成消息签名 (Testnet)";
  } catch (e) {
    if (statusEl) statusEl.textContent = e?.message || "签名失败";
  }
}

// Auto-bind if button exists
const btn = document.getElementById("xverse-connect");
if (btn) btn.addEventListener("click", connectXverse);

// Expose helpers
window.connectXverse = connectXverse;
window.signXverseMessage = signApprovalMessage;
