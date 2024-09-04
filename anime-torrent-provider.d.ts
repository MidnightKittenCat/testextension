/// <reference path="./anime-torrent-provider.d.ts" />

class Provider {
    private api = "https://anidex.info";

    async getSettings(): Promise<AnimeProviderSettings> {
        return {
            canSmartSearch: true,
            smartSearchFilters: ["batch", "episodeNumber", "resolution", "query"],
            supportsAdult: true,
            type: "main",
        };
    }

    async search(opts: AnimeSearchOptions): Promise<AnimeTorrent[]> {
        const url = `${this.api}/?q=${encodeURIComponent(opts.query)}`;
        return this.fetchTorrents(url);
    }

    async smartSearch(opts: AnimeSmartSearchOptions): Promise<AnimeTorrent[]> {
        let query = opts.query || opts.media.romajiTitle || opts.media.englishTitle;
        if (opts.batch) query += " batch";
        if (opts.episodeNumber > 0) query += ` episode ${opts.episodeNumber}`;
        if (opts.resolution) query += ` ${opts.resolution}`;

        const url = `${this.api}/?q=${encodeURIComponent(query)}`;
        return this.fetchTorrents(url);
    }

    async getTorrentInfoHash(torrent: AnimeTorrent): Promise<string> {
        if (torrent.infoHash) return torrent.infoHash;
        return this.scrapeTorrentPage(torrent.link, 'infoHash');
    }

    async getTorrentMagnetLink(torrent: AnimeTorrent): Promise<string> {
        if (torrent.magnetLink) return torrent.magnetLink;
        return this.scrapeTorrentPage(torrent.link, 'magnetLink');
    }

    async getLatest(): Promise<AnimeTorrent[]> {
        const url = `${this.api}/?s=id&o=desc`;
        return this.fetchTorrents(url);
    }

    private async fetchTorrents(url: string): Promise<AnimeTorrent[]> {
        try {
            const response = await fetch(url);
            const html = await response.text();
            return this.parseTorrents(html);
        } catch (error) {
            console.error("Error fetching torrents:", error);
            return [];
        }
    }

    private parseTorrents(html: string): AnimeTorrent[] {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const rows = doc.querySelectorAll('table.table-hover > tbody > tr');
        
        return Array.from(rows).map(row => {
            const nameElement = row.querySelector('td:nth-child(3) a');
            const name = nameElement?.textContent?.trim() || '';
            const link = nameElement?.getAttribute('href') || '';
            const size = row.querySelector('td:nth-child(7)')?.textContent?.trim() || '';
            const seeders = parseInt(row.querySelector('td:nth-child(9)')?.textContent?.trim() || '0', 10);
            const leechers = parseInt(row.querySelector('td:nth-child(10)')?.textContent?.trim() || '0', 10);
            const downloadCount = parseInt(row.querySelector('td:nth-child(8)')?.textContent?.trim() || '0', 10);
            const dateElement = row.querySelector('td:nth-child(5)');
            const date = dateElement ? new Date(dateElement.getAttribute('title') || '').toISOString() : new Date().toISOString();

            return {
                name,
                date,
                size: this.parseSize(size),
                formattedSize: size,
                seeders,
                leechers,
                downloadCount,
                link: `${this.api}${link}`,
                downloadUrl: '',
                magnetLink: null,
                infoHash: null,
                resolution: this.parseResolution(name),
                isBatch: name.toLowerCase().includes('batch'),
                episodeNumber: this.parseEpisodeNumber(name),
                releaseGroup: this.parseReleaseGroup(name),
                isBestRelease: false,
                confirmed: false,
            };
        });
    }

    private parseSize(size: string): number {
        const match = size.match(/^([\d.]+)\s*([KMGT]?B)$/i);
        if (!match) return 0;
        const [, value, unit] = match;
        const multipliers: { [key: string]: number } = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
        return parseFloat(value) * multipliers[unit.toUpperCase()];
    }

    private parseResolution(name: string): string {
        const resolutions = ['4K', '1080p', '720p', '480p'];
        for (const res of resolutions) {
            if (name.includes(res)) return res;
        }
        return '';
    }

    private parseEpisodeNumber(name: string): number {
        const match = name.match(/\b(?:E|EP|Episode)\s*(\d+)\b/i);
        return match ? parseInt(match[1], 10) : -1;
    }

    private parseReleaseGroup(name: string): string {
        const match = name.match(/\[([^\]]+)\]/);
        return match ? match[1] : '';
    }

    private async scrapeTorrentPage(url: string, type: 'infoHash' | 'magnetLink'): Promise<string> {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            if (type === 'infoHash') {
                const infoHashElement = doc.querySelector('.info-hash');
                return infoHashElement?.textContent?.trim() || '';
            } else {
                const magnetLink = doc.querySelector('a[href^="magnet:"]')?.getAttribute('href') || '';
                return magnetLink;
            }
        } catch (error) {
            console.error(`Error scraping ${type}:`, error);
            return '';
        }
    }
}
