/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as SmtpEmail from "../SmtpEmail.js";
import type * as adminOps from "../adminOps.js";
import type * as auth from "../auth.js";
import type * as buildRequests from "../buildRequests.js";
import type * as changePassword from "../changePassword.js";
import type * as constants from "../constants.js";
import type * as customPlugins from "../customPlugins.js";
import type * as http from "../http.js";
import type * as seedTestUser from "../seedTestUser.js";
import type * as seedUser from "../seedUser.js";
import type * as smtp from "../smtp.js";
import type * as ssoAuth from "../ssoAuth.js";
import type * as testAuth from "../testAuth.js";
import type * as users from "../users.js";
import type * as wpUpdates from "../wpUpdates.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  SmtpEmail: typeof SmtpEmail;
  adminOps: typeof adminOps;
  auth: typeof auth;
  buildRequests: typeof buildRequests;
  changePassword: typeof changePassword;
  constants: typeof constants;
  customPlugins: typeof customPlugins;
  http: typeof http;
  seedTestUser: typeof seedTestUser;
  seedUser: typeof seedUser;
  smtp: typeof smtp;
  ssoAuth: typeof ssoAuth;
  testAuth: typeof testAuth;
  users: typeof users;
  wpUpdates: typeof wpUpdates;
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
