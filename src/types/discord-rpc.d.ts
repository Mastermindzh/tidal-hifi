declare module 'discord-rpc' {
  export class Client {
    constructor(options: { transport: 'ipc' });
    on(event: string, listener: (...args: any[]) => void): this;
    login(options: { clientId: string }): Promise<void>;
    setActivity(presence: Presence): Promise<void>;
    clearActivity(): Promise<void>;
    destroy(): Promise<void>;
  }

  export interface Presence {
    state?: string;
    details?: string;
    startTimestamp?: number;
    endTimestamp?: number;
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
    partyId?: string;
    partySize?: number;
    partyMax?: number;
    matchSecret?: string;
    spectateSecret?: string;
    joinSecret?: string;
    instance?: boolean;
    type?: number;
    buttons?: Array<{ label: string; url: string }>;
  }

  export const ActivityTypes: {
    PLAYING: 0,
    STREAMING: 1,
    LISTENING: 2,
    WATCHING: 3,
    CUSTOM: 4,
    COMPETING: 5
  };
}
