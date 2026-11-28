import { httpRouter } from "convex/server";

import { uploadPhoto, uploadPreflight } from "./uploads";

/** HTTP endpoints on the Convex site URL (`*.convex.site`). */
const http = httpRouter();

http.route({ path: "/photos", method: "POST", handler: uploadPhoto });
http.route({ path: "/photos", method: "OPTIONS", handler: uploadPreflight });

export default http;
