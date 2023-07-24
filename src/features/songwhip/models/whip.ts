import { Artist } from "./Artist";
import { ServiceLinks } from "./ServiceLinks";

export interface WhippedResult {
  status: string;
  data: {
    item: {
      type: string;
      id: number;
      path: string;
      name: string;
      url: string;
      sourceUrl: string;
      sourceCountry: string;
      releaseDate: string;
      createdAt: string;
      updatedAt: string;
      refreshedAt: string;
      image: string;
      isrc: string;
      isExplicit: boolean;
      links: { [key: string]: ServiceLinks[] };
      linksCountries: string[];
      artists: Artist[];
    };
  };
}
