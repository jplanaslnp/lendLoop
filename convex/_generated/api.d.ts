/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as borrowRequests from "../borrowRequests.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_history from "../lib/history.js";
import type * as lib_imageFormat from "../lib/imageFormat.js";
import type * as lib_lifecycle from "../lib/lifecycle.js";
import type * as lib_listingRules from "../lib/listingRules.js";
import type * as lib_requestRules from "../lib/requestRules.js";
import type * as listings from "../listings.js";
import type * as loans from "../loans.js";
import type * as myListings from "../myListings.js";
import type * as seed from "../seed.js";
import type * as seedData from "../seedData.js";
import type * as uploads from "../uploads.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  borrowRequests: typeof borrowRequests;
  crons: typeof crons;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/history": typeof lib_history;
  "lib/imageFormat": typeof lib_imageFormat;
  "lib/lifecycle": typeof lib_lifecycle;
  "lib/listingRules": typeof lib_listingRules;
  "lib/requestRules": typeof lib_requestRules;
  listings: typeof listings;
  loans: typeof loans;
  myListings: typeof myListings;
  seed: typeof seed;
  seedData: typeof seedData;
  uploads: typeof uploads;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
