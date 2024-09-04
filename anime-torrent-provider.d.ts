import { AnimeProvider, AnimeProviderSettings, AnimeTorrent, AnimeSearchOptions, AnimeSmartSearchOptions } from 'seanime';

class AnidexProvider implements AnimeProvider {
  api = 'https://anidex.info/api/';

  getSettings(): AnimeProviderSettings {
    return {
      canSmartSearch: true,
      smartSearchFilters: ['batch', 'episodeNumber', 'resolution'],
      supportsAdult: true,
      type: 'main',
    };
  }

  async search(opts: AnimeSearchOptions): Promise<AnimeTorrent[]> {
    const query = `?q=${encodeURIComponent(opts.query)}&category=1_2`;
    const torrents = await this.fetchTorrents(query);
    return torrents.map((t) => this.toAnimeTorrent(t));
  }

  async smartSearch(opts: AnimeSmartSearchOptions): Promise<AnimeTorrent[]> {
    const ret: AnimeTorrent[] = [];

    if (opts.batch) {
      if (!opts.anidbAID) return [];

      let torrents = await this.searchByAID(opts.anidbAID, opts.resolution);

      if (!(opts.media.format === 'MOVIE' || opts.media.episodeCount === 1)) {
        torrents = torrents.filter((t) => t.num_files > 1);
      }

      for (const torrent of torrents) {
        const t = this.toAnimeTorrent(torrent);
        t.isBatch = true;
        ret.push(t);
      }

      return ret;
    }

    if (!opts.anidbEID) return [];

    const torrents = await this.searchByEID(opts.anidbEID, opts.resolution);

    for (const torrent of torrents) {
      ret.push(this.toAnimeTorrent(torrent));
    }

    return ret;
  }

  async getTorrentInfoHash(torrent: AnimeTorrent): Promise<string> {
    return torrent.infoHash || '';
  }

  async getTorrentMagnetLink(torrent: AnimeTorrent): Promise<string> {
    return torrent.magnetLink || '';
  }

  async getLatest(): Promise<AnimeTorrent[]> {
    const query = `?q=&category=1_2`;
    const torrents = await this.fetchTorrents(query);
    return torrents.map((t) => this.toAnimeTorrent(t));
  }

  async searchByAID(aid: number, quality: string): Promise<AnidexTorrent[]> {
    const q = encodeURIComponent(this.formatCommonQuery(quality));
    const query = `?q=${q}&anidb_aid=${aid}`;
    return this.fetchTorrents(query);
  }

  async searchByEID(eid: number, quality: string): Promise<AnidexTorrent[]> {
    const q = encodeURIComponent(this.formatCommonQuery(quality));
    const query = `?q=${q}&anidb_eid=${eid}`;
    return this.fetchTorrents(query);
  }

  async fetchTorrents(url: string): Promise<AnidexTorrent[]> {
    const furl = `${this.api}${url}`;

    try {
      const response = await fetch(furl);

      if (!response.ok) {
        throw new Error(`Failed to fetch torrents, ${response.statusText}`);
      }

      const torrents: AnidexTorrent[] = await response.json();

      return torrents.map((t) => {
        if (t.seeders > 30000) {
          t.seeders = 0;
        }
        if (t.leechers > 30000) {
          t.leechers = 0;
        }
        return t;
      });
    } catch (error) {
      throw new Error(`Error fetching torrents: ${error}`);
    }
  }

  formatCommonQuery(quality: string): string {
    if (quality === '') {
      return '';
    }

    quality = quality.replace(/p$/, '');

    const resolutions = ['480', '540', '720', '1080'];

    const others = resolutions.filter((r) => r !== quality);
    const othersStrs = others.map((r) => `!"${r}"`);

    return `("${quality}" ${othersStrs.join(' ')})`;
  }

  toAnimeTorrent(torrent: AnidexTorrent): AnimeTorrent {
    return {
      name: torrent.title,
      date: new Date(torrent.timestamp * 1000).toISOString(),
      size: torrent.total_size,
      formattedSize: '',
      seeders: torrent.seeders,
      leechers: torrent.leechers,
      downloadCount: torrent.torrent_download_count,
      link: torrent.link,
      downloadUrl: torrent.torrent_url,
      magnetLink: torrent.magnet_uri,
      infoHash: torrent.info_hash,
      resolution: '',
      isBatch: false,
      isBestRelease: false,
      confirmed: true,
    };
  }
}

type AnidexTorrent = {
  id: number;
  title: string;
  link: string;
  timestamp: number;
  status: string;
  anidb_aid: number;
  anidb_eid: number;
  torrent_url: string;
  info_hash: string;
  magnet_uri: string;
  seeders: number;
  leechers: number;
  torrent_download_count: number;
  total_size: number;
  num_files: number;
};
