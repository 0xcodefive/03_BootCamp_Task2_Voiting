let Data;
let contract;
let provider;
let account;
let signer;

window.ethereum.on("accountsChanged", function (accounts) {
  location.reload();
});

function setData() {
  fetch("/config.json")
    .then((res) => res.json())
    .then((data) => {
      Data = data;
    });
}

// Принимает 'window.ethereum'
// Возвращает account, contract и provider
async function connectWallet(ethereum) {
  provider = new ethers.providers.Web3Provider(ethereum);
  await provider.send("eth_requestAccounts", []).then(async () => {
    // Проверяем, в нужной сети находится кошелёк, если нет, меняем сеть
    if (ethereum.chainId !== Data.BSC_TESTNET_CHAIN_ID) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: Data.BSC_TESTNET_CHAIN_ID,
            rpcUrls: [Data.BSC_TESTNET_RPC_URL],
            chainName: Data.BSC_TESTNET_CHAINNAME,
            nativeCurrency: {
              name: Data.BSC_TESTNET_NAME,
              symbol: Data.BSC_TESTNET_SYMBOL,
              decimals: Data.BSC_TESTNET_DECIMALS,
            },
            blockExplorerUrls: [Data.BSC_TESTNET_BLOCK_EXPLORER_URLS],
          },
        ],
      });
    }

    await provider.listAccounts().then((accounts) => {
      account = accounts[0];
      signer = provider.getSigner(account);
      contract = new ethers.Contract(
        Data.CONTRACT_ADDRESS,
        Data.CONTRACT_ABI,
        signer
      );
    });

    showWalletDisconect();
  });
}

async function showWalletDisconect() {
  try {
    document.getElementById("walletDisconect").style.display = "block";
    document.getElementById(
      "walletAddress"
    ).textContent = `Ваш кошелёк ${account}`;
  } catch {}
}

async function createNewSession(_addr, _topic, _optionNames) {
  if (compareIgnoreCase(_addr, Data.CONTRACT_ADDRESS)) {
    return await _createNewSessionSimple(account, _topic, _optionNames);
  } else {
    return await _createNewSessionBySBT(account, _addr, _topic, _optionNames);
  }
}

async function _createNewSessionSimple(_owner, _topic, _optionNames) {
  const txResponse = await contract.createNewSessionSimple(
    _owner,
    _topic,
    _optionNames
  );
  return await txResponse.wait(1);
}

async function _createNewSessionBySBT(_owner, _addrSBT, _topic, _optionNames) {
  const txResponse = await contract.createNewSessionBySBT(
    _owner,
    _addrSBT,
    _topic,
    _optionNames
  );
  return await txResponse.wait(1);
}

async function getActiveSessions() {
  const sessionsCount = await contract.getSessionsCount();
  const _activeSessions = [];
  for (let i = 0; i < sessionsCount; i++) {
    const session = await contract.sessions(i);
    if (session.isActive) {
      const hasVoted = compareIgnoreCase(
        session.addrForVote,
        Data.CONTRACT_ADDRESS
      )
        ? await getHasVoted(i, account)
        : false;
      if (!hasVoted) {
        const sessionArray = [session, i];
        _activeSessions.push(sessionArray);
      }
    }
  }
  return _activeSessions;
}

async function getSessionsForOptions() {
  const sessionsCount = await contract.getSessionsCount();
  const _sessions = [];
  for (let i = 0; i < sessionsCount; i++) {
    const session = await contract.sessions(i);
    if (session.isActive && compareIgnoreCase(session.owner, account)) {
      const sessionArray = [session, i];
      _sessions.push(sessionArray);
    }
  }
  return _sessions;
}

async function getClosedSessions() {
  const sessionsCount = await contract.getSessionsCount();
  const _closedSessions = [];
  for (let i = 0; i < sessionsCount; i++) {
    const session = await contract.sessions(i);
    if (!session.isActive) {
      const sessionArray = [session, i];
      _closedSessions.push(sessionArray);
    }
  }
  return _closedSessions;
}

async function castVoteSimple(sessionId, optionIndex) {
  const txResponse = await contract.castVoteSimple(sessionId, optionIndex);
  return await txResponse.wait(1);
}

async function castVoteBySBT(sessionId, optionIndex, tokenIndex) {
  const txResponse = await contract.castVoteBySBT(
    sessionId,
    optionIndex,
    tokenIndex
  );
  return await txResponse.wait(1);
}

async function setMinQuorum(sessionId, minQuorum) {
  await contract.setMinQuorum(sessionId, minQuorum);
}

async function transferSessionOwner(sessionId, newAddress) {
  await contract.transferSessionOwner(sessionId, newAddress);
}

async function closeSession(sessionId) {
  await contract.closeSession(sessionId);
}

async function getOption(index) {
  const options = [];
  try {
    let _counter = 0;
    while (true) {
      const option = await contract.options(index, _counter++);
      options.push(option);
    }
  } catch {}
  return options;
}

async function getHasVoted(index, address) {
  return await contract.hasVoted(index, address);
}

async function getHasVotedBySBT(sessionIndex, voteIndex) {
  return await contract.hasVotedBySBT(sessionIndex, voteIndex);
}

async function getVotes(index, address) {
  return await contract.votes(index, address);
}

async function getVotesBySBT(sessionIndex, voteIndex) {
  return await contract.votesBySBT(sessionIndex, voteIndex);
}

async function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compareIgnoreCase(str1, str2) {
  return str1.toLowerCase() === str2.toLowerCase();
}
