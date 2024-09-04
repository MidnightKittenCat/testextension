class Provider {
    private api = "https://anidex.info/api";  // Anidex API base URL

    async getSettings(): Promise<AnimeProviderSettings> {
        return {
            canSmartSearch: true,
            smartSearchFilters: ["batch", "episodeNumber", "resolution"],
            supportsAdult: false,
            type: "main",
        };
    }

    async search(opts: AnimeSearchOptions): Promise<AnimeTorrent[]> {
        // Fetch search results from Anidex API based on user query
        const response = await fetch(`${this.api}/search?query=${encodeURIComponent(opts.query)}&lang=en`);
        const results = await response.json();

        return results.map((result: any) => this.transformToAnimeTorrent(result));
    }

    async smartSearch(opts: AnimeSmartSearchOptions): Promise<AnimeTorrent[]> {
        // Implement smart search using filters like batch, episode number, and resolution
        const url = `${this.api}/search?query=${encodeURIComponent(opts.query)}&episode=${opts.episodeNumber}&resolution=${opts.resolution}&batch=${opts.batch}`;
        const response = await fetch(url);
        const results = await response.json();

        return results.map((result: any) => this.transformToAnimeTorrent(result));
    }

    async getTorrentInfoHash(torrent: AnimeTorrent): Promise<string> {
        // Return the info hash directly from the torrent object if available, otherwise scrape it
        if (torrent.infoHash) {
            return torrent.infoHash;
        }
        const response = await fetch(torrent.link);
        const pageContent = await response.text();
        // Implement scraping logic to extract the info hash
        const infoHash = this.extractInfoHashFromPage(pageContent);
        return infoHash;
    }

    async getTorrentMagnetLink(torrent: AnimeTorrent): Promise<string> {
        // Return the magnet link directly from the torrent object if available, otherwise scrape it
        if (torrent.magnetLink) {
            return torrent.magnetLink;
        }
        const response = await fetch(torrent.link);
        const pageContent = await response.text();
        // Implement scraping logic to extract the magnet link
        const magnetLink = this.extractMagnetLinkFromPage(pageContent);
        return magnetLink;
    }

    async getLatest(): Promise<AnimeTorrent[]> {
        // Fetch the latest torrents from Anidex API
        const response = await fetch(`${this.api}/latest?lang=en`);
        const results = await response.json();

        return results.map((result: any) => this.transformToAnimeTorrent(result));
    }

    private transformToAnimeTorrent(data: any): AnimeTorrent {
        return {
            name: data.title,
            date: data.date,
            size: data.size,
            formattedSize: this.formatSize(data.size),
            seeders: data.seeders,
            leechers: data.leechers,
            downloadCount: data.download_count,
            link: data.link,
            downloadUrl: data.download_url,
            magnetLink: data.magnet_link,
            infoHash: data.info_hash,
            resolution: data.resolution,
            isBatch: data.is_batch,
            episodeNumber: data.episode_number,
            releaseGroup: data.release_group,
            isBestRelease: data.is_best_release,
            confirmed: data.confirmed
        };
    }

    private formatSize(size: number): string {
        const i = Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
    }

    private extractInfoHashFromPage(pageContent: string): string {
        // Implement logic to extract info hash from HTML page
        // Example (pseudo-code):
        // const match = pageContent.match(/Info Hash: ([a-f0-9]{40})/);
        // return match ? match[1] : "";
        return "";
    }

    private extractMagnetLinkFromPage(pageContent: string): string {
        // Implement logic to extract magnet link from HTML page
        // Example (pseudo-code):
        // const match = pageContent.match(/magnet:\?xt=urn:btih:([a-f0-9]{40})/);
        // return match ? match[0] : "";
        return "";
    }
}
