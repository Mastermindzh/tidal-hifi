import fs from "fs";
import swaggerjsdoc from "swagger-jsdoc";
import packagejson from "./../package.json";

const specs = swaggerjsdoc({
  definition: {
    openapi: "3.1.0",
    info: {
      title: "TIDAL Hi-Fi API",
      version: packagejson.version,
      description: "",
      license: {
        name: packagejson.license,
        url: "https://github.com/Mastermindzh/tidal-hifi/blob/master/LICENSE",
      },
      contact: {
        name: "Rick <mastermindzh> van Lieshout",
        url: "https://www.rickvanlieshout.com",
      },
    },
    externalDocs: {
      description: "swagger.json",
      url: "swagger.json",
    },
  },
  apis: ["**/*.ts"],
});

fs.writeFileSync("src/features/api/swagger.json", JSON.stringify(specs, null, 2), "utf8");
console.log("Written swagger.json");
