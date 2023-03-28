const mainBlock = document.querySelector("main");
const walletAddress = document.getElementById("walletAddress");
const btnConnectWalletWrapper = document.getElementById(
  "btnConnectWallet-wrapper"
);
const checkbox1 = document.getElementById("checkbox1");
const newVotingTopic = document.getElementById("newVotingTopic");
const textInputContainerToken = document.getElementById(
  "text-input-container-token"
);
const textInputToken = document.getElementById("text-input-token");
const CastVote = document.getElementById("CastVote");
const topicCastVote = document.getElementById("topicCastVote");
const containerCastVote = document.getElementById("containerCastVote");
const VoteResult = document.getElementById("VoteResult");
const resultTable = document.getElementById("resultTable");
const curVoteOptions = document.getElementById("curVoteOptions");
const setMinQuorumValue = document.getElementById("setMinQuorumValue");
const transferSessionOwnerValue = document.getElementById(
  "transferSessionOwnerValue"
);

const isEmptyString = (element) => element === "";

let activeSessions = {};

setData();

async function btnConnectWallet() {
  btnConnectWallet.innerHTML = "Инициализация подключения. Ожидайте...";

  // Проверяем подключен ли Метамаск к сайту
  if (typeof window.ethereum === "undefined") {
    alert("Крипто кошелёк не обнаружен");
    btnConnectWallet.innerHTML = "Подключи любой кошелёк, поддерживающий EVM";
    return;
  }

  await connectWallet(window.ethereum);
  btnConnectWalletWrapper.style.display = "none";
  mainBlock.style.display = "block";

  _getCastVote();
  _getVoteResult();
  _startTimers();

  walletAddress.textContent = `Ваш кошелёк ${account}`;
}

async function btnDisconnectWallet() {
  try {
    await provider.send("eth_requestAccounts", [{ eth_accounts: {} }]);
    localStorage.clear();
  } catch {}

  document.getElementById("walletDisconect").style.display = "none";
  document.getElementById("walletAddress").textContent = `Кошелёк не подключен`;
  location.reload();
}

async function _startTimers() {
  setInterval(() => _getCastVote(), 60_000);
  setInterval(() => _getVoteResult(), 60_000);
}

checkbox1.addEventListener("change", () => {
  if (checkbox1.checked) {
    textInputContainerToken.style.display = "block";
  } else {
    textInputContainerToken.style.display = "none";
    textInputToken.value = "";
  }
});

function addField() {
  var container = document.getElementById("containerVoting");
  var input = document.createElement("input");
  input.type = "text";
  container.appendChild(input);
}

function removeField() {
  var container = document.getElementById("containerVoting");
  var inputs = container.getElementsByTagName("input");
  if (inputs.length > 2) {
    container.removeChild(inputs[inputs.length - 1]);
  }
}

function removeAllField() {
  var container = document.getElementById("containerVoting");
  var inputs = container.getElementsByTagName("input");
  for (let i = 0; i < inputs.length; i++) {
    inputs[i].value = "";
  }
  while (inputs.length > 2) {
    container.removeChild(inputs[inputs.length - 1]);
  }
  textInputContainerToken.style.display = "none";
  textInputToken.value = "";
  checkbox1.checked = false;
  newVotingTopic.value = "";
}

async function createVote() {
  if (isEmptyString(newVotingTopic.value)) {
    alert("Укажите тему голосования");
    return;
  }

  const values = _getValues();
  if (values.some(isEmptyString)) {
    alert("Не все поля заполнены. Укажите варианты для голосования");
    return;
  }

  const _tokenAddr =
    textInputToken.value !== "" ? textInputToken.value : Data.CONTRACT_ADDRESS;

  _setLoader("CreateSession");
  await createNewSession(_tokenAddr, newVotingTopic.value, values)
    .then((result) => {
      removeAllField();
      console.log(result);
      alert("Новая сессия для голосования создана");
      _getCastVote();
      _getVoteResult();
    })
    .catch((error) => {
      console.log(error);
      alert("Возникла некая ошибка, попробуйте позже");
    });
  _removeLoader("CreateSession");
}

function _getValues() {
  var container = document.getElementById("containerVoting");
  var inputs = container.getElementsByTagName("input");
  var values = [];
  for (var i = 0; i < inputs.length; i++) {
    values.push(inputs[i].value);
  }
  return values;
}

async function _getCastVote() {
  _setLoader("CastVote");
  activeSessions = await getActiveSessions();
  for (let i = 0; i < activeSessions.length; i++) {
    let option = document.createElement("option");
    option.text = activeSessions[i][0].topic;
    topicCastVote.add(option);
  }

  _removeLoader("CastVote");
  CastVote.style.display = activeSessions.length > 0 ? "block" : "none";

  _topicCastVoteEventChange();
  _getVoteOptions();
}

topicCastVote.addEventListener("change", _topicCastVoteEventChange);

async function _topicCastVoteEventChange() {
  _setLoader("CastVote");
  while (containerCastVote.firstChild) {
    containerCastVote.removeChild(containerCastVote.firstChild);
  }
  if (typeof activeSessions === "undefined") {
    return;
  }
  const session = activeSessions[topicCastVote.selectedIndex];
  await getOption(session[1])
    .then((results) => {
      results.forEach((result, i) => {
        const btn = document.createElement("button");
        btn.innerHTML = result.name;
        btn.addEventListener("click", () => {
          castVote(session[1], i, session[0].addrForVote);
        });
        containerCastVote.appendChild(btn);
      });
    })
    .catch((error) => {
      console.log(error);
    });
  _removeLoader("CastVote");
}

async function castVote(sessionId, optionIndex, addrForVote) {
  _setLoader("CastVote");
  if (compareIgnoreCase(addrForVote, Data.CONTRACT_ADDRESS)) {
    await castVoteSimple(sessionId, optionIndex)
      .then(async () => {
        alert("Спасибо, Ваш голос учтён!");
        _getCastVote();
      })
      .catch((error) => {
        console.log(error);
        alert("Произошла ошибка, вероятно, вы уже проголосовали.");
      });
  } else {
    const value = prompt(
      `Голосование предназначено только для влядельцев токена ${addrForVote}. Ведите id вашего токена:`
    );
    await castVoteBySBT(sessionId, optionIndex, value)
      .then(async () => {
        alert("Спасибо, Ваш голос учтён!");
        _getCastVote();
      })
      .catch((error) => {
        console.log(error);
        alert(
          "Произошла ошибка, вероятно, у вас нет прав для голосования, или вы уже проголосовали вашим токеном."
        );
      });
  }
  _removeLoader("CastVote");
}

async function _getVoteResult() {
  _setLoader("VoteResult");

  const rows = resultTable.getElementsByTagName("tr");
  for (let i = rows.length - 1; i > 0; i--) {
    resultTable.removeChild(rows[i]);
  }

  await getClosedSessions().then((sessions) => {
    sessions.forEach(async (session) => {
      const newRow = document.createElement("tr");

      const topicCell = document.createElement("td");
      topicCell.textContent = session[0].topic;
      newRow.appendChild(topicCell);

      const typeOfCell = document.createElement("td");
      typeOfCell.textContent =
        session[0].typeOf.toString() === "0" ? "Simple" : "SBT";
      newRow.appendChild(typeOfCell);

      const resultCell = document.createElement("td");
      const results = await getOption(session[1]);
      let bestResult = results[0];
      results.forEach((result) => {
        if (result.voteCount.gt(bestResult.voteCount)) {
          bestResult = result;
        }
        resultCell.innerHTML += `${result.name}: ${result.voteCount} голосов<br>`;
      });
      newRow.appendChild(resultCell);

      const bestCell = document.createElement("td");
      bestCell.textContent = bestResult.name;
      newRow.appendChild(bestCell);

      resultTable.appendChild(newRow);
    });
  });

  await _sleep(1000);
  _removeLoader("VoteResult");
}

async function _getVoteOptions() {
  _setLoader("VoteOptions");
  while (curVoteOptions.firstChild) {
    curVoteOptions.removeChild(curVoteOptions.firstChild);
  }
  const sessions = await getSessionsForOptions();
  for (let i = 0; i < sessions.length; i++) {
    let option = document.createElement("option");
    option.text = `${sessions[i][0].topic} :: кворум голосов ${sessions[i][0].minQuorum}`;
    option.value = sessions[i][1];
    curVoteOptions.add(option);
  }

  await _sleep(1000);
  _removeLoader("VoteOptions");
  VoteOptions.style.display = curVoteOptions.length > 0 ? "block" : "none";
}

async function _setMinQuorum() {
  _setLoader("VoteOptions");
  const selectedOption = curVoteOptions.options[curVoteOptions.selectedIndex];
  const value = selectedOption.value;
  await setMinQuorum(value, setMinQuorumValue.value)
    .then(() => {
      alert("Кворум изменён");
    })
    .catch((error) => {
      console.log(error);
      alert(
        "Возникла ошибка, попробуйте другое значение или перезагрузите страницу"
      );
    });
  _getVoteOptions();
}

async function _transferSessionOwner() {
  _setLoader("VoteOptions");
  const selectedOption = curVoteOptions.options[curVoteOptions.selectedIndex];
  const value = selectedOption.value;
  await transferSessionOwner(value, transferSessionOwnerValue.value)
    .then(() => {
      alert("Владелец голосования изменён");
    })
    .catch((error) => {
      console.log(error);
      alert(
        "Возникла ошибка, попробуйте другое значение или перезагрузите страницу"
      );
    });
  _getVoteOptions();
}

async function _closeSession() {
  _setLoader("VoteOptions");
  const selectedOption = curVoteOptions.options[curVoteOptions.selectedIndex];
  const value = selectedOption.value;
  await closeSession(value)
    .then(() => {
      alert(
        "Голосование завершено, результаты подсчитываются, ожидайте обновления."
      );
    })
    .catch((error) => {
      console.log(error);
      alert(
        "Возникла ошибка, возможно, кворум еще не достигнут, попробуйте позже"
      );
    });
  _getVoteOptions();
}

async function _setLoader(id) {
  const elem = document.getElementById(id);
  const overlays = elem.getElementsByClassName("loading-overlay");
  if (overlays.length == 0) {
    const overlay = document.createElement("div");
    overlay.classList.add("loading-overlay");
    elem.appendChild(overlay);
  }

  const loaders = elem.getElementsByClassName("loader");
  if (loaders.length == 0) {
    const loader = document.createElement("div");
    loader.classList.add("loader");
    elem.appendChild(loader);
  }
  elem.style.pointerEvents = "none";
}

async function _removeLoader(id) {
  const elem = document.getElementById(id);
  const overlays = elem.getElementsByClassName("loader");
  for (let i = overlays.length - 1; i >= 0; i--) {
    overlays[i].remove();
  }
  const loaders = elem.getElementsByClassName("loading-overlay");
  for (let i = loaders.length - 1; i >= 0; i--) {
    loaders[i].remove();
  }
  elem.style.pointerEvents = "auto";
}
