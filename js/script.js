let provider = null;
let contract = null;
let info = {};
const iconWallet =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none"><path d="M4 3C2.89 3 2 3.9 2 5V19C2 19.5304 2.21071 20.0391 2.58579 20.4142C2.96086 20.7893 3.46957 21 4 21H18C18.5304 21 19.0391 20.7893 19.4142 20.4142C19.7893 20.0391 20 19.5304 20 19V16.72C20.59 16.37 21 15.74 21 15V9C21 8.26 20.59 7.63 20 7.28V5C20 4.46957 19.7893 3.96086 19.4142 3.58579C19.0391 3.21071 18.5304 3 18 3H4ZM4 5H18V7H12C11.4696 7 10.9609 7.21071 10.5858 7.58579C10.2107 7.96086 10 8.46957 10 9V15C10 15.5304 10.2107 16.0391 10.5858 16.4142C10.9609 16.7893 11.4696 17 12 17H18V19H4V5ZM12 9H19V15H12V9ZM15 10.5C14.6022 10.5 14.2206 10.658 13.9393 10.9393C13.658 11.2206 13.5 11.6022 13.5 12C13.5 12.3978 13.658 12.7794 13.9393 13.0607C14.2206 13.342 14.6022 13.5 15 13.5C15.3978 13.5 15.7794 13.342 16.0607 13.0607C16.342 12.7794 16.5 12.3978 16.5 12C16.5 11.6022 16.342 11.2206 16.0607 10.9393C15.7794 10.658 15.3978 10.5 15 10.5Z" fill="currentColor"/></svg>';

function initProvider() {
  provider = new ethers.providers.Web3Provider(window.ethereum);
  contract = new ethers.Contract(nftAddress, nftAbi, provider);
}

async function connectWallet() {
  let currentChain = null;
  $("#connectError").html("");

  try {
    initProvider();
    currentChain = await getCurrentChain();
  } catch (e) {
    $("#connectError").html(metamaskNotSupportedMessage());
    return;
  }

  if (currentChain != chainId) {
    try {
      await switchChain();
      // location.reload();
      initProvider();
      currentChain = await getCurrentChain();
    } catch (e) {
      await addChain();
    }
  }

  /** Btn onConected: Show Wallet address */
  await ethereum.request({ method: "eth_requestAccounts" });
  const address = await provider.getSigner().getAddress();
  $("#btnConnect").html(
    iconWallet + "<span>" + address.slice(0, 11) + "</span>"
  );

  try {
    info = await getCollectionInfo();
  } catch (e) {
    console.warn(e);
    $("#connectError").html("Error: Invalid NFT collection");
    return;
  }

  loadInfo();
  await loadAllNFTs();
}

function browserName() {
  let userAgent = navigator.userAgent;
  let browserName = "";

  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = "chrome";
  } else if (userAgent.match(/firefox|fxios/i)) {
    browserName = "firefox";
  } else if (userAgent.match(/safari/i)) {
    browserName = "safari";
  } else if (userAgent.match(/opr\//i)) {
    browserName = "opera";
  } else if (userAgent.match(/edg/i)) {
    browserName = "edge";
  } else if (userAgent.match(/brave/i)) {
    browserName = "brave";
  } else {
    browserName = "No browser detection";
  }
  return browserName;
}
function browserSupportsMetaMask() {
  return ["chrome", "firefox", "brave", "edge", "opera"].includes(
    browserName()
  );
}
function metamaskNotSupportedMessage() {
  return browserSupportsMetaMask()
    ? "You need MetaMask extension to connect wallet!"
    : "Your browser does not support MetaMask, please use another browser!";
}

function loadInfo() {
  let content = `
          <b> Name: </b>${info.name} </br>
          <b> Symbol: </b>${info.symbol} </br>
          <b> Soulbound: </b>${info.soulbound} </br>
          <b> Supply: </b>${info.totalSupply}/${info.maxSupply} </br>
        `;

  if (info.drop) {
    const dropStartTimestamp = info.dropStart.toNumber() * 1000;

    content = `${content}
          <b> Price: </b>${ethers.utils.formatEther(info.price)}</br>
          `;
    if (info.totalSupply.eq(info.maxSupply)) {
      $("#drop").html("<h3>Sold out!</h3>");
    } else if (dropStartTimestamp > Date.now()) {
      // The data/time we want to countdown to
      const dropStartDate = new Date(dropStartTimestamp);
      countdown(dropStartDate);

      // Run myfunc every second
      var myfunc = setInterval(function () {
        countdown(dropStartDate);
        // Display the message when countdown is over
        var timeleft = dropStartDate - new Date().getTime();
        if (timeleft < 0) {
          clearInterval(myfunc);
          renderMint();
        }
      }, 1000);
    } else {
      renderMint();
    }
  }
  $("#collection").html(content);
  $("#actions").show();
}

function countdown(date) {
  var now = new Date().getTime();
  var timeleft = date - now;

  // Calculating the days, hours, minutes and seconds left
  var days = Math.floor(timeleft / (1000 * 60 * 60 * 24));
  var hours = Math.floor((timeleft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  var minutes = Math.floor((timeleft % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((timeleft % (1000 * 60)) / 1000);

  $("#drop").html(`
    <b> Drop: </b>${date.toDateString()} ${date.toLocaleTimeString()} </br>
    ${days} <b>d </b>
    ${hours} <b>h </b>
    ${minutes} <b>m </b>
    ${seconds} <b>s </b>
  `);
}
function renderMint() {
  $("#drop").html(`
    <div class="amount">
      <label for="amount">Number of tokens (1-5):</label>
      <input id="amount" type="number" min="1" max="5" value="1" />
    </div>
    <button id="btnMint" onclick="mint()">Mint</button>
  `);
}

async function mint() {
  btnLoader($("#btnMint"), true);
  try {
    const nft = new ethers.Contract(nftAddress, nftAbi, provider).connect(
      provider.getSigner()
    );

    const address = await provider.getSigner().getAddress();
    const amount = $("#amount").val();
    const value = info.price.mul(ethers.BigNumber.from(amount)); // 0.1
    const tx = await nft.mint(address, amount, { value });

    btnLoader($("#btnMint"), false);
  } catch (error) {
    console.log(error);
    btnLoader($("#btnMint"), false);
  }
}

async function getCollectionInfo() {
  const info = {};
  info["name"] = await contract.name();
  info["symbol"] = await contract.symbol();
  info["maxSupply"] = await contract.maxSupply();
  info["totalSupply"] = await contract.totalSupply();
  info["soulbound"] = await contract.isSoulbound();
  info["revokable"] = await contract.isRevokable();
  info["drop"] = await contract.isDrop();
  info["dropStart"] = await contract.dropStart();
  info["reserve"] = await contract.reserve();
  info["price"] = await contract.price();
  info["royaltiesFees"] = await contract.royaltiesFees();
  info["royaltiesAddress"] = await contract.royaltiesAddress();
  return info;
}

async function getCurrentChain() {
  return ethereum.request({ method: "eth_chainId" });
}

async function addChain() {
  if (chainId == 0x507) {
    // moonbase
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          rpcUrls: ["https://rpc.api.moonbase.moonbeam.network/"],
          chainName: "Moonbase",
          nativeCurrency: {
            name: "DEV",
            symbol: "DEV",
            decimals: 18,
          },
          blockExplorerUrls: ["https://moonbase.moonscan.io/"],
        },
      ],
    });
  } else if (chainId == 0x504) {
    // moonbeam
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          rpcUrls: ["https://rpc.api.moonbeam.network/"],
          chainName: "Moonbeam",
          nativeCurrency: {
            name: "GLMR",
            symbol: "GLMR",
            decimals: 18,
          },
          blockExplorerUrls: ["https://moonscan.io/"],
        },
      ],
    });
  } else if (chainId == 0x250) {
    // moonbeam
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          rpcUrls: ["https://evm.astar.network/"],
          chainName: "Astar",
          nativeCurrency: {
            name: "ASTR",
            symbol: "ASTR",
            decimals: 18,
          },
          blockExplorerUrls: ["https://blockscout.com/astar"],
        },
      ],
    });
  }
}

async function switchChain() {
  await ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId }], // chainId must be in HEX with 0x in front
  });
}

async function loadAllNFTs() {
  btnLoader($("#btnAllNFTs"), true);
  const balance = info.totalSupply;

  await renderNFTs(balance);
  btnLoader($("#btnAllNFTs"), false);
}

async function loadMyNFTs() {
  btnLoader($("#myNFTs"), true);
  const address = await provider.getSigner().getAddress();
  const balance = await contract.balanceOf(address);

  await renderNFTs(balance, address);

  btnLoader($("#myNFTs"), false);
}

async function renderNFTs(balance, address = null) {
  if (balance.toBigInt() > 0) {
    $("#nfts").html("");
  } else if (address) {
    $("#nfts").html('<h2 class="text-center">You don\'t have any NFTs</h2>');
    return;
  } else {
    $("#nfts").html(
      '<h2 class="text-center">No NFTs, they must be minted first.</h2>'
    );
    return;
  }

  for (let i = 0; i < balance.toBigInt(); i++) {
    const id = address
      ? await contract.tokenOfOwnerByIndex(address, i)
      : await contract.tokenByIndex(i);
    const url = await contract.tokenURI(id.toBigInt());

    let metadata = null;
    try {
      metadata = await $.getJSON(url);

      $("#nfts").append(`
        <div class="box br" id="nft_${id}">
          <img src="${metadata.image}" alt="${metadata.name}" />
          <div class="box-content">
            <h3>${metadata.name || `#${id}`}</h3>
            <p>${metadata.description}</p>
          </div>
        </div>
      `);
    } catch (e) {
      console.log(e);
      metadata = {
        name: "",
        description: "",
        image: "",
      };
      $("#nfts").html(
        '<h3 class="text-center">Apologies, we were unable to load NFTs at this time. Please try again later or contact our support team for assistance. Thank you for your patience.</h3>'
      );
    }
  }
}

function btnLoader(el, loading) {
  if (loading) {
    el.attr("data-text", el.text());
    el.addClass("loading");
    el.html(`
      <svg
      class="spinner"
      style="
        margin: -${12}px 0 0 -${12}px;
        width: ${24}px;
        height: ${24}px;
      "
      viewBox="0 0 50 50"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="path"
      ></circle>
    </svg>
    `);
  } else {
    el.removeClass("loading");
    el.html(el.attr("data-text"));
  }
}
