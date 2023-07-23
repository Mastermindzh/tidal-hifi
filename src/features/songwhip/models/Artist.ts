import { ServiceLinks } from "./ServiceLinks";

export interface Artist {
  type: string;
  id: number;
  path: string;
  name: string;
  sourceUrl: string;
  sourceCountry: string;
  url: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  refreshedAt: string;
  serviceIds: { [key: string]: string };
  orchardId: string;
  spotifyId: string;
  links: { [key: string]: ServiceLinks[] };
  linksCountries: string[];
  description: string;
}
