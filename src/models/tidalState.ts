export type TidalState = {
  status: "Playing" | "Paused" | "Stopped";
  repeat: "Off" | "All" | "Single";
  shuffle: boolean;
  currentTrack?: {
    id: number;
    title: string;
    // undefined for videos
    album?: string;
    artists: string[];
    current: number;
    duration: number;
    url: string;
    image: string;
  };
};
