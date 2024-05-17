export type TidalState = {
  status: "Playing" | "Paused" | "Stopped";
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
