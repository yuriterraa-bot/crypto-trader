let fgCache: any = null;
let fgLastFetch = 0;

let trendingCache: any = null;
let trendingLastFetch = 0;

let rssCache: any = null;
let rssLastFetch = 0;

const FG_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const TRENDING_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const RSS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const POSITIVE_BTC = ["bitcoin", "btc", "bull", "surge", "rally", "ath", "breakout", "adoption", "etf", "halving"];
const NEGATIVE_BTC = ["bitcoin", "btc", "crash", "ban", "hack", "dump", "bear", "fud", "liquidation", "lawsuit"];
const POSITIVE_ETH = ["ethereum", "eth", "bull", "surge", "rally", "upgrade", "staking", "layer2"];
const NEGATIVE_ETH = ["ethereum", "eth", "crash", "ban", "hack", "dump", "bear", "fud"];

const fetchFearAndGreed = async () => {
  const now = Date.now();
  if (fgCache && (now - fgLastFetch < FG_CACHE_TTL)) {
    return fgCache;
  }

  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=3&format=json');
    const data = await res.json();
    const current = data.data[0];
    const index = parseInt(current.value, 10);
    
    let sentiment = 0;
    if (index <= 25) sentiment = -1.0;
    else if (index <= 45) sentiment = -0.5;
    else if (index <= 55) sentiment = 0;
    else if (index <= 75) sentiment = 0.5;
    else sentiment = 1.0;

    fgCache = {
      fearGreedIndex: index,
      fearGreedLabel: current.value_classification,
      fearGreedSentiment: sentiment
    };
    fgLastFetch = now;
    return fgCache;
  } catch (error) {
    console.warn('Failed to fetch Fear & Greed Index:', error);
    return { fearGreedIndex: 50, fearGreedLabel: "Neutral", fearGreedSentiment: 0 };
  }
};

const fetchTrending = async () => {
  const now = Date.now();
  if (trendingCache && (now - trendingLastFetch < TRENDING_CACHE_TTL)) {
    return trendingCache;
  }

  try {
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending');
    const data = await res.json();
    const trendingCoins = data.coins.map((c: any) => c.item.symbol.toUpperCase());
    
    trendingCache = {
      btc: trendingCoins.includes('BTC'),
      eth: trendingCoins.includes('ETH')
    };
    trendingLastFetch = now;
    return trendingCache;
  } catch (error) {
    console.warn('Failed to fetch Trending Coins:', error);
    return { btc: false, eth: false };
  }
};

const fetchRSSFeeds = async () => {
  const now = Date.now();
  if (rssCache && (now - rssLastFetch < RSS_CACHE_TTL)) {
    return rssCache;
  }

  const feeds = [
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk' },
    { url: 'https://cointelegraph.com/rss', name: 'Cointelegraph' }
  ];

  const headlines: { title: string; source: string; sentiment: 'positive' | 'negative' | 'neutral'; pubDate: string; link: string }[] = [];
  
  let btcRssScore = 0;
  let ethRssScore = 0;

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url);
      const text = await res.text();
      
      const titleMatches = text.match(/<title>(.*?)<\/title>/g);
      const linkMatches = text.match(/<link>(.*?)<\/link>/g);
      const dateMatches = text.match(/<pubDate>(.*?)<\/pubDate>/g);
      
      if (titleMatches) {
        // Skip the first title (feed title) and take 10
        const items = titleMatches.slice(1, 11);
        const links = linkMatches ? linkMatches.slice(1, 11) : [];
        const dates = dateMatches ? dateMatches.slice(0, 10) : [];
        
        items.forEach((item, idx) => {
          const titleRaw = item.replace(/<\/?title>/g, '').replace('<![CDATA[', '').replace(']]>', '');
          const title = titleRaw.toLowerCase();
          
          let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
          
          // BTC logic
          const hasBtc = title.includes('bitcoin') || title.includes('btc');
          if (hasBtc) {
            let isPos = POSITIVE_BTC.some(w => title.includes(w));
            let isNeg = NEGATIVE_BTC.some(w => title.includes(w));
            if (isPos && !isNeg) { btcRssScore += 0.15; sentiment = 'positive'; }
            else if (isNeg && !isPos) { btcRssScore -= 0.15; sentiment = 'negative'; }
          }
          
          // ETH logic
          const hasEth = title.includes('ethereum') || title.includes('eth');
          if (hasEth) {
            let isPos = POSITIVE_ETH.some(w => title.includes(w));
            let isNeg = NEGATIVE_ETH.some(w => title.includes(w));
            if (isPos && !isNeg) { ethRssScore += 0.15; sentiment = 'positive'; }
            else if (isNeg && !isPos) { ethRssScore -= 0.15; sentiment = 'negative'; }
          }

          headlines.push({
            title: titleRaw,
            source: feed.name,
            sentiment,
            pubDate: dates[idx] ? dates[idx].replace(/<\/?pubDate>/g, '') : new Date().toUTCString(),
            link: links[idx] ? links[idx].replace(/<\/?link>/g, '') : '#'
          });
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch RSS for ${feed.name}:`, error);
    }
  }

  // Clamp RSS scores
  btcRssScore = Math.max(-0.5, Math.min(0.5, btcRssScore));
  ethRssScore = Math.max(-0.5, Math.min(0.5, ethRssScore));

  rssCache = { headlines, btcRssScore, ethRssScore };
  rssLastFetch = now;
  return rssCache;
};

export const fetchNews = async () => {
  const fg = await fetchFearAndGreed();
  const trending = await fetchTrending();
  const rss = await fetchRSSFeeds();

  // Combine sentiment
  const fgWeight = 0.5;
  const rssWeight = 0.3;
  const trendingWeight = 0.2;

  let btcFinal = (fg.fearGreedSentiment * fgWeight) + (rss.btcRssScore * rssWeight) + (trending.btc ? 0.2 * trendingWeight : 0);
  let ethFinal = (fg.fearGreedSentiment * fgWeight) + (rss.ethRssScore * rssWeight) + (trending.eth ? 0.2 * trendingWeight : 0);

  // Clamp final
  btcFinal = Math.max(-1, Math.min(1, btcFinal));
  ethFinal = Math.max(-1, Math.min(1, ethFinal));

  return {
    fearGreedIndex: fg.fearGreedIndex,
    fearGreedLabel: fg.fearGreedLabel,
    fearGreedSentiment: fg.fearGreedSentiment,
    trending,
    headlines: rss.headlines,
    finalSentiment: {
      btc: btcFinal,
      eth: ethFinal
    }
  };
};

export const analyzeNewsSentiment = (newsData: any) => {
  // O sentiment final já foi calculado no fetchNews.
  // Retornamos ele para manter a compatibilidade com a assinatura pedida.
  return newsData.finalSentiment || { btc: 0, eth: 0 };
};
