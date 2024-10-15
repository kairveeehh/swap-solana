const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const fetch = require('node-fetch');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const SOLANA_MAINNET_RPC_URL = "https://api.mainnet-beta.solana.com";
const SOLANA_DEVNET_RPC_URL = "https://api.devnet.solana.com";
const mainnetConnection = new Connection(SOLANA_MAINNET_RPC_URL);
const devnetConnection = new Connection(SOLANA_DEVNET_RPC_URL);

client.once('ready', () => {
  console.log('🚀 Solana Bot is ready!');
  client.user.setActivity('Solana to the moon! 🌕');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'sol') {
    if (args[0] === 'price') {
      const price = await getSolanaPrice();
      const embed = new EmbedBuilder()
        .setTitle('Solana Price 💰')
        .setDescription(`The current price of Solana is $${price} USD`)
        .setColor('#00FF00')
        .setThumbnail('https://cryptologos.cc/logos/solana-sol-logo.png');
      message.reply({ embeds: [embed] });
    } else if (args[0] === 'balance') {
      if (!args[1]) return message.reply('Please provide a Solana address.');
      const balance = await getBalance(args[1]);
      const embed = new EmbedBuilder()
        .setTitle('Solana Balance 💼')
        .setDescription(`The balance of ${args[1]} is ${balance} SOL`)
        .setColor('#0099FF');
      message.reply({ embeds: [embed] });
    } else if (args[0] === 'airdrop') {
      if (!args[1]) return message.reply('Please provide a Solana address.');
      const result = await requestAirdrop(args[1]);
      message.reply(result);
    } else if (args[0] === 'txn') {
      if (!args[1]) return message.reply('Please provide a transaction signature.');
      const txnInfo = await getTransactionInfo(args[1]);
      message.reply({ embeds: [txnInfo] });
    } else if (args[0] === 'market') {
      const marketInfo = await getSolanaMarketInfo();
      message.reply({ embeds: [marketInfo] });
    } else if (args[0] === 'nft') {
      if (!args[1]) return message.reply('Please provide an NFT address.');
      const nftInfo = await getNFTInfo(args[1]);
      message.reply({ embeds: [nftInfo] });
    } else if (args[0] === 'swap') {
      if (args.length !== 2) return message.reply('Usage: !sol swap <amount>');
      const swapInfo = await getJupiterSwapInfo(args[1]);
      message.reply({ embeds: [swapInfo] });
    } else if (args[0] === 'status') {
      const healthStatus = await getSolanaNetworkStatus();
      console.log('Health Status:', healthStatus); // Log the health status here
      const embed = new EmbedBuilder()
        .setTitle('Solana Network Health Status')
        .setDescription(`The network health is: ${healthStatus}`)
        .setColor('#00FF00');
      message.reply({ embeds: [embed] });
    } else if (args[0] === 'joke') {
      const joke = await getRandomJoke();
      message.reply(joke);
    } else if (args[0] === 'help') {
      sendHelpMessage(message);
    } else if (args[0] === 'news') {
      const newsEmbed = await getSolanaNews();
      message.reply({ embeds: [newsEmbed] });
    } else if (args[0] === 'staking') {
      const stakingInfo = await getStakingInfo();
      message.reply({ embeds: [stakingInfo] });
    } else if (args[0] === 'meme') { // Added meme command section
      if (args[1] === 'submit') {
        // Check if an image is attached
        if (message.attachments.size > 0) {
          const memeUrl = message.attachments.first().url;
          const memeDescription = args.slice(2).join(' '); // Get description after command

          // Assign an ID and add the submission to the memeSubmissions array
          const memeId = memeSubmissions.length + 1;
          memeSubmissions.push({
            id: memeId,
            user: message.author.username,
            url: memeUrl,
            description: memeDescription || 'No description',
            votes: 0
          });

          // Inform the user and others that the meme has been submitted and assign an ID
          const embed = {
            title: `😂 Meme Submitted by ${message.author.username}`,
            description: `ID: #${memeId}\nDescription: ${memeDescription || 'No description'}`,
            image: {
              url: memeUrl
            },
            footer: {
              text: `Others can vote using: !sol meme vote ${memeId}`
            }
          };
          message.channel.send({ embeds: [embed] });
        } else {
          message.reply('❗ Please attach an image to submit your meme.');
        }
      } else if (args[1] === 'vote') {
        const memeId = parseInt(args[2]);
        const meme = memeSubmissions.find(m => m.id === memeId);
        if (meme) {
          meme.votes += 1;
          message.reply('👍 You voted for the meme!');
        } else {
          message.reply('❗ Meme not found.');
        }
      } else if (args[1] === 'top') {
        const topMeme = memeSubmissions.reduce((max, meme) => (meme.votes > max.votes ? meme : max), memeSubmissions[0]);
        if (topMeme) {
          const embed = {
            title: `🏆 Top Meme by ${topMeme.user} with ${topMeme.votes} votes!`,
            description: topMeme.description,
            image: {
              url: topMeme.url
            }
          };
          message.channel.send({ embeds: [embed] });
        } else {
          message.reply('No memes have been submitted yet!');
        }
      } else if (args[1] === 'show') {
        const mentionedUser = message.mentions.users.first();
        if (mentionedUser) {
          const userMemes = memeSubmissions.filter(meme => meme.user === mentionedUser.username);
          if (userMemes.length > 0) {
            userMemes.forEach(meme => {
              const embed = {
                title: `Meme #${meme.id} by ${meme.user}`,
                description: meme.description,
                image: {
                  url: meme.url
                }
              };
              message.channel.send({ embeds: [embed] });
            });
          } else {
            message.reply(`❗ ${mentionedUser.username} hasn't submitted any memes yet.`);
          }
        } else {
          message.reply('❗ Please mention a user to see their memes.');
        }
      } else {
        message.reply('Invalid meme command. Use `!sol meme submit`, `!sol meme vote <id>`, `!sol meme top`, or `!sol meme show @username`.');
      }
    } else {
      message.reply('Invalid command. Use `!sol help` to see available commands.');
    }
  }
});


const memeSubmissions = [];



async function getSolanaNetworkStatus() {
  try {
    const response = await fetch(SOLANA_MAINNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
      }),
    });


    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    console.log('Fetched data:', data);

    // Check if the response has a valid result
    if (!data.result) {
      throw new Error('No result in response');
    }

    return data.result; // This should be 'ok' or 'not available'
  } catch (error) {
    console.error('Error fetching Solana network status:', error);
    return 'Error fetching network status. Please try again later.';
  }
}


async function getSolanaPrice() {
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
  const data = await response.json();
  return data.solana.usd;
}

async function getBalance(address) {
  try {
    const pubKey = new PublicKey(address);
    const balance = await mainnetConnection.getBalance(pubKey);
    return (balance / LAMPORTS_PER_SOL).toFixed(4);
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 'Error: Invalid address or network issue';
  }
}

async function requestAirdrop(address) {
  try {
    const pubKey = new PublicKey(address);
    const airdropSignature = await devnetConnection.requestAirdrop(pubKey, LAMPORTS_PER_SOL);
    await devnetConnection.confirmTransaction(airdropSignature);
    return `Airdrop of 1 SOL to ${address} successful on devnet!`;
  } catch (error) {
    console.error('Airdrop error:', error);
    return 'Error: Airdrop failed. Please try again later.';
  }
}
// client.on('messageCreate', async (message) => {
//   if (message.content.startsWith('!joke')) {
//     const joke = await getRandomJoke();
//     message.reply(joke);
//   }
// });

async function getRandomJoke() {
  const response = await fetch('https://official-joke-api.appspot.com/jokes/random');
  const data = await response.json();
  return `${data.setup} - ${data.punchline}`;
}


function sendHelpMessage(message) {
  const helpEmbed = new EmbedBuilder()
    .setTitle('🌟 Solana Bot Commands')
    .setDescription('Here are the available commands:')
    .setColor('#4B0082')
    .addFields(
      { name: '💰 !sol price', value: 'Get current Solana price' },
        { name: '💼 !sol balance <address>', value: 'Check SOL balance of an address' },
        { name: '💸 !sol airdrop <address>', value: 'Request SOL airdrop on devnet' },
        { name: '🔍 !sol txn <signature>', value: 'Get transaction information' },
        { name: '📊 !sol market', value: 'Get Solana market information' },
        { name: '🎨 !sol nft <address>', value: 'Get NFT information' },
        { name: '💱 !sol swap <amount>', value: 'Get swap information for SOL to USDC' },
        { name: '🎮 !sol game', value: 'Play a Solana-themed game' },
        { name: '📰 !sol news', value: 'Get latest Solana news' },
        { name: '📈 !sol staking', value: 'Get Solana staking information' },
        { name: '😂 !sol meme submit <image-attachment> <optional description>', value: 'Submit a meme with an image attachment and optional description'},
        { name: '👍 !sol meme vote <meme-id>', value: 'Vote for a meme using its ID'},
        { name: '🏆 !sol meme top', value: 'Display the top-voted meme'}
    )
    .setFooter({ text: 'Solana Bot - Powered by blockchain magic ✨' });

  message.reply({ embeds: [helpEmbed] });
}

// ... [Previous code remains the same]

async function getStakingInfo() {
  try {
    const epochInfo = await mainnetConnection.getEpochInfo();
    const supply = await mainnetConnection.getSupply();
    const inflationRate = await mainnetConnection.getInflationRate();
    const validatorsResponse = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getVoteAccounts',
      }),
    });
    const validatorsData = await validatorsResponse.json();

    const totalStake = validatorsData.result.current.reduce((acc, validator) => acc + validator.activatedStake, 0) / LAMPORTS_PER_SOL;
    const activeValidators = validatorsData.result.current.length;
    const totalSupply = supply.value.total / LAMPORTS_PER_SOL;
    const stakingRatio = (totalStake / totalSupply) * 100;

    const stakingEmbed = new EmbedBuilder()
      .setTitle('🥩 Solana Staking Information')
      .setColor('#8A2BE2')
      .addFields(
        { name: 'Current Epoch', value: epochInfo.epoch.toString(), inline: true },
        { name: 'Total SOL Staked', value: `${totalStake.toLocaleString()} SOL`, inline: true },
        { name: 'Staking Ratio', value: `${stakingRatio.toFixed(2)}%`, inline: true },
        { name: 'Active Validators', value: activeValidators.toString(), inline: true },
        { name: 'Minimum Stake', value: '1 SOL', inline: true },
        { name: 'Unstaking Period', value: '~2-3 days', inline: true }
      )
      .setFooter({ text: 'Data fetched from Solana Mainnet 🚀' });

    return stakingEmbed;
  } catch (error) {
    console.error('Error fetching staking info:', error);
    return new EmbedBuilder()
      .setDescription('Error fetching staking information. Please try again later.')
      .setColor('#FF0000');
  }
}

async function getSolanaNews() {
  try {
    const response = await fetch('https://hn.algolia.com/api/v1/search_by_date?query=solana&tags=story');
    const data = await response.json();
    const articles = data.hits.slice(0, 5);

    const newsEmbed = new EmbedBuilder()
      .setTitle('📰 Latest Solana News')
      .setColor('#1E90FF')
      .setDescription('Here are the top 5 recent news articles about Solana:');

    articles.forEach((article, index) => {
      newsEmbed.addFields({
        name: `${index + 1}. ${article.title}`,
        value: `[Read more](${article.url}) | 👍 ${article.points} | 💬 ${article.num_comments}`
      });
    });

    newsEmbed.setFooter({ text: 'Data from Hacker News Algolia API' });

    return newsEmbed;
  } catch (error) {
    console.error('Error fetching Solana news:', error);
    return new EmbedBuilder()
      .setDescription('Error fetching Solana news. Please try again later.')
      .setColor('#FF0000');
  }
}


async function getTransactionInfo(signature) {
  try {
    const txn = await mainnetConnection.getTransaction(signature);
    if (!txn) return new EmbedBuilder().setDescription('Transaction not found').setColor('#FF0000');

    const embed = new EmbedBuilder()
      .setTitle('Transaction Information')
      .setColor('#0099ff')
      .addFields(
        { name: 'Status', value: txn.meta.err ? 'Failed' : 'Success', inline: true },
        { name: 'Block Time', value: new Date(txn.blockTime * 1000).toLocaleString(), inline: true },
        { name: 'Fee', value: `${(txn.meta.fee / LAMPORTS_PER_SOL).toFixed(6)} SOL`, inline: true }
      );

    return embed;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return new EmbedBuilder().setDescription('Error fetching transaction information').setColor('#FF0000');
  }
}

async function getSolanaMarketInfo() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/solana');
    const data = await response.json();

    const embed = new EmbedBuilder()
      .setTitle('Solana Market Information')
      .setColor('#00FF00')
      .setThumbnail(data.image.large)
      .addFields(
        { name: 'Current Price', value: `$${data.market_data.current_price.usd}`, inline: true },
        { name: '24h Change', value: `${data.market_data.price_change_percentage_24h.toFixed(2)}%`, inline: true },
        { name: 'Market Cap', value: `$${data.market_data.market_cap.usd.toLocaleString()}`, inline: true },
        { name: '24h Trading Volume', value: `$${data.market_data.total_volume.usd.toLocaleString()}`, inline: true },
        { name: 'Circulating Supply', value: `${data.market_data.circulating_supply.toLocaleString()} SOL`, inline: true },
        { name: 'All-Time High', value: `$${data.market_data.ath.usd} (${new Date(data.market_data.ath_date.usd).toLocaleDateString()})`, inline: true }
      );

    return embed;
  } catch (error) {
    console.error('Error fetching market info:', error);
    return new EmbedBuilder().setDescription('Error fetching Solana market information').setColor('#FF0000');
  }
}

async function getNFTInfo(address) {
  try {
    // This is a mock function. In a real scenario, you'd interact with Solana's Metaplex or another NFT standard
    const response = await fetch(`https://api.opensea.io/api/v1/asset/${address}/`);
    const data = await response.json();

    const embed = new EmbedBuilder()
      .setTitle(data.name)
      .setDescription(data.description)
      .setImage(data.image_url)
      .addFields(
        { name: 'Collection', value: data.collection.name, inline: true },
        { name: 'Owner', value: data.owner.address.slice(0, 8) + '...', inline: true },
        { name: 'Token ID', value: data.token_id, inline: true }
      )
      .setColor('#FFA500');

    return embed;
  } catch (error) {
    console.error('Error fetching NFT info:', error);
    return new EmbedBuilder().setDescription('Error fetching NFT information').setColor('#FF0000');
  }
}





async function fetchJupiterQuote(lamports, retries = 3) {
  const fromMint = 'So11111111111111111111111111111111111111112'; // SOL
  const toMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC on devnet

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${fromMint}&outputMint=${toMint}&amount=${lamports}&slippage=0.5&onlyDirectRoutes=true`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Jupiter API response:', data);
      
      return data;
    } catch (error) {
      console.error(`Error fetching quote from Jupiter (attempt ${attempt + 1}):`, error);
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
    }
  }
}

async function getJupiterSwapInfo(amount) {
  try {
    const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
    
    // Fetch Jupiter quote using the new fetchJupiterQuote function
    const data = await fetchJupiterQuote(lamports);

    if (!data.inAmount || !data.outAmount) {
      throw new Error('Invalid quote received from Jupiter API');
    }

    const inputAmount = parseInt(data.inAmount) / LAMPORTS_PER_SOL;
    const outputAmount = parseInt(data.outAmount) / 1000000; // USDC has 6 decimal places
    const price = outputAmount / inputAmount;

    const embed = new EmbedBuilder()
      .setTitle('Token Swap Information (via Jupiter)')
      .setDescription(`Swap ${inputAmount.toFixed(6)} SOL to USDC`)
      .addFields(
        { name: 'Input Amount', value: `${inputAmount.toFixed(6)} SOL`, inline: true },
        { name: 'Output Amount', value: `${outputAmount.toFixed(6)} USDC`, inline: true },
        { name: 'Price', value: `1 SOL = ${price.toFixed(6)} USDC`, inline: true },
        { name: 'Route', value: data.routePlan ? data.routePlan.map(step => step.swapInfo.label).join(' → ') : 'N/A' },
        { name: 'Slippage', value: '0.5%', inline: true }
      )
      .setColor('#00CED1')
      .setFooter({ text: 'Data provided by Jupiter API' });

    return embed;
  } catch (error) {
    console.error('Error fetching swap info from Jupiter:', error);
    return new EmbedBuilder()
      .setDescription(`Error fetching swap information from Jupiter API: ${error.message}`)
      .setColor('#FF0000');
  }
}




client.login('process.env.BOT_TOKEN');
