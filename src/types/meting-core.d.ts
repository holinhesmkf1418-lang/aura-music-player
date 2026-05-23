declare module '@meting/core' {
  class Meting {
    constructor()
    site(platform: string): void
    format(enabled: boolean): void
    search(query: string, options?: { limit?: number; page?: number }): Promise<string>
    url(id: string, bitrate?: number): Promise<string>
    pic(id: string, size?: number): Promise<string>
    lyric(id: string): Promise<string>
    static getSupportedPlatforms(): string[]
  }

  export default Meting
}
