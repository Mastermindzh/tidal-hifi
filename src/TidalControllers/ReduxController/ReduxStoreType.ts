export type ReduxStoreType = {
  content: {
    mediaItems: {
      [trackId: string]: {
        item: {
          title: string;
          album: { title: string; cover: string };
          artists: { name: string }[];
        };
      };
    };
  };
  entities: {
    tracks: {
      entities: {
        [trackId: string]: {
          attributes: {
            externalLinks: { href: string }[];
          };
        };
      };
    };
  };
  playQueue: {
    sourceName: string;
    shuffleModeEnabled: boolean;
  };
  playbackControls: {
    playbackState: string;
    mediaProduct: {
      productId: string;
    };
  };
  favorites: {
    tracks: number[];
  };
};
