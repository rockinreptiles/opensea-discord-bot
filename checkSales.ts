import 'dotenv/config';
import Discord, { TextChannel } from 'discord.js';
import fetch from 'node-fetch';
import { ethers } from "ethers";

const OPENSEA_SHARED_STOREFRONT_ADDRESS = '0x495f947276749Ce646f68AC8c248420045cb7b5e';
var floorChannel;

const discordBot = new Discord.Client();
const  discordSetup = async (): Promise<TextChannel> => {
  return new Promise<TextChannel>((resolve, reject) => {
    ['DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID'].forEach((envVar) => {
      if (!process.env[envVar]) reject(`${envVar} not set`)
    })
  
    discordBot.login(process.env.DISCORD_BOT_TOKEN);
    discordBot.on('ready', async () => {
      const channel = await discordBot.channels.fetch(process.env.DISCORD_CHANNEL_ID!);
      floorChannel = await discordBot.channels.fetch(process.env.FLOOR_CHANNEL_ID!);
      resolve(channel as TextChannel);
    });
  })
}

const buildMessage = (sale: any) => (
  new Discord.MessageEmbed()
	.setColor('#0099ff')
	.setTitle(sale.asset.name + ' sold!')
	.setURL(sale.asset.permalink)
	.setAuthor('OpenSea Bot', 'https://files.readme.io/566c72b-opensea-logomark-full-colored.png', 'https://github.com/sbauch/opensea-discord-bot')
	.setThumbnail(sale.asset.collection.image_url)
	.addFields(
		{ name: 'Name', value: sale.asset.name },
		{ name: 'Amount', value: `${ethers.utils.formatEther(sale.total_price || '0')}${ethers.constants.EtherSymbol}`},
		{ name: 'Buyer', value: sale?.winner_account?.address, },
		{ name: 'Seller', value: sale?.seller?.address,  },
	)
  .setImage(sale.asset.image_url)
	.setTimestamp(Date.parse(`${sale?.created_date}Z`))
	.setFooter('Sold on OpenSea', 'https://files.readme.io/566c72b-opensea-logomark-full-colored.png')
)

async function main() {
  const channel = await discordSetup();
  //const floorChannel = await discordSetup();
  const seconds = process.env.SECONDS ? parseInt(process.env.SECONDS) : 3_600;
  const hoursAgo = (Math.round(new Date().getTime() / 1000) - (seconds)); // in the last hour, run hourly?
  //let guild = discordBot.guilds.cache.get("878336968872853515");
 //const floorChannel = discordBot.channels.cache.get("878336968872853515");
  console.log(floorChannel);
  
  

  const floorResponse = await fetch("https://api.opensea.io/api/v1/collections?asset_owner=0xA095884445297E804096c5bc02349588a97830ab&offset=0&limit=1").then((resp) => resp.json());
  floorChannel.send('The current floor of Rockin Reptiles is '+ floorResponse[0].stats.floor_price+' ETH');
  //const resp = JSON.parse(floorResponse);
 //console.log(floorResponse);
  console.log(floorResponse[0].stats.floor_price)

  //console.log("floor" + floorResponse.stats["floor_price"]);
 // const test = floorResponse.stats.floor_price;
 // console.log(test);
  


  const params = new URLSearchParams({
    offset: '0',
    limit: '1',
    event_type: 'successful',
    only_opensea: 'false',
    occurred_after: hoursAgo.toString(), 
    collection_slug: process.env.COLLECTION_SLUG!,
  })

  if (process.env.CONTRACT_ADDRESS !== OPENSEA_SHARED_STOREFRONT_ADDRESS) {
    params.append('asset_contract_address', process.env.CONTRACT_ADDRESS!)
  }

  const openSeaResponse = await fetch(
    "https://api.opensea.io/api/v1/events?" + params).then((resp) => resp.json());
    
  return await Promise.all(
    openSeaResponse?.asset_events?.reverse().map(async (sale: any) => {
      const message = buildMessage(sale);
      channel.send(message)
    })
  );   


  
  //console.log(floorResponse);  
  //return await Promise.all(
  //  floorResponse?.stats?.map(async (floor_price: any) => {
  //    //const message = buildMessage(sale);
  //    return channel.setName('floor-'+floor_price);
  //  })
 // );
  
}


main()
  .then((res) =>{ 
    if (!res.length) console.log("No recent sales")
    process.exit(0)
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
